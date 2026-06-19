import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Lock, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useWeb3 } from "@/hooks/useWeb3";

const PACKAGES = [
  {
    level: 1,
    priceUSDT: 20,
    points: 30000,
    description: "상위 1대~10대 각 8% 기부 배분 (대수별 2,400 DSHIB) | 추천 보너스 10% (3,000 DSHIB)",
    color: "from-blue-500 to-blue-600",
    badge: "level-badge-1",
  },
  {
    level: 2,
    priceUSDT: 33.33,
    points: 50000,
    description: "상위 1대~10대 각 8% 기부 배분 (대수별 4,000 DSHIB) | 추천 보너스 10% (5,000 DSHIB)",
    color: "from-purple-500 to-purple-600",
    badge: "level-badge-2",
  },
  {
    level: 3,
    priceUSDT: 60,
    points: 90000,
    description: "상위 1대~10대 각 8% 기부 배분 (대수별 7,200 DSHIB) | 추천 보너스 10% (9,000 DSHIB)",
    color: "from-pink-500 to-pink-600",
    badge: "level-badge-3",
  },
  {
    level: 4,
    priceUSDT: 93.33,
    points: 140000,
    description: "상위 1대~10대 각 8% 기부 배분 (대수별 11,200 DSHIB) | 추천 보너스 10% (14,000 DSHIB)",
    color: "from-orange-500 to-orange-600",
    badge: "level-badge-4",
  },
];

// 레벨별 필요 DSHIB 잔액
const LEVEL_DSHIB_PRICES: Record<number, number> = {
  1: 30000,
  2: 50000,
  3: 90000,
  4: 140000,
};

export default function Package() {
  const { wallet } = useWeb3();
  const { data: balanceData, refetch: refetchBalance } = trpc.points.getBalance.useQuery(
    undefined,
    { enabled: !!wallet }
  );
  const dbBalance = Number(String(balanceData?.balance ?? "0").replace(/,/g, ""));

  const utils = trpc.useUtils();
  const [purchasing, setPurchasing] = useState<number | null>(null);

  // 사용자 프로필 조회 (currentCycleLevel 포함)
  const { data: profile, isLoading: profileLoading } = trpc.user.getProfile.useQuery(
    undefined,
    { enabled: !!wallet }
  );

  // 레벨 업그레이드 뮤테이션
  const upgradeLevelMutation = trpc.user.updateLevel.useMutation({
    onSuccess: () => {
      toast.success("패키지 구매 완료!");
      setPurchasing(null);
      // 잔액 및 프로필 즉시 갱신
      utils.points.getBalance.invalidate();
      utils.user.getProfile.invalidate();
      refetchBalance();
    },
    onError: (error: any) => {
      toast.error(error.message || "구매 실패");
      setPurchasing(null);
    },
  });

  const handlePurchase = async (levelNum: number) => {
    if (!wallet) {
      toast.error("지갑을 연결해주세요");
      return;
    }
    if (!profile) {
      toast.error("사용자 정보를 불러올 수 없습니다");
      return;
    }

    setPurchasing(levelNum);
    upgradeLevelMutation.mutate({ level: levelNum });
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground/60">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>지갑 연결 필요</CardTitle>
            <CardDescription>매출 패키지를 구매하려면 지갑을 연결해주세요</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentLevel = profile?.level || 0;
  // currentCycleLevel: 이번 사이클에서 마지막으로 구매한 레벨 (0=미구매 또는 레벨4 완료 후 리셋)
  const cycleLevel = profile?.currentCycleLevel ?? 0;

  /**
   * 이중 검증 함수
   * [조건 1] 순서: 구매하려는 레벨의 이전 레벨이 현재 사이클에서 완료되어야 함
   * [조건 2] 잔액: pointBalance >= 해당 레벨 필요 DSHIB
   */
  const getLevelStatus = (levelNum: number) => {
    const requiredBalance = LEVEL_DSHIB_PRICES[levelNum];
    const hasEnoughBalance = dbBalance >= requiredBalance;

    // 순서 검증: 레벨 N을 구매하려면 cycleLevel이 N-1이어야 함
    const expectedPrevCycleLevel = levelNum - 1;
    const isCorrectOrder = cycleLevel === expectedPrevCycleLevel;

    // 두 조건 모두 만족해야 구매 가능
    const canPurchase = isCorrectOrder && hasEnoughBalance;

    // 잠금 이유 결정
    let lockReason: string | null = null;
    if (!isCorrectOrder) {
      if (levelNum === 1) {
        lockReason = cycleLevel > 0
          ? `레벨 ${cycleLevel} 진행 중 (레벨 4 완료 후 재진입 가능)`
          : "레벨 4 완료 후 재진입 가능";
      } else {
        lockReason = `레벨 ${levelNum - 1} 구매 필요`;
      }
    } else if (!hasEnoughBalance) {
      lockReason = `잔액 부족 (필요: ${requiredBalance.toLocaleString()} DSHIB)`;
    }

    return { canPurchase, isCorrectOrder, hasEnoughBalance, lockReason };
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary" />
            매출 패키지
          </h1>
          <p className="text-foreground/60">
            레벨을 순서대로 구매하여 조직을 확장하고 보너스를 획득하세요
          </p>
        </div>

        {/* 현재 상태 정보 */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-foreground/60 mb-1">최고 달성 레벨</p>
                <p className="text-2xl font-bold text-foreground">
                  {currentLevel > 0 ? `${currentLevel}레벨` : "미구매"}
                </p>
              </div>
              <div>
                <p className="text-sm text-foreground/60 mb-1">현재 사이클 진행</p>
                <p className="text-2xl font-bold text-primary">
                  {cycleLevel === 0
                    ? "레벨 1 구매 가능"
                    : cycleLevel === 4
                    ? "사이클 완료 (리셋)"
                    : `레벨 ${cycleLevel} 완료 → 레벨 ${cycleLevel + 1} 구매 가능`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-foreground/60 mb-1">DSHIB 잔액</p>
                <p className="text-2xl font-bold text-foreground">
                  {dbBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 패키지 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PACKAGES.map((pkg) => {
            const { canPurchase, isCorrectOrder, hasEnoughBalance, lockReason } = getLevelStatus(pkg.level);
            const isCurrentTarget = isCorrectOrder; // 이번 차례인 레벨

            return (
              <Card
                key={pkg.level}
                className={`relative overflow-hidden transition-all ${
                  !canPurchase ? "opacity-60" : ""
                } ${canPurchase ? "ring-2 ring-primary shadow-lg shadow-primary/20" : ""}`}
              >
                {/* 잠금 오버레이 */}
                {!canPurchase && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-10 gap-2">
                    <Lock className="w-8 h-8 text-white" />
                    {lockReason && (
                      <p className="text-white/80 text-xs text-center px-3 font-medium">{lockReason}</p>
                    )}
                  </div>
                )}

                <CardHeader className={`bg-gradient-to-r ${pkg.color} text-white`}>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-2xl">{pkg.level}레벨</CardTitle>
                    <span className={`${pkg.badge} px-2 py-1 rounded text-xs font-semibold text-white`}>
                      Level {pkg.level}
                    </span>
                  </div>
                  <CardDescription className="text-white/80">
                    {pkg.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-6">
                  {/* USDT 투자 금액 */}
                  <div className="mb-4">
                    <p className="text-sm text-foreground/60 mb-1">투자 금액</p>
                    <p className="text-2xl font-bold text-primary">
                      ${pkg.priceUSDT.toFixed(2)}
                    </p>
                    <p className="text-xs text-foreground/50">USDT</p>
                  </div>

                  {/* DSHIB 필요 잔액 */}
                  <div className="mb-4">
                    <p className="text-sm text-foreground/60 mb-1">필요 DSHIB 잔액</p>
                    <p className={`text-xl font-bold ${hasEnoughBalance ? "text-green-500" : "text-red-400"}`}>
                      {pkg.points.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {hasEnoughBalance ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-red-400" />
                      )}
                      <p className="text-xs text-foreground/50">
                        {hasEnoughBalance ? "잔액 충분" : "잔액 부족"}
                      </p>
                    </div>
                  </div>

                  {/* 순서 상태 */}
                  <div className="mb-6">
                    <div className="flex items-center gap-1">
                      {isCorrectOrder ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <Lock className="w-3 h-3 text-foreground/40" />
                      )}
                      <p className="text-xs text-foreground/50">
                        {isCorrectOrder ? "순서 조건 충족" : `순서 조건 미충족`}
                      </p>
                    </div>
                  </div>

                  {/* 구매 버튼 */}
                  {canPurchase ? (
                    <Button
                      onClick={() => handlePurchase(pkg.level)}
                      disabled={purchasing === pkg.level}
                      className="w-full"
                    >
                      {purchasing === pkg.level ? "구매 중..." : "구매하기"}
                    </Button>
                  ) : (
                    <div className="w-full py-2 px-4 bg-foreground/5 border border-foreground/10 rounded-lg text-center text-foreground/40 font-semibold text-sm">
                      🔒 잠금
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 순환 구조 안내 */}
        <Card className="mt-8 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              순환 구매 구조 안내
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-primary/5 rounded-lg p-4 mb-4">
              <p className="text-sm text-foreground/80 font-medium mb-2">구매 순서 규칙</p>
              <p className="text-sm text-foreground/60">
                각 사이클에서 반드시 <strong>레벨 1 → 2 → 3 → 4</strong> 순서로 구매해야 합니다.
                레벨 4 구매 완료 후 사이클이 리셋되어 레벨 1부터 다시 시작할 수 있습니다.
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <p className="text-sm text-amber-600 font-medium mb-2">⚠️ 이중 잠금 조건</p>
              <p className="text-sm text-foreground/60">
                구매 버튼이 활성화되려면 <strong>순서 조건</strong>과 <strong>잔액 조건</strong>을 모두 동시에 만족해야 합니다.
                둘 중 하나라도 충족되지 않으면 레벨은 잠금 상태를 유지합니다.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 레벨별 보너스 설명 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>레벨별 보너스 구조</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {PACKAGES.map((pkg) => (
                <div key={pkg.level} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                  <div className={`${pkg.badge} px-3 py-1 rounded text-xs font-semibold text-white whitespace-nowrap`}>
                    {pkg.level}레벨
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">
                      {pkg.points.toLocaleString()} DSHIB
                    </p>
                    <p className="text-sm text-foreground/60">
                      {pkg.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
