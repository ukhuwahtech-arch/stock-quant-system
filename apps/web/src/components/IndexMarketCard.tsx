"use client";

import { useState } from "react";

interface IndexMarketCardProps {
  marketRecord?: {
    spy_open?: number | string;
    spy_close?: number | string;
    spy_pct_change?: number | string;
    qqq_open?: number | string;
    qqq_close?: number | string;
    qqq_pct_change?: number | string;
    smh_open?: number | string;
    smh_close?: number | string;
    smh_pct_change?: number | string;
  };
}

export default function IndexMarketCard({ marketRecord = {} }: IndexMarketCardProps) {
  const [showSpyPrices, setShowSpyPrices] = useState(false);
  const [showQqqPrices, setShowQqqPrices] = useState(false);
  const [showSmhPrices, setShowSmhPrices] = useState(false);

  const spyOpen = marketRecord.spy_open != null ? Number(marketRecord.spy_open).toFixed(2) : "—";
  const spyClose = marketRecord.spy_close != null ? Number(marketRecord.spy_close).toFixed(2) : "—";
  const spyPct = marketRecord.spy_pct_change != null ? Number(marketRecord.spy_pct_change).toFixed(2) : "0.00";

  const qqqOpen = marketRecord.qqq_open != null ? Number(marketRecord.qqq_open).toFixed(2) : "—";
  const qqqClose = marketRecord.qqq_close != null ? Number(marketRecord.qqq_close).toFixed(2) : "—";
  const qqqPct = marketRecord.qqq_pct_change != null ? Number(marketRecord.qqq_pct_change).toFixed(2) : "0.00";

  const smhOpen = marketRecord.smh_open != null ? Number(marketRecord.smh_open).toFixed(2) : "—";
  const smhClose = marketRecord.smh_close != null ? Number(marketRecord.smh_close).toFixed(2) : "—";
  const smhPct = marketRecord.smh_pct_change != null ? Number(marketRecord.smh_pct_change).toFixed(2) : "0.00";

  const isSpyPositive = Number(spyPct) >= 0;
  const isQqqPositive = Number(qqqPct) >= 0;
  const isSmhPositive = Number(smhPct) >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* SPY Card */}
      <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800/80 p-4 rounded-2xl shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
              SPY Market Index
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${isSpyPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {isSpyPositive ? `+${spyPct}%` : `${spyPct}%`}
            </span>
          </div>

          {/* Compact Inline Prices */}
          {showSpyPrices && (
            <div className="flex items-center justify-between bg-zinc-950/80 px-3 py-1.5 rounded-lg border border-zinc-800/80 text-[11px] mb-2 animate-fadeIn">
              <span className="text-zinc-400">Open: <strong className="text-zinc-200">${spyOpen}</strong></span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">Close: <strong className="text-zinc-200">${spyClose}</strong></span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-zinc-800/60 flex justify-end">
          <button
            onClick={() => setShowSpyPrices(!showSpyPrices)}
            className="text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>{showSpyPrices ? "Hide Prices" : "Show Prices"}</span>
            <span className="text-xs">{showSpyPrices ? "▲" : "▼"}</span>
          </button>
        </div>
      </div>

      {/* QQQ Card */}
      <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800/80 p-4 rounded-2xl shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></span>
              QQQ Market Index
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${isQqqPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {isQqqPositive ? `+${qqqPct}%` : `${qqqPct}%`}
            </span>
          </div>

          {showQqqPrices && (
            <div className="flex items-center justify-between bg-zinc-950/80 px-3 py-1.5 rounded-lg border border-zinc-800/80 text-[11px] mb-2 animate-fadeIn">
              <span className="text-zinc-400">Open: <strong className="text-zinc-200">${qqqOpen}</strong></span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">Close: <strong className="text-zinc-200">${qqqClose}</strong></span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-zinc-800/60 flex justify-end">
          <button
            onClick={() => setShowQqqPrices(!showQqqPrices)}
            className="text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>{showQqqPrices ? "Hide Prices" : "Show Prices"}</span>
            <span className="text-xs">{showQqqPrices ? "▲" : "▼"}</span>
          </button>
        </div>
      </div>

      {/* SMH Card */}
      <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800/80 p-4 rounded-2xl shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
              SMH Semiconductor Index
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${isSmhPositive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {isSmhPositive ? `+${smhPct}%` : `${smhPct}%`}
            </span>
          </div>

          {showSmhPrices && (
            <div className="flex items-center justify-between bg-zinc-950/80 px-3 py-1.5 rounded-lg border border-zinc-800/80 text-[11px] mb-2 animate-fadeIn">
              <span className="text-zinc-400">Open: <strong className="text-zinc-200">${smhOpen}</strong></span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400">Close: <strong className="text-zinc-200">${smhClose}</strong></span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-zinc-800/60 flex justify-end">
          <button
            onClick={() => setShowSmhPrices(!showSmhPrices)}
            className="text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>{showSmhPrices ? "Hide Prices" : "Show Prices"}</span>
            <span className="text-xs">{showSmhPrices ? "▲" : "▼"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}