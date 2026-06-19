import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, walletAdminProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import * as db from "./db";
import { ENV } from "./_core/env";
import crypto from 'crypto';
import { totpVerify, generateSecret } from './_core/speakeasyWrapper';

// TOTP options
const totpOptions = {
  encoding: 'base32',
  window: 2,
};

// 지갑 주소로 사용자 ID 가져오기 (헤더에서)
const getWalletAddressFromContext = (ctx: any): string => {
  const walletAddress = ctx.req.headers["x-wallet-address"];
  if (!walletAddress || typeof walletAddress !== "string") {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Wallet address required",
    });
  }
  return walletAddress.toLowerCase();
};

// 지갑 주소로 사용자 조회 및 생성
const getOrCreateUserByWallet = async (walletAddress: string) => {
  let user = await db.getUserByWalletAddress(walletAddress);

  if (!user) {
    await db.upsertUser({
      openId: `web3_${walletAddress}`,
      walletAddress: walletAddress,
      name: `User_${walletAddress.slice(0, 8)}`,
      email: null,
      loginMethod: "web3",
      role: "user",
      lastSignedIn: new Date(),
    });
    user = await db.getUserByWalletAddress(walletAddress);
  }

  if (!user) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get or create user",
    });
  }

  return user;
};

export const appRouter = router({
  system: systemRouter,

  // Web3 Wallet Authentication
  auth: router({
    // 현재 사용자 정보 조회
    me: publicProcedure.query(async ({ ctx }) => {
      try {
        const walletAddress = getWalletAddressFromContext(ctx);
        const user = await getOrCreateUserByWallet(walletAddress);

        return {
          id: user.id,
          walletAddress: user.walletAddress,
          name: user.name,
          email: user.email,
          pointBalance: user.pointBalance,
          level: user.level,
        };
      } catch (error) {
        return null;
      }
    }),

    // 로그아웃
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
  }),

  // User Profile & Level
  user: router({
    getProfile: publicProcedure.query(async ({ ctx }) => {
      const walletAddress = getWalletAddressFromContext(ctx);
      const user = await getOrCreateUserByWallet(walletAddress);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        walletAddress: user.walletAddress,
        pointBalance: user.pointBalance,
        referralBonusBalance: user.referralBonusBalance ?? "0",
        donationBonusBalance: user.donationBonusBalance ?? "0",
        level: user.level,
        currentCycleLevel: user.currentCycleLevel ?? 0,
        referrerId: user.referrerId,
        isCreditAccount: user.isCreditAccount ?? false,
        creditOwed: user.creditOwed ?? "0",
      };
    }),

    getLevel: publicProcedure.query(async ({ ctx }) => {
      const walletAddress = getWalletAddressFromContext(ctx);
      const user = await getOrCreateUserByWallet(walletAddress);

      return {
        currentLevel: user.level,
        pointBalance: user.pointBalance,
      };
    }),

    // 추천인 등록 (URL ?ref= 파라미터로 신규 가입 시 호출)
    setReferrer: publicProcedure
      .input(z.object({ referrerWalletOrId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const user = await getOrCreateUserByWallet(walletAddress);

        // 이미 추천인이 있으면 변경 불가
        if (user.referrerId) {
          return { success: false, message: "이미 추천인이 등록되어 있습니다." };
        }

        // 추천인 조회 (지갑주소 또는 ID)
        let referrer;
        if (input.referrerWalletOrId.startsWith("0x")) {
          referrer = await db.getUserByWalletAddress(input.referrerWalletOrId.toLowerCase());
        } else {
          const refId = parseInt(input.referrerWalletOrId);
          if (!isNaN(refId)) referrer = await db.getUserById(refId);
        }

        if (!referrer) {
          return { success: false, message: "추천인을 찾을 수 없습니다." };
        }

        // 자기 자신은 추천인 불가
        if (referrer.id === user.id) {
          return { success: false, message: "자기 자신을 추천인으로 설정할 수 없습니다." };
        }

        await db.updateUserReferrer(user.id, referrer.id);
        return { success: true, referrerId: referrer.id, referrerName: referrer.name };
      }),

    updateLevel: publicProcedure
      .input(z.object({ level: z.number().min(1).max(4) }))
      .mutation(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const user = await getOrCreateUserByWallet(walletAddress);

        // 패키지 고정 YNV 단가
        const LEVEL_YNV_PRICES: Record<number, number> = {
          1: 30000,
          2: 50000,
          3: 90000,
          4: 140000,
        };
        const depositAmount = LEVEL_YNV_PRICES[input.level] || 0;

        // ====== 이중 검증 (Double Validation) ======
        // currentCycleLevel: 현재 사이클에서 마지막으로 구매한 레벨
        // 0 = 이번 사이클 미구매 (또는 레벨4 완료 후 리셋)
        const cycleLevel = user.currentCycleLevel ?? 0;

        // [검증 1] 순서 검증: 레벨 1은 cycleLevel이 0이어야 하고,
        //   레벨 N(N>=2)은 cycleLevel이 N-1이어야 함
        const expectedPrevCycleLevel = input.level - 1;
        if (cycleLevel !== expectedPrevCycleLevel) {
          if (input.level === 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `레벨 1을 먼저 구매해야 합니다. (현재 사이클 진행: 레벨 ${cycleLevel})`,
            });
          } else {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `레벨 ${input.level - 1}을 먼저 구매해야 합니다. (현재 사이클 진행: 레벨 ${cycleLevel})`,
            });
          }
        }

        // [검증 2] 잔액 검증
        const currentBalance = Number(String(user.pointBalance).replace(/,/g, ""));
        if (currentBalance < depositAmount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `YNV 잔액이 부족합니다. (필요: ${depositAmount.toLocaleString()} YNV, 보유: ${currentBalance.toLocaleString()} YNV)`,
          });
        }
        // ====== 이중 검증 완료 ======

        // 레벨 업그레이드 (최고 레벨 기록)
        if (input.level > user.level) {
          await db.updateUserLevel(user.id, input.level);
        }

        // 사이클 레벨 업데이트: 레벨4 구매 완료 시 0으로 리셋, 그 외 현재 레벨로 설정
        const newCycleLevel = input.level === 4 ? 0 : input.level;
        await db.updateUserCycleLevel(user.id, newCycleLevel);

        // 잔액 차감
        await db.updateUserPointBalance(user.id, currentBalance - depositAmount);

        // 바이너리 트리 자동 배치 (추천인이 있을 때만)
        if (user.referrerId) {
          await db.placeBinaryTreeNode(user.id, user.referrerId);
        }

        // 보상 분배: 직추천 10% + 상위 10대 각 8%
        if (depositAmount > 0) {
          await db.distributeRewardBonuses(user.id, depositAmount);
        }

        return { success: true, newCycleLevel };
      }),
  }),

  // Point Transactions
  points: router({
    getBalance: publicProcedure.query(async ({ ctx }) => {
      const walletAddress = getWalletAddressFromContext(ctx);
      const user = await getOrCreateUserByWallet(walletAddress);
      // 새 백엔드(Dogeshiba)에서 DSHIB 잔액 조회 시도
      try {
        const res = await fetch(`http://34.148.84.182:3000/api/dashboard/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          return { balance: String(data.withdrawable_balance || user.pointBalance) };
        }
      } catch {}
      return { balance: user.pointBalance };
    }),

    getTransactionHistory: publicProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const user = await getOrCreateUserByWallet(walletAddress);
        return await db.getPointTransactionHistory(user.id, input.limit);
      }),

    // P2P 수신 총액 + 어드민 지급 총액 요약
    getReceiptSummary: publicProcedure.query(async ({ ctx }) => {
      const walletAddress = getWalletAddressFromContext(ctx);
      const user = await getOrCreateUserByWallet(walletAddress);
      const dbConn = await db.getDb();
      if (!dbConn) return { p2pReceived: '0', adminDeposited: '0' };
      const { pointTransactions: txTable } = await import('../drizzle/schema');
      const { eq, and, sql } = await import('drizzle-orm');

      // P2P 수신 총액 (type='transfer', 수신자 = 이 유저)
      const p2pRows = await dbConn
        .select({ total: sql<string>`COALESCE(SUM(${txTable.amount}), 0)` })
        .from(txTable)
        .where(and(eq(txTable.userId, user.id), eq(txTable.type, 'transfer'), eq(txTable.status, 'completed')));

      // 어드민 지급 총액 (type='admin_deposit')
      const adminRows = await dbConn
        .select({ total: sql<string>`COALESCE(SUM(${txTable.amount}), 0)` })
        .from(txTable)
        .where(and(eq(txTable.userId, user.id), eq(txTable.type, 'admin_deposit'), eq(txTable.status, 'completed')));

      return {
        p2pReceived: String(p2pRows[0]?.total ?? '0'),
        adminDeposited: String(adminRows[0]?.total ?? '0'),
      };
    }),

    transfer: publicProcedure
      .input(
        z.object({
          recipientWalletOrId: z.string(),
          amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const sender = await getOrCreateUserByWallet(walletAddress);

        const amount = parseFloat(input.amount);
        if (parseFloat(sender.pointBalance.toString()) < amount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient balance" });
        }

        let recipient;
        if (input.recipientWalletOrId.startsWith("0x")) {
          recipient = await db.getUserByWalletAddress(input.recipientWalletOrId);
        } else {
          recipient = await db.getUserById(parseInt(input.recipientWalletOrId));
        }

        if (!recipient) throw new TRPCError({ code: "NOT_FOUND", message: "Recipient not found" });

        await db.createPointTransaction({
          userId: sender.id,
          type: "transfer",
          amount,
          relatedUserId: recipient.id,
          description: input.description || `Transfer to ${recipient.name}`,
          status: "completed",
        });

        await db.updateUserPointBalance(
          sender.id,
          parseFloat(sender.pointBalance.toString()) - amount
        );
        await db.updateUserPointBalance(
          recipient.id,
          parseFloat(recipient.pointBalance.toString()) + amount
        );

        return { success: true, recipientId: recipient.id };
      }),
  }),

  // Point Prices
  pointPrice: router({
    getCurrentPrice: publicProcedure.query(async () => {
      const today = new Date().toISOString().split("T")[0];
      let price = await db.getPointPriceForDate(today);

      if (!price) {
        price = await db.getLatestPointPrice();
      }

      if (!price) {
        return { priceUSD: "0.01", date: "fallback" };
      }

      return { priceUSD: price.priceUSD, date: price.date };
    }),

    getPriceHistory: publicProcedure
      .input(z.object({ days: z.number().default(30) }))
      .query(async ({ input }) => {
        return await db.getPointPriceHistory(input.days);
      }),

    setPrice: walletAdminProcedure
      .input(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          priceUSD: z.string().regex(/^\d+(\.\d{1,8})?$/),
        })
      )
      .mutation(async ({ input }) => {
        await db.setPointPrice(input.date, input.priceUSD);
        return { success: true };
      }),
  }),

  // Deposits
  deposit: router({
    initiateDeposit: publicProcedure
      .input(
        z.object({
          usdtAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const user = await getOrCreateUserByWallet(walletAddress);

        const price = await db.getPointPriceForDate(new Date().toISOString().split("T")[0]);
        if (!price) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Price not set" });

        const usdtAmount = parseFloat(input.usdtAmount);
        const pointAmount = usdtAmount / parseFloat(price.priceUSD.toString());

        await db.createPointTransaction({
          userId: user.id,
          type: "deposit",
          amount: pointAmount,
          status: "pending",
          description: `Deposit ${usdtAmount} USDT`,
        });

        return {
          pointAmount: pointAmount.toFixed(2),
          usdtAmount: input.usdtAmount,
          priceUSD: price.priceUSD,
        };
      }),

    confirmDeposit: publicProcedure
      .input(
        z.object({
          transactionHash: z.string(),
          pointAmount: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const user = await getOrCreateUserByWallet(walletAddress);

        const pointAmount = parseFloat(input.pointAmount);

        const newBalance = parseFloat(user.pointBalance.toString()) + pointAmount;
        await db.updateUserPointBalance(user.id, newBalance);

        await db.createPointTransaction({
          userId: user.id,
          type: "deposit",
          amount: pointAmount,
          status: "completed",
          description: `Deposit confirmed: ${input.transactionHash}`,
        });

        return { success: true, newBalance };
      }),
  }),

  // Withdrawals
  withdrawal: router({
    requestWithdrawal: publicProcedure
      .input(
        z.object({
          pointAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const user = await getOrCreateUserByWallet(walletAddress);

        const pointAmount = parseFloat(input.pointAmount);
        const feePercentage = 0.02; // 2% 기본 수수료
        const fee = pointAmount * feePercentage;
        const netAmount = pointAmount - fee;

        if (parseFloat(user.pointBalance.toString()) < pointAmount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient balance" });
        }

        await db.createWithdrawalRequest({
          userId: user.id,
          pointAmount,
          usdtAmount: netAmount,
          fee,
          walletAddress: user.walletAddress || "",
        });

        // 유저 잔액 차감
        await db.updateUserPointBalance(user.id, parseFloat(user.pointBalance.toString()) - pointAmount);

        // 수수료를 role='admin' 계정에 즉시 귀속
        const dbConn = await db.getDb();
        if (dbConn && fee > 0) {
          const { users: usersTable } = await import('../drizzle/schema');
          const { eq } = await import('drizzle-orm');
          const adminRows = await dbConn.select({ id: usersTable.id, pointBalance: usersTable.pointBalance })
            .from(usersTable)
            .where(eq(usersTable.role, 'admin'))
            .limit(1);
          if (adminRows.length > 0) {
            const adminId = adminRows[0].id;
            const adminBalance = parseFloat(String(adminRows[0].pointBalance || '0'));
            await db.updateUserPointBalance(adminId, adminBalance + fee);
            console.log(`[WithdrawalFee] fee=${fee} routed to admin id=${adminId}`);
          }
        }

        return {
          requestId: 1,
          pointAmount,
          fee,
          netAmount,
          status: "pending",
        };
      }),

    getWithdrawalHistory: publicProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const user = await getOrCreateUserByWallet(walletAddress);
        return await db.getPointTransactionHistory(user.id, input.limit);
      }),

    getPendingWithdrawals: walletAdminProcedure.query(async () => {
      return await db.getPendingWithdrawalRequests();
    }),

    approveWithdrawal: walletAdminProcedure
      .input(z.object({ withdrawalId: z.number() }))
      .mutation(async ({ input }) => {
        await db.approveWithdrawalRequest(input.withdrawalId, 1);
        return { success: true };
      }),

    rejectWithdrawal: walletAdminProcedure
      .input(z.object({ withdrawalId: z.number(), reason: z.string() }))
      .mutation(async ({ input }) => {
        const withdrawal = await db.getWithdrawalRequest(input.withdrawalId);
        if (!withdrawal) throw new TRPCError({ code: "NOT_FOUND" });

        await db.rejectWithdrawalRequest(input.withdrawalId, input.reason);

        // 포인트 반환
        const user = await db.getUserById(withdrawal.userId);
        if (user) {
          await db.updateUserPointBalance(
            withdrawal.userId,
            parseFloat(user.pointBalance.toString()) + parseFloat(withdrawal.pointAmount.toString())
          );
        }

        return { success: true };
      }),
  }),

  // Organization & Binary Tree
  organization: router({
    getBinaryTree: publicProcedure.query(async ({ ctx }) => {
      const walletAddress = getWalletAddressFromContext(ctx);
      const user = await getOrCreateUserByWallet(walletAddress);
      return {
        userId: user.id,
        level: user.level,
        name: user.name || "User",
      };
    }),

    getOrganizationStats: publicProcedure.query(async ({ ctx }) => {
      const walletAddress = getWalletAddressFromContext(ctx);
      const user = await getOrCreateUserByWallet(walletAddress);
      const uplineCount = await db.countUplineMembers(user.id);
      // 원라인 큐 기반: levelUpdatedAt > 내 levelUpdatedAt인 실결제 유저 수
      const downlineCount = await db.countOneLineDownlineMembers(user.id);
      // 직추천 회원 수: referrerId = 내 ID인 비유령 유저만 카운트
      const directReferralCount = await db.countDirectReferrals(user.id);
      return { uplineCount, downlineCount, directReferralCount };
    }),

    // 원라인 레그: 특정 레벨의 전체 맴버 목록 (FIFO 순서)
    getOneLineLeg: publicProcedure
      .input(z.object({ level: z.number().min(1).max(4) }))
      .query(async ({ input }) => {
        return await db.getOneLineLegMembers(input.level);
      }),

    // 내 직소속 하위 맴버 (레벨별)
    getDirectDownline: publicProcedure
      .input(z.object({ level: z.number().min(1).max(4) }))
      .query(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const user = await getOrCreateUserByWallet(walletAddress);
        return await db.getDirectDownlineByLevel(user.id, input.level);
      }),
  }),

  // Admin Functions
  admin: router({

    // Master admin login (password-only)
    login: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
        otpCode: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Verify username and password
        if (input.username !== ENV.adminUsername) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid username or password',
          });
        }

        if (input.password !== ENV.adminPassword) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid username or password',
          });
        }

        const adminWallet = ENV.adminWalletAddress || '0xd4ce178d8e8467b0c1ba3c0c8474f4ca457178d';

        // Generate session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        return {
          success: true,
          sessionToken,
          expiresAt,
          adminWallet,
          message: 'Login successful',
        };
      }),
    getPendingWithdrawals: publicProcedure.query(async () => {
      return await db.getPendingWithdrawalRequests();
    }),

    updateWithdrawalStatus: publicProcedure
      .input(
        z.object({
          withdrawalId: z.number(),
          status: z.enum(["approved", "rejected"]),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        if (input.status === "rejected") {
          await db.rejectWithdrawalRequest(input.withdrawalId, input.reason || "Rejected by admin");
        } else {
          await db.approveWithdrawalRequest(input.withdrawalId, 1);
        }
        return { success: true };
      }),

    // 출금 설정 조회
    getWithdrawalSettings: walletAdminProcedure.query(async () => {
      const settings = await db.getWithdrawalSettings();
      if (!settings) {
        return {
          minLimit: "1000",
          maxLimit: "100000",
          isPaused: false,
        };
      }
      return {
        minLimit: settings.minLimit,
        maxLimit: settings.maxLimit,
        isPaused: settings.isPaused,
      };
    }),

    // 가격 자동 상승 ON/OFF 설정 조회
    getPriceAutoIncrease: walletAdminProcedure.query(async () => {
      const setting = await db.getSystemSetting("price_auto_increase_enabled");
      return { enabled: setting?.value === "true" };
    }),

    // 가격 자동 상승 ON/OFF 설정 저장
    setPriceAutoIncrease: walletAdminProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.setSystemSetting("price_auto_increase_enabled", input.enabled ? "true" : "false");
        return { success: true };
      }),

    // 가격 자동 상승률 조회
    getPriceAutoPercent: walletAdminProcedure.query(async () => {
      const setting = await db.getSystemSetting("price_auto_increase_percent");
      return { percent: parseFloat(setting?.value || "1.5") };
    }),

    // 가격 자동 상승률 저장
    setPriceAutoPercent: walletAdminProcedure
      .input(z.object({ percent: z.number().min(0.1).max(100) }))
      .mutation(async ({ input }) => {
        await db.setSystemSetting("price_auto_increase_percent", input.percent.toString());
        return { success: true };
      }),

    // 출금 설정 업데이트
    updateWithdrawalSettings: walletAdminProcedure
      .input(
        z.object({
          minLimit: z.string().regex(/^\d+(\.\d{1,2})?$/),
          maxLimit: z.string().regex(/^\d+(\.\d{1,2})?$/),
          isPaused: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateWithdrawalSettings({
          minLimit: input.minLimit,
          maxLimit: input.maxLimit,
          isPaused: input.isPaused,
        });
        return { success: true };
      }),

    // P2P 전송 이력 조회 (관리자)
    getP2PTransferHistory: walletAdminProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ input }) => {
        return await db.getP2PTransferHistory(input.limit);
      }),

    // 가상 노드 설정 조회
    getVirtualNodeSettings: walletAdminProcedure.query(async () => {
      return await db.getVirtualNodeSettings();
    }),

    // 가상 노드 삽입 간격 업데이트
    updateVirtualNodeInterval: walletAdminProcedure
      .input(z.object({
        level: z.number().min(1).max(4),
        interval: z.number().min(1).max(100),
      }))
      .mutation(async ({ input }) => {
        await db.updateVirtualNodeInterval(input.level, input.interval);
        return { success: true };
      }),

    // 유령 코드 목록 조회 (isGhost=true인 유저)
    getGhostUsers: walletAdminProcedure.query(async () => {
      return await db.getGhostUsers();
    }),

    // 유령 코드 상태 토글 (userId, isGhost)
    setGhostStatus: walletAdminProcedure
      .input(z.object({
        userId: z.number(),
        isGhost: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserGhostStatus(input.userId, input.isGhost);
        return { success: true };
      }),

    // 사용자 지갑 주소 변경
    updateUserWalletAddress: walletAdminProcedure
      .input(z.object({
        userId: z.number(),
        newWalletAddress: z.string(),
      }))
      .mutation(async ({ input }) => {
        // 지갑 주소 형식 검증
        if (!/^0x[a-fA-F0-9]{40}$/.test(input.newWalletAddress)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid wallet address format",
          });
        }
        // 새 지갑 주소가 이미 다른 유저에게 등록되어 있는지 확인
        const existingUser = await db.getUserByWalletAddress(input.newWalletAddress);
        if (existingUser && existingUser.id !== input.userId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Wallet address already registered to another user",
          });
        }
        await db.updateUserWalletAddress(input.userId, input.newWalletAddress);
        return { success: true };
      }),

    // 전체 유저 목록 (유령 코드 관리용)
    getAllUsers: walletAdminProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async ({ input }) => {
        return await db.getAllUsersForAdmin(input.limit);
      }),

    // 스테이킹 설정 조회
    getStakingSettings: walletAdminProcedure.query(async () => {
      const [rate180, rate360, minInit, minRestake, p2pMin] = await Promise.all([
        db.getSystemSetting("stakingInterest180"),
        db.getSystemSetting("stakingInterest360"),
        db.getSystemSetting("staking_min_initial"),
        db.getSystemSetting("staking_min_restake"),
        db.getSystemSetting("p2p_min_transfer"),
      ]);
      return {
        dailyRate180: rate180?.value || "1.0",
        dailyRate360: rate360?.value || "1.5",
        minInitial: minInit?.value || "10000",
        minRestake: minRestake?.value || "1000",
        p2pMin: p2pMin?.value || "100",
      };
    }),

    // 스테이킹 설정 저장
    updateStakingSettings: walletAdminProcedure
      .input(z.object({
        dailyRate180: z.string().regex(/^\d+(\.\d{1,4})?$/),
        dailyRate360: z.string().regex(/^\d+(\.\d{1,4})?$/),
        minInitial: z.string().regex(/^\d+(\.\d{1,2})?$/),
        minRestake: z.string().regex(/^\d+(\.\d{1,2})?$/),
        p2pMin: z.string().regex(/^\d+(\.\d{1,2})?$/),
      }))
      .mutation(async ({ input }) => {
        await db.setSystemSetting("stakingInterest180", input.dailyRate180);
        await db.setSystemSetting("stakingInterest360", input.dailyRate360);
        await db.setSystemSetting("staking_min_initial", input.minInitial);
        await db.setSystemSetting("staking_min_restake", input.minRestake);
        await db.setSystemSetting("p2p_min_transfer", input.p2pMin);
        return { success: true };
      }),

    // 수수료 설정 조회
    getFeeSettings: walletAdminProcedure.query(async () => {
      const [withdrawalFee, p2pTransferFee] = await Promise.all([
        db.getSystemSetting("withdrawal_fee_percentage"),
        db.getSystemSetting("p2p_transfer_fee_percentage"),
      ]);
      return {
        withdrawalFee: withdrawalFee?.value || "5",
        p2pTransferFee: p2pTransferFee?.value || "3",
      };
    }),

    // 수수료 설정 저장
    updateFeeSettings: walletAdminProcedure
      .input(z.object({
        withdrawalFee: z.number().min(0).max(100),
        p2pTransferFee: z.number().min(0).max(100),
      }))
      .mutation(async ({ input }) => {
        await db.setSystemSetting("withdrawal_fee_percentage", input.withdrawalFee.toString());
        await db.setSystemSetting("p2p_transfer_fee_percentage", input.p2pTransferFee.toString());
        return { success: true };
      }),

    // P2P 전송 전역 잠금/해제 (p2p_enabled 플래그)
    setP2PEnabled: walletAdminProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.setSystemSetting("p2p_enabled", input.enabled ? "true" : "false");
        console.log(`[Admin] P2P transfer ${input.enabled ? 'UNLOCKED' : 'LOCKED'}`);
        return { success: true, p2pEnabled: input.enabled };
      }),

    // P2P 현재 상태 조회 (어드민용)
    getP2PEnabled: walletAdminProcedure.query(async () => {
      const setting = await db.getSystemSetting("p2p_enabled");
      return { p2pEnabled: setting ? setting.value !== "false" : true };
    }),

    // 관리자 잔액 직접 조정 (walletAddress 또는 userId 기반)
    adjustUserBalance: walletAdminProcedure
      .input(z.object({
        target: z.string().min(1), // walletAddress or userId (number string)
        field: z.enum(['pointBalance', 'referralBonusBalance', 'donationBonusBalance', 'stakedBalance', 'rewardBalance', 'p2pReceivedBalance']),
        mode: z.enum(['set', 'add', 'subtract']),
        amount: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB not available' });

        const { users: usersTable } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        const isId = /^\d+$/.test(input.target);
        const targetUsers = isId
          ? await dbConn.select().from(usersTable).where(eq(usersTable.id, parseInt(input.target)))
          : await dbConn.select().from(usersTable).where(eq(usersTable.walletAddress, input.target.toLowerCase()));

        if (!targetUsers || targetUsers.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: `User not found: ${input.target}` });
        }

        const user = targetUsers[0];
        const currentVal = parseFloat(String((user as any)[input.field] || '0'));
        let newVal: number;
        if (input.mode === 'set') newVal = input.amount;
        else if (input.mode === 'add') newVal = currentVal + input.amount;
        else newVal = Math.max(0, currentVal - input.amount);

        await dbConn.update(usersTable)
          .set({ [input.field]: newVal.toString() } as any)
          .where(eq(usersTable.id, user.id));

        return { success: true, userId: user.id, field: input.field, oldValue: currentVal, newValue: newVal };
      }),

    // 외상(Credit) 계정 설정: 관리자가 유저를 외상 계정으로 지정하고 레벨 강제 조정
    setCreditAccount: walletAdminProcedure
      .input(z.object({
        target: z.string().min(1), // walletAddress or userId
        level: z.number().min(1).max(4), // 강제 지정할 레벨
        creditAmount: z.number().min(0), // 외상 대여금 (YNV)
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB not available' });

        const { users: usersTable } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        const isId = /^\d+$/.test(input.target);
        let targetUsers = isId
          ? await dbConn.select().from(usersTable).where(eq(usersTable.id, parseInt(input.target)))
          : await dbConn.select().from(usersTable).where(eq(usersTable.walletAddress, input.target.toLowerCase()));

        // 유저가 없으면 지갑 주소로 신규 유저 자동 생성 (수동 선등록)
        if (!targetUsers || targetUsers.length === 0) {
          if (isId) {
            throw new TRPCError({ code: 'NOT_FOUND', message: `User ID ${input.target} not found` });
          }
          // 지갑 주소로 신규 유저 생성
          const walletAddr = input.target.toLowerCase();
          if (!walletAddr.startsWith('0x') || walletAddr.length !== 42) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: '유효한 지갑 주소(0x로 시작, 42자)를 입력하세요' });
          }
          await db.upsertUser({
            openId: `web3_${walletAddr}`,
            walletAddress: walletAddr,
            name: `User_${walletAddr.slice(0, 8)}`,
            email: null,
            loginMethod: 'web3',
            role: 'user',
            lastSignedIn: new Date(),
          });
          targetUsers = await dbConn.select().from(usersTable).where(eq(usersTable.walletAddress, walletAddr));
          if (!targetUsers || targetUsers.length === 0) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '유저 생성 실패' });
          }
          console.log(`[setCreditAccount] Auto-created user for wallet ${walletAddr} (id=${targetUsers[0].id})`);
        }

        const user = targetUsers[0];
        const now = new Date();

        // 레벨 강제 설정 + 외상 계정 활성화 + levelUpdatedAt 설정 (원라인 큐 배치)
        await dbConn.update(usersTable)
          .set({
            level: input.level,
            isCreditAccount: true,
            creditOwed: input.creditAmount.toString(),
            levelUpdatedAt: now,
            updatedAt: now,
          } as any)
          .where(eq(usersTable.id, user.id));

        return {
          success: true,
          userId: user.id,
          level: input.level,
          creditOwed: input.creditAmount,
          message: `User ${user.id} (${user.walletAddress || 'new'}) set as credit account: Level ${input.level}, owed ${input.creditAmount} YNV`,
        };
      }),

    // 어드민 잔액 조회
    getAdminBalance: walletAdminProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB not available' });
      const { users: usersTable } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const adminRows = await dbConn.select({ id: usersTable.id, pointBalance: usersTable.pointBalance })
        .from(usersTable)
        .where(eq(usersTable.role, 'admin'))
        .limit(1);
      if (adminRows.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Admin not found' });
      return { balance: adminRows[0].pointBalance, adminId: adminRows[0].id };
    }),

    // 내부 포인트 전송 (어드민 → 유저, DB만 조작)
    internalTransfer: walletAdminProcedure
      .input(z.object({
        recipient: z.string().min(1),
        amount: z.number().min(0.01),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB not available' });
        const { users: usersTable } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        // 어드민 계정 조회
        const adminRows = await dbConn.select().from(usersTable).where(eq(usersTable.role, 'admin')).limit(1);
        if (adminRows.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Admin not found' });
        const admin = adminRows[0];
        const adminBalance = parseFloat(String(admin.pointBalance || '0'));

        if (adminBalance < input.amount) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Admin 잔액 부족 (${adminBalance.toLocaleString()} < ${input.amount.toLocaleString()})` });
        }

        // 수신자 조회
        const isId = /^\d+$/.test(input.recipient);
        const recipientRows = isId
          ? await dbConn.select().from(usersTable).where(eq(usersTable.id, parseInt(input.recipient)))
          : await dbConn.select().from(usersTable).where(eq(usersTable.walletAddress, input.recipient.toLowerCase()));

        if (!recipientRows || recipientRows.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: `Recipient not found: ${input.recipient}` });
        }
        const recipient = recipientRows[0];
        const recipientBalance = parseFloat(String(recipient.pointBalance || '0'));

        // DB 전송: 어드민 차감, 수신자 증가
        await db.updateUserPointBalance(admin.id, adminBalance - input.amount);
        await db.updateUserPointBalance(recipient.id, recipientBalance + input.amount);

        // 수신자에게 admin_deposit 유형 트랜잭션 기록
        await db.createPointTransaction({
          userId: recipient.id,
          type: 'admin_deposit',
          amount: input.amount,
          relatedUserId: admin.id,
          status: 'completed',
          description: `Admin internal transfer from admin ${admin.id}`,
        });

        console.log(`[InternalTransfer] Admin ${admin.id} -> User ${recipient.id}: ${input.amount} YNV`);

        return {
          success: true,
          recipientId: recipient.id,
          amount: input.amount,
          adminNewBalance: (adminBalance - input.amount).toFixed(2),
        };
      }),
  }),

  // P2P Transfer
  p2p: router({
    // 출금 설정 조회 (사용자용 - 출금 제한 확인)
    getWithdrawalLimits: publicProcedure.query(async () => {
      const settings = await db.getWithdrawalSettings();
      if (!settings) {
        return {
          minLimit: "1000",
          maxLimit: "100000",
          isPaused: false,
        };
      }
      return {
        minLimit: settings.minLimit,
        maxLimit: settings.maxLimit,
        isPaused: settings.isPaused,
      };
    }),

    // P2P 설정 조회 (유저용 - p2p_enabled 플래그)
    getP2PSettings: publicProcedure.query(async () => {
      const setting = await db.getSystemSetting("p2p_enabled");
      return { p2pEnabled: setting ? setting.value !== "false" : true };
    }),

    // P2P YNV 전송
    transfer: publicProcedure
      .input(
        z.object({
          recipientWalletOrId: z.string().min(1),
          amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
          currentBalance: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const sender = await getOrCreateUserByWallet(walletAddress);

        // [P2P 전역 잠금 확인]
        const p2pEnabledSetting = await db.getSystemSetting("p2p_enabled");
        if (p2pEnabledSetting && p2pEnabledSetting.value === "false") {
          throw new TRPCError({ code: "FORBIDDEN", message: "P2P 전송이 현재 관리자에 의해 일시 잠금되어 있습니다." });
        }

        const amount = Number(String(input.amount).replace(/,/g, ""));
        if (isNaN(amount) || amount <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "전송 금액은 0보다 커야 합니다." });
        }

        // [검증] P2P 최소 수량 확인
        const p2pMinSetting = await db.getSystemSetting("p2p_min_transfer");
        const p2pMin = parseFloat(p2pMinSetting?.value || "100");
        if (amount < p2pMin) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Minimum requirement not met. Must be at least ${p2pMin.toLocaleString()} YNV to proceed.`,
          });
        }

        // [차단] P2P 수신 잔액으로는 P2P 재전송 불가 — 관리자 p2p_enabled=true 시 차단 해제
        const senderP2PReceived = Number(String(sender.p2pReceivedBalance || "0").replace(/,/g, ""));
        const senderPointBal = Number(String(sender.pointBalance || "0").replace(/,/g, ""));
        const p2pUnlocked = !p2pEnabledSetting || p2pEnabledSetting.value !== "false";
        // 관리자가 P2P 해제 상태일 때는 재전송 허용
        if (!p2pUnlocked && senderP2PReceived >= senderPointBal && senderP2PReceived > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid wallet route execution blocked. P2P-received assets cannot be re-transferred.",
          });
        }

        // 수신자 조회
        let recipient;
        if (input.recipientWalletOrId.startsWith("0x")) {
          recipient = await db.getUserByWalletAddress(input.recipientWalletOrId.toLowerCase());
        } else {
          const recipientId = parseInt(input.recipientWalletOrId);
          if (!isNaN(recipientId)) {
            recipient = await db.getUserById(recipientId);
          }
        }

        if (!recipient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "수신자를 찾을 수 없습니다.",
          });
        }

        if (recipient.id === sender.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "자기 자신에게는 전송할 수 없습니다.",
          });
        }

        // [P2P 수수료 계산]
        const p2pFeePercentSetting = await db.getSystemSetting("p2p_transfer_fee_percentage");
        const p2pFeePercent = parseFloat(p2pFeePercentSetting?.value || "3") / 100;
        const feeAmount = amount * p2pFeePercent;
        const netAmount = amount - feeAmount;

        // 잠액 차감 및 증가
        // 프론트엔드에서 온체의 잠액을 전달한 경우 해당 값 사용, 없으면 DB 값 사용
        const senderCurrentBalance = input.currentBalance
          ? Number(String(input.currentBalance).replace(/,/g, ""))
          : Number(String(sender.pointBalance).replace(/,/g, ""));
        const recipientCurrentBalance = Number(String(recipient.pointBalance).replace(/,/g, ""));
        
        // [Sender-Pays 수수료 검증] 발신자로부터 전체 금액 (본금 + 수수료) 차감 가능 여부 확인
        const totalDeduction = amount + feeAmount;
        if (senderCurrentBalance < totalDeduction) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient balance to cover the transfer amount and the ${(p2pFeePercent * 100).toFixed(1)}% P2P fee. Required: ${totalDeduction.toLocaleString()} YNV, Available: ${senderCurrentBalance.toLocaleString()} YNV.`,
          });
        }
        
        // 발신자로부터 전체 금액 차감 (본금 + 수수료)
        await db.updateUserPointBalance(sender.id, senderCurrentBalance - totalDeduction);
        // 수신자는 정확히 요청한 금액만 수령 (수수료 차감 없음)
        await db.updateUserPointBalance(recipient.id, recipientCurrentBalance + amount);
        
        // 수수료는 admin 계정으로 라우팅 (ID: 1)
        const adminUser = await db.getUserById(1);
        if (adminUser) {
          const adminBalance = Number(String(adminUser.pointBalance || "0").replace(/,/g, ""));
          await db.updateUserPointBalance(1, adminBalance + feeAmount);
        }

        // P2P 수신자 p2pReceivedBalance 증가 (재전송/스테이킹 차단 추적)
        const recipientP2PReceived = Number(String(recipient.p2pReceivedBalance || "0").replace(/,/g, ""));
        await db.updateUserP2PReceivedBalance(recipient.id, recipientP2PReceived + amount);

        // P2P 전송 기록 저장
        await db.createP2PTransfer({
          fromUserId: sender.id,
          toUserId: recipient.id,
          amount: amount.toString(),
          status: "completed",
        });

        return {
          success: true,
          recipientName: recipient.name || `User_${recipient.id}`,
          amount: amount.toString(),
          feeAmount: feeAmount.toString(),
          totalDeduction: totalDeduction.toString(),
        };
      }),

    // 내 P2P 전송 이력
    getMyTransfers: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const user = await getOrCreateUserByWallet(walletAddress);
        return await db.getUserP2PTransfers(user.id, input.limit);
      }),
  }),

  // 스테이킹 엔진
  staking: router({
    // 스테이킹 정보 조회
    getInfo: publicProcedure.query(async ({ ctx }) => {
      const walletAddress = getWalletAddressFromContext(ctx);
      const user = await getOrCreateUserByWallet(walletAddress);
      const rate180Setting = await db.getSystemSetting("stakingInterest180");
      const rate360Setting = await db.getSystemSetting("stakingInterest360");
      const minInitialSetting = await db.getSystemSetting("staking_min_initial");
      const minRestakeSetting = await db.getSystemSetting("staking_min_restake");
      return {
        stakedBalance: user.stakedBalance ?? "0",
        rewardBalance: user.rewardBalance ?? "0",
        p2pReceivedBalance: user.p2pReceivedBalance ?? "0",
        stakedAt: user.stakedAt,
        dailyInterestRate180: parseFloat(rate180Setting?.value || "1.0"),
        dailyInterestRate360: parseFloat(rate360Setting?.value || "1.5"),
        minInitial: parseFloat(minInitialSetting?.value || "10000"),
        minRestake: parseFloat(minRestakeSetting?.value || "1000"),
      };
    }),

    // 스테이킹 실행 (pointBalance → stakedBalance with duration tier)
    stake: publicProcedure
      .input(z.object({ amount: z.string().regex(/^\d+(\.\d{1,2})?$/), durationDays: z.enum(["180", "360"]) }))
      .mutation(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const user = await getOrCreateUserByWallet(walletAddress);
        const amount = parseFloat(input.amount);

        // [검증] 초기 스테이킹 최소 수량
        const minSetting = await db.getSystemSetting("staking_min_initial");
        const minInitial = parseFloat(minSetting?.value || "10000");
        if (amount < minInitial) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Minimum requirement not met. Must be at least ${minInitial.toLocaleString()} YNV to proceed.`,
          });
        }

        // [차단] P2P 수신 자산은 스테이킹 불가
        const p2pReceived = parseFloat(String(user.p2pReceivedBalance || "0"));
        if (p2pReceived > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid wallet route execution blocked. P2P-received assets cannot enter staking.",
          });
        }

        const currentBalance = parseFloat(String(user.pointBalance));
        if (currentBalance < amount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `YNV 잔액 부족. (보유: ${currentBalance.toLocaleString()})` });
        }

        // Get the appropriate interest rate based on duration
        const durationDays = parseInt(input.durationDays);
        const rateKey = durationDays === 180 ? "stakingInterest180" : "stakingInterest360";
        const rateSetting = await db.getSystemSetting(rateKey);
        const dailyRate = parseFloat(rateSetting?.value || (durationDays === 180 ? "1.0" : "1.5"));

        const currentStaked = parseFloat(String(user.stakedBalance || "0"));
        await db.updateUserPointBalance(user.id, currentBalance - amount);
        await db.updateUserStakedBalance(user.id, currentStaked + amount, user.stakedAt || new Date());

        // Create staking tier record
        await db.createStakingTier({
          userId: user.id,
          stakedAmount: amount.toString(),
          durationDays,
          dailyInterestRate: dailyRate.toString(),
        });

        return { success: true, stakedAmount: amount, totalStaked: currentStaked + amount, durationDays, dailyRate };
      }),

    // 리스테이킹 (rewardBalance → stakedBalance with duration tier)
    restake: publicProcedure
      .input(z.object({ amount: z.string().regex(/^\d+(\.\d{1,2})?$/), durationDays: z.enum(["180", "360"]) }))
      .mutation(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const user = await getOrCreateUserByWallet(walletAddress);
        const amount = parseFloat(input.amount);

        // [검증] 리스테이킹 최소 수량
        const minSetting = await db.getSystemSetting("staking_min_restake");
        const minRestake = parseFloat(minSetting?.value || "1000");
        if (amount < minRestake) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Minimum requirement not met. Must be at least ${minRestake.toLocaleString()} YNV to proceed.`,
          });
        }

        const rewardBal = parseFloat(String(user.rewardBalance || "0"));
        if (rewardBal < amount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `리워드 잔액 부족. (보유: ${rewardBal.toLocaleString()})` });
        }

        // Get the appropriate interest rate based on duration
        const durationDays = parseInt(input.durationDays);
        const rateKey = durationDays === 180 ? "stakingInterest180" : "stakingInterest360";
        const rateSetting = await db.getSystemSetting(rateKey);
        const dailyRate = parseFloat(rateSetting?.value || (durationDays === 180 ? "1.0" : "1.5"));

        const currentStaked = parseFloat(String(user.stakedBalance || "0"));
        await db.updateUserRewardBalance(user.id, rewardBal - amount);
        await db.updateUserStakedBalance(user.id, currentStaked + amount);

        // Create staking tier record
        await db.createStakingTier({
          userId: user.id,
          stakedAmount: amount.toString(),
          durationDays,
          dailyInterestRate: dailyRate.toString(),
        });

        return { success: true, restakedAmount: amount, totalStaked: currentStaked + amount, durationDays, dailyRate };
      }),

    // 리워드를 레벨 진입에 사용 (rewardBalance → pointBalance, 레벨 진입용)
    rewardToLevel: publicProcedure
      .input(z.object({ amount: z.string().regex(/^\d+(\.\d{1,2})?$/) }))
      .mutation(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const user = await getOrCreateUserByWallet(walletAddress);
        const amount = parseFloat(input.amount);

        const rewardBal = parseFloat(String(user.rewardBalance || "0"));
        if (rewardBal < amount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `리워드 잔액 부족. (보유: ${rewardBal.toLocaleString()})` });
        }

        // Forward Pipeline: rewardBalance → pointBalance (레벨 진입용)
        const currentBalance = parseFloat(String(user.pointBalance));
        await db.updateUserRewardBalance(user.id, rewardBal - amount);
        await db.updateUserPointBalance(user.id, currentBalance + amount);

        return { success: true, movedAmount: amount };
      }),

    // 언스테이킹 (stakedBalance → pointBalance)
    unstake: publicProcedure
      .input(z.object({ amount: z.string().regex(/^\d+(\.\d{1,2})?$/) }))
      .mutation(async ({ ctx, input }) => {
        const walletAddress = getWalletAddressFromContext(ctx);
        const user = await getOrCreateUserByWallet(walletAddress);
        const amount = parseFloat(input.amount);

        const stakedBal = parseFloat(String(user.stakedBalance || "0"));
        if (stakedBal < amount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `스테이킹 잔액 부족. (보유: ${stakedBal.toLocaleString()})` });
        }

        const currentBalance = parseFloat(String(user.pointBalance));
        await db.updateUserStakedBalance(user.id, stakedBal - amount);
        await db.updateUserPointBalance(user.id, currentBalance + amount);

        return { success: true, unstakedAmount: amount };
      }),

    // Admin 2FA: Get OTP secret status
    getOTPSecretStatus: walletAdminProcedure
      .input(z.object({ walletAddress: z.string() }))
      .query(async ({ input }) => {
        const secret = await db.getAdminSecret(input.walletAddress.toLowerCase());
        return {
          exists: !!secret,
          isEnabled: secret?.isEnabled ?? false,
          createdAt: secret?.createdAt,
        };
      }),

    // Admin 2FA: Generate new OTP secret
    generateOTPSecret: walletAdminProcedure
      .input(z.object({ walletAddress: z.string() }))
      .mutation(async ({ input }) => {
        const qrcode = require('qrcode');
        
        const walletAddr = input.walletAddress.toLowerCase();
        const secret = generateSecret({
          name: `YieldNova Admin (${walletAddr})`,
          issuer: 'YieldNova DeFi',
          length: 32,
        });

        // Generate QR code
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        // Store in database (not yet verified)
        await db.upsertAdminSecret({
          adminWalletAddress: walletAddr,
          otpSecret: secret.base32,
          isEnabled: false,
          backupCodes: JSON.stringify([]),
        });

        return {
          secret: secret.base32,
          qrCodeUrl,
          walletAddress: walletAddr,
        };
      }),

    // Admin 2FA: Verify OTP and enable 2FA
    verifyAndEnableOTP: walletAdminProcedure
      .input(z.object({
        walletAddress: z.string(),
        otpCode: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const speakeasy = require('speakeasy');
        const walletAddr = input.walletAddress.toLowerCase();
        
        const secret = await db.getAdminSecret(walletAddr);
        if (!secret) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'OTP secret not found. Generate one first.',
          });
        }

        // Verify OTP code
        const isValid = totpVerify({
          secret: secret.otpSecret,
          encoding: totpOptions.encoding,
          token: input.otpCode,
          window: totpOptions.window,
        });

        if (!isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid OTP code',
          });
        }

        // Enable 2FA
        await db.setAdminOTPEnabled(walletAddr, true);

        return { success: true, message: '2FA enabled successfully' };
      }),

    // Admin 2FA: Verify OTP code (for login)
    verifyOTP: publicProcedure
      .input(z.object({
        walletAddress: z.string(),
        otpCode: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const speakeasy = require('speakeasy');
        const walletAddr = input.walletAddress.toLowerCase();
        
        const secret = await db.getAdminSecret(walletAddr);
        if (!secret || !secret.isEnabled) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '2FA not enabled for this wallet',
          });
        }

        // Verify OTP code
        const isValid = totpVerify({
          secret: secret.otpSecret,
          encoding: totpOptions.encoding,
          token: input.otpCode,
          window: totpOptions.window,
        });

        if (!isValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid OTP code',
          });
        }

        return { success: true, message: 'OTP verified' };
      }),
  }),
});

export type AppRouter = typeof appRouter;
