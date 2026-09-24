"use client";

import { useEffect, useState, Fragment } from "react";
import { createClientComponentClient } from "@/utils/supabase/client";

export interface AssetRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  compliance: string;
  debt_ratio: string;
  sector: string;
}

interface ChartPoint {
  time: string;
  rawDate?: string;
  open?: number;
  high?: number;
  low?: number;
  price: number; // close
  volume?: number;
  atr?: number | null;
  rsi?: number | null;
  macd?: number | null;
  vwap?: number;
  dist_vwap?: number;
  minutes_from_open?: number;
  is_premarket?: boolean;
}

export function SectorAssetTable({ sector }: { sector: string }) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [selectedStock, setSelectedStock] = useState<string>("ALL");
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<Record<string, ChartPoint[]>>({});
  const [intradayData, setIntradayData] = useState<Record<string, ChartPoint[]>>({});
  const [selectedDay, setSelectedDay] = useState<{ symbol: string; date: string; label: string } | null>(null);
  
  const [chartLoading, setChartLoading] = useState(false);
  const [tickLoading, setTickLoading] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    setSelectedStock("ALL");
    setExpandedSymbol(null);
    setSelectedDay(null);
  }, [sector]);

  useEffect(() => {
    async function fetchAssets() {
      const { data, error } = await supabase.from("sector_assets").select("*").eq("sector", sector);
      if (error || !data || data.length === 0) {
        setAssets(getFallbackData(sector));
      } else {
        setAssets(data);
      }
    }
    fetchAssets();
  }, [sector, supabase]);

  const toggleExpand = async (symbol: string) => {
    if (expandedSymbol === symbol) {
      setExpandedSymbol(null);
      setSelectedDay(null);
      return;
    }
    setExpandedSymbol(symbol);
    setSelectedDay(null);

    if (!historyData[symbol]) {
      setChartLoading(true);
      try {
        const res = await fetch(`/api/stock-chart/${symbol}`);
        const json = await res.json();
        if (json.chartData) {
          setHistoryData((prev) => ({ ...prev, [symbol]: json.chartData }));
        }
      } catch {
        // fallback
      }
      setChartLoading(false);
    }
  };

  const handleDayClick = async (symbol: string, rawDate?: string, label?: string) => {
    if (!rawDate) return;
    const cacheKey = `${symbol}_${rawDate}`;
    setSelectedDay({ symbol, date: rawDate, label: label || rawDate });

    if (!intradayData[cacheKey]) {
      setTickLoading(true);
      try {
        const res = await fetch(`/api/stock-chart/${symbol}?date=${rawDate}`);
        const json = await res.json();
        if (json.chartData) {
          setIntradayData((prev) => ({ ...prev, [cacheKey]: json.chartData }));
        }
      } catch {
        // fallback
      }
      setTickLoading(false);
    }
  };

  const filteredAssets = selectedStock === "ALL" ? assets : assets.filter((a) => a.symbol === selectedStock);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/80">
        <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Filter Asset Ticker:</span>
        <select
          value={selectedStock}
          onChange={(e) => setSelectedStock(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
        >
          <option value="ALL">All Tickers in Sector</option>
          {assets.map((asset) => (
            <option key={asset.symbol} value={asset.symbol}>{asset.symbol} - {asset.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm font-mono">
          <thead className="border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Asset / Ticker</th>
              <th className="py-3 px-4">Current Price</th>
              <th className="py-3 px-4">24H Change</th>
              <th className="py-3 px-4 text-right">7-Day History</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredAssets.map((asset) => {
              const isExpanded = expandedSymbol === asset.symbol;
              return (
                <Fragment key={asset.symbol}>
                  <tr className="hover:bg-zinc-900/45 transition-colors">
                    <td className="py-4 px-4 font-semibold text-zinc-200">
                      {asset.symbol}
                      <span className="block text-xs font-normal text-zinc-500">{asset.name}</span>
                    </td>
                    <td className="py-4 px-4 text-zinc-100">${Number(asset.price).toFixed(2)}</td>
                    <td className={`py-4 px-4 font-medium ${Number(asset.change) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {Number(asset.change) >= 0 ? `+${asset.change}%` : `${asset.change}%`}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => toggleExpand(asset.symbol)}
                        className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition-colors cursor-pointer"
                      >
                        {isExpanded ? "Hide History" : "View 7D History"}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-zinc-950/90">
                      <td colSpan={4} className="p-6">
                        <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/50">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                              {asset.symbol} — Past 7 Days (Click any day to view 1-min institutional telemetry)
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono">Interactive Daily Closes</span>
                          </div>

                          {chartLoading ? (
                            <div className="py-8 text-center text-xs text-zinc-500 font-mono animate-pulse">
                              Pulling 7-day history...
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                              {historyData[asset.symbol]?.map((pt, idx) => {
                                const isSelected = selectedDay?.date === pt.rawDate;
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => handleDayClick(asset.symbol, pt.rawDate, pt.time)}
                                    className={`bg-zinc-950 border p-3 rounded text-center cursor-pointer transition-all ${
                                      isSelected 
                                        ? "border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/50" 
                                        : "border-zinc-800/80 hover:border-zinc-600"
                                    }`}
                                  >
                                    <span className="block text-[10px] text-zinc-400 mb-1">{pt.time}</span>
                                    <span className="block text-xs font-bold text-zinc-200">${pt.price}</span>
                                    <span className="block text-[9px] text-emerald-400/80 mt-1">View 1m Ticks →</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* 1-Minute OHLCV & Indicators Sub-Panel */}
                          {selectedDay && selectedDay.symbol === asset.symbol && (
                            <div className="mt-6 border-t border-zinc-800 pt-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                  1-Minute Telemetry & Indicators for {selectedDay.label} ({selectedDay.date})
                                </span>
                                <button
                                  onClick={() => setSelectedDay(null)}
                                  className="text-[10px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                                >
                                  Close Telemetry
                                </button>
                              </div>

                              {tickLoading ? (
                                <div className="py-6 text-center text-xs text-zinc-500 font-mono animate-pulse">
                                  Fetching 1-minute candlestick telemetry & VWAP indicators...
                                </div>
                              ) : (
                                <div className="max-h-80 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 bg-zinc-950/90 p-3 rounded-lg border border-zinc-800/60 font-mono text-xs">
                                  {intradayData[`${asset.symbol}_${selectedDay.date}`]?.map((tick, idx) => (
                                    <div key={idx} className="bg-zinc-900 border border-zinc-800/90 p-2.5 rounded flex flex-col justify-between gap-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                                          {tick.time}
                                          {tick.is_premarket && (
                                            <span className="bg-amber-950/80 text-amber-400 border border-amber-800/60 text-[9px] px-1 rounded">
                                              PRE
                                            </span>
                                          )}
                                        </span>
                                        <span className="text-[10px] text-cyan-400">VWAP: ${tick.vwap ?? "—"}</span>
                                      </div>

                                      <div className="text-[11px] grid grid-cols-2 gap-1 bg-zinc-950/60 p-1.5 rounded border border-zinc-800/50">
                                        <div>O: <span className="text-zinc-300">${tick.open}</span></div>
                                        <div>H: <span className="text-emerald-400">${tick.high}</span></div>
                                        <div>L: <span className="text-rose-400">${tick.low}</span></div>
                                        <div>C: <span className="text-cyan-400">${tick.price}</span></div>
                                      </div>

                                      <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
                                        <span>Vol: {tick.volume?.toLocaleString()}</span>
                                        <span>RSI: <strong className="text-zinc-200">{tick.rsi ?? "—"}</strong></span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getFallbackData(_sector: string): AssetRow[] {
  return [];
}