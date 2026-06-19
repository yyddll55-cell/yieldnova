import { useWeb3 } from "@/hooks/useWeb3";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, Users, Zap, Package, AlertCircle, Gift, ArrowLeftRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { t } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Home() {
  const web3 = useWeb3();
  const [, setLocation] = useLocation();
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const [referrerRegistered, setReferrerRegistered] = useState(false);
  const { language, setLanguage } = useLanguage();

  // 추천인 등록 mutation (URL ?ref= 파라미터)
  const setReferrerMutation = trpc.user.setReferrer.useMutation({
    onSuccess: (data) => {
      if (data?.success) {
        console.log("[Referrer] 추천인 등록 성공:", data.referrerName);
        // 등록 성공 후 URL에서 ref 파라미터 제거
        const url = new URL(window.location.href);
        url.searchParams.delete("ref");
        window.history.replaceState({}, "", url.toString());
      }
      setReferrerRegistered(true);
    },
    onError: () => setReferrerRegistered(true),
  });

  // DSHIB 시세
  const { data: priceData } = trpc.pointPrice.getCurrentPrice.useQuery();

  // 사용자 프로필 조회 (지갑 연결 후)
  const { data: profile, isLoading: profileLoading } = trpc.user.getProfile.useQuery(
    undefined,
    { enabled: !!web3.wallet }
  );

  // 조직도 통계 조회
  const { data: orgStats } = trpc.organization.getOrganizationStats.useQuery(
    undefined,
    { enabled: !!web3.wallet }
  );

  // DSHIB 거래 내역
  const { data: transactions } = trpc.points.getTransactionHistory.useQuery(
    { limit: 5 },
    { enabled: !!web3.wallet }
  );
  // DB pointBalance 조회 (실제 지갑 잔액)
  const { data: balanceData, refetch: refetchBalance } = trpc.points.getBalance.useQuery(
    undefined,
    { enabled: !!web3.wallet }
  );
  const dbBalance = Number(String(balanceData?.balance ?? "0").replace(/,/g, ""));

  // P2P 수신 총액 + 어드민 지급 총액
  const { data: receiptSummary } = trpc.points.getReceiptSummary.useQuery(
    undefined,
    { enabled: !!web3.wallet }
  );

  // 지갑 연결 후 ?ref= 파라미터로 추천인 자동 등록 (URL + localStorage 이중 확인)
  useEffect(() => {
    if (!web3.wallet || referrerRegistered) return;
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get("ref") || localStorage.getItem("ynv_referrer");
    if (refParam && refParam.trim()) {
      setReferrerMutation.mutate({ referrerWalletOrId: refParam.trim() });
      // 사용 후 localStorage 정리
      localStorage.removeItem("ynv_referrer");
    } else {
      setReferrerRegistered(true); // ref 파라미터 없으면 스킵
    }
  }, [web3.wallet, referrerRegistered]);

  // 페이지 로드 시 자동으로 지갑 연결 시도
  useEffect(() => {
    const autoConnect = async () => {
      if (autoConnectAttempted) return;

      setAutoConnectAttempted(true);

      // window.ethereum이 있으면 자동으로 연결 시도
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          // 이미 연결된 계정이 있는지 확인
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });

          if (accounts && accounts.length > 0) {
            // 이미 연결된 계정이 있으면 자동으로 로그인
            web3.connect();
          } else {
            // 연결된 계정이 없으면 eth_requestAccounts 호출
            web3.connect();
          }
        } catch (error) {
          console.error("Auto-connect failed:", error);
        }
      }
    };

    autoConnect();
  }, [autoConnectAttempted, web3]);

  // 지갑 미연결 상태 - 지갑 연결 버튼 표시
  if (!web3.wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Dogeshiba DeFi
            </CardTitle>
            <CardDescription className="text-slate-400 mt-2">{t("dashboard.title", language)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300 text-center text-sm">
              {autoConnectAttempted ? "지갑을 수동으로 연결하세요" : "지갑을 자동으로 감지하고 있습니다..."}
            </p>
            {web3.error && web3.error !== "Wallet not available" && (
              <div className="flex gap-2 items-start bg-red-950/30 p-3 rounded">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{web3.error}</p>
              </div>
            )}
            <Button
              onClick={web3.connect}
              disabled={web3.isConnecting}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold"
              size="lg"
            >
              <Wallet className="w-5 h-5 mr-2" />
              {web3.isConnecting ? t("common.loading", language) : t("nav.connect_wallet", language)}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              MetaMask 또는 TokenPocket을 사용하여 BSC 네트워크에 연결하세요
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 지갑 연결 완료 - 대시보드 렌더링
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container py-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold gradient-text">Dogeshiba DeFi</h1>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLanguage("ko")}
                    className={`px-2 py-1 text-sm font-medium rounded transition-all ${
                      language === "ko"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🇰🇷 KR
                  </button>
                  <button
                    onClick={() => setLanguage("en")}
                    className={`px-2 py-1 text-sm font-medium rounded transition-all ${
                      language === "en"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🇺🇸 EN
                  </button>
                  <button
                    onClick={() => setLanguage("jp")}
                    className={`px-2 py-1 text-sm font-medium rounded transition-all ${
                      language === "jp"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🇯🇵 JP
                  </button>
                  <button
                    onClick={() => setLanguage("cn")}
                    className={`px-2 py-1 text-sm font-medium rounded transition-all ${
                      language === "cn"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🇨🇳 CN
                  </button>
                  <button
                    onClick={() => setLanguage("vn")}
                    className={`px-2 py-1 text-sm font-medium rounded transition-all ${
                      language === "vn"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🇻🇳 VN
                  </button>
                </div>
              </div>
              <p className="text-muted-foreground mt-1">{t("app.subtitle", language)}</p>
            </div>
            <div className="flex gap-4 items-center">
              <LanguageSwitcher />
              {web3.wallet && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{t("wallet.connected", language)}</p>
                  <p className="font-mono text-sm">
                    {web3.wallet.address.substring(0, 6)}...{web3.wallet.address.substring(-4)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {web3.error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
            {web3.error}
          </div>
        )}

        {profileLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("common.loading", language)}</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Point Balance */}
              <Card className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t("token.ynv_balance", language)}</p>
                    <p className="text-3xl font-bold text-primary">
                      {dbBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Zap className="w-8 h-8 text-yellow-400" />
                </div>
              </Card>

              {/* Current Level */}
              <Card className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t("deposit.current_level", language)}</p>
                    <p className="text-3xl font-bold text-purple-400">
                      {profile?.level || "0"}
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-purple-400" />
                </div>
              </Card>

              {/* Downline Count */}
              <Card className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t("organization.downline", language)}</p>
                    <p className="text-3xl font-bold text-green-400">
                      {orgStats?.downlineCount || "0"}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-green-400" />
                </div>
              </Card>

              {/* Point Price */}
              <Card className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t("token.ynv_price", language)}</p>
                    <p className="text-3xl font-bold text-orange-400">
                      ${priceData?.priceUSD || "0.01"}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-400" />
                </div>
              </Card>
            </div>

            {/* Wallet Info */}
            {web3.wallet && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* USDT Balance */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">USDT {t("wallet.balance", language)}</h3>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-blue-400">
                      0.00
                    </p>
                    <p className="text-sm text-muted-foreground">Binance Smart Chain</p>
                  </div>
                </Card>

                {/* DSHIB Balance */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">DSHIB {t("token.ynv_balance", language)}</h3>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-purple-400">
                      {dbBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">Dogeshiba Token</p>
                  </div>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Button className="h-12 gap-2" variant="default" onClick={() => setLocation('/package')}>
                <Package className="w-4 h-4" />
                {language === 'en' ? 'Revenue Package' : '매출 패키지'}
              </Button>
              <Button className="h-12 gap-2" variant="default" onClick={() => setLocation('/deposit')}>
                <Wallet className="w-4 h-4" />
                {t("deposit.title", language)}
              </Button>
              <Button className="h-12 gap-2" variant="default"
                disabled={profile?.isCreditAccount && parseFloat(String(profile?.creditOwed || '0')) > 0}
                onClick={() => {
                  if (profile?.isCreditAccount && parseFloat(String(profile?.creditOwed || '0')) > 0) {
                    toast.error('외상 대여금 상환 완료 후 출금이 가능합니다');
                    return;
                  }
                  setLocation('/withdrawal');
                }}>
                <TrendingUp className="w-4 h-4" />
                {t("withdrawal.title", language)}
              </Button>
              <Button className="h-12 gap-2" variant="default" onClick={() => setLocation('/organization')}>
                <Users className="w-4 h-4" />
                {t("organization.title", language)}
              </Button>
              <Button className="h-12 gap-2" variant="default"
                disabled={profile?.isCreditAccount && parseFloat(String(profile?.creditOwed || '0')) > 0}
                onClick={() => {
                  if (profile?.isCreditAccount && parseFloat(String(profile?.creditOwed || '0')) > 0) {
                    toast.error('외상 대여금 상환 완료 후 전송이 가능합니다');
                    return;
                  }
                  setLocation('/p2p-transfer');
                }}>
                <ArrowLeftRight className="w-4 h-4" />
                P2P 전송
              </Button>
              <Button className="h-12 gap-2" variant="default" onClick={() => setLocation('/staking')}>
                <TrendingUp className="w-4 h-4" />
                스테이킹
              </Button>
            </div>

            {/* Referral Link Section */}
            {web3.wallet && (
              <Card className="p-6 mb-8 border-cyan-500/30 bg-cyan-500/5">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-cyan-400" />
                  {t("referral.my_referral_link", language)}
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`https://yieldnova-k5ft.vercel.app?ref=${web3.wallet.address}`}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm font-mono text-slate-300"
                    />
                    <Button
                      onClick={() => {
                        if (web3.wallet) {
                          navigator.clipboard.writeText(`https://yieldnova-k5ft.vercel.app?ref=${web3.wallet.address}`);
                          alert("링크가 복사되었습니다!");
                        }
                      }}
                      className="bg-cyan-600 hover:bg-cyan-700"
                      size="sm"
                    >
                      {t("common.copy", language)}
                    </Button>
                  </div>
                  <p className="text-sm text-slate-400">
                    {language === 'en' ? 'Share this link and earn referral bonuses when friends sign up.' : '이 링크를 공유하면 친구들이 가입할 때 당신이 추천인으로 등록됩니다.'}
                  </p>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">{language === 'en' ? 'Referrals' : '추천한 회원'}</p>
                      <p className="text-2xl font-bold text-cyan-400">{orgStats?.directReferralCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">{t("referral.direct_bonus", language)}</p>
                      <p className="text-2xl font-bold text-green-400">{Number(profile?.referralBonusBalance || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700 mt-2">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">{language === 'en' ? 'Downline' : '하위조직'}</p>
                      <p className="text-2xl font-bold text-slate-300">{orgStats?.downlineCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">{language === 'en' ? '10-Level Donation' : '10대 기부 보너스'}</p>
                      <p className="text-2xl font-bold text-yellow-400">{Number(profile?.donationBonusBalance || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700 mt-2">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">{language === 'en' ? 'P2P Received' : 'P2P 수신 총액'}</p>
                      <p className="text-2xl font-bold text-blue-400">{Number(receiptSummary?.p2pReceived || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">{language === 'en' ? 'Admin Granted' : '관리자 지급 총액'}</p>
                      <p className="text-2xl font-bold text-purple-400">{Number(receiptSummary?.adminDeposited || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Recent Transactions */}
            {transactions && transactions.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">{language === 'en' ? 'Recent Transactions' : '최근 거래'}</h3>
                <div className="space-y-3">
                  {transactions.map((tx: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-card/50 rounded border border-border">
                      <div>
                        <p className="text-sm font-medium">{tx.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {['deposit', 'bonus_direct_referral', 'bonus_upline_matching', 'p2p_receive', 'admin_credit'].includes(tx.type) ? '+' : '-'}{tx.amount}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
