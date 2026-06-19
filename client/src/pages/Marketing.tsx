
import { trpc } from "@/lib/trpc";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Zap, Shield, Users, DollarSign,
  ArrowRight, Activity, Globe, Lock, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { useWeb3 } from "@/hooks/useWeb3";
import { useState, useMemo } from "react";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0d1117] border border-blue-500/30 rounded-xl p-3 shadow-xl">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <p className="text-base font-bold text-blue-400">${parseFloat(payload[0].value).toFixed(4)}</p>
        <p className="text-xs text-gray-500">DSHIB / USDT</p>
      </div>
    );
  }
  return null;
};

export default function Marketing() {
  const [, setLocation] = useLocation();
  const { wallet } = useWeb3();
  const [priceModalOpen, setPriceModalOpen] = useState(false);

  // URL ?ref= 파라미터를 /app 이동 시 유지 + localStorage 백업
  const goToApp = () => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("ynv_referrer", ref);
    }
    setLocation(ref ? `/app?ref=${ref}` : "/app");
  };

  const shortenAddress = (addr: string | null) => {
    if (!addr) return null;
    return `${addr.slice(0, 6)}...${addr.slice(-5)}`;
  };
  const displayAddress = shortenAddress(wallet?.address || null);

  // 관리자가 설정한 실제 가격 데이터 조회 (자동 연동)
  const { data: priceHistory } = trpc.pointPrice.getPriceHistory.useQuery(
    { days: 30 },
    { refetchOnMount: true, staleTime: 0, refetchInterval: 30000 }
  );
  const { data: currentPrice } = trpc.pointPrice.getCurrentPrice.useQuery(
    undefined,
    { refetchOnMount: true, staleTime: 0, refetchInterval: 30000 }
  );

  const chartData = useMemo(() => {
    return priceHistory?.map((item) => ({
      date: new Date(item.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
      price: parseFloat(item.priceUSD.toString()),
    })) || [];
  }, [priceHistory]);

  const currentPriceVal = parseFloat(currentPrice?.priceUSD?.toString() || "0.01");
  const prices = chartData.map((d) => d.price);
  const firstPrice = prices[0] || currentPriceVal;
  const priceChangePct = firstPrice > 0 ? (((currentPriceVal - firstPrice) / firstPrice) * 100).toFixed(2) : "0.00";
  const isPositive = currentPriceVal >= firstPrice;

  const FEATURES = [
    { icon: Zap, title: "고수익 DeFi", desc: "DSHIB 토큰 기반 스마트 수익 시스템으로 안정적인 수익을 창출하세요.", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    { icon: Users, title: "바이너리 조직", desc: "좌우 2진 트리 구조로 팀을 구성하고 추천 보너스를 받으세요.", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { icon: Shield, title: "BSC 블록체인", desc: "Binance Smart Chain 기반으로 투명하고 안전한 거래를 보장합니다.", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
    { icon: DollarSign, title: "USDT 출금", desc: "DSHIB를 USDT로 환전하여 언제든지 출금할 수 있습니다.", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  ];

  const PACKAGES = [
    { name: "스타터", price: 20, level: 1, color: "from-blue-600 to-blue-800", badge: "입문" },
    { name: "실버", price: 33.33, level: 2, color: "from-slate-500 to-slate-700", badge: "인기" },
    { name: "골드", price: 60, level: 3, color: "from-yellow-600 to-yellow-800", badge: "추천" },
    { name: "플래티넘", price: 93.33, level: 4, color: "from-purple-600 to-purple-800", badge: "VIP" },
  ];

  // YNV 환산 계산: USDT × 1,500 = YNV
  const calculateDSHIB = (usdtAmount: number) => {
    return (usdtAmount * 1500).toLocaleString();
  };

  const STATS = [
    { label: "총 사용자", value: "12,400+", icon: Users },
    { label: "총 거래량", value: "$2.4M+", icon: DollarSign },
    { label: "지원 국가", value: "30+", icon: Globe },
    { label: "업타임", value: "99.9%", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#060b14] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#060b14]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">Dogeshiba</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">특징</a>
            <a href="#chart" className="hover:text-white transition-colors">시세</a>
            <a href="#packages" className="hover:text-white transition-colors">패키지</a>

          </div>
          {wallet ? (
            <div className="flex items-center gap-3">
              <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400 font-mono">
                {displayAddress}
              </div>
              <Button
                onClick={goToApp}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-9"
              >
                앱 이동 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={goToApp}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-9"
            >
              지갑 연결 <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 text-sm text-blue-400 mb-8">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            현재 DSHIB 가격: ${currentPriceVal.toFixed(9)} USDT
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Dogeshiba
            </span>
            <br />
            <span className="text-white">DeFi 플랫폼</span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            BSC 블록체인 기반 DSHIB 토큰으로 스마트한 수익을 창출하세요.
            바이너리 조직 구조와 USDT 출금 시스템을 갖춘 차세대 DeFi 플랫폼입니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
            onClick={goToApp}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-14 px-8 text-base font-semibold shadow-lg shadow-blue-600/30"
            >
              지금 시작하기 <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              onClick={() => setPriceModalOpen(true)}
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5 h-14 px-8 text-base"
            >
              시세 확인하기 <TrendingUp className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>





      {/* Features */}
      <section id="features" className="py-20 px-4 bg-white/2">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              왜 <span className="text-blue-400">Dogeshiba</span>인가?
            </h2>
            <p className="text-gray-400">차세대 DeFi 플랫폼의 핵심 기능</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className={`p-6 bg-[#0d1117] border ${f.bg} hover:scale-105 transition-transform`}>
                  <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${f.color}`} />
                  </div>
                  <h3 className="font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              투자 <span className="text-blue-400">패키지</span>
            </h2>
            <p className="text-gray-400">목표에 맞는 패키지를 선택하세요</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PACKAGES.map((pkg) => (
              <div key={pkg.name} className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-b ${pkg.color} rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity`} />
                <Card className="relative p-6 bg-[#0d1117] border-white/10 rounded-2xl hover:border-white/20 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs bg-white/10 text-white px-2 py-1 rounded-full">{pkg.badge}</span>
                    <span className="text-xs text-gray-500">레벨 {pkg.level}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{pkg.name}</h3>
                  <p className="text-3xl font-black text-white mb-1">${pkg.price.toFixed(2)}</p>
                  <p className="text-sm text-gray-400 mb-4">USDT 투자</p>
                  <div className="bg-white/5 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-500 mb-1">받는 DSHIB</p>
                    <p className="font-bold text-blue-400">{calculateDSHIB(pkg.price)} YNV</p>
                  </div>
                  <Button
              onClick={goToApp}
              className="w-full bg-white/10 hover:bg-white/20 text-white"
                    size="sm"
                  >
                    시작하기 <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-3xl p-12">
            <Lock className="w-12 h-12 text-blue-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-gray-400 mb-8 text-lg">
              MetaMask 또는 TokenPocket 지갑으로 BSC 네트워크에 연결하고<br />
              Dogeshiba DeFi 플랫폼을 경험하세요.
            </p>
            <Button
              onClick={goToApp}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-14 px-10 text-lg font-semibold shadow-xl shadow-blue-600/30"
            >
              앱 시작하기 <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-400">Dogeshiba DeFi</span>
          </div>
          <p className="text-xs text-gray-600">© 2026 Dogeshiba. All rights reserved. BSC Network.</p>
        </div>
      </footer>

      {/* Price Modal */}
      <Dialog open={priceModalOpen} onOpenChange={setPriceModalOpen}>
        <DialogContent className="bg-[#0d1117] border border-blue-500/30 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">YNV 현재 가격</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-6xl font-bold text-blue-400 mb-2">
              ${currentPriceVal.toFixed(9)}
            </div>
            <p className="text-gray-400 text-lg">USDT</p>
            <p className="text-gray-500 text-sm mt-4">Dogeshiba DeFi 플랫폼</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
