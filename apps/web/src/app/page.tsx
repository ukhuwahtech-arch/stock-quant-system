"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "../../utils/supabase/client";

const supabase = createClientComponentClient();

interface TradeRecord {
  id: number;
  evaluation_date: string;
  ticker: string;
  tier: string;
  gate_1_score: number;
  gate_2_score: number;
  gate_3_score: number;
  gate_4_score: number;
  gate_5_score: number;
  gate_6_score: number;
  gate_7_score: number;
  gate_8_score: number;
  gate_9_score: number;
  gate_10_score: number;
  entry_price: number;
  target_price?: number;
  profit_dollar?: number;
  status: string;
  hit_time?: string;
  hit_day?: any;
  created_at: string;
}

// Helper to get display date in "24 Sep 26" format from a YYYY-MM-DD string
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const [year, month, day] = parts as [string, string, string];
  const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  if (isNaN(d.getTime())) return dateStr;
  const dayStr = String(d.getDate()).padStart(2, "0");
  const monthStr = d.toLocaleDateString("en-US", { month: "short" });
  const yearStr = String(d.getFullYear()).slice(-2);
  return `${dayStr} ${monthStr} ${yearStr}`;
}

// Helper to get day of the week (e.g., "Monday", "Thursday") from a YYYY-MM-DD string
function formatDayOfWeek(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return "Session";
  const [year, month, day] = parts as [string, string, string];
  const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  if (isNaN(d.getTime())) return "Session";
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

// Helper to format YYYY-MM-DD from a JS Date object
function formatDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to generate the last N business days (excluding Saturday and Sunday)
function getLastBusinessDays(count: number): string[] {
  const businessDays: string[] = [];
  let d = new Date();
  
  while (businessDays.length < count) {
    const dayOfWeek = d.getDay();
    // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays.push(formatDateString(d));
    }
    d.setDate(d.getDate() - 1);
  }
  return businessDays;
}

// Robust hit day formatter supporting day numbers (1, 2, 3...) or dates
function formatHitDay(evalDate: string, hitDayVal: any): string {
  if (hitDayVal === null || hitDayVal === undefined || hitDayVal === "") return "—";
  const valStr = String(hitDayVal ?? "").trim();

  if (/^\d+$/.test(valStr)) {
    const dayNum = parseInt(valStr, 10);
    if (dayNum <= 1) return "Same Day";
    return `${dayNum} Days`;
  }

  const match = valStr.match(/(\d+)/);
  if (match && !valStr.includes("-")) {
    const dayNum = parseInt(match[1] ?? "0", 10);
    if (dayNum <= 1) return "Same Day";
    return `${dayNum} Days`;
  }

  const d1 = new Date(evalDate ?? "");
  const d2 = new Date(valStr);
  if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Same Day";
    return `${diffDays + 1} Days`;
  }

  return valStr;
}

function cleanOutcomeText(status: string): string {
  if (!status) return "";
  return status.replace(/^(OPEN|WIN|HIT)\s*/i, "").trim();
}

function GateBarMeter({ label, score }: { label: string; score: number }) {
  const clampedScore = Math.max(1, Math.min(14, score || 7));
  const percentage = Math.round((clampedScore / 14) * 100);

  return (
    <div className="flex items-center justify-between text-[10px] py-1 gap-2">
      <span className="text-zinc-400 font-medium truncate w-[110px]" title={label}>
        {label}
      </span>
      <div className="flex-1 mx-2 h-[6px] bg-zinc-900 rounded-full relative overflow-hidden">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundImage: "linear-gradient(to right, rgb(239 68 68) 0%, rgb(34 197 94) 100%)",
          }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 bg-[#0c0c0e] transition-all duration-500 rounded-r-full"
          style={{ width: `${100 - percentage}%` }}
        />
      </div>
      <span className="text-zinc-300 font-mono w-[30px] text-right">
        {percentage}%
      </span>
    </div>
  );
}

const tierPriority: Record<string, number> = {
  "75%": 4,
  "65%": 3,
  "55%": 2,
  "45%": 1,
};

const TIER_TABS = ["ALL", "75%", "65%", "55%", "45%"];

export default function DashboardPage() {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");
  const [activeTierTab, setActiveTierTab] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Generate last 7 business days dynamically (excluding weekends)
  const dynamicTradingDates = getLastBusinessDays(7);

  useEffect(() => {
    async function fetchTrades() {
      setLoading(true);
      const { data, error } = await supabase
        .from("stock_gate_results")
        .select("*")
        .in("tier", ["45%", "55%", "65%", "75%"])
        .order("evaluation_date", { ascending: false });

      if (error) {
        console.error("Error fetching trades from Supabase:", error);
      } else {
        const fetchedTrades = data || [];
        setTrades(fetchedTrades);
      }
      setLoading(false);
    }

    fetchTrades();

    // Set default active tab to today's business date automatically on load
    if (!activeTab && dynamicTradingDates[0]) {
      setActiveTab(dynamicTradingDates[0]);
    }
  }, []);

  // Build dynamic tabs: Day of the Week (last 7 business days) + "All Days" option at the end
  const dynamicTabs = [
    ...dynamicTradingDates.map((dateStr) => ({
      label: formatDayOfWeek(dateStr),
      date: dateStr,
      displaySub: formatDisplayDate(dateStr),
    })),
    { label: "All Days", date: "ALL", displaySub: "Combined" },
  ];

  const currentActiveDate = activeTab || dynamicTradingDates[0] || "";

  const dayTrades = trades.filter((trade) => {
    if (activeTab === "ALL") return true;
    return trade.evaluation_date === currentActiveDate;
  });

  const tickerBestTierMap = new Map<string, { tier: string; score: number; trade: TradeRecord }>();
  dayTrades.forEach((trade) => {
    const normalizedTier = (trade.tier || "").trim();
    const score = tierPriority[normalizedTier] || 0;
    const tickerKey = trade.ticker ?? "";
    const existing = tickerBestTierMap.get(tickerKey);
    if (!existing || score > existing.score) {
      tickerBestTierMap.set(tickerKey, { tier: normalizedTier, score, trade });
    }
  });

  const topStocks = Array.from(tickerBestTierMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const filteredTrades = dayTrades.filter((trade) => {
    const normalizedTradeTier = (trade.tier || "").trim();
    const matchesTier = activeTierTab === "ALL" || normalizedTradeTier === activeTierTab;
    const matchesSearch = (trade.ticker ?? "").toLowerCase().includes((searchTerm ?? "").toLowerCase());
    return matchesTier && matchesSearch;
  });

  const totalSignals = filteredTrades.length;
  const totalWins = filteredTrades.filter((t) => {
    const statusLower = (t.status ?? "").toLowerCase();
    return statusLower.includes("win") || statusLower.includes("hit");
  }).length;
  const winRate = totalSignals > 0 ? ((totalWins / totalSignals) * 100).toFixed(1) : "0.0";

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 font-mono p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-3">
            <span>Stock Quant System</span>
          </h1>
        </div>

        {/* Quick Metrics Bar */}
        <div className="flex items-center gap-4 bg-zinc-900/60 border border-zinc-800 px-4 py-2.5 rounded-xl">
          <div>
            <div className="text-[10px] text-zinc-500">SIGNALS (VIEW)</div>
            <div className="text-sm font-bold text-white">{totalSignals}</div>
          </div>
          <div className="h-6 w-[1px] bg-zinc-800" />
          <div>
            <div className="text-[10px] text-zinc-500">WIN RATE</div>
            <div className="text-sm font-bold text-emerald-400">{winRate}%</div>
          </div>
        </div>
      </div>

      {/* Top Qualified Opportunities Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Top Quant Opportunities ({activeTab === "ALL" ? "All Days" : `${formatDayOfWeek(currentActiveDate)} - ${formatDisplayDate(currentActiveDate)}`})
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-[350px] bg-zinc-900/40 border border-zinc-800/80 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : topStocks.length > 0 ? (
          <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(topStocks.length, 3)} gap-4`}>
            {topStocks.map(({ tier, trade }, index) => {
              const cleanTicker = (trade.ticker ?? "").replace(/(\d+%)$/, "").trim();
              const targetPrice = trade.target_price ?? trade.entry_price * 1.01;
              const profitVal = trade.profit_dollar ?? (targetPrice - trade.entry_price);
              const statusLower = (trade.status ?? "").toLowerCase();
              const isHit = statusLower.includes("win") || statusLower.includes("hit");

              return (
                <div
                  key={trade.id}
                  className="relative bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-zinc-800/80 hover:border-emerald-500/45 transition-all p-4 rounded-2xl shadow-xl flex flex-col justify-between h-[350px]"
                >
                  <div>
                    <div className="grid grid-cols-3 items-center mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 justify-self-start">
                        TIER {tier}
                      </span>
                      <div className="justify-self-center w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center justify-center shadow-sm">
                        {index + 1}
                      </div>
                      <span className="text-[10px] text-zinc-500 justify-self-end">{formatDisplayDate(trade.evaluation_date)}</span>
                    </div>

                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-lg font-bold font-sans text-white">{cleanTicker}</span>
                      <span className="text-xs font-semibold text-zinc-300">+${profitVal.toFixed(2)}</span>
                    </div>

                    <div className="space-y-0.5 border-t border-zinc-800/60 pt-2 pb-1">
                      <GateBarMeter label="G1 Open Distance" score={trade.gate_1_score} />
                      <GateBarMeter label="G2 Premarket RVol" score={trade.gate_2_score} />
                      <GateBarMeter label="G3 Candle Pattern" score={trade.gate_3_score} />
                      <GateBarMeter label="G4 Candle Efficiency" score={trade.gate_4_score} />
                      <GateBarMeter label="G5 VWAP Deviation" score={trade.gate_5_score} />
                      <GateBarMeter label="G6 Relative Strength" score={trade.gate_6_score} />
                      <GateBarMeter label="G7 Momentum Index" score={trade.gate_7_score} />
                      <GateBarMeter label="G8 VWAP Slope" score={trade.gate_8_score} />
                      <GateBarMeter label="G9 Volume Flow" score={trade.gate_9_score} />
                      <GateBarMeter label="G10 Bar Volume Ratio" score={trade.gate_10_score} />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400 truncate max-w-[130px]">{cleanOutcomeText(trade.status)}</span>
                    <span className={`font-bold ${isHit ? "text-emerald-400" : "text-amber-400"}`}>
                      {isHit ? "HIT" : "Waiting"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-zinc-800/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-xl h-[350px]">
            <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3 text-zinc-500 border border-zinc-700/50 shadow-inner">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-zinc-200 font-semibold font-sans tracking-wide">No Trade Recorded in this Session</p>
            <p className="text-[11px] text-zinc-500 mt-1.5 max-w-xs leading-relaxed">
              Market conditions did not trigger strategy criteria or no trade executions were logged for this specific timeframe.
            </p>
          </div>
        )}
      </div>

      {/* Main Trading Session Navigation Tabs (Last 7 Business Days + All Days) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 bg-zinc-900/40 p-2 rounded-xl border border-zinc-800/80 mb-6">
        {dynamicTabs.map((tab) => {
          const isActive = activeTab === tab.date;
          return (
            <button
              key={tab.date}
              onClick={() => setActiveTab(tab.date)}
              className={`flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all cursor-pointer w-full text-center ${
                isActive
                  ? "bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <span className="text-xs font-semibold leading-tight">{tab.label}</span>
              <span className={`text-[10px] mt-1 leading-tight ${isActive ? "text-zinc-900 font-medium" : "text-zinc-500"}`}>
                {tab.displaySub}
              </span>
            </button>
          );
        })}
      </div>

      {/* Data Table Card */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 px-2 font-bold uppercase tracking-wider">Tier:</span>
              {TIER_TABS.map((tier) => {
                const isTierActive = activeTierTab === tier;
                return (
                  <button
                    key={tier}
                    onClick={() => setActiveTierTab(tier)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isTierActive
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    }`}
                  >
                    {tier}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-zinc-500">
              ({filteredTrades.length} results)
            </span>
          </div>

          <input
            type="text"
            placeholder="Filter by ticker (e.g., NVDA)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 w-full sm:w-64"
          />
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-zinc-500 text-xs">
            Loading database trade logs...
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-xs gap-2 text-center px-4">
            <p className="text-zinc-300 font-semibold font-sans">No Trade Recorded in this Session</p>
            <p className="text-[11px] text-zinc-500 max-w-sm">
              Market conditions did not trigger strategy criteria or no trade executions were logged for this specific timeframe.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 bg-zinc-900/40">
                  <th className="py-3 px-6 font-semibold">ENTRY DATE</th>
                  <th className="py-3 px-6 font-semibold">TICKER</th>
                  <th className="py-3 px-6 font-semibold">TIER</th>
                  <th className="py-3 px-6 font-semibold">ENTRY PRICE</th>
                  <th className="py-3 px-6 font-semibold">TARGET PRICE</th>
                  <th className="py-3 px-6 font-semibold">PROFIT</th>
                  <th className="py-3 px-6 font-semibold">OUTCOME</th>
                  <th className="py-3 px-6 font-semibold">STATUS</th>
                  <th className="py-3 px-6 font-semibold">HIT TIME</th>
                  <th className="py-3 px-6 font-semibold text-right">HIT DAY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredTrades.map((trade) => {
                  const targetPrice = trade.target_price ?? trade.entry_price * 1.01;
                  const profitVal = trade.profit_dollar ?? (targetPrice - trade.entry_price);
                  const statusLower = (trade.status ?? "").toLowerCase();
                  const isHit = statusLower.includes("win") || statusLower.includes("hit");
                  const cleanTicker = (trade.ticker ?? "").replace(/(\d+%)$/, "").trim();
                  const cleanOutcome = cleanOutcomeText(trade.status);
                  const calculatedHitDay = formatHitDay(trade.evaluation_date, trade.hit_day);
                  const displayTier = (trade.tier || "").trim();

                  return (
                    <tr key={trade.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3.5 px-6 text-zinc-400">{formatDisplayDate(trade.evaluation_date)}</td>
                      <td className="py-3.5 px-6 font-bold text-white">
                        {cleanTicker}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                          {displayTier}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-zinc-300">${trade.entry_price.toFixed(2)}</td>
                      <td className="py-3.5 px-6 text-emerald-400 font-semibold">${targetPrice.toFixed(2)}</td>
                      <td className="py-3.5 px-6 text-emerald-400 font-bold">+${profitVal.toFixed(2)}</td>
                      <td className="py-3.5 px-6 text-zinc-300">{cleanOutcome}</td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isHit
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {isHit ? "HIT" : "Waiting"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-zinc-300 font-mono">
                        {trade.hit_time || "—"}
                      </td>
                      <td className="py-3.5 px-6 text-right font-semibold text-zinc-300">
                        {calculatedHitDay}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}