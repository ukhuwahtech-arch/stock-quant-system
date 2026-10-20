"use client";

interface SummaryCardProps {
  mainTab?: string;
  summaryStats?: any;
  metricFilter?: string;
  onSelectMetricFilter?: (filter: string) => void;
}

export default function SummaryCard({
  mainTab = "Week",
  summaryStats,
  metricFilter = "ALL",
  onSelectMetricFilter,
}: SummaryCardProps) {
  const stats = summaryStats || {};

  // Overall Tier >= 40% Metrics
  const totalPass = stats.trades_pass_tier_vwap ?? 0;
  const hits = stats.pass_trade_hit ?? 0;
  const holds = stats.pass_trade_hold ?? 0;
  const totalTrades = stats.total_trade ?? 0;

  // Top-1 Metrics
  const top1Pass = stats.trades_pass_tier_vwap_1_rank ?? 0;
  const top1Hits = stats.pass_trade_hit_1_rank ?? 0;
  const top1Holds = stats.pass_trade_hold_1_rank ?? 0;
  const top1Total = stats.total_trade_top_1_rank ?? 0;

  // Top-2 Metrics
  const top2Pass = stats.trades_pass_tier_vwap_2_rank ?? 0;
  const top2Hits = stats.pass_trade_hit_2_rank ?? 0;
  const top2Holds = stats.pass_trade_hold_2_rank ?? 0;
  const top2Total = stats.total_trade_top_2_rank ?? 0;

  // Top-3 Metrics
  const top3Pass = stats.trades_pass_tier_vwap_3_rank ?? 0;
  const top3Hits = stats.pass_trade_hit_3_rank ?? 0;
  const top3Holds = stats.pass_trade_hold_3_rank ?? 0;
  const top3Total = stats.total_trade_top_3_rank ?? 0;

  const handleClick = (filterKey: string) => {
    if (onSelectMetricFilter) {
      onSelectMetricFilter(metricFilter === filterKey ? "ALL" : filterKey);
    }
  };

  const getBoxStyle = (filterKey: string) => {
    const isActive = metricFilter === filterKey;
    return `cursor-pointer transition-all rounded-xl p-3 border ${
      isActive
        ? "bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
        : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50"
    }`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Card 1: Overall Tier ≥ 40% Activity Breakdown */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 backdrop-blur-md p-6 shadow-xl">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Tier ≥ 40% Activity Breakdown</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">All Tickers</span>
        </h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div onClick={() => handleClick("LEFT_PASS")} className={getBoxStyle("LEFT_PASS")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Pass</div>
            <div className="text-xl font-bold text-white font-mono">{totalPass}</div>
          </div>
          <div onClick={() => handleClick("LEFT_HIT")} className={getBoxStyle("LEFT_HIT")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Hit</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">{hits}</div>
          </div>
          <div onClick={() => handleClick("LEFT_HOLD")} className={getBoxStyle("LEFT_HOLD")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Hold</div>
            <div className="text-xl font-bold text-amber-400 font-mono">{holds}</div>
          </div>
          <div onClick={() => handleClick("LEFT_TOTAL")} className={getBoxStyle("LEFT_TOTAL")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total</div>
            <div className="text-xl font-bold text-zinc-300 font-mono">{totalTrades}</div>
          </div>
        </div>
      </div>

      {/* Card 2: Top-1 Session Pick Performance */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 backdrop-blur-md p-6 shadow-xl">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Top-1 Session Pick Performance</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Rank #1</span>
        </h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div onClick={() => handleClick("RIGHT_TOP1_PASS")} className={getBoxStyle("RIGHT_TOP1_PASS")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Pass</div>
            <div className="text-xl font-bold text-white font-mono">{top1Pass}</div>
          </div>
          <div onClick={() => handleClick("RIGHT_TOP1_HIT")} className={getBoxStyle("RIGHT_TOP1_HIT")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Hit</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">{top1Hits}</div>
          </div>
          <div onClick={() => handleClick("RIGHT_TOP1_HOLD")} className={getBoxStyle("RIGHT_TOP1_HOLD")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Hold</div>
            <div className="text-xl font-bold text-amber-400 font-mono">{top1Holds}</div>
          </div>
          <div onClick={() => handleClick("RIGHT_TOP1_TOTAL")} className={getBoxStyle("RIGHT_TOP1_TOTAL")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total</div>
            <div className="text-xl font-bold text-zinc-300 font-mono">{top1Total}</div>
          </div>
        </div>
      </div>

      {/* Card 3: Top-2 Session Pick Performance */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 backdrop-blur-md p-6 shadow-xl">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Top-2 Session Pick Performance</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Rank #2</span>
        </h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div onClick={() => handleClick("RIGHT_TOP2_PASS")} className={getBoxStyle("RIGHT_TOP2_PASS")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Pass</div>
            <div className="text-xl font-bold text-white font-mono">{top2Pass}</div>
          </div>
          <div onClick={() => handleClick("RIGHT_TOP2_HIT")} className={getBoxStyle("RIGHT_TOP2_HIT")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Hit</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">{top2Hits}</div>
          </div>
          <div onClick={() => handleClick("RIGHT_TOP2_HOLD")} className={getBoxStyle("RIGHT_TOP2_HOLD")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Hold</div>
            <div className="text-xl font-bold text-amber-400 font-mono">{top2Holds}</div>
          </div>
          <div onClick={() => handleClick("RIGHT_TOP2_TOTAL")} className={getBoxStyle("RIGHT_TOP2_TOTAL")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total</div>
            <div className="text-xl font-bold text-zinc-300 font-mono">{top2Total}</div>
          </div>
        </div>
      </div>

      {/* Card 4: Top-3 Session Pick Performance */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 backdrop-blur-md p-6 shadow-xl">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Top-3 Session Pick Performance</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Rank #3</span>
        </h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div onClick={() => handleClick("RIGHT_TOP3_PASS")} className={getBoxStyle("RIGHT_TOP3_PASS")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Pass</div>
            <div className="text-xl font-bold text-white font-mono">{top3Pass}</div>
          </div>
          <div onClick={() => handleClick("RIGHT_TOP3_HIT")} className={getBoxStyle("RIGHT_TOP3_HIT")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Hit</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">{top3Hits}</div>
          </div>
          <div onClick={() => handleClick("RIGHT_TOP3_HOLD")} className={getBoxStyle("RIGHT_TOP3_HOLD")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Hold</div>
            <div className="text-xl font-bold text-amber-400 font-mono">{top3Holds}</div>
          </div>
          <div onClick={() => handleClick("RIGHT_TOP3_TOTAL")} className={getBoxStyle("RIGHT_TOP3_TOTAL")}>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total</div>
            <div className="text-xl font-bold text-zinc-300 font-mono">{top3Total}</div>
          </div>
        </div>
      </div>
    </div>
  );
}