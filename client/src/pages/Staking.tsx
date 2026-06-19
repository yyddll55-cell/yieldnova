import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, TrendingUp, Zap, ArrowRight, Loader2, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Staking() {
  const [stakeAmount, setStakeAmount] = useState("");
  const [stakeDuration, setStakeDuration] = useState<"180" | "360">("180");
  const [restakeAmount, setRestakeAmount] = useState("");
  const [restakeDuration, setRestakeDuration] = useState<"180" | "360">("180");
  const [isStaking, setIsStaking] = useState(false);
  const [isRestaking, setIsRestaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [unstakeAmount, setUnstakeAmount] = useState("");

  // 스테이킹 정보 조회
  const { data: stakingInfo, refetch: refetchStakingInfo } = trpc.staking.getInfo.useQuery();

  // 스테이킹 뮤테이션
  const stakeMutation = trpc.staking.stake.useMutation({
    onSuccess: () => {
      toast.success("✅ 스테이킹 완료!");
      setStakeAmount("");
      setIsStaking(false);
      refetchStakingInfo();
    },
    onError: (error: any) => {
      toast.error(error?.message || "스테이킹 실패");
      setIsStaking(false);
    },
  });

  // 리스테이킹 뮤테이션
  const restakeMutation = trpc.staking.restake.useMutation({
    onSuccess: () => {
      toast.success("✅ 리스테이킹 완료!");
      setRestakeAmount("");
      setIsRestaking(false);
      refetchStakingInfo();
    },
    onError: (error: any) => {
      toast.error(error?.message || "리스테이킹 실패");
      setIsRestaking(false);
    },
  });

  // 언스테이킹 뮤테이션
  const unstakeMutation = trpc.staking.unstake.useMutation({
    onSuccess: () => {
      toast.success("✅ 언스테이킹 완료!");
      setUnstakeAmount("");
      setIsUnstaking(false);
      refetchStakingInfo();
    },
    onError: (error: any) => {
      toast.error(error?.message || "언스테이킹 실패");
      setIsUnstaking(false);
    },
  });

  // 리워드 → 레벨 진입 뮤테이션
  const rewardToLevelMutation = trpc.staking.rewardToLevel.useMutation({
    onSuccess: () => {
      toast.success("✅ 리워드가 레벨 진입 지갑으로 이동되었습니다!");
      refetchStakingInfo();
    },
    onError: (error: any) => {
      toast.error(error?.message || "이동 실패");
    },
  });

  const handleStake = () => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) {
      toast.error("올바른 금액을 입력해주세요.");
      return;
    }
    setIsStaking(true);
    stakeMutation.mutate({ amount: stakeAmount, durationDays: stakeDuration });
  };

  const handleRestake = () => {
    const amount = parseFloat(restakeAmount);
    if (!amount || amount <= 0) {
      toast.error("올바른 금액을 입력해주세요.");
      return;
    }
    setIsRestaking(true);
    restakeMutation.mutate({ amount: restakeAmount, durationDays: restakeDuration });
  };

  const handleUnstake = () => {
    const amount = parseFloat(unstakeAmount);
    if (!amount || amount <= 0) {
      toast.error("올바른 금액을 입력해주세요.");
      return;
    }
    setIsUnstaking(true);
    unstakeMutation.mutate({ amount: unstakeAmount });
  };

  const handleMoveRewardToLevel = (amount: string) => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error("올바른 금액을 입력해주세요.");
      return;
    }
    rewardToLevelMutation.mutate({ amount });
  };

  const stakedBal = parseFloat(String(stakingInfo?.stakedBalance || "0"));
  const rewardBal = parseFloat(String(stakingInfo?.rewardBalance || "0"));
  const p2pReceivedBal = parseFloat(String(stakingInfo?.p2pReceivedBalance || "0"));
  const dailyRate180 = stakingInfo?.dailyInterestRate180 || 1.0;
  const dailyRate360 = stakingInfo?.dailyInterestRate360 || 1.5;
  const minInitial = stakingInfo?.minInitial || 10000;
  const minRestake = stakingInfo?.minRestake || 1000;

  // 선택된 기간에 따른 일일 이자율
  const selectedRate = stakeDuration === "180" ? dailyRate180 : dailyRate360;
  // 예상 일일 이자 계산
  const estimatedDailyInterest = stakedBal * (selectedRate / 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-2">
            <TrendingUp className="w-8 h-8 text-cyan-400" />
            스테이킹 엔진
          </h1>
          <p className="text-slate-400">DSHIB를 스테이킹하여 매일 이자를 얻으세요</p>
        </div>

        {/* 잔액 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 스테이킹 잔액 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">스테이킹 잔액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-cyan-400">{stakedBal.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">DSHIB</p>
              <div className="mt-3 p-2 bg-cyan-900/20 rounded border border-cyan-500/30">
                <p className="text-xs text-cyan-300">
                  📊 일일 이자: <span className="font-bold">{estimatedDailyInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> DSHIB
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 리워드 잔액 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">리워드 잔액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">{rewardBal.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">DSHIB (Reward Interest Wallet)</p>
              <div className="mt-3 p-2 bg-yellow-900/20 rounded border border-yellow-500/30">
                <p className="text-xs text-yellow-300">
                  💰 누적된 이자 수익
                </p>
              </div>
            </CardContent>
          </Card>

          {/* P2P 수신 잔액 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">P2P 수신 잔액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-400">{p2pReceivedBal.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">DSHIB (레벨 진입 전용)</p>
              <div className="mt-3 p-2 bg-orange-900/20 rounded border border-orange-500/30">
                <p className="text-xs text-orange-300">
                  🔒 재전송 불가, 레벨만 사용
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 스테이킹 탭 */}
        <Tabs defaultValue="stake" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border border-slate-700">
            <TabsTrigger value="stake" className="data-[state=active]:bg-cyan-600">
              스테이킹
            </TabsTrigger>
            <TabsTrigger value="restake" className="data-[state=active]:bg-yellow-600">
              리스테이킹
            </TabsTrigger>
            <TabsTrigger value="unstake" className="data-[state=active]:bg-red-600">
              언스테이킹
            </TabsTrigger>
          </TabsList>

          {/* 스테이킹 탭 */}
          <TabsContent value="stake" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">초기 스테이킹</CardTitle>
                <CardDescription className="text-slate-400">
                  보유한 DSHIB를 스테이킹하여 매일 이자를 받으세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 스테이킹 기간 선택 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">스테이킹 기간 선택</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setStakeDuration("180")}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        stakeDuration === "180"
                          ? "bg-cyan-600 border-cyan-400 text-white"
                          : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="font-medium">180일</div>
                      <div className="text-xs mt-1">일 {dailyRate180}%</div>
                    </button>
                    <button
                      onClick={() => setStakeDuration("360")}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        stakeDuration === "360"
                          ? "bg-yellow-600 border-yellow-400 text-white"
                          : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="font-medium">360일</div>
                      <div className="text-xs mt-1">일 {dailyRate360}%</div>
                    </button>
                  </div>
                </div>

                {/* 최소 수량 안내 */}
                <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-300">
                    <p className="font-medium">최소 스테이킹: {minInitial.toLocaleString()} DSHIB</p>
                    <p className="text-xs mt-1">이 금액 이상을 스테이킹해야 합니다.</p>
                  </div>
                </div>

                {/* 입력 필드 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">스테이킹 금액 (DSHIB)</label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder={`최소 ${minInitial.toLocaleString()} DSHIB 이상`}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                {/* 이자율 정보 */}
                <div className="p-3 bg-slate-700 rounded-lg">
                  <p className="text-sm text-slate-300">
                    <span className="font-medium">예상 일일 이자:</span>{" "}
                    <span className="text-cyan-400 font-bold">
                      {(parseFloat(stakeAmount || "0") * (selectedRate / 100)).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      DSHIB/일
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    일일 이자율: {selectedRate}% (매일 자동 적립)
                  </p>
                </div>

                <Button
                  onClick={handleStake}
                  disabled={isStaking || !stakeAmount}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {isStaking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      스테이킹 중...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      스테이킹 실행
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 리스테이킹 탭 */}
          <TabsContent value="restake" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">리워드 리스테이킹</CardTitle>
                <CardDescription className="text-slate-400">
                  누적된 이자를 다시 스테이킹하여 복리 수익을 얻으세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 리스테이킹 기간 선택 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">리스테이킹 기간 선택</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setRestakeDuration("180")}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        restakeDuration === "180"
                          ? "bg-cyan-600 border-cyan-400 text-white"
                          : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="font-medium">180일</div>
                      <div className="text-xs mt-1">일 {dailyRate180}%</div>
                    </button>
                    <button
                      onClick={() => setRestakeDuration("360")}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        restakeDuration === "360"
                          ? "bg-yellow-600 border-yellow-400 text-white"
                          : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="font-medium">360일</div>
                      <div className="text-xs mt-1">일 {dailyRate360}%</div>
                    </button>
                  </div>
                </div>

                {/* 현재 리워드 잡액 */}
                <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-300">
                    <span className="font-medium">현재 리워드 잡액:</span>{" "}
                    <span className="text-yellow-400 font-bold">{rewardBal.toLocaleString()} DSHIB</span>
                  </p>
                </div>

                {/* 최소 수량 안내 */}
                <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-300">
                    <p className="font-medium">최소 리스테이킹: {minRestake.toLocaleString()} DSHIB</p>
                    <p className="text-xs mt-1">리워드 지갑에서 이 금액 이상을 리스테이킹할 수 있습니다.</p>
                  </div>
                </div>

                {/* 입력 필드 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">리스테이킹 금액 (DSHIB)</label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={restakeAmount}
                    onChange={(e) => setRestakeAmount(e.target.value)}
                    placeholder={`최소 ${minRestake.toLocaleString()} DSHIB 이상`}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                {/* 복리 효과 */}
                <div className="p-3 bg-slate-700 rounded-lg">
                  <p className="text-sm text-slate-300">
                    <span className="font-medium">추가 일일 이자:</span>{" "}
                    <span className="text-yellow-400 font-bold">
                      {(parseFloat(restakeAmount || "0") * (selectedRate / 100)).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      DSHIB/일
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    리스테이킹으로 일일 이자가 증가합니다 (복리 효과)
                  </p>
                </div>

                <Button
                  onClick={handleRestake}
                  disabled={isRestaking || !restakeAmount}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {isRestaking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      리스테이킹 중...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      리스테이킹 실행
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* 리워드 → 레벨 진입 빠른 이동 */}
            {rewardBal > 0 && (
              <Card className="bg-slate-800 border-slate-700 border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-sm text-green-400">리워드 → 레벨 진입 이동</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-400">
                    리워드 지갑의 DSHIB를 레벨 진입 지갑으로 이동하여 레벨을 활성화할 수 있습니다.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleMoveRewardToLevel(rewardBal.toString())}
                      disabled={rewardToLevelMutation.isPending}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />
                      전액 이동
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 언스테이킹 탭 */}
          <TabsContent value="unstake" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">언스테이킹</CardTitle>
                <CardDescription className="text-slate-400">
                  스테이킹된 DSHIB를 다시 인출합니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 현재 스테이킹 잔액 */}
                <div className="p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
                  <p className="text-sm text-cyan-300">
                    <span className="font-medium">현재 스테이킹 잔액:</span>{" "}
                    <span className="text-cyan-400 font-bold">{stakedBal.toLocaleString()} DSHIB</span>
                  </p>
                </div>

                {/* 경고 */}
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-300">
                    <p className="font-medium">주의</p>
                    <p className="text-xs mt-1">언스테이킹하면 일일 이자 수익이 중단됩니다.</p>
                  </div>
                </div>

                {/* 입력 필드 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">언스테이킹 금액 (DSHIB)</label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    placeholder="금액 입력"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <Button
                  onClick={handleUnstake}
                  disabled={isUnstaking || !unstakeAmount}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  {isUnstaking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      언스테이킹 중...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      언스테이킹 실행
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 지갑 분리 규칙 안내 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm text-white">지갑 분리 규칙</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-2 p-2 bg-green-900/20 border border-green-500/30 rounded">
              <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-300">
                <span className="font-medium">허용:</span> 리워드 지갑 → 레벨 진입 지갑
              </p>
            </div>
            <div className="flex gap-2 p-2 bg-red-900/20 border border-red-500/30 rounded">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300">
                <span className="font-medium">차단:</span> 레벨 진입 지갑 → 리워드/스테이킹 역방향 불가
              </p>
            </div>
            <div className="flex gap-2 p-2 bg-red-900/20 border border-red-500/30 rounded">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300">
                <span className="font-medium">차단:</span> P2P 수신 자산은 재전송/스테이킹 불가 (레벨 진입만 가능)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
