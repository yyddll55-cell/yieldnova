import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useWeb3 } from "@/hooks/useWeb3";
import { Loader2, Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function P2PTransfer() {
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();

  const { data: balanceData, refetch: refetchBalance } = trpc.points.getBalance.useQuery();
  const { data: myTransfers, refetch: refetchTransfers } = trpc.p2p.getMyTransfers.useQuery({ limit: 10 });
  const { data: withdrawalLimits } = trpc.p2p.getWithdrawalLimits.useQuery();
  const { data: feeSettingsData } = trpc.admin.getFeeSettings.useQuery();
  
  const minLimit = parseFloat(withdrawalLimits?.minLimit?.toString() || "100");
  const utils = trpc.useUtils();

  // DB pointBalance 사용 (실제 차감되는 잔액)
  const userBalance = Number(String(balanceData?.balance ?? "0").replace(/,/g, ""));
  
  // 수수료 설정 조회
  const p2pFeePercent = parseFloat(feeSettingsData?.p2pTransferFee || "3");
  const transferAmount = Number(String(amount).replace(/,/g, ""));
  const feeAmount = isNaN(transferAmount) || transferAmount <= 0 ? 0 : transferAmount * (p2pFeePercent / 100);
  const totalDeduction = transferAmount + feeAmount;
  const hasInsufficientBalance = totalDeduction > userBalance && transferAmount > 0;

  const transferMutation = trpc.p2p.transfer.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.recipientName}님에게 ${parseFloat(data.amount).toLocaleString()} YNV 전송 완료`);
      setRecipientId("");
      setAmount("");
      refetchBalance();
      refetchTransfers();
    },
    onError: (error: any) => {
      toast.error(error?.message || "전송 실패");
    },
  });

  const handleTransfer = async () => {
    if (!recipientId || !amount) {
      toast.error("모든 필드를 입력해주세요");
      return;
    }
    // 순수 숫자로 변환 (쉼표 제거 후 Number)
    const balance = userBalance;
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error("0보다 큰 금액을 입력해주세요");
      return;
    }
    if (transferAmount < minLimit) {
      toast.error(`최소 전송액은 ${minLimit.toLocaleString()} YNV입니다`);
      return;
    }
    // Sender-Pays 방식: 본금 + 수수료 합계 검증
    if (totalDeduction > balance) {
      toast.error(`잔액이 부족합니다 (수수료 포함). 필요: ${totalDeduction.toLocaleString()} YNV, 보유: ${balance.toLocaleString()} YNV`);
      return;
    }
    setIsLoading(true);
    try {
      await transferMutation.mutateAsync({
        recipientWalletOrId: recipientId,
        amount: amount,
      });
    } catch (_) {}
    setIsLoading(false);
  };



  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <div className="border-b border-white/5 bg-[#0d1117]/90 backdrop-blur-sm">
        <div className="container py-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/app")} className="text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> 돌아가기
          </Button>
          <h1 className="text-2xl font-bold text-white">P2P YNV 전송</h1>
          <p className="text-slate-400 text-sm mt-1">다른 회원에게 YNV를 내부 전송합니다</p>
        </div>
      </div>

      <div className="container py-8 max-w-2xl">
        <Card className="bg-slate-800 border-slate-700 p-6">
          {/* 잔액 */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <p className="text-blue-300 text-sm">내 YNV 잔액: <span className="font-bold text-lg">{userBalance.toLocaleString()}</span></p>
          </div>

          {/* 받는 사람 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">받는 사람 (지갑 주소 또는 ID)</label>
            <Input
              type="text"
              placeholder="0x... 또는 숫자 ID"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* 보낼 수량 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">보낼 YNV 수량</label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
              min="0"
            />
          </div>

          {/* 수수료 및 총 차감 수량 표시 */}
          {transferAmount > 0 && (
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">수수료</span>
                <span className="text-sm font-medium text-yellow-400">{feeAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} YNV ({p2pFeePercent}%)</span>
              </div>
              <div className="border-t border-slate-600 pt-2 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-200">총 차감 수량</span>
                <span className={`text-sm font-bold ${hasInsufficientBalance ? 'text-red-400' : 'text-cyan-400'}`}>
                  {totalDeduction.toLocaleString(undefined, { maximumFractionDigits: 2 })} YNV
                </span>
              </div>
            </div>
          )}

          {/* 잔액 부족 경고 */}
          {hasInsufficientBalance && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
              <p className="text-red-300 text-sm">⚠️ 잔액이 부족합니다 (수수료 포함)</p>
            </div>
          )}

          {/* 전송 버튼 */}
          <Button
            onClick={handleTransfer}
            disabled={isLoading || !recipientId || !amount || hasInsufficientBalance}
            className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 전송 중...</> : <><Send className="w-4 h-4 mr-2" /> 전송하기</>}
          </Button>
        </Card>

        {/* 최근 전송 이력 */}
        {myTransfers && myTransfers.length > 0 && (
          <Card className="bg-slate-800 border-slate-700 p-6 mt-6">
            <h3 className="font-semibold text-white mb-4">최근 전송 이력</h3>
            <div className="space-y-2">
              {myTransfers.map((tx: any) => (
                <div key={tx.id} className="flex justify-between items-center border-b border-slate-700 pb-2">
                  <span className="text-sm text-slate-400">→ #{tx.toUserId}</span>
                  <span className="text-sm font-medium text-red-400">-{parseFloat(tx.amount).toLocaleString()} YNV</span>
                  <span className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleDateString("ko-KR")}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
