import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { useWeb3 } from "@/hooks/useWeb3";

interface OneLineLegProps {
  showHeader?: boolean;
}

const LEVEL_COLORS: Record<number, { bg: string; text: string; border: string; badge: string }> = {
  1: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", badge: "bg-blue-500/20 text-blue-300" },
  2: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", badge: "bg-purple-500/20 text-purple-300" },
  3: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30", badge: "bg-pink-500/20 text-pink-300" },
  4: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", badge: "bg-orange-500/20 text-orange-300" },
};

const LEVEL_NAMES: Record<number, string> = {
  1: "레벨 1",
  2: "레벨 2",
  3: "레벨 3",
  4: "레벨 4",
};

const LEVEL_PRICES: Record<number, number> = {
  1: 30000,
  2: 50000,
  3: 90000,
  4: 140000,
};

function shortenWallet(addr: string | null) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function MemberRow({ member, index, myId }: { member: any; index: number; myId?: number }) {
  const [expanded, setExpanded] = useState(false);
  const isMe = member.id === myId;
  const colors = LEVEL_COLORS[member.level] || LEVEL_COLORS[1];

  return (
    <div
      className={`border rounded-lg transition-all ${colors.border} ${isMe ? "ring-2 ring-cyan-400/50" : ""}`}
    >
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 rounded-lg ${colors.bg}`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* 순번 + 이름 */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-slate-500 w-6 shrink-0">#{index + 1}</span>
          <div className="min-w-0">
            <p className={`font-semibold text-sm truncate ${isMe ? "text-cyan-400" : "text-slate-200"}`}>
              {member.name || "Unknown"}
              {isMe && <span className="ml-2 text-xs text-cyan-500">(나)</span>}
            </p>
            <p className="text-xs text-slate-500 font-mono">{shortenWallet(member.walletAddress)}</p>
          </div>
        </div>

        {/* 레벨 배지 + 잔액 + 토글 */}
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
            Lv.{member.level}
          </span>
          <span className="text-xs text-slate-400 hidden sm:block">
            {Number(member.pointBalance || 0).toLocaleString()} DSHIB
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>

      {/* 확장 상세 정보 */}
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-slate-500 mb-0.5">지갑 주소</p>
            <p className="text-slate-300 font-mono break-all">{member.walletAddress || "—"}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-0.5">DSHIB 잔액</p>
            <p className={`font-bold ${colors.text}`}>
              {Number(member.pointBalance || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-slate-500 mb-0.5">추천인 ID</p>
            <p className="text-slate-300">{member.referrerId || "최상위"}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-0.5">가입일</p>
            <p className="text-slate-300">
              {member.createdAt ? new Date(member.createdAt).toLocaleDateString("ko-KR") : "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function LevelTab({ level, myId }: { level: number; myId?: number }) {
  const colors = LEVEL_COLORS[level];
  const { data: members, isLoading } = trpc.organization.getOneLineLeg.useQuery({ level });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Users className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">레벨 {level} 맴버가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 요약 헤더 */}
      <div className={`flex items-center justify-between px-4 py-2 rounded-lg ${colors.bg} border ${colors.border} mb-4`}>
        <div className="flex items-center gap-2">
          <TrendingUp className={`w-4 h-4 ${colors.text}`} />
          <span className={`text-sm font-semibold ${colors.text}`}>{LEVEL_NAMES[level]}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>총 {members.length}명</span>
          <span>|</span>
          <span>필요 잔액: {LEVEL_PRICES[level].toLocaleString()} DSHIB</span>
        </div>
      </div>

      {/* 맴버 목록 (FIFO 순서) */}
      {members.map((member: any, idx: number) => (
        <MemberRow key={member.id} member={member} index={idx} myId={myId} />
      ))}
    </div>
  );
}

export default function OneLineLeg({ showHeader = true }: OneLineLegProps) {
  const [activeLevel, setActiveLevel] = useState(1);
  const { wallet } = useWeb3();

  const { data: profile } = trpc.user.getProfile.useQuery(undefined, {
    enabled: !!wallet,
  });
  const { data: stats } = trpc.organization.getOrganizationStats.useQuery(undefined, {
    enabled: !!wallet,
  });

  const myId = profile?.id;

  return (
    <div className="min-h-screen bg-background">
      {showHeader && (
        <div className="border-b border-border bg-card/50">
          <div className="container py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Users className="w-6 h-6 text-primary" />
                  원라인 조직도
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  전체 맴버를 레벨별로 FIFO 순서로 확인합니다
                </p>
              </div>
              {stats && (
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">하위조직</p>
                    <p className="text-xl font-bold text-slate-300">{stats.downlineCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">조직원</p>
                    <p className="text-xl font-bold text-green-400">{stats.downlineCount}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="container py-6">
        {/* 레벨 탭 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[1, 2, 3, 4].map((level) => {
            const colors = LEVEL_COLORS[level];
            const isActive = activeLevel === level;
            return (
              <button
                key={level}
                onClick={() => setActiveLevel(level)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border ${
                  isActive
                    ? `${colors.bg} ${colors.text} ${colors.border} shadow-sm`
                    : "bg-card/30 text-slate-400 border-slate-700 hover:border-slate-500"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isActive ? colors.text.replace("text-", "bg-") : "bg-slate-600"
                  }`}
                />
                레벨 {level}
                {isActive && (
                  <Badge variant="outline" className={`text-xs ${colors.badge} border-0 ml-1`}>
                    활성
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* 선택된 레벨 탭 내용 */}
        <LevelTab level={activeLevel} myId={myId} />
      </div>
    </div>
  );
}
