"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "../../utils/supabase/client";

const supabase = createClientComponentClient();

interface TradeRecord {
  id: number | string;
  date: string;
  ticker: string;
  Tier?: string;
  RVOL?: number;
  "Gap %"?: number;
  "BASE PRICE": number | string;
  "TARGET PRICE": number | string;
  PROFIT?: number | string;
  STATUS: string;
  "HIT TIME"?: string;
  "HIT DAY"?: string;
  // SPY fields
  spy_open?: number | string;
  spy_close?: number | string;
  spy_pct_change?: number | string;
  spy_status?: string;
  // QQQ fields
  qqq_open?: number | string;
  qqq_close?: number | string;
  qqq_pct_change?: number | string;
  qqq_status?: string;
  // SMH fields
  smh_open?: number | string;
  smh_close?: number | string;
  smh_pct_change?: number | string;
  smh_status?: string;
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

// Helper to get day of the week from a YYYY-MM-DD string
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

// Helper to get Monday-to-Friday business days for a specific year and month, split into weeks
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

// Helper to get 12 months for a given year
function getMonthsOfYear(year: number): { label: string; monthVal: number; displaySub: string }[] {
  const months = [
    { name: "Jan", num: 0 },
    { name: "Feb", num: 1 },
    { name: "Mar", num: 2 },
    { name: "Apr", num: 3 },
    { name: "May", num: 4 },
    { name: "Jun", num: 5 },
    { name: "Jul", num: 6 },
    { name: "Aug", num: 7 },
    { name: "Sep", num: 8 },
    { name: "Oct", num: 9 },
    { name: "Nov", num: 10 },
    { name: "Dec", num: 11 },
  ];

  return months.map((m) => ({
    label: m.name,
    monthVal: m.num,
    displaySub: String(year),
  }));
}

// Tier priority mapping
const tierPriority: Record<string, number> = {
  "100%": 11,
  "100": 11,
  "90%": 10,
  "90": 10,
  "80%": 9,
  "80": 9,
  "70%": 8,
  "70": 8,
  "60%": 7,
  "60": 7,
  "50%": 6,
  "50": 6,
  "40%": 5,
  "40": 5,
  "30%": 4,
  "30": 4,
  "20%": 3,
  "20": 3,
  "10%": 2,
  "10": 2,
  "0%": 1,
  "0": 1,
};

function getTierScore(tierStr?: string): number {
  if (!tierStr) return 1;
  const clean = tierStr.trim();
  if (tierPriority[clean] !== undefined) return tierPriority[clean];
  const normalized = clean.replace("%", "");
  return tierPriority[normalized] || 1; 
}

const TIER_TABS = ["ALL", "100", "90", "80", "70", "60", "50", "40", "30", "20", "10", "0"];
const MAIN_TABS = ["Live", "Week", "Month", "Year"];
const AVAILABLE_YEARS = [2024, 2025, 2026, 2027];

export default function DashboardPage() {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<string>("Week");
  
  // Calculator state: (price) +(number)% = Result
  const [calcPrice, setCalcPrice] = useState<string>("100");
  const [calcPercent, setCalcPercent] = useState<string>("1");

  // Dynamic default states initialized to today, but updated once trades load
  const today = new Date();
  const [weekYear, setWeekYear] = useState<number>(today.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(today.getMonth());
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);
  const [activeDayTab, setActiveDayTab] = useState<string>("");

  const monthWeeks = getMondayToFridayWeeksForMonth(weekYear, selectedMonthIndex);
  const currentWeekDays = monthWeeks[selectedWeekIndex] || monthWeeks[0] || [];

  const [monthYear, setMonthYear] = useState<number>(today.getFullYear());
  const [activeMonthTab, setActiveMonthTab] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );

  const [activeTierTab, setActiveTierTab] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    async function fetchTrades() {
      setLoading(true);
      const { data, error } = await supabase
        .from("stock_master_trades")
        .select("*")
        .order("Date", { ascending: false });

      if (error) {
        console.error("Error fetching trades from Supabase:", error);
      } else {
        const fetchedTrades: TradeRecord[] = (data || []).map((row: any) => ({
          id: row.id || `${row.Date}_${row.Ticker}`,
          date: row.Date || "",
          ticker: row.Ticker || "",
          Tier: row.Tier,
          RVOL: row.RVOL ? Number(row.RVOL) : 0,
          "Gap %": row["Gap %"],
          "BASE PRICE": row["BASE PRICE"] || 0,
          "TARGET PRICE": row["TARGET PRICE"] || 0,
          PROFIT: row.PROFIT,
          STATUS: row.STATUS || "",
          "HIT TIME": row["HIT TIME"],
          "HIT DAY": row["HIT DAY"],
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
        setTrades(fetchedTrades);

        // Find the latest trading date available in the database safely
        const latestDateStr = fetchedTrades[0]?.date;
        if (fetchedTrades.length > 0 && latestDateStr) {
          const parts = latestDateStr.split("-").map(Number);
          const lYear = parts[0] ?? today.getFullYear();
          const lMonth = parts[1] ?? (today.getMonth() + 1);
          const lYearNum = lYear;
          const lMonthIdx = lMonth - 1;

          setWeekYear(lYearNum);
          setSelectedMonthIndex(lMonthIdx);
          setMonthYear(lYearNum);
          setActiveMonthTab(`${lYear}-${String(lMonth).padStart(2, "0")}`);

          const weeksForMonth = getMondayToFridayWeeksForMonth(lYearNum, lMonthIdx);
          const foundWeekIdx = weeksForMonth.findIndex((wk) => wk.some((d) => d.date === latestDateStr));
          
          if (foundWeekIdx !== -1) {
            setSelectedWeekIndex(foundWeekIdx);
          }
          setActiveDayTab(latestDateStr);
        }
      }
      setLoading(false);
    }

    fetchTrades();
  }, []);

  const handleWeekMonthChange = (mIndex: number) => {
    setSelectedMonthIndex(mIndex);
    setSelectedWeekIndex(0);
    const newWeeks = getMondayToFridayWeeksForMonth(weekYear, mIndex);
    const firstWeek = newWeeks[0] || [];
    setActiveDayTab(firstWeek[firstWeek.length - 1]?.date || "");
  };

  const handleWeekYearChange = (y: number) => {
    setWeekYear(y);
    const newWeeks = getMondayToFridayWeeksForMonth(y, selectedMonthIndex);
    const firstWeek = newWeeks[0] || [];
    setActiveDayTab(firstWeek[firstWeek.length - 1]?.date || "");
  };

  const handleMonthYearSelect = (y: number) => {
    setMonthYear(y);
    const currentMonthNum = activeMonthTab.split("-")[1] || "01";
    setActiveMonthTab(`${y}-${currentMonthNum}`);
  };

  const currentActiveDate = activeDayTab || currentWeekDays[currentWeekDays.length - 1]?.date || "";

  // Filter trades based on Main Tab selection
  const scopedTrades = trades.filter((trade) => {
    if (!trade.date) return false;
    const tradeYear = trade.date.split("-")[0];
    const tradeMonth = trade.date.substring(0, 7);
    const currentYearStr = String(today.getFullYear());

    if (mainTab === "Live") {
      const todayStr = formatDateString(today);
      const hasTodayTrades = trades.some((t) => t.date === todayStr);
      const targetLiveDate = hasTodayTrades ? todayStr : (trades[0]?.date || todayStr);
      return trade.date === targetLiveDate;
    } else if (mainTab === "Week") {
      return trade.date === currentActiveDate;
    } else if (mainTab === "Month") {
      return tradeMonth === activeMonthTab;
    } else if (mainTab === "Year") {
      return tradeYear === currentYearStr;
    }
    return true;
  });

  const filteredTrades = scopedTrades.filter((trade) => {
    const tierVal = trade.Tier || "0%";
    const normalizedTradeTier = tierVal.trim().replace("%", "");
    const matchesTier = activeTierTab === "ALL" || tierVal.trim() === activeTierTab || normalizedTradeTier === activeTierTab;
    const matchesSearch = (trade.ticker ?? "").toLowerCase().includes((searchTerm ?? "").toLowerCase());
    return matchesTier && matchesSearch;
  });

  filteredTrades.sort((a, b) => {
    const scoreA = getTierScore(a.Tier);
    const scoreB = getTierScore(b.Tier);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return (b.RVOL || 0) - (a.RVOL || 0);
  });

  const topStocks = filteredTrades.slice(0, 3).map((trade) => ({
    tier: trade.Tier?.trim() || "0%",
    score: getTierScore(trade.Tier),
    trade,
  }));

  const totalSignals = filteredTrades.length;
  const totalWins = filteredTrades.filter((t) => {
    const statusLower = (t.STATUS ?? "").toLowerCase();
    return statusLower.includes("win") || statusLower.includes("hit");
  }).length;
  const winRate = totalSignals > 0 ? ((totalWins / totalSignals) * 100).toFixed(1) : "0.0";

  // Calculator computation
  const pVal = parseFloat(calcPrice) || 0;
  const pctVal = parseFloat(calcPercent) || 0;
  const calcResult = pVal + (pVal * pctVal) / 100;

  // Representative market stats safely accessed using optional chaining
  const sampleMarketRecord: Partial<TradeRecord> = filteredTrades[0] || trades[0] || {};
  const spyOpen = sampleMarketRecord.spy_open !== undefined && sampleMarketRecord.spy_open !== null ? Number(sampleMarketRecord.spy_open).toFixed(2) : "—";
  const spyClose = sampleMarketRecord.spy_close !== undefined && sampleMarketRecord.spy_close !== null ? Number(sampleMarketRecord.spy_close).toFixed(2) : "—";
  const spyPct = sampleMarketRecord.spy_pct_change !== undefined && sampleMarketRecord.spy_pct_change !== null ? Number(sampleMarketRecord.spy_pct_change).toFixed(2) : "0.00";
  const spyStatus = sampleMarketRecord.spy_status || "Neutral";

  const qqqOpen = sampleMarketRecord.qqq_open !== undefined && sampleMarketRecord.qqq_open !== null ? Number(sampleMarketRecord.qqq_open).toFixed(2) : "—";
  const qqqClose = sampleMarketRecord.qqq_close !== undefined && sampleMarketRecord.qqq_close !== null ? Number(sampleMarketRecord.qqq_close).toFixed(2) : "—";
  const qqqPct = sampleMarketRecord.qqq_pct_change !== undefined && sampleMarketRecord.qqq_pct_change !== null ? Number(sampleMarketRecord.qqq_pct_change).toFixed(2) : "0.00";
  const qqqStatus = sampleMarketRecord.qqq_status || "Neutral";

  const smhOpen = sampleMarketRecord.smh_open !== undefined && sampleMarketRecord.smh_open !== null ? Number(sampleMarketRecord.smh_open).toFixed(2) : "—";
  const smhClose = sampleMarketRecord.smh_close !== undefined && sampleMarketRecord.smh_close !== null ? Number(sampleMarketRecord.smh_close).toFixed(2) : "—";
  const smhPct = sampleMarketRecord.smh_pct_change !== undefined && sampleMarketRecord.smh_pct_change !== null ? Number(sampleMarketRecord.smh_pct_change).toFixed(2) : "0.00";
  const smhStatus = sampleMarketRecord.smh_status || "Neutral";

  const isSpyPositive = Number(spyPct) >= 0;
  const isQqqPositive = Number(qqqPct) >= 0;
  const isSmhPositive = Number(smhPct) >= 0;

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 font-mono p-6 lg:p-10">
      {/* Header & Main Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-3">
            <span>Stock Quant System</span>
          </h1>
          <p className="text-[11px] text-zinc-500 mt-1">Live Database Feed Active (stock_master_trades)</p>
        </div>

        {/* Main Tabs Selector */}
        <div className="flex items-center gap-1 bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800">
          {MAIN_TABS.map((tab) => {
            const isMainActive = mainTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setMainTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isMainActive
                    ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Target Price Calculator Box */}
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-3 py-2 rounded-xl text-xs">
          <span className="text-zinc-500 font-bold">$</span>
          <input
            type="number"
            value={calcPrice}
            onChange={(e) => setCalcPrice(e.target.value)}
            className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-emerald-500 text-center"
            placeholder="Price"
          />
          <span className="text-zinc-400">+</span>
          <input
            type="number"
            value={calcPercent}
            onChange={(e) => setCalcPercent(e.target.value)}
            className="w-12 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-zinc-200 focus:outline-none focus:border-emerald-500 text-center"
            placeholder="%"
          />
          <span className="text-zinc-400">%</span>
          <span className="text-zinc-500">=</span>
          <span className="font-bold text-emerald-400">${calcResult.toFixed(2)}</span>
        </div>
      </div>

      {/* Sub-Navigation Bar for 'Week' Tab */}
      {mainTab === "Week" && (
        <div className="flex flex-col gap-3 mb-6 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 border-b border-zinc-800/60">
            <div className="flex items-center gap-1 shrink-0">
              {AVAILABLE_YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => handleWeekYearChange(y)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    weekYear === y
                      ? "bg-emerald-500 text-zinc-950 shadow"
                      : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {getMonthsOfYear(weekYear).map((m) => {
                const isSelectedMonth = selectedMonthIndex === m.monthVal;
                return (
                  <button
                    key={m.label}
                    onClick={() => handleWeekMonthChange(m.monthVal)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      isSelectedMonth
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {monthWeeks.length > 1 && (
              <div className="flex flex-col gap-1 shrink-0">
                <span className="text-[10px] text-zinc-500 font-bold">WEEK</span>
                <div className="flex gap-1">
                  {monthWeeks.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedWeekIndex(idx);
                        const wk = monthWeeks[idx] || [];
                        setActiveDayTab(wk[wk.length - 1]?.date || "");
                      }}
                      className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center cursor-pointer ${
                        selectedWeekIndex === idx
                          ? "bg-emerald-500 text-zinc-950"
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-5 gap-2 flex-1">
              {currentWeekDays.map((tab) => {
                const isActive = activeDayTab === tab.date;
                return (
                  <button
                    key={tab.date}
                    onClick={() => setActiveDayTab(tab.date)}
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
          </div>
        </div>
      )}

      {/* Sub-Navigation Bar for 'Month' Tab */}
      {mainTab === "Month" && (
        <div className="flex flex-col gap-3 mb-6 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/60">
            <span className="text-[10px] text-zinc-500 font-bold uppercase">Year:</span>
            <div className="flex items-center gap-1.5">
              {AVAILABLE_YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => handleMonthYearSelect(y)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    monthYear === y
                      ? "bg-emerald-500 text-zinc-950 shadow"
                      : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
            {getMonthsOfYear(monthYear).map((m) => {
              const monthString = `${monthYear}-${String(m.monthVal + 1).padStart(2, "0")}`;
              const isActive = activeMonthTab === monthString;
              return (
                <button
                  key={monthString}
                  onClick={() => setActiveMonthTab(monthString)}
                  className={`flex flex-col items-center justify-center px-2 py-2.5 rounded-lg transition-all cursor-pointer w-full text-center ${
                    isActive
                      ? "bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
                >
                  <span className="text-xs font-semibold leading-tight">{m.label}</span>
                  <span className={`text-[10px] mt-1 leading-tight ${isActive ? "text-zinc-900 font-medium" : "text-zinc-500"}`}>
                    {monthYear}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3 Market Overview Boxes (SPY, QQQ, SMH Index) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* SPY Box */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-zinc-800/80 p-4 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              SPY Market Index
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isSpyPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {isSpyPositive ? `+${spyPct}%` : `${spyPct}%`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60 text-xs mb-2">
            <div>
              <div className="text-[10px] text-zinc-500">OPEN</div>
              <div className="font-mono text-zinc-200">${spyOpen}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500">CLOSE</div>
              <div className="font-mono text-zinc-200">${spyClose}</div>
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1 border-t border-zinc-800/60">
            <span>Status:</span>
            <span className="font-bold text-white">{spyStatus}</span>
          </div>
        </div>

        {/* QQQ Box */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-zinc-800/80 p-4 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              QQQ Market Index
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isQqqPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {isQqqPositive ? `+${qqqPct}%` : `${qqqPct}%`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60 text-xs mb-2">
            <div>
              <div className="text-[10px] text-zinc-500">OPEN</div>
              <div className="font-mono text-zinc-200">${qqqOpen}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500">CLOSE</div>
              <div className="font-mono text-zinc-200">${qqqClose}</div>
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1 border-t border-zinc-800/60">
            <span>Status:</span>
            <span className="font-bold text-white">{qqqStatus}</span>
          </div>
        </div>

        {/* SMH Detail Box */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-zinc-800/80 p-4 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              SMH Semiconductor Index
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isSmhPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {isSmhPositive ? `+${smhPct}%` : `${smhPct}%`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60 text-xs mb-2">
            <div>
              <div className="text-[10px] text-zinc-500">OPEN</div>
              <div className="font-mono text-zinc-200">${smhOpen}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500">CLOSE</div>
              <div className="font-mono text-zinc-200">${smhClose}</div>
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1 border-t border-zinc-800/60">
            <span>Status:</span>
            <span className="font-bold text-white">{smhStatus}</span>
          </div>
        </div>
      </div>

      {/* Top 3 Opportunities Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Top 3 Opportunities ({mainTab})
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-[220px] bg-zinc-900/40 border border-zinc-800/80 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : topStocks.length > 0 ? (
          <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(topStocks.length, 3)} gap-4`}>
            {topStocks.map(({ tier, trade }, index) => {
              const cleanTicker = (trade.ticker ?? "").replace(/(\d+%)$/, "").trim();
              const baseNum = Number(trade["BASE PRICE"] ?? 0);
              const targetPrice = Number(trade["TARGET PRICE"] ?? baseNum * 1.01);
              const profitVal = Number(trade.PROFIT ?? (targetPrice - baseNum));
              const statusLower = (trade.STATUS ?? "").toLowerCase();
              const isHit = statusLower.includes("win") || statusLower.includes("hit");

              return (
                <div
                  key={trade.id}
                  className="relative bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-zinc-800/80 hover:border-emerald-500/45 transition-all p-5 rounded-2xl shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="grid grid-cols-3 items-center mb-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 justify-self-start">
                        {tier}
                      </span>
                      <div className="justify-self-center w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center justify-center shadow-sm">
                        {index + 1}
                      </div>
                      <span className="text-[10px] text-zinc-500 justify-self-end">{formatDisplayDate(trade.date)}</span>
                    </div>

                    <div className="flex items-baseline justify-between mb-4">
                      <span className="text-lg font-bold font-sans text-white">{cleanTicker}</span>
                      <span className="text-xs font-semibold text-emerald-400">+${profitVal.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60 mb-3 text-xs">
                      <div>
                        <div className="text-[10px] text-zinc-500">BASE PRICE</div>
                        <div className="font-mono text-zinc-200 mt-0.5">${baseNum.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500">TARGET PRICE</div>
                        <div className="font-mono text-emerald-400 mt-0.5">${targetPrice.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                    <span className="text-zinc-400 truncate max-w-[130px]">{trade["HIT TIME"] || "—"}</span>
                    <span className={`font-bold ${isHit ? "text-emerald-400" : "text-amber-400"}`}>
                      {isHit ? "HIT" : "HOLD"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-950 border border-zinc-800/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-xl h-[200px]">
            <p className="text-xs text-zinc-200 font-semibold font-sans tracking-wide">No Trade Recorded in this Session</p>
            <p className="text-[11px] text-zinc-500 mt-1.5 max-w-xs leading-relaxed">
              Market conditions did not trigger strategy criteria or no records were logged for this timeframe.
            </p>
          </div>
        )}
      </div>

      {/* Data Table Card */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Active Date & Signals/Win Rate Badge Combined Beside Each Other */}
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                {mainTab === "Week"
                  ? formatDisplayDate(currentActiveDate)
                  : mainTab === "Month"
                  ? `Month: ${activeMonthTab}`
                  : `${mainTab} View`}
              </div>

              <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 mr-1">SIGNALS:</span>
                  <span className="font-bold text-white">{totalSignals}</span>
                </div>
                <div className="h-3 w-[1px] bg-zinc-800" />
                <div>
                  <span className="text-[10px] text-zinc-500 mr-1">WIN RATE:</span>
                  <span className="font-bold text-emerald-400">{winRate}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 overflow-x-auto max-w-full">
              <span className="text-[10px] text-zinc-500 px-2 font-bold uppercase tracking-wider">Tier:</span>
              {TIER_TABS.map((tier) => {
                const isTierActive = activeTierTab === tier;
                return (
                  <button
                    key={tier}
                    onClick={() => setActiveTierTab(tier)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isTierActive
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    }`}
                  >
                    {tier === "ALL" ? "ALL" : `${tier}%`}
                  </button>
                );
              })}
            </div>
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
              Market conditions did not trigger strategy criteria or no records were logged for this specific timeframe.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 bg-zinc-900/40">
                  <th className="py-3 px-6 font-semibold">DATE</th>
                  <th className="py-3 px-6 font-semibold">TICKER</th>
                  <th className="py-3 px-6 font-semibold">TIER</th>
                  <th className="py-3 px-6 font-semibold">RVOL</th>
                  <th className="py-3 px-6 font-semibold">BASE PRICE</th>
                  <th className="py-3 px-6 font-semibold">TARGET PRICE</th>
                  <th className="py-3 px-6 font-semibold">PROFIT</th>
                  <th className="py-3 px-6 font-semibold">STATUS</th>
                  <th className="py-3 px-6 font-semibold">HIT TIME</th>
                  <th className="py-3 px-6 font-semibold text-right">HIT DAY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredTrades.map((trade) => {
                  const baseNum = Number(trade["BASE PRICE"] ?? 0);
                  const targetPrice = Number(trade["TARGET PRICE"] ?? baseNum * 1.01);
                  const profitVal = Number(trade.PROFIT ?? (targetPrice - baseNum));
                  const statusLower = (trade.STATUS ?? "").toLowerCase();
                  const isHit = statusLower.includes("win") || statusLower.includes("hit");
                  const cleanTicker = (trade.ticker ?? "").replace(/(\d+%)$/, "").trim();
                  const displayTier = trade.Tier?.trim() || "0%";

                  return (
                    <tr key={trade.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3.5 px-6 text-zinc-400 font-mono">
                        {formatDisplayDate(trade.date)}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-white">
                        {cleanTicker}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                          {displayTier}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-zinc-300 font-mono">
                        {trade.RVOL !== undefined ? Number(trade.RVOL).toFixed(2) : "—"}
                      </td>
                      <td className="py-3.5 px-6 text-zinc-300">${baseNum.toFixed(2)}</td>
                      <td className="py-3.5 px-6 text-emerald-400 font-semibold">${targetPrice.toFixed(2)}</td>
                      <td className="py-3.5 px-6 text-emerald-400 font-bold">+${profitVal.toFixed(2)}</td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isHit
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {isHit ? "HIT" : "HOLD"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-zinc-300 font-mono">
                        {trade["HIT TIME"] || "—"}
                      </td>
                      <td className="py-3.5 px-6 text-right text-zinc-300 font-mono">
                        {trade["HIT DAY"] || "—"}
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