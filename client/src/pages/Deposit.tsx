import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useWeb3 } from "@/hooks/useWeb3";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

// YNV 고정 수량 정의
const LEVEL_YNV_AMOUNTS = {
  1: 30000,
  2: 50000,
  3: 90000,
  4: 140000,
};

// 보너스 계산 함수
const calculateBonus = (levelYnv: number, bonusType: 'referral' | 'upline') => {
  if (bonusType === 'referral') {
    return levelYnv * 0.1; // 추천 보너스 10%
  }
  return levelYnv * 0.08; // 기부 보너스 8%
};

export default function Deposit() {
  const { wallet } = useWeb3();
  const [usdtAmount, setUsdtAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch current point price
  const { data: priceData } = trpc.pointPrice.getCurrentPrice.useQuery();

  // Fetch point transaction history
  const { data: history } = trpc.points.getTransactionHistory.useQuery({ limit: 10 });

  const calculatePoints = () => {
    if (!usdtAmount) return "0";
    const amount = parseFloat(usdtAmount);
    return Math.floor(amount * 1500).toString();
  };

  // 보너스 YNV를 USDT로 환산
  const convertYnvToUsdt = (ynvAmount: number) => {
    if (!priceData) return 0;
    const priceUsd = parseFloat(priceData.priceUSD.toString());
    return ynvAmount * priceUsd;
  };

  const handleDeposit = async () => {
    if (!wallet) {
      toast.error("지갑을 먼저 연결해주세요");
      return;
    }

    if (!usdtAmount || parseFloat(usdtAmount) <= 0) {
      toast.error("유효한 금액을 입력해주세요");
      return;
    }

    setIsLoading(true);
    try {
      // In production, this would interact with the smart contract
      toast.success("입금 요청이 생성되었습니다");
      setUsdtAmount("");
    } catch (error) {
      toast.error("입금 처리 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const pointAmount = calculatePoints();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container py-6">
          <h1 className="text-3xl font-bold">YNV 입금</h1>
          <p className="text-muted-foreground mt-1">USDT를 YNV로 환전하세요</p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Deposit Form */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">YNV 환전 정보</h2>

              {/* USDT Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">USDT 금액</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={usdtAmount}
                    onChange={(e) => setUsdtAmount(e.target.value)}
                    className="pr-12"
                    disabled={!wallet}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    USDT
                  </span>
                </div>
              </div>

              {/* Conversion Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm">환전 YNV</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">
                      {pointAmount} YNV
                    </p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-blue-300" />
                </div>

                <div className="text-xs text-muted-foreground mt-4">
                  <p>환율: 1 USDT = 1,500 YNV 기준</p>
                </div>
              </div>

              {/* Bonus Info */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-green-300 mb-3">보너스 분배</h3>
                <p className="text-sm text-green-200 mb-3">
                  패키지 진입 시 상위 1대~10대까지 각 대수별로 기부 보너스 8%씩(총 80%) 자동 분배되며, 추천 보너스 10%가 별도로 합산 분배됩니다. (※ 1레벨 30,000 YNV 진입 시, 기부와 추천을 합산하여 총 5,400 YNV가 매칭 정산됩니다.)
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-green-300 mb-1">↑ 상위 1대~10대:</p>
                    <ul className="text-xs text-green-200 space-y-0.5 ml-2">
                      {Array.from({ length: 10 }, (_, i) => {
                        const level = 1; // 기본값: 레벨 1
                        const baseYnv = LEVEL_YNV_AMOUNTS[level as keyof typeof LEVEL_YNV_AMOUNTS];
                        const bonusYnv = calculateBonus(baseYnv, 'upline');
                        const bonusUsdt = convertYnvToUsdt(bonusYnv);
                        return (
                          <li key={i + 1}>
                            • {i + 1}대: {bonusYnv.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} YNV
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-300 mb-1">↓ 추천 보너스 (직추천인):</p>
                    <ul className="text-xs text-green-200 space-y-0.5 ml-2">
                      {Array.from({ length: 1 }, (_, i) => {
                        const level = 1; // 기본값: 레벨 1
                        const baseYnv = LEVEL_YNV_AMOUNTS[level as keyof typeof LEVEL_YNV_AMOUNTS];
                        const referralBonus = calculateBonus(baseYnv, 'referral');
                        const uplineBonus = calculateBonus(baseYnv, 'upline');
                        const totalBonus = referralBonus + uplineBonus;
                        const totalUsdt = convertYnvToUsdt(totalBonus);
                        return (
                          <li key="referral">
                            • 직추천인: {totalBonus.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} YNV
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Wallet Status */}
              {!wallet ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <p className="text-yellow-300 text-sm">지갑을 연결하여 입금을 시작하세요</p>
                </div>
              ) : (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6" style={{ height: 'auto' }}>
                  <p className="text-blue-300 text-sm font-mono" style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                    연결된 지갑: {wallet.address}
                  </p>
                </div>
              )}

              {/* Deposit Button */}
              <Button
                onClick={handleDeposit}
                disabled={isLoading || !wallet || !usdtAmount}
                className="w-full h-12"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  "입금하기"
                )}
              </Button>
            </Card>
          </div>

          {/* Info Sidebar */}
          <div>
            {/* Current Price */}
            <Card className="p-6 mb-6">
              <h3 className="font-semibold mb-4">YNV 가격</h3>
              <div className="text-3xl font-bold text-blue-400 mb-2">
                ${priceData?.priceUSD || "로딩 중..."}
              </div>
              <p className="text-xs text-muted-foreground">
                기준일: {priceData?.date || "미설정"}
              </p>
            </Card>

            {/* Recent Deposits */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">최근 거래</h3>
              <div className="space-y-3">
                {history && history.length > 0 ? (
                  history
                    .filter((tx) => tx.type === "deposit")
                    .slice(0, 5)
                    .map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center text-sm">
                        <div>
                          <p className="font-medium">입금</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-semibold text-green-400">+{tx.amount}</p>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-muted-foreground">최근 거래가 없습니다</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
