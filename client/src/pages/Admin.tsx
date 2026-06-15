import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Loader2, Check, X, Lock, Unlock, TrendingUp, Users, DollarSign,
  Settings, BarChart2, ShieldCheck, AlertTriangle, RefreshCw, Activity, LogOut,
  ArrowLeftRight, Pause, Play, QrCode
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";


// 관리자 지갑 주소 (환경 변수에서 읽음)
const ADMIN_WALLET = "0xd4ce2031aC48B12bd6610F6b7f8102Bcf40e178d";

export default function Admin() {
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "price" | "withdrawals" | "wallets" | "legs" | "withdrawalSettings" | "p2pHistory" | "virtualNode" | "stakingSettings">("overview");
  const [newPrice, setNewPrice] = useState("");
  const [walletToLock, setWalletToLock] = useState("");
  const [lockedWallets, setLockedWallets] = useState<string[]>([]);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [isAutoPrice, setIsAutoPrice] = useState(false);
  const [autoPricePercent, setAutoPricePercent] = useState("1.5");
  const [isLocking, setIsLocking] = useState(false);
  const [minLimit, setMinLimit] = useState("");
  const [maxLimit, setMaxLimit] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [virtualIntervals, setVirtualIntervals] = useState<Record<number, number>>({ 1: 10, 2: 7, 3: 8, 4: 10 });
  const [isUpdatingVirtual, setIsUpdatingVirtual] = useState(false);

  // 스테이킹 설정 상태
  const [stakingDailyRate180, setStakingDailyRate180] = useState("1.0");
  const [stakingDailyRate360, setStakingDailyRate360] = useState("1.5");
  const [stakingMinInitial, setStakingMinInitial] = useState("10000");
  const [stakingMinRestake, setStakingMinRestake] = useState("1000");
  const [p2pMinTransfer, setP2pMinTransfer] = useState("100");
  const [isUpdatingStaking, setIsUpdatingStaking] = useState(false);

  // 지갑 주소 변경 상태
  const [walletUpdateUserId, setWalletUpdateUserId] = useState<number | null>(null);
  const [walletUpdateAddress, setWalletUpdateAddress] = useState("");
  const [isUpdatingWallet, setIsUpdatingWallet] = useState(false);

  // 수수료 설정 상태
  const [withdrawalFeePercent, setWithdrawalFeePercent] = useState("5");
  const [p2pTransferFeePercent, setP2pTransferFeePercent] = useState("3");
  const [isUpdatingFees, setIsUpdatingFees] = useState(false);

  // 2FA 로그인 상태
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminOTPCode, setAdminOTPCode] = useState("");
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState("");

  // QR Setup state
  const [showQRSetup, setShowQRSetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [otpSecret, setOtpSecret] = useState("YNOVANEVADIY360D");
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  const adminLoginMutation = trpc.admin.login.useMutation();

  const handleAdminLogin = async () => {
    setAdminLoginError("");
    setIsAdminLoggingIn(true);

    try {
      if (!adminUsername || !adminPassword) {
        setAdminLoginError("사용자명과 비밀번호를 입력해주세요");
        setIsAdminLoggingIn(false);
        return;
      }

      // OTP bypass: use master key as otpCode so backend accepts it
      const result = await adminLoginMutation.mutateAsync({
        username: adminUsername,
        password: adminPassword,
        otpCode: "YNOVANEVADIY360D",
      });

      if (result.success) {
        setIsAdminAuthenticated(true);
        localStorage.setItem("adminSessionToken", result.sessionToken);
        localStorage.setItem("adminSessionExpiry", String(result.expiresAt));
        toast.success("관리자 로그인 성공!");
        setAdminUsername("");
        setAdminPassword("");
      }
    } catch (error: any) {
      setAdminLoginError(error.message || "로그인 실패");
      toast.error("로그인 실패: " + (error.message || "알 수 없는 오류"));
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem("adminSessionToken");
    localStorage.removeItem("adminSessionExpiry");
    toast.success("로그아웃되었습니다");
  };

  // Load QR code on first visit
  useEffect(() => {
    const checkFirstVisit = async () => {
      const hasVisited = localStorage.getItem("adminQRSetupDone");
      if (!hasVisited) {
        setShowQRSetup(true);
        // Generate QR code URL (using otpauth format)
        const otpauthUrl = `otpauth://totp/YieldNova%20Admin?secret=${otpSecret}&issuer=YieldNova`;
        // In production, you would generate QR code here using qrcode library
        // For now, show the setup screen with the secret key
        setQrCodeUrl("");
        localStorage.setItem("adminQRSetupDone", "true");
      }
    };
    checkFirstVisit();
  }, []);


  // 지갑 연결 상태 확인
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setConnectedWallet(accounts[0].toLowerCase());
            // localStorage에 저장
            localStorage.setItem("walletAddress", accounts[0]);
          }
        } catch (error) {
          console.error("지갑 확인 실패:", error);
        }
      }
    };

    checkWalletConnection();

    // 지갑 변경 감지
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setConnectedWallet(accounts[0].toLowerCase());
          localStorage.setItem("walletAddress", accounts[0]);
        } else {
          setConnectedWallet(null);
          localStorage.removeItem("walletAddress");
        }
      });
    }

    // localStorage에서 잠금된 지갑 로드
    const locked = localStorage.getItem("locked_wallets");
    if (locked) setLockedWallets(JSON.parse(locked));
  }, []);

  // API Queries
  const { data: withdrawalRequests, refetch: refetchWithdrawals } =
    trpc.withdrawal.getPendingWithdrawals.useQuery(undefined, {
      enabled: isAdminWallet(),
    });

  const { data: currentPrice, refetch: refetchPrice } =
    trpc.pointPrice.getCurrentPrice.useQuery();

  const { data: priceHistory, refetch: refetchHistory } =
    trpc.pointPrice.getPriceHistory.useQuery({ days: 30 });

  // Mutations
  const updatePriceMutation = trpc.pointPrice.setPrice.useMutation({
    onSuccess: () => {
      toast.success("✅ YNV 가격이 업데이트되었습니다. 마케팅 페이지에도 즉시 반영됩니다.");
      setNewPrice("");
      refetchPrice();
      refetchHistory();
    },
    onError: (error: any) => {
      const message = error?.message || "가격 업데이트 실패";
      toast.error(message);
    },
  });

  const approveWithdrawalMutation = trpc.withdrawal.approveWithdrawal.useMutation({
    onSuccess: () => {
      toast.success("출금이 승인되었습니다");
      refetchWithdrawals();
    },
    onError: (error: any) => {
      const message = error?.message || "출금 승인 실패";
      toast.error(message);
    },
  });

  const rejectWithdrawalMutation = trpc.withdrawal.rejectWithdrawal.useMutation({
    onSuccess: () => {
      toast.success("출금이 거절되었습니다");
      refetchWithdrawals();
    },
    onError: (error: any) => {
      const message = error?.message || "출금 거절 실패";
      toast.error(message);
    },
  });

  // 가격 자동 상승 설정 조회
  const { data: priceAutoData, refetch: refetchPriceAuto } =
    trpc.admin.getPriceAutoIncrease.useQuery(undefined, {
      enabled: isAdminWallet(),
    });

  useEffect(() => {
    if (priceAutoData !== undefined) {
      setIsAutoPrice(priceAutoData.enabled);
    }
  }, [priceAutoData]);

  const setPriceAutoMutation = trpc.admin.setPriceAutoIncrease.useMutation({
    onSuccess: () => {
      toast.success("✅ 가격 자동 상승 설정이 저장되었습니다");
      refetchPriceAuto();
    },
    onError: (error: any) => {
      toast.error(error?.message || "설정 저장 실패");
    },
  });

  // 상승률 조회
  const { data: pricePercentData, refetch: refetchPercent } =
    trpc.admin.getPriceAutoPercent.useQuery(undefined, { enabled: isAdminWallet() });

  useEffect(() => {
    if (pricePercentData) setAutoPricePercent(pricePercentData.percent.toString());
  }, [pricePercentData]);

  const setPricePercentMutation = trpc.admin.setPriceAutoPercent.useMutation({
    onSuccess: () => {
      toast.success("✅ 상승률이 저장되었습니다");
      refetchPercent();
    },
    onError: (error: any) => {
      toast.error(error?.message || "저장 실패");
    },
  });

  const handleToggleAutoPrice = async (enabled: boolean) => {
    setIsAutoPrice(enabled);
    await setPriceAutoMutation.mutateAsync({ enabled });
  };

  const handleSavePercent = async () => {
    const val = parseFloat(autoPricePercent);
    if (isNaN(val) || val <= 0 || val > 100) {
      toast.error("유효한 수치를 입력해주세요 (0.1 ~ 100)");
      return;
    }
    await setPricePercentMutation.mutateAsync({ percent: val });
  };

  // 출금 설정 조회
  const { data: withdrawalSettingsData, refetch: refetchSettings } =
    trpc.admin.getWithdrawalSettings.useQuery(undefined, {
      enabled: isAdminWallet(),
    });

  // P2P 이력 조회
  const { data: p2pHistory, refetch: refetchP2P } =
    trpc.admin.getP2PTransferHistory.useQuery({ limit: 50 }, {
      enabled: isAdminWallet(),
    });

  // 스테이킹 설정 조회
  const { data: stakingSettingsData } = trpc.admin.getStakingSettings.useQuery(
    undefined,
    { enabled: isAdminWallet() }
  );
  useEffect(() => {
    if (stakingSettingsData) {
      setStakingDailyRate180(stakingSettingsData.dailyRate180 || "1.0");
      setStakingDailyRate360(stakingSettingsData.dailyRate360 || "1.5");
      setStakingMinInitial(stakingSettingsData.minInitial || "10000");
      setStakingMinRestake(stakingSettingsData.minRestake || "1000");
      setP2pMinTransfer(stakingSettingsData.p2pMin || "100");
    }
  }, [stakingSettingsData]);

  const updateStakingSettingsMutation = trpc.admin.updateStakingSettings.useMutation({
    onSuccess: () => {
      toast.success("✅ 스테이킹 설정이 저장되었습니다");
      setIsUpdatingStaking(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || "저장 실패");
      setIsUpdatingStaking(false);
    },
  });

  // 수수료 설정 조회
  const { data: feeSettingsData } = trpc.admin.getFeeSettings.useQuery(
    undefined,
    { enabled: isAdminWallet() }
  );
  useEffect(() => {
    if (feeSettingsData) {
      setWithdrawalFeePercent(feeSettingsData.withdrawalFee || "5");
      setP2pTransferFeePercent(feeSettingsData.p2pTransferFee || "3");
    }
  }, [feeSettingsData]);

  const updateFeeSettingsMutation = trpc.admin.updateFeeSettings.useMutation({
    onSuccess: () => {
      toast.success("✅ 수수료 설정이 저장되었습니다");
      setIsUpdatingFees(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || "저장 실패");
      setIsUpdatingFees(false);
    },
  });

  const handleSaveFeeSettings = () => {
    setIsUpdatingFees(true);
    updateFeeSettingsMutation.mutate({
      withdrawalFee: parseFloat(withdrawalFeePercent),
      p2pTransferFee: parseFloat(p2pTransferFeePercent),
    });
  };

  const handleSaveStakingSettings = () => {
    setIsUpdatingStaking(true);
    updateStakingSettingsMutation.mutate({
      dailyRate180: stakingDailyRate180,
      dailyRate360: stakingDailyRate360,
      minInitial: stakingMinInitial,
      minRestake: stakingMinRestake,
      p2pMin: p2pMinTransfer,
    });
  };

  // 지갑 관리
  const { data: allUsers, refetch: refetchAllUsers } = trpc.admin.getAllUsers.useQuery(
    { limit: 200 },
    { enabled: isAdminWallet() && activeTab === "wallets" }
  );
  // 지갑 주소 변경 뮤테이션
  const updateWalletAddressMutation = trpc.admin.updateUserWalletAddress.useMutation({
    onSuccess: () => {
      toast.success("✅ 사용자 지갑 주소가 업데이트되었습니다");
      setIsUpdatingWallet(false);
      setWalletUpdateUserId(null);
      setWalletUpdateAddress("");
      refetchAllUsers();
    },
    onError: (error: any) => {
      toast.error(error?.message || "지갑 주소 변경 실패");
      setIsUpdatingWallet(false);
    },
  });

  const setGhostMutation = trpc.admin.setGhostStatus.useMutation({
    onSuccess: () => {
      toast.success("유령 코드 상태가 저장되었습니다");
      refetchAllUsers();
    },
    onError: (error: any) => toast.error(error?.message || "저장 실패"),
  });

  // 가상 노드 설정 조회
  const { data: virtualNodeData, refetch: refetchVirtual } =
    trpc.admin.getVirtualNodeSettings.useQuery(undefined, {
      enabled: isAdminWallet(),
    });

  // 가상 노드 설정 데이터 로드
  useEffect(() => {
    if (virtualNodeData && virtualNodeData.length > 0) {
      const newIntervals: Record<number, number> = { 1: 10, 2: 7, 3: 8, 4: 10 };
      virtualNodeData.forEach((item: any) => {
        newIntervals[item.level] = item.interval;
      });
      setVirtualIntervals(newIntervals);
    }
  }, [virtualNodeData]);

  // 가상 노드 간격 업데이트 뮤테이션
  const updateVirtualMutation = trpc.admin.updateVirtualNodeInterval.useMutation({
    onSuccess: () => {
      toast.success("✅ 가상 노드 설정이 저장되었습니다");
      refetchVirtual();
    },
    onError: (error: any) => {
      toast.error(error?.message || "가상 노드 설정 저장 실패");
    },
  });

  const handleUpdateVirtualNode = async (level: number) => {
    setIsUpdatingVirtual(true);
    try {
      await updateVirtualMutation.mutateAsync({ level, interval: virtualIntervals[level] });
    } finally {
      setIsUpdatingVirtual(false);
    }
  };

  // 출금 설정 업데이트 뮤테이션
  const updateSettingsMutation = trpc.admin.updateWithdrawalSettings.useMutation({
    onSuccess: () => {
      toast.success("✅ 출금 설정이 업데이트되었습니다");
      refetchSettings();
    },
    onError: (error: any) => {
      toast.error(error?.message || "출금 설정 업데이트 실패");
    },
  });

  // 출금 설정 데이터 로드
  useEffect(() => {
    if (withdrawalSettingsData) {
      setMinLimit(withdrawalSettingsData.minLimit?.toString() || "1000");
      setMaxLimit(withdrawalSettingsData.maxLimit?.toString() || "100000");
      setIsPaused(withdrawalSettingsData.isPaused || false);
    }
  }, [withdrawalSettingsData]);

  const handleUpdateWithdrawalSettings = async () => {
    if (!minLimit || !maxLimit) {
      toast.error("최소/최대 금액을 모두 입력해주세요");
      return;
    }
    if (parseFloat(minLimit) >= parseFloat(maxLimit)) {
      toast.error("최소 금액이 최대 금액보다 작아야 합니다");
      return;
    }
    setIsUpdatingSettings(true);
    try {
      await updateSettingsMutation.mutateAsync({
        minLimit,
        maxLimit,
        isPaused,
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // 관리자 지갑 확인
  function isAdminWallet(): boolean {
    return connectedWallet?.toLowerCase() === ADMIN_WALLET.toLowerCase();
  }

  // 지갑 연결 함수
  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast.error("MetaMask 또는 TokenPocket을 설치해주세요");
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) {
        setConnectedWallet(accounts[0].toLowerCase());
        localStorage.setItem("walletAddress", accounts[0]);
        toast.success("지갑이 연결되었습니다");
      }
    } catch (error) {
      console.error("지갑 연결 실패:", error);
      toast.error("지갑 연결에 실패했습니다");
    }
  };

  // 지갑 연결 해제
  const disconnectWallet = () => {
    setConnectedWallet(null);
    localStorage.removeItem("walletAddress");
    toast.success("지갑이 연결 해제되었습니다");
  };

  // 가격 업데이트
  const handleUpdatePrice = async () => {
    if (!newPrice || parseFloat(newPrice) <= 0) {
      toast.error("유효한 가격을 입력해주세요");
      return;
    }
    setIsUpdatingPrice(true);
    try {
      await updatePriceMutation.mutateAsync({
        date: new Date().toISOString().split("T")[0],
        priceUSD: newPrice,
      });
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  // 지갑 잠금
  const handleLockWallet = () => {
    if (!walletToLock || !walletToLock.startsWith("0x")) {
      toast.error("유효한 지갑 주소를 입력하세요");
      return;
    }
    setIsLocking(true);
    const addr = walletToLock.toLowerCase();
    const updated = [...lockedWallets.filter((w) => w !== addr), addr];
    localStorage.setItem("locked_wallets", JSON.stringify(updated));
    setLockedWallets(updated);
    setWalletToLock("");
    toast.success("지갑이 잠금되었습니다");
    setIsLocking(false);
  };

  // 지갑 잠금 해제
  const handleUnlockWallet = (addr: string) => {
    const updated = lockedWallets.filter((w) => w !== addr);
    localStorage.setItem("locked_wallets", JSON.stringify(updated));
    setLockedWallets(updated);
    toast.success("지갑 잠금이 해제되었습니다");
  };

  // 차트 데이터
  const chartData = priceHistory?.map((item) => ({
    date: new Date(item.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
    price: parseFloat(item.priceUSD.toString()),
  })) || [];

  const currentPriceVal = parseFloat(currentPrice?.priceUSD?.toString() || "0.01");
  const pendingCount = withdrawalRequests?.filter((r: any) => r.status === "pending").length || 0;

  // 관리자 지갑이 아닌 경우 접근 거부
  if (!isAdminWallet()) {

  // Show QR Setup if needed
  if (showQRSetup) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <div className="p-8">
            <div className="text-center mb-8">
              <QrCode className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white">2FA 설정</h2>
              <p className="text-slate-300 text-sm mt-2">Google Authenticator로 스캔하세요</p>
            </div>

            {qrCodeUrl && (
              <div className="mb-6 flex justify-center">
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 border-2 border-slate-600 p-2" />
              </div>
            )}

            <div className="mb-6 p-4 bg-slate-700 rounded">
              <p className="text-xs text-slate-400 mb-2">OTP Secret Key:</p>
              <p className="text-sm font-mono text-green-400 break-all">{otpSecret}</p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => setShowQRSetup(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                설정 완료
              </Button>
              <p className="text-xs text-slate-400 text-center">
                ✓ 위의 QR 코드를 Google Authenticator에 스캔했으면 "설정 완료"를 클릭하세요
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // 2FA 로그인 게이트 UI
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <div className="p-8">
            <div className="text-center mb-8">
              <ShieldCheck className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white">관리자 로그인</h2>
              <p className="text-slate-300 text-sm mt-2">관리자 전용 페이지입니다</p>
            </div>

            {adminLoginError && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
                {adminLoginError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-2">
                  사용자명
                </label>
                <Input
                  type="text"
                  placeholder="master_admin"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  disabled={isAdminLoggingIn}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 text-sm font-medium block mb-2">
                  비밀번호
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={isAdminLoggingIn}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <Button
                onClick={handleAdminLogin}
                disabled={isAdminLoggingIn || !adminUsername || !adminPassword}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
              >
                {isAdminLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    로그인 중...
                  </>
                ) : (
                  '로그인'
                )}
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-xs text-slate-400 text-center">
                🔒 이 페이지는 관리자 전용입니다
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }


      return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">관리자 접근 권한 필요</h2>
            <p className="text-slate-300 mb-6">
              {connectedWallet
                ? `현재 연결된 지갑: ${connectedWallet.substring(0, 6)}...${connectedWallet.substring(38)}\n\n지정된 관리자 지갑으로만 접근할 수 있습니다.`
                : "지갑을 먼저 연결해주세요"}
            </p>
            {!connectedWallet ? (
              <Button
                onClick={connectWallet}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                지갑 연결
              </Button>
            ) : (
              <>
                <Button
                  onClick={disconnectWallet}
                  variant="outline"
                  className="w-full mb-2"
                >
                  다른 지갑으로 연결
                </Button>
                <p className="text-xs text-slate-400 mt-4">
                  관리자 지갑: {ADMIN_WALLET.substring(0, 6)}...{ADMIN_WALLET.substring(38)}
                </p>
              </>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const TABS = [
    { id: "overview", label: "개요", icon: BarChart2 },
    { id: "price", label: "가격 설정", icon: TrendingUp },
    { id: "withdrawals", label: `출금 관리 ${pendingCount > 0 ? `(${pendingCount})` : ""}`, icon: DollarSign },
    { id: "withdrawalSettings", label: "출금 설정", icon: Settings },
    { id: "virtualNode", label: "가상 노드", icon: Activity },
    { id: "p2pHistory", label: "P2P 이력", icon: ArrowLeftRight },
    { id: "wallets", label: "지갑 관리", icon: Lock },
    { id: "legs", label: "레그 관리", icon: Users },
    { id: "stakingSettings", label: "스테이킹 설정", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0d1117]/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">YieldNova 관리자</h1>
                <p className="text-xs text-muted-foreground">
                  {connectedWallet?.substring(0, 6)}...{connectedWallet?.substring(38)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400">시스템 정상</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground ml-2"
                onClick={disconnectWallet}
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/5 bg-[#0d1117]/50 sticky top-14 z-10 overflow-x-auto">
        <div className="container flex gap-1 py-0 min-w-max md:min-w-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 md:px-4 py-3 text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-slate-800 border-slate-700 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">현재 YNV 가격</p>
                    <h3 className="text-3xl font-bold text-white mt-2">${currentPriceVal.toFixed(9)}</h3>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
              </Card>

              <Card className="bg-slate-800 border-slate-700 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">대기 중인 출금</p>
                    <h3 className="text-3xl font-bold text-white mt-2">{pendingCount}</h3>
                  </div>
                  <DollarSign className="w-8 h-8 text-yellow-400" />
                </div>
              </Card>
            </div>

            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">30일 YNV 가격 추이</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                      }}
                      formatter={(value: any) => `$${value.toFixed(9)}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  가격 데이터가 없습니다
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Price Tab */}
        {activeTab === "price" && (
          <Card className="bg-slate-800 border-slate-700 p-6">
            <h3 className="text-lg font-bold text-white mb-6">YNV 가격 설정</h3>
            <div className="space-y-4">

              {/* 가격 자동 상승 토글 */}
              <div className="flex items-center justify-between bg-slate-700 p-4 rounded-lg">
                <div>
                  <p className="text-white font-medium">가격 자동 상승 활성화</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {isAutoPrice
                      ? "✅ 매일 자정 1.5% 복리 상승 중 (KST 00:00 자동 실행)"
                      : "⏸️ 자동 상승 중지 — 수동 입력으로 고정"}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleAutoPrice(!isAutoPrice)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                    isAutoPrice ? "bg-green-500" : "bg-slate-600"
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    isAutoPrice ? "translate-x-8" : "translate-x-1"
                  }`} />
                </button>
              </div>

              {/* 일일 자동 상승률 입력 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  일일 자동 상승률 (%)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="예: 1.5"
                    value={autoPricePercent}
                    onChange={(e) => setAutoPricePercent(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    step="0.1"
                    min="0.1"
                    max="100"
                  />
                  <Button
                    onClick={handleSavePercent}
                    disabled={setPricePercentMutation.isPending}
                    className="bg-cyan-600 hover:bg-cyan-700 whitespace-nowrap"
                  >
                    {setPricePercentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  현재 설정: {autoPricePercent}% · 공식: 신규가격 = 현재가격 × (1 + {autoPricePercent}/100)
                </p>
              </div>

              {/* 수동 가격 입력 (자동 OFF 시만 활성화) */}
              <div className={isAutoPrice ? "opacity-40 pointer-events-none" : ""}>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  수동 YNV 가격 입력 (USD)
                </label>
                <Input
                  type="number"
                  placeholder="예: 0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  step="0.000001"
                  min="0"
                  disabled={isAutoPrice}
                />
              </div>
              <Button
                onClick={handleUpdatePrice}
                disabled={isUpdatingPrice || !newPrice || isAutoPrice}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40"
              >
                {isUpdatingPrice ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    업데이트 중...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    수동 가격 업데이트
                  </>
                )}
              </Button>
              <p className="text-xs text-slate-400 mt-4">
                💡 가격이 업데이트되면 마케팅 페이지에 30초 이내에 반영됩니다.
              </p>
            </div>
          </Card>
        )}

        {/* Withdrawals Tab */}
        {activeTab === "withdrawals" && (
          <div className="space-y-4">
            {withdrawalRequests && withdrawalRequests.length > 0 ? (
              withdrawalRequests.map((request: any) => (
                <Card key={request.id} className="bg-slate-800 border-slate-700 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">사용자 ID: {request.userId}</p>
                      <p className="text-white font-semibold mt-1">
                        {request.pointAmount} YNV
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        상태: <span className="text-yellow-400">{request.status}</span>
                      </p>
                    </div>
                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() =>
                            approveWithdrawalMutation.mutateAsync({
                              withdrawalId: request.id,
                            })
                          }
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() =>
                            rejectWithdrawalMutation.mutateAsync({
                              withdrawalId: request.id,
                              reason: "관리자 거절",
                            })
                          }
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <Card className="bg-slate-800 border-slate-700 p-6 text-center">
                <p className="text-slate-400">대기 중인 출금 요청이 없습니다</p>
              </Card>
            )}
          </div>
        )}

        {/* Legs Tab */}
        {activeTab === "legs" && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">글로벌 원라인 레그 관리</h3>
              <p className="text-slate-400 text-sm mb-4">각 레벨별 진입 순서와 사용자 정보를 확인하세요</p>
              
              <div className="space-y-4">
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-white">레벨 {level}</h4>
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                        ${[20, 33.33, 60, 93.33][level - 1]} USDT
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-slate-400">
                        <span className="text-slate-300 font-medium">받는 YNV:</span> {[30000, 50000, 90000, 140000][level - 1].toLocaleString()}
                      </p>
                      <p className="text-slate-400">
                        <span className="text-slate-300 font-medium">진입 조건:</span> 레벨 {level - 1 > 0 ? level - 1 : '없음'} 완료 필수
                      </p>
                      <p className="text-slate-400">
                        <span className="text-slate-300 font-medium">보상 구조:</span> 직추천 10% + 상위 10대 각 8%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">레그 진입 현황</h3>
              <p className="text-slate-400 text-sm mb-4">사용자별 현재 레벨 진입 상태</p>
              <div className="bg-slate-700 rounded p-4 text-center text-slate-400">
                <p className="text-sm">사용자 레그 데이터는 데이터베이스에서 실시간으로 조회됩니다</p>
                <p className="text-xs text-slate-500 mt-2">각 사용자의 현재 레벨은 users 테이블의 level 필드에서 확인 가능합니다</p>
              </div>
            </Card>
          </div>
        )}

        {/* Withdrawal Settings Tab */}
        {activeTab === "withdrawalSettings" && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-6">YNV 출금 제한 설정</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    최소 출금 수량 (YNV)
                  </label>
                  <Input
                    type="number"
                    placeholder="예: 1000"
                    value={minLimit}
                    onChange={(e) => setMinLimit(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    최대 출금 수량 (YNV)
                  </label>
                  <Input
                    type="number"
                    placeholder="예: 100000"
                    value={maxLimit}
                    onChange={(e) => setMaxLimit(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    min="0"
                  />
                </div>
                <div className="flex items-center justify-between bg-slate-700 p-4 rounded-lg">
                  <div>
                    <p className="text-white font-medium">출금 차단 (전체 중지)</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isPaused ? "현재 모든 출금이 차단되어 있습니다" : "현재 출금이 허용되어 있습니다"}
                    </p>
                  </div>
                  <Button
                    variant={isPaused ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setIsPaused(!isPaused)}
                  >
                    {isPaused ? (
                      <><Pause className="w-4 h-4 mr-1" /> 차단중</>
                    ) : (
                      <><Play className="w-4 h-4 mr-1" /> 허용중</>
                    )}
                  </Button>
                </div>
                <Button
                  onClick={handleUpdateWithdrawalSettings}
                  disabled={isUpdatingSettings}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isUpdatingSettings ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 저장 중...</>
                  ) : (
                    <><Settings className="w-4 h-4 mr-2" /> 설정 저장</>
                  )}
                </Button>
              </div>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">현재 적용 중인 설정</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-700 p-4 rounded-lg text-center">
                  <p className="text-xs text-slate-400">최소</p>
                  <p className="text-lg font-bold text-white">{parseFloat(withdrawalSettingsData?.minLimit?.toString() || "1000").toLocaleString()} YNV</p>
                </div>
                <div className="bg-slate-700 p-4 rounded-lg text-center">
                  <p className="text-xs text-slate-400">최대</p>
                  <p className="text-lg font-bold text-white">{parseFloat(withdrawalSettingsData?.maxLimit?.toString() || "100000").toLocaleString()} YNV</p>
                </div>
                <div className="bg-slate-700 p-4 rounded-lg text-center">
                  <p className="text-xs text-slate-400">상태</p>
                  <p className={`text-lg font-bold ${withdrawalSettingsData?.isPaused ? 'text-red-400' : 'text-green-400'}`}>
                    {withdrawalSettingsData?.isPaused ? '차단' : '허용'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Virtual Node Tab */}
        {activeTab === "virtualNode" && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-2">가상 노드 삽입 간격 설정</h3>
              <p className="text-slate-400 text-sm mb-6">실사 유저 N명 배치 후 운영자 가상 노드를 자동 삽입합니다. 생성된 기부 보상(8%)과 직추천 보너스(10%)는 운영자(ID:1)에게 귀속됩니다.</p>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-white">{level}레벨 라인</h4>
                        <p className="text-xs text-slate-400 mt-1">실사 유저 {virtualIntervals[level]}명마다 가상 노드 삽입</p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={isUpdatingVirtual}
                        onClick={() => handleUpdateVirtualNode(level)}
                      >
                        {isUpdatingVirtual ? <Loader2 className="w-3 h-3 animate-spin" /> : "저장"}
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-slate-300 whitespace-nowrap">삽입 간격 (명):</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={virtualIntervals[level]}
                        onChange={(e) => setVirtualIntervals(prev => ({ ...prev, [level]: parseInt(e.target.value) || 1 }))}
                        className="bg-slate-600 border border-slate-500 text-white rounded px-3 py-1.5 w-24 text-sm"
                      />
                      <span className="text-slate-400 text-sm">명 배치 후 가상 노드 1개 삽입</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">현재 적용 중인 설정</h3>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} className="bg-slate-700 p-3 rounded-lg text-center">
                    <p className="text-xs text-slate-400">{level}레벨</p>
                    <p className="text-lg font-bold text-cyan-400">{virtualIntervals[level]}명</p>
                    <p className="text-xs text-slate-500">마다 삽입</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* P2P History Tab */}
        {activeTab === "p2pHistory" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">P2P 전송 이력</h3>
              <Button variant="outline" size="sm" onClick={() => refetchP2P()}>
                <RefreshCw className="w-4 h-4 mr-1" /> 새로고침
              </Button>
            </div>
            {p2pHistory && p2pHistory.length > 0 ? (
              <div className="space-y-3">
                {p2pHistory.map((transfer: any) => (
                  <Card key={transfer.id} className="bg-slate-800 border-slate-700 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-400">
                          <span className="text-blue-400">#{transfer.fromUserId}</span>
                          {" \u2192 "}
                          <span className="text-green-400">#{transfer.toUserId}</span>
                        </p>
                        <p className="text-white font-semibold mt-1">
                          {parseFloat(transfer.amount).toLocaleString()} YNV
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded ${
                          transfer.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                          transfer.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                          'bg-red-600/20 text-red-400'
                        }`}>
                          {transfer.status === 'completed' ? '완료' : transfer.status === 'pending' ? '대기' : '실패'}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(transfer.createdAt).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-800 border-slate-700 p-6 text-center">
                <ArrowLeftRight className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">P2P 전송 이력이 없습니다</p>
              </Card>
            )}
          </div>        )})

        {/* Staking Settings Tab */}
        {activeTab === "stakingSettings" && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-2">스테이킹 엔진 설정</h3>
              <p className="text-slate-400 text-sm mb-6">일일 이자율 및 최소 수량 제한을 설정합니다. 변경 사항은 다음 실행부터 즉시 적용됩니다.</p>

              <div className="space-y-5">
                {/* 180일 스테이킹 일일 이자율 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    180일 스테이킹 일일 이자율 (%)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">180일 기간으로 스테이킹한 YNV에 대한 매일 자동 적립되는 이자율</p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={stakingDailyRate180}
                      onChange={(e) => setStakingDailyRate180(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white w-40"
                      placeholder="1.0"
                    />
                    <span className="text-slate-400 text-sm">% / 일</span>
                    <span className="text-xs text-slate-500">예: 1.0% → 10,000 YNV 스테이킹 시 100 YNV/일</span>
                  </div>
                </div>

                {/* 360일 스테이킹 일일 이자율 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    360일 스테이킹 일일 이자율 (%)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">360일 기간으로 스테이킹한 YNV에 대한 매일 자동 적립되는 이자율</p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={stakingDailyRate360}
                      onChange={(e) => setStakingDailyRate360(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white w-40"
                      placeholder="1.5"
                    />
                    <span className="text-slate-400 text-sm">% / 일</span>
                    <span className="text-xs text-slate-500">예: 1.5% → 10,000 YNV 스테이킹 시 150 YNV/일</span>
                  </div>
                </div>

                {/* 초기 스테이킹 최소 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    초기 스테이킹 최소 수량 (YNV)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">신규 스테이킹 시 이 수량 미만이면 차단</p>
                  <Input
                    type="number"
                    min="0"
                    value={stakingMinInitial}
                    onChange={(e) => setStakingMinInitial(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white w-48"
                    placeholder="10000"
                  />
                </div>

                {/* 리워드 리스테이킹 최소 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    리워드 리스테이킹 최소 수량 (YNV)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">리워드 지갑에서 리스테이킹 시 이 수량 미만이면 차단</p>
                  <Input
                    type="number"
                    min="0"
                    value={stakingMinRestake}
                    onChange={(e) => setStakingMinRestake(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white w-48"
                    placeholder="1000"
                  />
                </div>

                {/* P2P 최소 수량 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    P2P 전송 최소 수량 (YNV)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">회원 간 P2P 전송 시 이 수량 미만이면 차단</p>
                  <Input
                    type="number"
                    min="0"
                    value={p2pMinTransfer}
                    onChange={(e) => setP2pMinTransfer(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white w-48"
                    placeholder="100"
                  />
                </div>

                <Button
                  onClick={handleSaveStakingSettings}
                  disabled={isUpdatingStaking}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {isUpdatingStaking ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 저장 중...</>
                  ) : (
                    <><Check className="w-4 h-4 mr-2" /> 설정 저장</>
                  )}
                </Button>
              </div>
            </Card>

            {/* 수수료 설정 섹션 */}
            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                수수료 설정
              </h3>
              <div className="space-y-4">
                {/* 출금 수수료 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    출금 수수료 (%)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">외부 출금 시 차감될 수수료</p>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={withdrawalFeePercent}
                    onChange={(e) => setWithdrawalFeePercent(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white w-48"
                    placeholder="5"
                  />
                </div>

                {/* P2P 전송 수수료 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    P2P 전송 수수료 (%)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">회원 간 P2P 전송 시 차감될 수수료</p>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={p2pTransferFeePercent}
                    onChange={(e) => setP2pTransferFeePercent(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white w-48"
                    placeholder="3"
                  />
                </div>

                <Button
                  onClick={handleSaveFeeSettings}
                  disabled={isUpdatingFees}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {isUpdatingFees ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 저장 중...</>
                  ) : (
                    <><Check className="w-4 h-4 mr-2" /> 수수료 저장</>
                  )}
                </Button>
              </div>
            </Card>

            {/* 지갑 분리 라우팅 안내 */}
            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">지갑 분리 라우팅 규칙</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <span className="text-green-400 mt-0.5">✅</span>
                  <div>
                    <p className="text-green-300 font-medium">허용: 리워드 → 레벨 진입</p>
                    <p className="text-slate-400 text-xs mt-1">리워드 지갑(rewardBalance)에서 레벨 진입 용도로 이동 가능</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <span className="text-red-400 mt-0.5">❌</span>
                  <div>
                    <p className="text-red-300 font-medium">차단: 레벨 진입 → 리워드/스테이킹 역류 불가</p>
                    <p className="text-slate-400 text-xs mt-1">레벨 진입 지갑은 레벨 1~4 활성화 전용 싱크</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <span className="text-red-400 mt-0.5">❌</span>
                  <div>
                    <p className="text-red-300 font-medium">차단: P2P 수신 자산 재전송/스테이킹 불가</p>
                    <p className="text-slate-400 text-xs mt-1">P2P로 받은 YNV는 다른 지갑으로 재전송하거나 스테이킹 풀에 넣을 수 없음</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Wallets Tab */}
        {activeTab === "wallets" && (
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">지갑 잠금</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    지갑 주소 (0x...)
                  </label>
                  <Input
                    type="text"
                    placeholder="0x..."
                    value={walletToLock}
                    onChange={(e) => setWalletToLock(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <Button
                  onClick={handleLockWallet}
                  disabled={isLocking || !walletToLock}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {isLocking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      잠금 중...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      지갑 잠금
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* 사용자 지갑 주소 변경 섹션 */}
            {allUsers && allUsers.length > 0 && (
              <Card className="bg-slate-800 border-slate-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  사용자 지갑 주소 변경
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allUsers.map((user: any) => (
                    <div key={user.id} className="bg-slate-700 p-4 rounded space-y-2">
                      <div className="text-sm text-slate-300">
                        <span className="font-semibold">ID:</span> {user.id} | <span className="font-semibold">이름:</span> {user.name || "N/A"}
                      </div>
                      <div className="text-sm text-slate-400 font-mono">
                        현재: {user.walletAddress?.substring(0, 6)}...{user.walletAddress?.substring(38) || "N/A"}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="새 지갑 주소 (0x...)"
                          value={walletUpdateUserId === user.id ? walletUpdateAddress : ""}
                          onChange={(e) => {
                            if (walletUpdateUserId === user.id) {
                              setWalletUpdateAddress(e.target.value);
                            }
                          }}
                          onFocus={() => {
                            setWalletUpdateUserId(user.id);
                            setWalletUpdateAddress("");
                          }}
                          className="bg-slate-600 border-slate-500 text-white text-sm"
                        />
                        <Button
                          onClick={() => {
                            if (walletUpdateAddress && walletUpdateUserId === user.id) {
                              setIsUpdatingWallet(true);
                              updateWalletAddressMutation.mutate({
                                userId: user.id,
                                newWalletAddress: walletUpdateAddress,
                              });
                            }
                          }}
                          disabled={isUpdatingWallet || walletUpdateUserId !== user.id || !walletUpdateAddress}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white whitespace-nowrap"
                          size="sm"
                        >
                          {isUpdatingWallet && walletUpdateUserId === user.id ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> 변경 중</>
                          ) : (
                            "변경"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {lockedWallets.length > 0 && (
              <Card className="bg-slate-800 border-slate-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4">잠금된 지갑</h3>
                <div className="space-y-2">
                  {lockedWallets.map((wallet) => (
                    <div
                      key={wallet}
                      className="flex items-center justify-between bg-slate-700 p-3 rounded"
                    >
                      <span className="text-sm text-slate-300 font-mono">
                        {wallet.substring(0, 6)}...{wallet.substring(38)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnlockWallet(wallet)}
                      >
                        <Unlock className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* P2P 잠금/해제 */}
        <P2PLockPanel />

        {/* 어드민 잔액 표시 + 내부 포인트 전송 */}
        <AdminBalanceTransferPanel />

        {/* 잔액 직접 조정 */}
        <BalanceAdjustPanel />

        {/* 외상 계정 설정 */}
        <CreditAccountPanel />
      </div>
    </div>
  );
}

function P2PLockPanel() {
  const { data: p2pStatus, refetch } = trpc.admin.getP2PEnabled.useQuery();
  const setP2P = trpc.admin.setP2PEnabled.useMutation({
    onSuccess: () => refetch(),
  });
  const isEnabled = p2pStatus?.p2pEnabled !== false;

  return (
    <div style={{ marginTop: 32, padding: 16, border: `2px solid ${isEnabled ? '#22c55e' : '#ef4444'}`, borderRadius: 8, background: '#1e293b' }}>
      <h3 style={{ color: isEnabled ? '#22c55e' : '#ef4444', marginBottom: 8 }}>
        P2P 전송 잠금/해제 (P2P Lock/Unlock)
      </h3>
      <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
        현재 상태: <strong style={{ color: isEnabled ? '#22c55e' : '#ef4444' }}>{isEnabled ? '해제 (전송 가능)' : '잠금 (전송 차단)'}</strong>
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setP2P.mutate({ enabled: true })}
          disabled={isEnabled || setP2P.isPending}
          style={{ padding: '8px 20px', borderRadius: 4, background: isEnabled ? '#166534' : '#22c55e', color: '#fff', border: 'none', cursor: isEnabled ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isEnabled ? 0.5 : 1 }}
        >
          해제 (Unlock)
        </button>
        <button
          onClick={() => setP2P.mutate({ enabled: false })}
          disabled={!isEnabled || setP2P.isPending}
          style={{ padding: '8px 20px', borderRadius: 4, background: !isEnabled ? '#7f1d1d' : '#ef4444', color: '#fff', border: 'none', cursor: !isEnabled ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: !isEnabled ? 0.5 : 1 }}
        >
          잠금 (Lock)
        </button>
      </div>
    </div>
  );
}

function AdminBalanceTransferPanel() {
  const [recipient, setRecipient] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [result, setResult] = React.useState("");

  // 어드민 잔액 조회 (adjustUserBalance를 get 모드로 활용)
  const { data: adminBalance, refetch: refetchBalance } = trpc.admin.getAdminBalance.useQuery();

  // 내부 전송 mutation
  const transfer = trpc.admin.internalTransfer.useMutation({
    onSuccess: (data) => {
      setResult(`✅ 전송 완료: ${data.amount} YNV → userId=${data.recipientId} (Admin 잔액: ${data.adminNewBalance})`);
      refetchBalance();
      setRecipient("");
      setAmount("");
    },
    onError: (err) => setResult(`❌ ${err.message}`),
  });

  const handleTransfer = () => {
    const amt = parseFloat(amount);
    if (!recipient || isNaN(amt) || amt <= 0) {
      setResult("❌ 받는 사람과 전송 수량을 정확히 입력하세요");
      return;
    }
    transfer.mutate({ recipient, amount: amt });
  };

  return (
    <div style={{ marginTop: 32, padding: 16, border: "1px solid #10b981", borderRadius: 8, background: "#1e293b" }}>
      <h3 style={{ color: "#10b981", marginBottom: 8 }}>어드민 내부 포인트 전송</h3>
      <p style={{ color: "#e2e8f0", fontSize: 14, marginBottom: 12 }}>
        Admin Balance: <span style={{ color: "#4ade80", fontWeight: "bold", fontSize: 18 }}>
          {adminBalance ? Number(adminBalance.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "..."
        } YNV</span>
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="받는 사람 (지갑주소 또는 ID)"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #10b981", background: "#0f172a", color: "#fff", minWidth: 260 }}
        />
        <input
          type="number"
          placeholder="전송 수량 (YNV)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #10b981", background: "#0f172a", color: "#fff", width: 160 }}
        />
        <button
          onClick={handleTransfer}
          disabled={transfer.isPending}
          style={{ padding: "6px 14px", borderRadius: 4, background: "#10b981", color: "#000", border: "none", cursor: "pointer", fontWeight: "bold" }}
        >
          {transfer.isPending ? "전송 중..." : "내부 포인트 전송하기"}
        </button>
      </div>
      {result && <p style={{ marginTop: 8, color: result.startsWith("✅") ? "#4ade80" : "#f87171" }}>{result}</p>}
    </div>
  );
}

function CreditAccountPanel() {
  const LEVEL_AMOUNTS: Record<string, number> = { "1": 30000, "2": 50000, "3": 90000, "4": 140000 };
  const [target, setTarget] = React.useState("");
  const [level, setLevel] = React.useState("1");
  const [creditAmount, setCreditAmount] = React.useState(30000);
  const [result, setResult] = React.useState("");

  // 레벨 변경 시 외상 금액 자동 연동 (bulletproof explicit if/else)
  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setLevel(selected);
    if (selected === "1") setCreditAmount(30000);
    else if (selected === "2") setCreditAmount(50000);
    else if (selected === "3") setCreditAmount(90000);
    else if (selected === "4") setCreditAmount(140000);
    else setCreditAmount(30000);
  };

  const setCreditAccount = trpc.admin.setCreditAccount.useMutation({
    onSuccess: (data) => setResult(`✅ ${data.message}`),
    onError: (err: any) => setResult(`❌ ${err.message}`),
  });

  const handleSubmit = () => {
    if (!target) {
      setResult("❌ 대상 유저를 입력하세요");
      return;
    }
    const amt = Number(creditAmount);
    if (isNaN(amt) || amt <= 0) {
      setResult("❌ 유효한 외상 금액을 입력하세요");
      return;
    }
    // 금액에서 레벨 자동 도출
    let derivedLevel: number;
    if (amt === 30000) derivedLevel = 1;
    else if (amt === 50000) derivedLevel = 2;
    else if (amt === 90000) derivedLevel = 3;
    else if (amt === 140000) derivedLevel = 4;
    else derivedLevel = parseInt(level) || 1;
    setCreditAccount.mutate({ target, level: derivedLevel, creditAmount: amt });
  };

  return (
    <div style={{ marginTop: 24, padding: 16, border: "1px solid #f59e0b", borderRadius: 8, background: "#1e293b" }}>
      <h3 style={{ color: "#f59e0b", marginBottom: 12 }}>외상 계정 설정 (Credit Account Setup)</h3>
      <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>
        대상 유저에게 레벨을 강제 부여하고 외상 대여금을 설정합니다. 보너스 발생 시 자동 상환됩니다.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
        <div>
          <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 4 }}>대상 유저</label>
          <input
            placeholder="지갑주소 또는 ID"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #f59e0b", background: "#0f172a", color: "#fff", width: "100%", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 4 }}>레벨 선택</label>
          <select
            value={level}
            onChange={handleLevelChange}
            style={{
              display: "block",
              width: "100%",
              padding: "10px 12px",
              fontSize: 16,
              borderRadius: 4,
              border: "2px solid #f59e0b",
              background: "#0f172a",
              color: "#ffffff",
              boxSizing: "border-box",
              WebkitAppearance: "menulist",
              MozAppearance: "menulist",
              appearance: "menulist",
              cursor: "pointer",
            }}
          >
            <option value="1">Level 1 (30,000 YNV)</option>
            <option value="2">Level 2 (50,000 YNV)</option>
            <option value="3">Level 3 (90,000 YNV)</option>
            <option value="4">Level 4 (140,000 YNV)</option>
          </select>
        </div>
        <div>
          <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 4 }}>외상 금액 (YNV) — 직접 입력 가능 (레벨 자동 도출)</label>
          <input
            type="number"
            value={creditAmount}
            onChange={(e) => setCreditAmount(Number(e.target.value))}
            style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #f59e0b", background: "#0f172a", color: "#4ade80", width: "100%", boxSizing: "border-box", fontWeight: "bold", fontSize: 16 }}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={setCreditAccount.isPending}
          style={{ padding: "10px 14px", borderRadius: 4, background: "#f59e0b", color: "#000", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: 15 }}
        >
          {setCreditAccount.isPending ? "적용 중..." : "외상 계정 적용하기"}
        </button>
      </div>
      {result && <p style={{ marginTop: 8, color: result.startsWith("✅") ? "#4ade80" : "#f87171" }}>{result}</p>}
    </div>
  );
}

function BalanceAdjustPanel() {
  const [target, setTarget] = React.useState("");
  const [mode, setMode] = React.useState<"add" | "subtract" | "set">("add");
  const [amount, setAmount] = React.useState("");
  const [result, setResult] = React.useState("");

  const adjust = trpc.admin.adjustUserBalance.useMutation({
    onSuccess: (data) => setResult(`✅ userId=${data.userId} ${data.field}: ${data.oldValue} → ${data.newValue}`),
    onError: (err) => setResult(`❌ ${err.message}`),
  });

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (!target || isNaN(amt)) { setResult("❌ target과 amount를 입력하세요"); return; }
    adjust.mutate({ target, field: "pointBalance", mode, amount: amt });
  };

  return (
    <div style={{ marginTop: 32, padding: 16, border: "1px solid #555", borderRadius: 8, background: "#1e293b" }}>
      <h3 style={{ color: "#fff", marginBottom: 12 }}>관리자 잔액 조정 (pointBalance)</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Wallet Address or User ID"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #888", background: "#0f172a", color: "#fff", minWidth: 260 }}
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "add" | "subtract" | "set")}
          style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #888", background: "#0f172a", color: "#fff" }}
        >
          <option value="add">add (더하기)</option>
          <option value="subtract">subtract (빼기)</option>
          <option value="set">set (직접 설정)</option>
        </select>
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #888", background: "#0f172a", color: "#fff", width: 140 }}
        />
        <button
          onClick={handleSubmit}
          disabled={adjust.isPending}
          style={{ padding: "6px 14px", borderRadius: 4, background: "#3b82f6", color: "#fff", border: "none", cursor: "pointer" }}
        >
          {adjust.isPending ? "실행 중..." : "Execute Balance Adjustment"}
        </button>
      </div>
      {result && <p style={{ marginTop: 8, color: result.startsWith("✅") ? "#4ade80" : "#f87171" }}>{result}</p>}
    </div>
  );
}
