"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "../../utils/supabase/client";
import IndexMarketCard from "../components/IndexMarketCard";
import MultiTickersCard from "../components/MultiTickersCard";
import CalendarPickCard from "../components/CalendarPickCard";
import SummaryCard from "../components/SummaryCard";

const supabase = createClientComponentClient();

interface TradeRecord {
  id: number | string;
  date: string;
  rank?: string | number;
  ticker: string;
  tier?: string;
  vwap_pass?: string;
  rvol?: number;
  gap_pct?: number;
  base_price_trade: number | string;
  target_price: number | string;
  profit?: number | string;
  status: string;
  hit_date?: string;
  hit_time?: string;
  hit_day?: string;
  [key: string]: any;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const [year, month, day] = parts as [string, string, string];
  const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleDateString("en-US", { month: "short" })} ${String(d.getFullYear()).slice(-2)}`;
}

function formatDayOfWeek(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return "Session";
  const [year, month, day] = parts as [string, string, string];
  const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  if (isNaN(d.getTime())) return "Session";
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function formatDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMondayToFridayWeeksForMonth(year: number, monthIndex: number): { label: string; date: string; displaySub: string }[][] {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

  let current = new Date(firstDayOfMonth);
  const dayOfWeek = current.getDay();
  const diffToMonday = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  current.setDate(diffToMonday);

  const weeks: { label: string; date: string; displaySub: string }[][] = [];

  while (current <= lastDayOfMonth || weeks.length === 0) {
    const weekDays = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(current);
      d.setDate(current.getDate() + i);
      const dateStr = formatDateString(d);
      weekDays.push({
        label: formatDayOfWeek(dateStr),
        date: dateStr,
        displaySub: formatDisplayDate(dateStr),
      });
    }
    weeks.push(weekDays);
    current.setDate(current.getDate() + 7);
    if (current.getMonth() !== monthIndex && weeks.length >= 5) break;
  }

  return weeks;
}

const MAIN_TABS = ["Day", "Week", "Month", "Year"];
const AVAILABLE_YEARS = [2024, 2025, 2026, 2027];

export default function DashboardPage() {
  const [masterTrades, setMasterTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<string>("Week");
  const [summaryStats, setSummaryStats] = useState<any>(null);

  const [calcPrice, setCalcPrice] = useState<string>("100");
  const [calcPercent, setCalcPercent] = useState<string>("1");

  const today = new Date();
  const todayStr = formatDateString(today);

  const [weekYear, setWeekYear] = useState<number>(today.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(today.getMonth());
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);
  const [activeDayTab, setActiveDayTab] = useState<string>(todayStr);

  const monthWeeks = getMondayToFridayWeeksForMonth(weekYear, selectedMonthIndex);
  const currentWeekDays = monthWeeks[selectedWeekIndex] || monthWeeks[0] || [];

  const [activeTierTab, setActiveTierTab] = useState<string>("ALL");
  const [metricFilter, setMetricFilter] = useState<string>("ALL");

  // Paginated fetch to bypass Supabase 1000-row limit
  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);

      let allRows: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let fetchMore = true;

      while (fetchMore) {
        const { data, error } = await supabase
          .from("master_trade_data")
          .select("*")
          .order("date", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error("Error fetching master_trade_data:", error);
          break;
        }

        if (data && data.length > 0) {
          allRows = [...allRows, ...data];
          if (data.length < pageSize) {
            fetchMore = false;
          } else {
            page++;
          }
        } else {
          fetchMore = false;
        }
      }

      const formattedNorm: TradeRecord[] = allRows.map((row: any) => ({
        id: row.id,
        date: row.date || "",
        rank: row.rank || "",
        ticker: row.ticker || "",
        tier: row.tier,
        vwap_pass: row.vwap_pass || "NO",
        rvol: row.rvol ? Number(row.rvol) : 0,
        gap_pct: row.gap_pct,
        base_price_trade: row.base_price_trade || 0,
        target_price: row.target_price || 0,
        profit: row.profit,
        status: row.status || "",
        hit_date: row.hit_date,
        hit_time: row.hit_time,
        hit_day: row.hit_day,
        spy_open: row.spy_open,
        spy_close: row.spy_close,
        spy_pct_change: row.spy_pct_change,
        spy_status: row.spy_status,
        qqq_open: row.qqq_open,
        qqq_close: row.qqq_close,
        qqq_pct_change: row.qqq_pct_change,
        qqq_status: row.qqq_status,
        smh_open: row.smh_open,
        smh_close: row.smh_close,
        smh_pct_change: row.smh_pct_change,
        smh_status: row.smh_status,
      }));

      setMasterTrades(formattedNorm);

      const allDates = Array.from(new Set(formattedNorm.map(t => t.date)))
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a));

      const targetDate = allDates.includes(todayStr) 
        ? todayStr 
        : (allDates.find(d => d <= todayStr) || allDates[0] || todayStr);

      if (targetDate) {
        const parts = targetDate.split("-").map(Number);
        const lYear = parts[0] ?? today.getFullYear();
        const lMonth = parts[1] ?? (today.getMonth() + 1);

        setWeekYear(lYear);
        setSelectedMonthIndex(lMonth - 1);
        setActiveDayTab(targetDate);

        const weeks = getMondayToFridayWeeksForMonth(lYear, lMonth - 1);
        const matchedWeekIdx = weeks.findIndex(wk => wk.some(d => d.date === targetDate));
        if (matchedWeekIdx !== -1) {
          setSelectedWeekIndex(matchedWeekIdx);
        }
      }

      setLoading(false);
    }

    fetchAllData();
  }, []);

  // Compute summary stats dynamically based on active tab scope
  useEffect(() => {
    async function computeSummaryStats() {
      if (mainTab === "Day") {
        if (!activeDayTab) {
          setSummaryStats(null);
          return;
        }
        const { data, error } = await supabase
          .from("master_stat_table")
          .select("*")
          .eq("date", activeDayTab)
          .single();

        if (!error && data) {
          setSummaryStats(data);
        } else {
          setSummaryStats(null);
        }
      } else {
        let matchingDates: string[] = [];
        const activeMonthStr = `${weekYear}-${String(selectedMonthIndex + 1).padStart(2, "0")}`;

        if (mainTab === "Week") {
          matchingDates = currentWeekDays.map(d => d.date);
        } else if (mainTab === "Month") {
          matchingDates = Array.from(new Set(masterTrades.filter(t => t.date?.startsWith(activeMonthStr)).map(t => t.date)));
        } else if (mainTab === "Year") {
          matchingDates = Array.from(new Set(masterTrades.filter(t => t.date?.startsWith(String(weekYear))).map(t => t.date)));
        }

        if (matchingDates.length === 0) {
          setSummaryStats(null);
          return;
        }

        const { data, error } = await supabase
          .from("master_stat_table")
          .select("*")
          .in("date", matchingDates);

        if (!error && data && data.length > 0) {
          const aggregated = data.reduce((acc, curr) => ({
            total_trade: (acc.total_trade || 0) + (curr.total_trade || 0),
            trades_pass_tier_vwap: (acc.trades_pass_tier_vwap || 0) + (curr.trades_pass_tier_vwap || 0),
            pass_trade_hit: (acc.pass_trade_hit || 0) + (curr.pass_trade_hit || 0),
            pass_trade_hold: (acc.pass_trade_hold || 0) + (curr.pass_trade_hold || 0),
            
            total_trade_top_1_rank: (acc.total_trade_top_1_rank || 0) + (curr.total_trade_top_1_rank || 0),
            trades_pass_tier_vwap_1_rank: (acc.trades_pass_tier_vwap_1_rank || 0) + (curr.trades_pass_tier_vwap_1_rank || 0),
            pass_trade_hit_1_rank: (acc.pass_trade_hit_1_rank || 0) + (curr.pass_trade_hit_1_rank || 0),
            pass_trade_hold_1_rank: (acc.pass_trade_hold_1_rank || 0) + (curr.pass_trade_hold_1_rank || 0),

            total_trade_top_2_rank: (acc.total_trade_top_2_rank || 0) + (curr.total_trade_top_2_rank || 0),
            trades_pass_tier_vwap_2_rank: (acc.trades_pass_tier_vwap_2_rank || 0) + (curr.trades_pass_tier_vwap_2_rank || 0),
            pass_trade_hit_2_rank: (acc.pass_trade_hit_2_rank || 0) + (curr.pass_trade_hit_2_rank || 0),
            pass_trade_hold_2_rank: (acc.pass_trade_hold_2_rank || 0) + (curr.pass_trade_hold_2_rank || 0),

            total_trade_top_3_rank: (acc.total_trade_top_3_rank || 0) + (curr.total_trade_top_3_rank || 0),
            trades_pass_tier_vwap_3_rank: (acc.trades_pass_tier_vwap_3_rank || 0) + (curr.trades_pass_tier_vwap_3_rank || 0),
            pass_trade_hit_3_rank: (acc.pass_trade_hit_3_rank || 0) + (curr.pass_trade_hit_3_rank || 0),
            pass_trade_hold_3_rank: (acc.pass_trade_hold_3_rank || 0) + (curr.pass_trade_hold_3_rank || 0),
          }), {});
          setSummaryStats(aggregated);
        } else {
          setSummaryStats(null);
        }
      }
    }

    computeSummaryStats();
  }, [mainTab, activeDayTab, selectedWeekIndex, selectedMonthIndex, weekYear, masterTrades]);

  const handlePrevWeek = () => {
    if (selectedWeekIndex > 0) {
      setSelectedWeekIndex(selectedWeekIndex - 1);
    } else {
      if (selectedMonthIndex > 0) {
        const prevMonth = selectedMonthIndex - 1;
        setSelectedMonthIndex(prevMonth);
        const prevWeeks = getMondayToFridayWeeksForMonth(weekYear, prevMonth);
        setSelectedWeekIndex(Math.max(0, prevWeeks.length - 1));
      } else if (weekYear > (AVAILABLE_YEARS[0] ?? 2024)) {
        const prevYear = weekYear - 1;
        setWeekYear(prevYear);
        setSelectedMonthIndex(11);
        const prevWeeks = getMondayToFridayWeeksForMonth(prevYear, 11);
        setSelectedWeekIndex(Math.max(0, prevWeeks.length - 1));
      }
    }
  };

  const handleNextWeek = () => {
    const maxYear = AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1] ?? 2027;

    if (selectedWeekIndex < monthWeeks.length - 1) {
      setSelectedWeekIndex(selectedWeekIndex + 1);
    } else {
      if (selectedMonthIndex < 11) {
        setSelectedMonthIndex(selectedMonthIndex + 1);
        setSelectedWeekIndex(0);
      } else if (weekYear < maxYear) {
        setWeekYear(weekYear + 1);
        setSelectedMonthIndex(0);
        setSelectedWeekIndex(0);
      }
    }
  };

  const scopedTrades = masterTrades.filter((trade) => {
    if (!trade.date) return false;
    const tradeYear = trade.date.split("-")[0];
    const tradeMonth = trade.date.substring(0, 7);
    const activeMonthStr = `${weekYear}-${String(selectedMonthIndex + 1).padStart(2, "0")}`;

    if (mainTab === "Day") {
      return trade.date === activeDayTab;
    } else if (mainTab === "Week") {
      return currentWeekDays.some((d) => d.date === trade.date);
    } else if (mainTab === "Month") {
      return tradeMonth === activeMonthStr;
    } else if (mainTab === "Year") {
      return tradeYear === String(weekYear);
    }
    return true;
  });

  // 1. Tier Tab Filter
  let filteredTrades = scopedTrades.filter((trade) => {
    const tierVal = trade.tier || "0%";
    return activeTierTab === "ALL" || tierVal.trim() === activeTierTab || tierVal.trim().replace("%", "") === activeTierTab;
  });

  // 2. Summary Metric Box Click Filter logic
  if (metricFilter === "LEFT_PASS") {
    filteredTrades = filteredTrades.filter(t => {
      const tierNum = parseInt(String(t.tier || "0").replace("%", ""), 10);
      const vwapStr = String(t.vwap_pass || "").trim().toLowerCase();
      const isPass = vwapStr === "yes" || vwapStr === "true" || vwapStr === "1";
      return tierNum >= 40 && isPass;
    });
  } else if (metricFilter === "LEFT_HIT") {
    filteredTrades = filteredTrades.filter(t => {
      const tierNum = parseInt(String(t.tier || "0").replace("%", ""), 10);
      const vwapStr = String(t.vwap_pass || "").trim().toLowerCase();
      const isPass = vwapStr === "yes" || vwapStr === "true" || vwapStr === "1";
      const status = String(t.status || "").trim().toUpperCase();
      return tierNum >= 40 && isPass && (status === "HIT" || status.includes("HIT"));
    });
  } else if (metricFilter === "LEFT_HOLD") {
    filteredTrades = filteredTrades.filter(t => {
      const tierNum = parseInt(String(t.tier || "0").replace("%", ""), 10);
      const vwapStr = String(t.vwap_pass || "").trim().toLowerCase();
      const isPass = vwapStr === "yes" || vwapStr === "true" || vwapStr === "1";
      const status = String(t.status || "").trim().toUpperCase();
      return tierNum >= 40 && isPass && (status === "HOLD" || status.includes("HOLD"));
    });
  } else if (metricFilter === "LEFT_TOTAL") {
    // Left Total Trades: shows all filtered trades for the timeframe/tier
  } else if (metricFilter === "RIGHT_TOP1_TOTAL") {
    filteredTrades = filteredTrades.filter(t => parseInt(String(t.rank || "99").replace("#", ""), 10) === 1);
  } else if (metricFilter === "RIGHT_TOP1_PASS") {
    filteredTrades = filteredTrades.filter(t => {
      const rankNum = parseInt(String(t.rank || "99").replace("#", ""), 10);
      const tierNum = parseInt(String(t.tier || "0").replace("%", ""), 10);
      const vwapStr = String(t.vwap_pass || "").trim().toLowerCase();
      const isPass = vwapStr === "yes" || vwapStr === "true" || vwapStr === "1";
      return rankNum === 1 && tierNum >= 40 && isPass;
    });
  } else if (metricFilter === "RIGHT_TOP1_HIT") {
    filteredTrades = filteredTrades.filter(t => {
      const rankNum = parseInt(String(t.rank || "99").replace("#", ""), 10);
      const tierNum = parseInt(String(t.tier || "0").replace("%", ""), 10);
      const vwapStr = String(t.vwap_pass || "").trim().toLowerCase();
      const isPass = vwapStr === "yes" || vwapStr === "true" || vwapStr === "1";
      const status = String(t.status || "").trim().toUpperCase();
      return rankNum === 1 && tierNum >= 40 && isPass && (status === "HIT" || status.includes("HIT"));
    });
  } else if (metricFilter === "RIGHT_TOP1_HOLD") {
    filteredTrades = filteredTrades.filter(t => {
      const rankNum = parseInt(String(t.rank || "99").replace("#", ""), 10);
      const tierNum = parseInt(String(t.tier || "0").replace("%", ""), 10);
      const vwapStr = String(t.vwap_pass || "").trim().toLowerCase();
      const isPass = vwapStr === "yes" || vwapStr === "true" || vwapStr === "1";
      const status = String(t.status || "").trim().toUpperCase();
      return rankNum === 1 && tierNum >= 40 && isPass && (status === "HOLD" || status.includes("HOLD"));
    });
  } else if (metricFilter === "RIGHT_TOP2_TOTAL") {
    filteredTrades = filteredTrades.filter(t => parseInt(String(t.rank || "99").replace("#", ""), 10) === 2);
  } else if (metricFilter === "RIGHT_TOP2_PASS") {
    filteredTrades = filteredTrades.filter(t => {
      const rankNum = parseInt(String(t.rank || "99").replace("#", ""), 10);
      const tierNum = parseInt(String(t.tier || "0").replace("%", ""), 10);
      const vwapStr = String(t.vwap_pass || "").trim().toLowerCase();
      const isPass = vwapStr === "yes" || vwapStr === "true" || vwapStr === "1";
      return rankNum === 2 && tierNum >= 40 && isPass;
    });
  } else if (metricFilter === "RIGHT_TOP2_HIT") {
    filteredTrades = filteredTrades.filter(t => {
      const rankNum = parseInt(String(t.rank || "99").replace("#", ""), 10);
      const tierNum = parseInt(String(t.tier || "0").replace("%", ""), 10);
      const vwapStr = String(t.vwap_pass || "").trim().toLowerCase();
      const isPass = vwapStr === "yes" || vwapStr === "true" || vwapStr === "1";
      const status = String(t.status || "").trim().toUpperCase();
      return rankNum === 2 && tierNum >= 40 && isPass && (status === "HIT" || status.includes("HIT"));
    });
  } else if (metricFilter === "RIGHT_TOP2_HOLD") {
    filteredTrades = filteredTrades.filter(t => {
      const rankNum = parseInt(String(t.rank || "99").replace("#", ""), 10);
      const tierNum = parseInt(String(t.tier || "0").replace("%", ""), 10);
      const vwapStr = String(t.vwap_pass || "").trim().toLowerCase();
      const isPass = vwapStr === "yes" || vwapStr === "true" || vwapStr === "1";
      const status = String(t.status || "").trim().toUpperCase();
      return rankNum === 2 && tierNum >= 40 && isPass && (status === "HOLD" || status.includes("HOLD"));
    });
  } else if (metricFilter === "RIGHT_TOP3_TOTAL") {
    filteredTrades = filteredTrades.filter(t => parseInt(String(t.rank || "99").replace("#", ""), 10) === 3);
  } else if (metricFilter === "RIGHT_TOP3_PASS") {
    filteredTrades = filteredTrades.filter(t => {
      const rankNum = parseInt(String(t.rank || "99").replace("#", ""), 10);
      const tierNum = parseInt(String(t.tier || "0").replace("%", ""), 10);
      const vwapStr = String(t.vwap_pass || "").trim().toLowerCase();
      const isPass = vwapStr === "yes" || vwapStr === "true" || vwapStr === "1";
      return rankNum === 3 && tierNum >= 40 && isPass;
    });
  } else if (metricFilter === "RIGHT_TOP3_HIT") {
    filteredTrades = filteredTrades.filter(t => {
      const rankNum = parseInt(String(t.rank || "99").replace("#", ""), 10);
      const tierNum = parseInt(String(t.tier || "0").replace("%", ""), 10);
      const vwapStr = String(t.vwap_pass || "").trim().toLowerCase();
      const isPass = vwapStr === "yes" || vwapStr === "true" || vwapStr === "1";
      const status = String(t.status || "").trim().toUpperCase();
      return rankNum === 3 && tierNum >= 40 && isPass && (status === "HIT" || status.includes("HIT"));
    });
  } else if (metricFilter === "RIGHT_TOP3_HOLD") {
    filteredTrades = filteredTrades.filter(t => {
      const rankNum = parseInt(String(t.rank || "99").replace("#", ""), 10);
      const tierNum = parseInt(String(t.tier || "0").replace("%", ""), 10);
      const vwapStr = String(t.vwap_pass || "").trim().toLowerCase();
      const isPass = vwapStr === "yes" || vwapStr === "true" || vwapStr === "1";
      const status = String(t.status || "").trim().toUpperCase();
      return rankNum === 3 && tierNum >= 40 && isPass && (status === "HOLD" || status.includes("HOLD"));
    });
  }

  // Sort strictly by database rank (#1 to #15), using RVOL as tie-breaker
  filteredTrades.sort((a, b) => {
    const rankA = parseInt(String(a.rank || 99).replace("#", ""), 10);
    const rankB = parseInt(String(b.rank || 99).replace("#", ""), 10);
    if (rankA !== rankB) return rankA - rankB;
    return (b.rvol || 0) - (a.rvol || 0);
  });

  const allDatasetDates = Array.from(new Set(masterTrades.map(t => t.date))).filter(Boolean).sort((a, b) => b.localeCompare(a));
  const fallbackDate = allDatasetDates.includes(todayStr) ? todayStr : (allDatasetDates.find(d => d <= todayStr) || allDatasetDates[0] || todayStr);

  const currentActiveDate = mainTab === "Day" 
    ? (activeDayTab || fallbackDate) 
    : scopedTrades[0]?.date || fallbackDate;

  const nvdaMarketRecord = masterTrades.find(
    (t) => t.ticker?.toUpperCase() === "NVDA" && t.date === currentActiveDate
  ) || masterTrades.find((t) => t.ticker?.toUpperCase() === "NVDA") || {};

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 font-mono p-6 lg:p-10">
      {/* Header & Main Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-3">
            <span>Stock Quant System</span>
          </h1>
          <p className="text-[11px] text-zinc-500 mt-1">Active Pipeline Feed: master_trade_data</p>
        </div>

        {/* Main Timeframe Tabs */}
        <div className="flex items-center gap-1 bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setMainTab(tab);
                if (allDatasetDates.includes(todayStr) || todayStr) {
                  const target = allDatasetDates.includes(todayStr) ? todayStr : (allDatasetDates.find(d => d <= todayStr) || allDatasetDates[0] || todayStr);
                  const p = target.split("-").map(Number);
                  setWeekYear(p[0] ?? today.getFullYear());
                  setSelectedMonthIndex((p[1] ?? (today.getMonth() + 1)) - 1);
                  setActiveDayTab(target);
                }
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mainTab === tab ? "bg-emerald-500 text-zinc-950 shadow" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Calculator */}
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-3 py-2 rounded-xl text-xs">
          <span className="text-zinc-500 font-bold">$</span>
          <input type="number" value={calcPrice} onChange={(e) => setCalcPrice(e.target.value)} className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 text-center" />
          <span className="text-zinc-400">+</span>
          <input type="number" value={calcPercent} onChange={(e) => setCalcPercent(e.target.value)} className="w-12 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-zinc-200 text-center" />
          <span className="text-zinc-400">%</span>
          <span className="text-zinc-500">=</span>
          <span className="font-bold text-emerald-400">${(parseFloat(calcPrice || "0") * (1 + parseFloat(calcPercent || "0") / 100)).toFixed(2)}</span>
        </div>
      </div>

      {/* Calendar Picker Card */}
      <CalendarPickCard
        availableYears={AVAILABLE_YEARS}
        weekYear={weekYear}
        onYearChange={(y) => {
          setWeekYear(y);
          setSelectedWeekIndex(0);
        }}
        selectedMonthIndex={selectedMonthIndex}
        onMonthChange={(mIdx) => {
          setSelectedMonthIndex(mIdx);
          setSelectedWeekIndex(0);
        }}
        monthWeeks={monthWeeks}
        selectedWeekIndex={selectedWeekIndex}
        activeDayTab={activeDayTab}
        onDayChange={(date) => setActiveDayTab(date)}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
      />

      {/* Complete Card Stack */}
      <IndexMarketCard marketRecord={nvdaMarketRecord} />
      
      {/* Pass metric filter setter to SummaryCard so clicking boxes updates the view */}
      <SummaryCard 
        mainTab={mainTab} 
        summaryStats={summaryStats} 
        metricFilter={metricFilter}
        onSelectMetricFilter={setMetricFilter}
      />

      <MultiTickersCard
        trades={filteredTrades}
        loading={loading}
        activeTierTab={activeTierTab}
        onSelectTierTab={setActiveTierTab}
      />
    </main>
  );
}