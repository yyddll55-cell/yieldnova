import { eq, and, or, desc, asc, lte, gte, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  binaryTree,
  pointTransactions,
  pointPrices,
  withdrawalRequests,
  systemSettings,
  bonusRecords,
  levelRequirements,
  withdrawalSettings,
  p2pTransfers,
  virtualNodeSettings,
  stakingTiers,
  InsertStakingTier,
  adminSecrets,
  InsertAdminSecret,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // 1지갑 = 1노드: 지갑 주소가 이미 존재하면 기존 사용자를 업데이트만 함
    if (user.walletAddress) {
      const existingUser = await getUserByWalletAddress(user.walletAddress);
      if (existingUser) {
        const updateSet: Record<string, unknown> = {};
        if (user.name !== undefined) updateSet.name = user.name;
        if (user.email !== undefined) updateSet.email = user.email;
        if (user.lastSignedIn !== undefined) updateSet.lastSignedIn = user.lastSignedIn;
        if (user.role !== undefined) updateSet.role = user.role;
        updateSet.updatedAt = new Date();
        await db.update(users).set(updateSet).where(eq(users.id, existingUser.id));
        return;
      }
    }

    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "walletAddress"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByWalletAddress(walletAddress: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.walletAddress, walletAddress.toLowerCase()))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserLevel(userId: number, level: number) {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  const result = await db
    .update(users)
    .set({ level, levelUpdatedAt: now, updatedAt: now })
    .where(eq(users.id, userId));
  return result;
}

export async function updateUserGhostStatus(userId: number, isGhost: boolean) {
  const db = await getDb();
  if (!db) return undefined;

  return await db
    .update(users)
    .set({ isGhost, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserReferrer(userId: number, referrerId: number) {
  const db = await getDb();
  if (!db) return undefined;

  return await db
    .update(users)
    .set({ referrerId, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserCycleLevel(userId: number, currentCycleLevel: number) {
  const db = await getDb();
  if (!db) return undefined;

  return await db
    .update(users)
    .set({ currentCycleLevel, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserPointBalance(userId: number, newBalance: string | number) {
  const db = await getDb();
  if (!db) return undefined;

  return await db
    .update(users)
    .set({ pointBalance: newBalance.toString(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserReferralBonusBalance(userId: number, newBalance: string | number) {
  const db = await getDb();
  if (!db) return undefined;

  return await db
    .update(users)
    .set({ referralBonusBalance: newBalance.toString(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserDonationBonusBalance(userId: number, newBalance: string | number) {
  const db = await getDb();
  if (!db) return undefined;

  return await db
    .update(users)
    .set({ donationBonusBalance: newBalance.toString(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function getPointPriceForDate(date: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(pointPrices).where(eq(pointPrices.date, date)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getLatestPointPrice() {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(pointPrices)
    .orderBy(desc(pointPrices.date))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setPointPrice(date: string, priceUSD: string | number) {
  const db = await getDb();
  if (!db) return undefined;

  const existing = await getPointPriceForDate(date);
  if (existing) {
    return await db
      .update(pointPrices)
      .set({ priceUSD: priceUSD.toString(), updatedAt: new Date() })
      .where(eq(pointPrices.date, date));
  } else {
    return await db.insert(pointPrices).values({
      date,
      priceUSD: priceUSD.toString(),
    });
  }
}

export async function getPointPriceHistory(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split("T")[0];

  return await db
    .select()
    .from(pointPrices)
    .where(gte(pointPrices.date, startDateStr))
    .orderBy(pointPrices.date);
}

export async function createPointTransaction(data: {
  userId: number;
  type: string;
  amount: string | number;
  relatedUserId?: number;
  transactionHash?: string;
  status?: string;
  description?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;

  return await db.insert(pointTransactions).values({
    userId: data.userId,
    type: data.type as any,
    amount: data.amount.toString(),
    relatedUserId: data.relatedUserId,
    transactionHash: data.transactionHash,
    status: (data.status || "pending") as any,
    description: data.description,
  });
}

export async function getPointTransactionHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(pointTransactions)
    .where(eq(pointTransactions.userId, userId))
    .orderBy(desc(pointTransactions.createdAt))
    .limit(limit);
}

export async function createWithdrawalRequest(data: {
  userId: number;
  pointAmount: string | number;
  usdtAmount: string | number;
  fee: string | number;
  walletAddress: string;
}) {
  const db = await getDb();
  if (!db) return undefined;

  return await db.insert(withdrawalRequests).values({
    userId: data.userId,
    pointAmount: data.pointAmount.toString(),
    usdtAmount: data.usdtAmount.toString(),
    fee: data.fee.toString(),
    walletAddress: data.walletAddress,
    status: "pending",
  });
}

export async function getWithdrawalRequest(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(withdrawalRequests)
    .where(eq(withdrawalRequests.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPendingWithdrawalRequests(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(withdrawalRequests)
    .where(eq(withdrawalRequests.status, "pending"))
    .orderBy(withdrawalRequests.createdAt)
    .limit(limit);
}

export async function approveWithdrawalRequest(id: number, adminId: number, txHash?: string) {
  const db = await getDb();
  if (!db) return undefined;

  return await db
    .update(withdrawalRequests)
    .set({
      status: "approved",
      approvedBy: adminId,
      transactionHash: txHash,
      updatedAt: new Date(),
    })
    .where(eq(withdrawalRequests.id, id));
}

export async function rejectWithdrawalRequest(id: number, reason: string) {
  const db = await getDb();
  if (!db) return undefined;

  return await db
    .update(withdrawalRequests)
    .set({
      status: "rejected",
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(withdrawalRequests.id, id));
}

export async function getSystemSetting(key: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setSystemSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) return undefined;

  const existing = await getSystemSetting(key);
  if (existing) {
    return await db
      .update(systemSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(systemSettings.key, key));
  } else {
    return await db.insert(systemSettings).values({ key, value });
  }
}

export async function getBinaryTreeNode(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(binaryTree)
    .where(eq(binaryTree.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createBinaryTreeNode(data: {
  userId: number;
  parentId?: number;
  leftChildId?: number;
  rightChildId?: number;
}) {
  const db = await getDb();
  if (!db) return undefined;

  return await db.insert(binaryTree).values({
    userId: data.userId,
    parentId: data.parentId,
    leftChildId: data.leftChildId,
    rightChildId: data.rightChildId,
  });
}

export async function updateBinaryTreeNode(
  userId: number,
  data: {
    leftChildId?: number;
    rightChildId?: number;
  }
) {
  const db = await getDb();
  if (!db) return undefined;

  return await db
    .update(binaryTree)
    .set({
      leftChildId: data.leftChildId,
      rightChildId: data.rightChildId,
      updatedAt: new Date(),
    })
    .where(eq(binaryTree.userId, userId));
}

export async function getBinaryTreePath(userId: number, depth: number = 2) {
  const db = await getDb();
  if (!db) return undefined;

  // Get the user's binary tree node
  const node = await getBinaryTreeNode(userId);
  if (!node) return undefined;

  // Recursively fetch children
  const fetchChildren = async (parentId: number, currentDepth: number): Promise<any> => {
    if (currentDepth === 0) return null;

    const parent = await getBinaryTreeNode(parentId);
    if (!parent) return null;

    const parentUser = await getUserById(parentId);

    return {
      id: parentId,
      user: parentUser,
      left: parent.leftChildId ? await fetchChildren(parent.leftChildId, currentDepth - 1) : null,
      right: parent.rightChildId ? await fetchChildren(parent.rightChildId, currentDepth - 1) : null,
    };
  };

  return await fetchChildren(userId, depth);
}

export async function createBonusRecord(data: {
  userId: number;
  sourceUserId: number;
  bonusType: "direct_referral" | "upline_matching";
  level: number;
  bonusPercent: string | number;
  bonusAmount: string | number;
  sourceAmount: string | number;
  transactionId?: number;
}) {
  const db = await getDb();
  if (!db) return undefined;

  return await db.insert(bonusRecords).values({
    userId: data.userId,
    sourceUserId: data.sourceUserId,
    bonusType: data.bonusType,
    level: data.level,
    bonusPercent: data.bonusPercent.toString(),
    bonusAmount: data.bonusAmount.toString(),
    sourceAmount: data.sourceAmount.toString(),
    transactionId: data.transactionId,
  });
}

export async function getBonusRecordsForUser(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(bonusRecords)
    .where(eq(bonusRecords.userId, userId))
    .orderBy(desc(bonusRecords.createdAt))
    .limit(limit);
}

export async function getLevelRequirement(level: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(levelRequirements)
    .where(eq(levelRequirements.level, level))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllLevelRequirements() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(levelRequirements).orderBy(levelRequirements.level);
}

export async function getWithdrawalRequestsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(withdrawalRequests)
    .where(eq(withdrawalRequests.userId, userId))
    .orderBy(desc(withdrawalRequests.createdAt));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users);
}

export async function updateUserWalletAddress(userId: number, walletAddress: string) {
  const db = await getDb();
  if (!db) return undefined;

  return await db
    .update(users)
    .set({ walletAddress: walletAddress.toLowerCase(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/**
 * 상위 조직원 수 카운트 (referrerId 체인 위로 타고 올라가며 카운트)
 */
export async function countUplineMembers(userId: number): Promise<number> {
  let count = 0;
  let currentId = userId;
  const visited = new Set<number>();
  while (true) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const user = await getUserById(currentId);
    if (!user || !user.referrerId) break;
    count++;
    currentId = user.referrerId;
  }
  return count;
}

/**
 * 하위 조직원 수 카운트 (referrerId가 이 유저를 가리키는 모든 유저 재귀 카운트)
 */
export async function countDownlineMembers(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  let count = 0;
  const queue: number[] = [userId];
  const visited = new Set<number>();
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    // isGhost=false인 하위 맴버만 카운트
    const children = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.referrerId, currentId), eq(users.isGhost, false)));
    for (const child of children) {
      count++;
      queue.push(child.id);
    }
  }
  return count;
}

/**
 * 가상 노드 설정 조회
 */
export async function getVirtualNodeSettings() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(virtualNodeSettings).orderBy(virtualNodeSettings.level);
}

export async function getVirtualNodeInterval(level: number): Promise<number> {
  const db = await getDb();
  if (!db) return 10;
  const result = await db.select().from(virtualNodeSettings).where(eq(virtualNodeSettings.level, level)).limit(1);
  return result.length > 0 ? result[0].interval : 10;
}

export async function updateVirtualNodeInterval(level: number, interval: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(virtualNodeSettings).where(eq(virtualNodeSettings.level, level)).limit(1);
  if (existing.length > 0) {
    await db.update(virtualNodeSettings).set({ interval, updatedAt: new Date() }).where(eq(virtualNodeSettings.level, level));
  } else {
    await db.insert(virtualNodeSettings).values({ level, interval });
  }
}

/**
 * 특정 레벨의 바이너리 트리 노드 수 조회 (level >= purchasedLevel)
 */
export async function countBinaryTreeNodesAtLevel(level: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(eq(users.level, level));
  return result[0]?.count || 0;
}

/**
 * 가상 노드(ID:1)를 BFS로 빈자리에 삽입
 */
async function insertVirtualNode(referrerId: number, db: any) {
  const ADMIN_ID = 1;
  const queue: number[] = [referrerId];
  let placedParentId: number | null = null;
  let placedSide: "left" | "right" | null = null;

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentNode = await getBinaryTreeNode(currentId);
    if (!currentNode) continue;
    if (!currentNode.leftChildId) { placedParentId = currentId; placedSide = "left"; break; }
    if (!currentNode.rightChildId) { placedParentId = currentId; placedSide = "right"; break; }
    queue.push(currentNode.leftChildId);
    queue.push(currentNode.rightChildId);
  }

  if (!placedParentId || !placedSide) return;

  // 가상 노드 binaryTree 삽입 (중복 삽입 방지: 이미 있으면 새 노드 생성 안 함)
  const existingAdmin = await getBinaryTreeNode(ADMIN_ID);
  if (!existingAdmin) {
    await db.insert(binaryTree).values({ userId: ADMIN_ID, parentId: placedParentId });
  }

  if (placedSide === "left") {
    await db.update(binaryTree).set({ leftChildId: ADMIN_ID, updatedAt: new Date() }).where(eq(binaryTree.userId, placedParentId));
  } else {
    await db.update(binaryTree).set({ rightChildId: ADMIN_ID, updatedAt: new Date() }).where(eq(binaryTree.userId, placedParentId));
  }
}

/**
 * 바이너리 트리 자동 배치 (BFS - Left 우선 빈자리 채우기)
 * 추천인의 하위 트리를 너비 우선 탐색하여 가장 먼저 나오는 빈자리에 신규 유저 삽입
 */
export async function placeBinaryTreeNode(newUserId: number, referrerId: number) {
  const db = await getDb();
  if (!db) return;

  try {
    // 신규 유저의 binaryTree 노드가 이미 있으면 스킵 (1지갑 = 1노드)
    const existing = await getBinaryTreeNode(newUserId);
    if (existing) {
      console.log(`[Binary Tree] User ${newUserId} already has a node. Skipping placement.`);
      return;
    }

    // 신규 유저의 레벨 확인 (placeBinaryTreeNode 호출 전 updateUserLevel이 실행되므로 level이 이미 설정됨)
    const newUser = await getUserById(newUserId);
    
    // 신규 유저가 이미 추천인 관계를 가지고 있으면 스킵 (이미 배치됨)
    if (newUser?.referrerId && newUser.referrerId !== 0) {
      console.log(`[Binary Tree] User ${newUserId} already has referrer. Skipping placement.`);
      return;
    }
    const purchasedLevel = newUser?.level || 1;

    // 해당 레벨의 가상 노드 삽입 간격 조회
    const interval = await getVirtualNodeInterval(purchasedLevel);

    // 해당 레벨의 현재 실사 유저 수 조회
    const realUserCount = await countBinaryTreeNodesAtLevel(purchasedLevel);

    // 가상 노드 삽입 조건: 실사 유저 수가 interval의 배수일 때 (0이 아닐 때)
    // 예: interval=10 이면 10명마다 가상 노드 삽입
    if (realUserCount > 0 && realUserCount % interval === 0) {
      // 운영자(ID:1)의 가상 노드를 먼저 삽입
      const adminNode = await getBinaryTreeNode(1);
      if (!adminNode) {
        await db.insert(binaryTree).values({ userId: 1 });
      }
      // 가상 노드를 BFS로 배치 (referrerId 기준)
      await insertVirtualNode(referrerId, db);
    }

    // 추천인 노드 확인 (없으면 루트로 생성)
    let referrerNode = await getBinaryTreeNode(referrerId);
    if (!referrerNode) {
      await db.insert(binaryTree).values({ userId: referrerId });
      referrerNode = await getBinaryTreeNode(referrerId);
      if (!referrerNode) return;
    }

    // BFS로 빈자리 탐색 (Left 우선)
    const queue: number[] = [referrerId];
    let placedParentId: number | null = null;
    let placedSide: "left" | "right" | null = null;

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentNode = await getBinaryTreeNode(currentId);
      if (!currentNode) continue;

      // Left 빈자리 확인
      if (!currentNode.leftChildId) {
        placedParentId = currentId;
        placedSide = "left";
        break;
      }
      // Right 빈자리 확인
      if (!currentNode.rightChildId) {
        placedParentId = currentId;
        placedSide = "right";
        break;
      }
      // 둘 다 차 있으면 자식들을 큐에 추가
      queue.push(currentNode.leftChildId);
      queue.push(currentNode.rightChildId);
    }

    if (!placedParentId || !placedSide) return;

    // 신규 유저 노드 생성
    await db.insert(binaryTree).values({
      userId: newUserId,
      parentId: placedParentId,
    });

    // 부모 노드 업데이트
    if (placedSide === "left") {
      await db.update(binaryTree)
        .set({ leftChildId: newUserId, updatedAt: new Date() })
        .where(eq(binaryTree.userId, placedParentId));
    } else {
      await db.update(binaryTree)
        .set({ rightChildId: newUserId, updatedAt: new Date() })
        .where(eq(binaryTree.userId, placedParentId));
    }

    // users 테이블 binaryPosition 업데이트
    await db.update(users)
      .set({ binaryPosition: placedSide, updatedAt: new Date() })
      .where(eq(users.id, newUserId));

  } catch (error) {
    console.error("[BinaryTree] Auto placement error:", error);
  }
}

/**
 * 출금 설정 조회
 */
export async function getWithdrawalSettings() {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(withdrawalSettings).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 출금 설정 업데이트
 */
export async function updateWithdrawalSettings(data: {
  minLimit?: string | number;
  maxLimit?: string | number;
  isPaused?: boolean;
  updatedBy?: number;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const existing = await getWithdrawalSettings();
  if (existing) {
    return await db
      .update(withdrawalSettings)
      .set({
        minLimit: data.minLimit !== undefined ? data.minLimit.toString() : undefined,
        maxLimit: data.maxLimit !== undefined ? data.maxLimit.toString() : undefined,
        isPaused: data.isPaused,
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(withdrawalSettings.id, existing.id));
  } else {
    return await db.insert(withdrawalSettings).values({
      minLimit: data.minLimit ? data.minLimit.toString() : "1000",
      maxLimit: data.maxLimit ? data.maxLimit.toString() : "100000",
      isPaused: data.isPaused || false,
      updatedBy: data.updatedBy,
    });
  }
}

/**
 * P2P 전송 기록 생성
 */
export async function createP2PTransfer(data: {
  fromUserId: number;
  toUserId: number;
  amount: string | number;
  status?: "pending" | "completed" | "failed";
  transactionHash?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;

  return await db.insert(p2pTransfers).values({
    fromUserId: data.fromUserId,
    toUserId: data.toUserId,
    amount: data.amount.toString(),
    status: data.status || "completed",
    transactionHash: data.transactionHash,
  });
}

/**
 * P2P 전송 이력 조회
 */
export async function getP2PTransferHistory(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(p2pTransfers)
    .orderBy(desc(p2pTransfers.createdAt))
    .limit(limit);
}

/**
 * 사용자별 P2P 전송 이력 조회
 */
export async function getUserP2PTransfers(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(p2pTransfers)
    .where(eq(p2pTransfers.fromUserId, userId))
    .orderBy(desc(p2pTransfers.createdAt))
    .limit(limit);
}

/**
 * 외상 계정 보너스 인터셉션: 보너스를 유저에게 지급하지 않고 creditOwed에서 차감
 * creditOwed가 0이 되면 isCreditAccount = false로 자동 전환
 */
async function handleCreditInterception(userId: number, bonusAmount: number, dbInstance: any) {
  const user = await getUserById(userId);
  if (!user) return;

  const currentCredit = parseFloat(String(user.creditOwed || "0"));
  const newCredit = Math.max(0, currentCredit - bonusAmount);

  // creditOwed 차감
  const updateData: any = {
    creditOwed: newCredit.toString(),
    updatedAt: new Date(),
  };

  // creditOwed가 0이 되면 외상 계정 해제
  if (newCredit <= 0) {
    updateData.isCreditAccount = false;
  }

  await dbInstance.update(users)
    .set(updateData)
    .where(eq(users.id, userId));

  // 어드민 계정에 보너스 귀속
  const adminUser = await dbInstance.select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'admin'))
    .limit(1);
  const adminId = adminUser[0]?.id ?? 1;
  const adminData = await getUserById(adminId);
  if (adminData) {
    const adminBalance = parseFloat(String(adminData.pointBalance || "0")) + bonusAmount;
    await updateUserPointBalance(adminId, adminBalance);
  }

  console.log(`[Credit] User ${userId}: creditOwed ${currentCredit} -> ${newCredit} (deducted ${bonusAmount}). isCreditAccount=${newCredit > 0}`);
}

export async function distributeRewardBonuses(sourceUserId: number, depositAmount: number) {
  const db = await getDb();
  if (!db) return;

  try {
    // 신규 회원 정보 조회
    const sourceUser = await getUserById(sourceUserId);
    if (!sourceUser) return;

    const purchasedLevel = sourceUser.level || 0;

    // ─────────────────────────────────────────────────────────────
    // [1] 직추천 보너스 10% — Override Rule 적용
    //   - 추천인(referrerId)이 있고, 추천인 레벨 >= 구매 레벨 → 추천인에게 지급
    //   - 추천인 레벨 < 구매 레벨 (Override) → 마스터 어드민(role='admin')에게 지급
    //   - 추천인이 없는 경우 → 마스터 어드민에게 지급
    // ─────────────────────────────────────────────────────────────
    let directBonusRecipientId: number;
    let overridden = false;

    if (sourceUser.referrerId) {
      const referrer = await getUserById(sourceUser.referrerId);
      if (referrer && (referrer.level ?? 0) >= purchasedLevel) {
        directBonusRecipientId = sourceUser.referrerId;
      } else {
        // Override: 추천인 레벨 부족 → 어드민으로 귀속
        overridden = true;
        const adminUser = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.role, 'admin'))
          .limit(1);
        directBonusRecipientId = adminUser[0]?.id ?? 1;
      }
    } else {
      // 추천인 없음 → 어드민으로 귀속
      overridden = true;
      const adminUser = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'admin'))
        .limit(1);
      directBonusRecipientId = adminUser[0]?.id ?? 1;
    }

    console.log(`[Bonus][10%] directBonusRecipientId=${directBonusRecipientId} override=${overridden} purchasedLevel=${purchasedLevel}`);
    const directBonusRecipient = await getUserById(directBonusRecipientId);
    if (directBonusRecipient) {
      const directBonusAmount = depositAmount * 0.1;
      console.log(`[Bonus][10%] recipient found: id=${directBonusRecipient.id} role=${directBonusRecipient.role} currentPoint=${directBonusRecipient.pointBalance} currentReferral=${directBonusRecipient.referralBonusBalance}`);

      await createPointTransaction({
        userId: directBonusRecipientId,
        type: "bonus_direct_referral",
        amount: directBonusAmount,
        relatedUserId: sourceUserId,
        status: "completed",
        description: overridden
          ? `Direct referral bonus (override: sponsor level < ${purchasedLevel}) from user ${sourceUserId} → admin`
          : `Direct referral bonus from user ${sourceUserId}`,
      });

      await createBonusRecord({
        userId: directBonusRecipientId,
        sourceUserId: sourceUserId,
        bonusType: "direct_referral",
        level: 1,
        bonusPercent: 10,
        bonusAmount: directBonusAmount,
        sourceAmount: depositAmount,
        transactionId: undefined,
      });

      // 신선한 읽기로 race condition 방지
      const freshRecipient = await getUserById(directBonusRecipientId);

      // 외상 계정 인터셉션: creditOwed > 0이면 보너스를 유저에게 지급하지 않고 creditOwed에서 차감 후 어드민에게 귀속
      if (freshRecipient?.isCreditAccount && parseFloat(String(freshRecipient.creditOwed || "0")) > 0) {
        await handleCreditInterception(directBonusRecipientId, directBonusAmount, db);
        console.log(`[Bonus][10%] CREDIT INTERCEPT: User ${directBonusRecipientId} bonus ${directBonusAmount} applied to creditOwed`);
      } else {
        const newPointBalance = parseFloat(String(freshRecipient?.pointBalance || "0")) + directBonusAmount;
        await updateUserPointBalance(directBonusRecipientId, newPointBalance);

        const newReferralBonusBalance = parseFloat(String(freshRecipient?.referralBonusBalance || "0")) + directBonusAmount;
        await updateUserReferralBonusBalance(directBonusRecipientId, newReferralBonusBalance);

        console.log(`[Bonus][10%] DONE: User ${directBonusRecipientId} pointBalance ${freshRecipient?.pointBalance} -> ${newPointBalance}, referralBonus ${freshRecipient?.referralBonusBalance} -> ${newReferralBonusBalance}`);
      }
    } else {
      console.error(`[Bonus][10%] ERROR: directBonusRecipient not found for id=${directBonusRecipientId}`);
    }

    // ─────────────────────────────────────────────────────────────
    // [2] 8% 기부 보너스 — 원라인 레그 큐 기반 (레벨 격리)
    //   탐색 방향: 신규 유저 바로 위(BEFORE)에 있는 상위 유저들에게 지급 (levelUpdatedAt ASC 기준 역방향)
    //   유령 계정: 8%를 어드민 귀속하고 continue (실계정 카운트 미포함)
    //   실계정: 8% 정상 지급하고 실계정 카운트 +1
    //   종료 조건: 실계정 카운트 == 10일 때 break
    // ─────────────────────────────────────────────────────────────
    const levelMembers = await getOneLineLegMembersWithGhost(purchasedLevel);
    // 신규 유저의 위치 찾기 (levelUpdatedAt ASC 정렬 기준)
    const sourceUserIndex = levelMembers.findIndex((m: any) => m.id === sourceUserId);

    if (sourceUserIndex > 0) {
      let realCount = 0; // 실계정 카운트
      // 신규 유저 바로 위에서 역방향으로 탐색 (상위 10명)
      for (let i = sourceUserIndex - 1; i >= 0 && realCount < 10; i--) {
        const targetUser = levelMembers[i];
        const targetUserId = targetUser.id;
        const matchingBonusAmount = depositAmount * 0.08;

        if (targetUser.isGhost) {
          // 유령 계정: 8%를 어드민에게 귀속하고 continue (실계정 카운트 미포함)
          const adminUser = await db.select({ id: users.id, pointBalance: users.pointBalance })
            .from(users)
            .where(eq(users.role, 'admin'))
            .limit(1);
          if (adminUser.length > 0) {
            const adminId = adminUser[0].id;
            const adminBalance = parseFloat(String(adminUser[0].pointBalance || '0'));
            await updateUserPointBalance(adminId, adminBalance + matchingBonusAmount);
            await createPointTransaction({
              userId: adminId,
              type: "bonus_upline_matching",
              amount: matchingBonusAmount,
              relatedUserId: sourceUserId,
              status: "completed",
              description: `Level ${purchasedLevel} ghost absorb bonus from user ${sourceUserId} via ghost ${targetUserId}`,
            });
            console.log(`[Bonus][8%] GHOST ABSORB: ghost user ${targetUserId} -> admin ${adminId} gets ${matchingBonusAmount}`);
          }
          continue; // 실계정 카운트 증가 없이 다음 노드로
        }

        // 실계정: 8% 정상 지급
        await createPointTransaction({
          userId: targetUserId,
          type: "bonus_upline_matching",
          amount: matchingBonusAmount,
          relatedUserId: sourceUserId,
          status: "completed",
          description: `Level ${purchasedLevel} one-line donation bonus (upline #${realCount + 1}) from user ${sourceUserId}`,
        });

        await createBonusRecord({
          userId: targetUserId,
          sourceUserId: sourceUserId,
          bonusType: "upline_matching",
          level: realCount + 1,
          bonusPercent: 8,
          bonusAmount: matchingBonusAmount,
          sourceAmount: depositAmount,
          transactionId: undefined,
        });

        const freshTarget = await getUserById(targetUserId);

        if (freshTarget?.isCreditAccount && parseFloat(String(freshTarget.creditOwed || "0")) > 0) {
          await handleCreditInterception(targetUserId, matchingBonusAmount, db);
          console.log(`[Bonus][8%] CREDIT INTERCEPT: upline#${realCount + 1} User ${targetUserId} bonus ${matchingBonusAmount} applied to creditOwed`);
        } else {
          const newPointBalance = parseFloat(String(freshTarget?.pointBalance || "0")) + matchingBonusAmount;
          await updateUserPointBalance(targetUserId, newPointBalance);

          const newDonationBonusBalance = parseFloat(String(freshTarget?.donationBonusBalance || "0")) + matchingBonusAmount;
          await updateUserDonationBonusBalance(targetUserId, newDonationBonusBalance);

          console.log(`[Bonus][8%] Level ${purchasedLevel} upline#${realCount + 1}: User ${targetUserId} pointBalance -> ${newPointBalance}`);
        }
        realCount++; // 실계정 카운트 증가
      }
    }
  } catch (error) {
    console.error("[Reward Distribution] Error distributing bonuses:", error);
    throw error;
  }
}

/**
 * 보너스 분배 전용: 유령 계정 포함 원라인 레그 맴버 (기부 차단 로직에 사용)
 * 유령 계정(isGhost=true)도 포함하여 보너스 루프에서 차단 지점으로 활용
 */
export async function getOneLineLegMembersWithGhost(level: number) {
  const db = await getDb();
  if (!db) return [];

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      walletAddress: users.walletAddress,
      level: users.level,
      pointBalance: users.pointBalance,
      donationBonusBalance: users.donationBonusBalance,
      referrerId: users.referrerId,
      createdAt: users.createdAt,
      levelUpdatedAt: users.levelUpdatedAt,
      isGhost: users.isGhost,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        gte(users.level, level),             // 레벨 조건
        sql`${users.levelUpdatedAt} IS NOT NULL` // 레벨 진입 시각 있는 유저만
        // isGhost 필터 제거: 유령 계정도 포함하여 차단 로직에 활용
      )
    )
    .orderBy(asc(users.levelUpdatedAt));
  return members;
}

/**
 * 원라인 레그: 특정 레벨의 전체 맴버 목록 (가입순 FIFO)
 * 해당 레벨 이상을 보유한 모든 유저를 createdAt 순으로 반환
 */
export async function getOneLineLegMembers(level: number) {
  const db = await getDb();
  if (!db) return [];

  // 조직도 화면: level >= 해당 레벨인 실결제자만 포함
  // level=0 미결제 유저는 어떤 레벨 탭에서도 완전 제외
  // 노트: 어드민은 보너스 분배 로직에서만 포함되며 조직도 화면에는 노출되지 않음
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      walletAddress: users.walletAddress,
      level: users.level,
      pointBalance: users.pointBalance,
      donationBonusBalance: users.donationBonusBalance,
      referrerId: users.referrerId,
      createdAt: users.createdAt,
      levelUpdatedAt: users.levelUpdatedAt,
      isGhost: users.isGhost,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        eq(users.isGhost, false),
        gte(users.level, level),             // 엄격한 레벨 필터: level >= N (0레벨 제외)
        sql`${users.levelUpdatedAt} IS NOT NULL` // levelUpdatedAt 없는 미결제자 제외
      )
    )
    // levelUpdatedAt 기준 FIFO 정렬
    .orderBy(asc(users.levelUpdatedAt));
  return members;
}

/**
 * 내 직소속 하위 맴버 (referrerId = userId, 레벨 필터)
 */
export async function getDirectDownlineByLevel(userId: number, level: number) {
  const db = await getDb();
  if (!db) return [];

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      walletAddress: users.walletAddress,
      level: users.level,
      pointBalance: users.pointBalance,
      referrerId: users.referrerId,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.referrerId, userId), gte(users.level, level), eq(users.isGhost, false)))
    .orderBy(asc(users.createdAt));

  return members;
}

/**
 * 유령 코드 목록 조회 (isGhost=true인 유저)
 */
export async function getGhostUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: users.id,
      name: users.name,
      walletAddress: users.walletAddress,
      level: users.level,
      isGhost: users.isGhost,
      pointBalance: users.pointBalance,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.isGhost, true))
    .orderBy(desc(users.createdAt));
}

/**
 * 전체 유저 목록 (관리자용 - 유령 코드 관리)
 */
export async function getAllUsersForAdmin(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: users.id,
      name: users.name,
      walletAddress: users.walletAddress,
      level: users.level,
      isGhost: users.isGhost,
      pointBalance: users.pointBalance,
      referrerId: users.referrerId,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// STAKING ENGINE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** 스테이킹 잔액 업데이트 */
export async function updateUserStakedBalance(userId: number, stakedBalance: string | number, stakedAt?: Date) {
  const db = await getDb();
  if (!db) return undefined;
  const setObj: Record<string, unknown> = { stakedBalance: stakedBalance.toString(), updatedAt: new Date() };
  if (stakedAt !== undefined) setObj.stakedAt = stakedAt;
  return await db.update(users).set(setObj).where(eq(users.id, userId));
}

/** 리워드 잔액 업데이트 */
export async function updateUserRewardBalance(userId: number, rewardBalance: string | number) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.update(users).set({ rewardBalance: rewardBalance.toString(), updatedAt: new Date() }).where(eq(users.id, userId));
}

/** P2P 수신 잔액 업데이트 */
export async function updateUserP2PReceivedBalance(userId: number, p2pReceivedBalance: string | number) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.update(users).set({ p2pReceivedBalance: p2pReceivedBalance.toString(), updatedAt: new Date() }).where(eq(users.id, userId));
}

/** 모든 활성 스테이커 조회 (일일 이자 계산용) */
export async function getAllActiveStakers() {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ id: users.id, stakedBalance: users.stakedBalance, rewardBalance: users.rewardBalance })
    .from(users)
    .where(sql`CAST(${users.stakedBalance} AS DECIMAL) > 0`);
  return result;
}

/** 스테이킹 티어 레코드 생성 */
export async function createStakingTier(data: InsertStakingTier) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.insert(stakingTiers).values(data);
}

/** 사용자의 활성 스테이킹 티어 조회 (unstakedAt이 NULL인 것) */
export async function getUserActiveStakingTiers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(stakingTiers)
    .where(and(eq(stakingTiers.userId, userId), sql`${stakingTiers.unstakedAt} IS NULL`))
    .orderBy(desc(stakingTiers.stakedAt));
}

/** 모든 활성 스테이킹 티어 조회 (일일 이자 계산용) */
export async function getAllActiveStakingTiers() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(stakingTiers)
    .where(sql`${stakingTiers.unstakedAt} IS NULL`);
}

/** 스테이킹 티어 언스테이크 (unstakedAt 설정) */
export async function unstakeStakingTier(tierId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return await db
    .update(stakingTiers)
    .set({ unstakedAt: new Date(), updatedAt: new Date() })
    .where(eq(stakingTiers.id, tierId));
}


/**
 * Admin 2FA OTP Secret Management
 * CRITICAL: These functions preserve admin_secrets table during migrations
 */

/** Create or update admin OTP secret */
export async function upsertAdminSecret(data: InsertAdminSecret) {
  const db = await getDb();
  if (!db) return undefined;
  
  try {
    // Try to update first
    const existing = await db
      .select()
      .from(adminSecrets)
      .where(eq(adminSecrets.adminWalletAddress, data.adminWalletAddress));
    
    if (existing.length > 0) {
      // Update existing record
      return await db
        .update(adminSecrets)
        .set({
          otpSecret: data.otpSecret,
          isEnabled: data.isEnabled,
          backupCodes: data.backupCodes,
          updatedAt: new Date(),
        })
        .where(eq(adminSecrets.adminWalletAddress, data.adminWalletAddress));
    } else {
      // Insert new record
      return await db.insert(adminSecrets).values(data);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert admin secret:", error);
    return undefined;
  }
}

/** Retrieve admin OTP secret by wallet address */
export async function getAdminSecret(walletAddress: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  try {
    const result = await db
      .select()
      .from(adminSecrets)
      .where(eq(adminSecrets.adminWalletAddress, walletAddress));
    
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to retrieve admin secret:", error);
    return undefined;
  }
}

/** Check if admin OTP is enabled */
export async function isAdminOTPEnabled(walletAddress: string): Promise<boolean> {
  const secret = await getAdminSecret(walletAddress);
  return secret ? secret.isEnabled : false;
}

/** Enable/disable admin OTP */
export async function setAdminOTPEnabled(walletAddress: string, enabled: boolean) {
  const db = await getDb();
  if (!db) return undefined;
  
  try {
    return await db
      .update(adminSecrets)
      .set({ isEnabled: enabled, updatedAt: new Date() })
      .where(eq(adminSecrets.adminWalletAddress, walletAddress));
  } catch (error) {
    console.error("[Database] Failed to update admin OTP status:", error);
    return undefined;
  }
}

/**
 * 원라인 큐에서 특정 유저 이후에 등록된 실코드 유저 수 카운트
 * (로그인 유저의 createdAt 이후에 등록된, 같은 레벨 이상의 비유령 유저 수)
 */
/**
 * 직추천 회원 수: referrerId = userId인 비유령 유저 수 (원라인 큐와 무관)
 */
export async function countDirectReferrals(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // 직추천 회원 수: referrerId = userId이고, level > 0(실결제자)이며, 비유령인 유저만 카운트
  // 순환 참조 방지: 자기 자신은 제외
  const result = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${users.id})` })
    .from(users)
    .where(
      and(
        eq(users.referrerId, userId),
        eq(users.isGhost, false),
        sql`${users.level} > 0`,           // level=0 미결제 유저 제외
        sql`${users.id} != ${userId}`      // 순환 참조 방지
      )
    );

  return Number(result[0]?.count ?? 0);
}

export async function countOneLineDownlineMembers(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const user = await getUserById(userId);
  if (!user) return 0;

  // 큐 순서 기준: levelUpdatedAt (레벨 진입 시각)
  // levelUpdatedAt이 없으면 (level=0 유저) 큐에 없는 것으로 간주
  const userLevelUpdatedAt = user.levelUpdatedAt;
  if (!userLevelUpdatedAt) return 0; // 레벨 미진입 유저는 하위조직 0

  // 나보다 나중에 레벨 진입한 비유령 유저 수
  // level=0 미결제 유저는 제외 (gt(users.level, 0))
  // 동일 시각인 경우 id 큰 쪽이 나중에 진입한 것으로 간주 (tiebreaker)
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users)
    .where(
      and(
        eq(users.isGhost, false),
        sql`${users.level} > 0`,              // level=0 미결제 유저 제외
        sql`${users.levelUpdatedAt} IS NOT NULL`,
        sql`(
          ${users.levelUpdatedAt} > ${userLevelUpdatedAt}
          OR (
            ${users.levelUpdatedAt} = ${userLevelUpdatedAt}
            AND ${users.id} > ${userId}
          )
        )`
      )
    );
  const count = Number(result[0]?.count ?? 0);
  return count;
}
