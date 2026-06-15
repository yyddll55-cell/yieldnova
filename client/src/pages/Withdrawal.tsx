import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useWeb3 } from "@/hooks/useWeb3";
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Withdrawal() {
  const { wallet, refreshBalances } = useWeb3();
  const [, setLocation] = useLocation();
  const [pointAmount, setPointAmount] = useState("");
  const [withdrawalAddress, setWithdrawalAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 지갑 주소
  const walletAddr = wallet ? (typeof wallet === "string" ? wallet : wallet?.address) : null;
  const isWalletConnected = !!walletAddr;

  // 외상 계정 조회
  const { data: profile } = trpc.user.getProfile.useQuery(undefined, { enabled: isWalletConnected });
  const isCreditLocked = profile?.isCreditAccount && parseFloat(String(profile?.creditOwed || '0')) > 0;

  // DB pointBalance 조회
  const { data: balanceData, refetch: refetchBalance } = trpc.points.getBalance.useQuery(
    undefined,
    { enabled: isWalletConnected }
  );
  const userBalance = Number(String(balanceData?.balance ?? "0").replace(/,/g, ""));

  // 지갑 연결 시 출금 주소 기본값 설정
  useEffect(() => {
    if (walletAddr && !withdrawalAddress) {
      setWithdrawalAddress(walletAddr);
    }
  }, [walletAddr]);

  // 현재 YNV 가격 조회
  const { data: priceData } = trpc.pointPrice.getCurrentPrice.useQuery();

  // 출금 내역 조회
  const { data: withdrawalRequests } = trpc.withdrawal.getPendingWithdrawals.useQuery();

  // 관리자 출금 제한 설정 조회
  const { data: withdrawalLimits } = trpc.p2p.getWithdrawalLimits.useQuery();
  const minLimit = parseFloat(withdrawalLimits?.minLimit?.toString() || "100");
  const maxLimit = parseFloat(withdrawalLimits?.maxLimit?.toString() || "100000");
  const isWithdrawalPaused = withdrawalLimits?.isPaused || false;

  const calculateUSDT = () => {
    if (!pointAmount || !priceData) return "0";
    const price = parseFloat(priceData.priceUSD.toString());
    const amount = parseFloat(pointAmount);
    return (amount * price).toFixed(2);
  };

  const calculateFee = () => {
    const usdt = parseFloat(calculateUSDT());
    return (usdt * 0.05).toFixed(2);
  };

  const calculateNetAmount = () => {
    const usdt = parseFloat(calculateUSDT());
    const fee = parseFloat(calculateFee());
    return (usdt - fee).toFixed(2);
  };

  const handleRefresh = async () => {
    await refreshBalances();
    await refetchBalance();
    toast.info("잔액을 새로고침했습니다");
  };

  const handleWithdrawal = async () => {
    if (!wallet) {
      toast.error("지갑을 먼저 연결해주세요");
      return;
    }

    const lockedWallets = JSON.parse(localStorage.getItem("locked_wallets") || "[]");
    if (walletAddr && lockedWallets.includes(walletAddr.toLowerCase())) {
      toast.error("이 지갑은 거래가 차단되었습니다. 관리자에게 문의하세요.");
      return;
    }

    if (!pointAmount || parseFloat(pointAmount) <= 0) {
      toast.error("유효한 금액을 입력해주세요");
      return;
    }

    if (!withdrawalAddress || !withdrawalAddress.startsWith("0x") || withdrawalAddress.length !== 42) {
      toast.error("유효한 지갑 주소를 입력해주세요 (0x로 시작, 42자)");
      return;
    }

    if (parseFloat(pointAmount) > userBalance) {
      toast.error(`YNV 잔액이 부족합니다 (보유: ${userBalance.toFixed(2)} YNV)`);
      return;
    }

    if (isWithdrawalPaused) {
      toast.error("현재 출금이 차단되어 있습니다. 관리자에게 문의하세요.");
      return;
    }
    if (parseFloat(pointAmount) < minLimit) {
      toast.error(`최소 출금액은 ${minLimit.toLocaleString()} YNV입니다`);
      return;
    }
    if (parseFloat(pointAmount) > maxLimit) {
      toast.error(`최대 출금액은 ${maxLimit.toLocaleString()} YNV입니다`);
      return;
    }

    setIsLoading(true);
    try {
      toast.success(`출금 요청이 생성되었습니다 (${pointAmount} YNV → ${withdrawalAddress.substring(0, 10)}...)`);
      setPointAmount("");
      await refreshBalances();
    } catch (error) {
      console.error("[Withdrawal] Error:", error);
      toast.error("출금 처리 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">출금</h1>
              <p className="text-muted-foreground mt-1">YNV를 USDT로 환전하세요</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Withdrawal Form */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">출금 신청</h2>

              {/* Balance Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm mb-1">사용 가능한 YNV</p>
                    <p className="font-bold text-2xl text-white">
                      {!isWalletConnected
                        ? "지갑 연결 필요"
                        : `${userBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} YNV`}
                    </p>
                  </div>
                  {isWalletConnected && (
                    <Button variant="ghost" size="icon" onClick={handleRefresh} title="잔액 새로고침">
                      <RefreshCw className="w-4 h-4 text-blue-300" />
                    </Button>
                  )}
                </div>
              </div>

              {/* YNV Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">출금할 YNV</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={pointAmount}
                      onChange={(e) => setPointAmount(e.target.value)}
                      className="pr-14"
                      disabled={!isWalletConnected}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      YNV
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setPointAmount(userBalance.toString())}
                    disabled={!isWalletConnected || userBalance === 0}
                  >
                    전액
                  </Button>
                </div>
              </div>

              {/* Conversion Breakdown */}
              <div className="bg-card/50 border border-border rounded-lg p-4 mb-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">YNV 금액</span>
                  <span className="font-medium">{pointAmount || "0"} YNV</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">USDT 환전액</span>
                  <span className="font-medium">${calculateUSDT()}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">출금 수수료 (5%)</span>
                  <span className="font-medium text-red-400">-${calculateFee()}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between text-lg">
                  <span className="font-semibold">실제 수령액</span>
                  <span className="font-bold text-green-400">${calculateNetAmount()}</span>
                </div>
              </div>

              {/* Withdrawal Address Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">출금 받을 지갑 주소 (USDT)</label>
                <Input
                  type="text"
                  placeholder="0x로 시작하는 지갑 주소를 입력하세요"
                  value={withdrawalAddress}
                  onChange={(e) => setWithdrawalAddress(e.target.value)}
                  className="font-mono text-sm"
                  disabled={!isWalletConnected}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  기본값: 현재 연결된 지갑 주소. 다른 주소로 변경 가능합니다.
                </p>
              </div>

              {/* Fee Info */}
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6 flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-300 text-sm font-medium">출금 수수료 안내</p>
                  <p className="text-orange-200 text-xs mt-1">
                    모든 출금에는 5%의 수수료가 적용됩니다. 수수료는 시스템 운영 및 유지보수에 사용됩니다.
                  </p>
                </div>
              </div>

              {/* Wallet Status */}
              {!isWalletConnected ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <p className="text-yellow-300 text-sm">지갑을 연결하여 출금을 시작하세요</p>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6" style={{ height: 'auto' }}>
                  <p className="text-green-300 text-sm font-mono" style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                    ✅ 연결된 지갑: {walletAddr}
                  </p>
                </div>
              )}

              {/* Credit Lock Warning */}
              {isCreditLocked && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                  <p className="text-red-300 text-sm font-medium">⚠️ 외상 대여금 상환 완료 후 출금이 가능합니다</p>
                  <p className="text-red-200 text-xs mt-1">잔여 대여금: {Number(profile?.creditOwed || 0).toLocaleString()} YNV</p>
                </div>
              )}

              {/* Withdrawal Button */}
              <Button
                onClick={handleWithdrawal}
                disabled={isLoading || !isWalletConnected || !pointAmount || isCreditLocked}
                className="w-full h-12"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    처리 중...
                  </>
                ) : isCreditLocked ? (
                  "출금 잠김 (외상 상환 중)"
                ) : (
                  "출금 신청"
                )}
              </Button>

              <p className="text-xs text-muted-foreground mt-4 text-center">
                출금 신청 후 관리자 승인이 필요합니다
              </p>
            </Card>
          </div>

          {/* Status Sidebar */}
          <div>
            {/* Withdrawal Status */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">출금 신청 현황</h3>
              <div className="space-y-3">
                {withdrawalRequests && withdrawalRequests.length > 0 ? (
                  withdrawalRequests.slice(0, 5).map((request: any) => (
                    <div key={request.id} className="border border-border rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm">${request.usdtAmount}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            request.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : request.status === "approved"
                                ? "bg-green-500/20 text-green-300"
                                : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {request.status === "pending"
                            ? "대기중"
                            : request.status === "approved"
                              ? "승인됨"
                              : "거절됨"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">출금 신청이 없습니다</p>
                )}
              </div>
            </Card>

            {/* Info Card */}
            <Card className="p-6 mt-6">
              <h3 className="font-semibold mb-4">출금 안내</h3>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>• 최소 출금액: {minLimit.toLocaleString()} YNV</li>
                <li>• 최대 출금액: {maxLimit.toLocaleString()} YNV</li>
                {isWithdrawalPaused && <li className="text-red-400 font-semibold">• ⚠️ 현재 출금 차단 중</li>}
                <li>• 출금 수수료: 5%</li>
                <li>• 처리 시간: 1-2시간</li>
                <li>• BSC 네트워크를 통해 처리됩니다</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
