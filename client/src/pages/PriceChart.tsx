import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowLeft,
  Activity,
  BarChart2,
  DollarSign,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

const PERIODS = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0d1117] border border-blue-500/30 rounded-xl p-4 shadow-2xl shadow-blue-500/10">
        <p className="text-xs text-muted-foreground mb-2">{label}</p>
        <p className="text-lg font-bold text-blue-400">
          ${parseFloat(payload[0].value).toFixed(4)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">DSHIB / USDT</p>
      </div>
    );
  }
  return null;
};

export default function PriceChart() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [newPrice, setNewPrice] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch price history
  const { data: priceHistory, refetch: refetchHistory } = trpc.pointPrice.getPriceHistory.useQuery(
    { days: selectedPeriod },
    { refetchOnMount: true, staleTime: 0 }
  );

  // Fetch current price
  const { data: currentPrice } = trpc.pointPrice.getCurrentPrice.useQuery();

  // Update price mutation
  const updatePriceMutation = trpc.pointPrice.setPrice.useMutation({
    onSuccess: () => {
      toast.success("DSHIB 가격이 업데이트되었습니다");
      setNewPrice("");
      refetchHistory();
    },
    onError: () => {
      toast.error("가격 업데이트 실패");
    },
  });

  const handleUpdatePrice = async () => {
    if (!newPrice || parseFloat(newPrice) <= 0) {
      toast.error("유효한 가격을 입력해주세요");
      return;
    }
    setIsUpdating(true);
    try {
      await updatePriceMutation.mutateAsync({
        date: new Date().toISOString().split("T")[0],
        priceUSD: newPrice,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    return (
      priceHistory?.map((item) => ({
        date: new Date(item.date).toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
        }),
        price: parseFloat(item.priceUSD.toString()),
        fullDate: item.date,
      })) || []
    );
  }, [priceHistory]);

  // Stats
  const currentPriceVal = parseFloat(currentPrice?.priceUSD?.toString() || "0.01");
  const prices = chartData.map((d) => d.price);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const firstPrice = prices.length > 0 ? prices[0] : currentPriceVal;
  const priceChange = currentPriceVal - firstPrice;
  const priceChangePct = firstPrice > 0 ? ((priceChange / firstPrice) * 100).toFixed(2) : "0.00";
  const isPositive = priceChange >= 0;

  // Gradient color based on trend
  const gradientId = isPositive ? "greenGradient" : "redGradient";
  const lineColor = isPositive ? "#22c55e" : "#ef4444";
  const gradientColor = isPositive ? "#22c55e" : "#ef4444";

  const isAdmin = true;

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0d1117]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}
                className="text-muted-foreground hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">DSHIB / USDT</h1>
                  <p className="text-xs text-muted-foreground">Dogeshiba Token</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">${currentPriceVal.toFixed(4)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-[#0d1117] border-white/5 hover:border-blue-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-400" />
              <p className="text-xs text-muted-foreground">현재 가격</p>
            </div>
            <p className="text-xl font-bold text-white">${currentPriceVal.toFixed(4)}</p>
            <p className="text-xs text-muted-foreground mt-1">USDT</p>
          </Card>

          <Card className="p-4 bg-[#0d1117] border-white/5 hover:border-green-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <p className="text-xs text-muted-foreground">최고가 ({selectedPeriod}D)</p>
            </div>
            <p className="text-xl font-bold text-green-400">${maxPrice.toFixed(4)}</p>
            <p className="text-xs text-muted-foreground mt-1">USDT</p>
          </Card>

          <Card className="p-4 bg-[#0d1117] border-white/5 hover:border-red-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <p className="text-xs text-muted-foreground">최저가 ({selectedPeriod}D)</p>
            </div>
            <p className="text-xl font-bold text-red-400">${minPrice.toFixed(4)}</p>
            <p className="text-xs text-muted-foreground mt-1">USDT</p>
          </Card>

          <Card className="p-4 bg-[#0d1117] border-white/5 hover:border-purple-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <p className="text-xs text-muted-foreground">변동폭 ({selectedPeriod}D)</p>
            </div>
            <p className={`text-xl font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{priceChangePct}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isPositive ? "▲" : "▼"} ${Math.abs(priceChange).toFixed(4)}
            </p>
          </Card>
        </div>

        {/* Chart Card */}
        <Card className="bg-[#0d1117] border-white/5 mb-6 overflow-hidden">
          {/* Chart Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">가격 차트</h2>
            </div>
            {/* Period Selector */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setSelectedPeriod(p.days)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    selectedPeriod === p.days
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="px-2 pb-6">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.2)"
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(chartData.length / 6)}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.2)"
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v.toFixed(4)}`}
                    width={70}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
                  <ReferenceLine
                    y={currentPriceVal}
                    stroke="rgba(255,255,255,0.15)"
                    strokeDasharray="4 4"
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={lineColor}
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    dot={false}
                    activeDot={{ r: 5, fill: lineColor, stroke: "#0d1117", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Activity className="w-12 h-12 opacity-20" />
                <p className="text-sm">가격 데이터를 불러오는 중...</p>
              </div>
            )}
          </div>
        </Card>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Price Info */}
          <Card className="p-6 bg-[#0d1117] border-white/5">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-400" />
              DSHIB 가격 안내
            </h3>
            <div className="space-y-3">
              {[
                { label: "입금 환율", value: `1 USDT = ${(1 / currentPriceVal).toFixed(2)} DSHIB` },
                { label: "출금 환율", value: `1 DSHIB = $${currentPriceVal.toFixed(4)} USDT` },
                { label: "출금 수수료", value: "5%" },
                { label: "가격 업데이트", value: "매일 관리자 설정" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Admin Price Update */}
          {isAdmin && (
            <Card className="p-6 bg-[#0d1117] border-white/5">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                가격 설정 (관리자)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">새로운 DSHIB 가격 (USD)</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        type="number"
                        placeholder={currentPriceVal.toFixed(4)}
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        step="0.0001"
                        min="0"
                        className="bg-white/5 border-white/10 text-white pr-14 focus:border-blue-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        USD
                      </span>
                    </div>
                    <Button
                      onClick={handleUpdatePrice}
                      disabled={isUpdating || !newPrice}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "업데이트"
                      )}
                    </Button>
                  </div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-blue-300 text-xs">
                    현재 가격: <span className="font-bold text-blue-200">${currentPriceVal.toFixed(4)}</span>
                  </p>
                  <p className="text-blue-400/70 text-xs mt-1">
                    가격 변경 시 모든 거래에 즉시 적용됩니다.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
