"use client";

interface TradeRecord {
  id?: number | string;
  date?: string;
  rank?: string | number;
  ticker?: string;
  tier?: string;
  vwap_pass?: any;
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

interface MultiTickersCardProps {
  trades: TradeRecord[];
  loading: boolean;
  activeTierTab: string;
  onSelectTierTab: (tier: string) => void;
}

const TIER_TABS = ["ALL", "100", "90", "80", "70", "60", "50", "40", "30", "20", "10", "0"];

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const [year, month, day] = parts as [string, string, string];
  const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, "0")} ${d.toLocaleDateString("en-US", { month: "short" })} ${String(d.getFullYear()).slice(-2)}`;
}

export default function MultiTickersCard({
  trades,
  loading,
  activeTierTab,
  onSelectTierTab,
}: MultiTickersCardProps) {
  // Sort trades strictly by numeric rank (#1 to #15)
  const sortedTrades = [...trades].sort((a, b) => {
    const rankA = parseInt(String(a.rank || a.Rank || 99).replace("#", ""), 10);
    const rankB = parseInt(String(b.rank || b.Rank || 99).replace("#", ""), 10);
    return rankA - rankB;
  });

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/35 backdrop-blur-md overflow-hidden shadow-2xl">
      {/* Tier Filter Header & Centered Row for Tabs + Record Count */}
      <div className="px-6 py-4 border-b border-zinc-800/80 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-nowrap w-full">
          {/* Uniform Width Tier Tabs */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {TIER_TABS.map((tierTab) => {
              const isActive = activeTierTab === tierTab;
              return (
                <button
                  key={tierTab}
                  onClick={() => onSelectTierTab(tierTab)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center truncate px-0.5 ${
                    isActive
                      ? "bg-emerald-500 text-zinc-950 shadow"
                      : "bg-zinc-800/50 text-zinc-400 hover:text-white"
                  }`}
                >
                  {tierTab === "ALL" ? "ALL" : `${tierTab}%`}
                </button>
              );
            })}
          </div>

          {/* Centered Records Count */}
          <div className="flex items-center justify-center text-xs text-zinc-400 font-mono shrink-0 ml-2 text-center">
            <span>Showing <span className="text-white font-bold">{sortedTrades.length}</span> records</span>
          </div>
        </div>
      </div>

      {/* Table Component with 9 Columns */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs table-fixed border-collapse">
          <colgroup>
            <col className="w-[11.11%]" />
            <col className="w-[11.11%]" />
            <col className="w-[11.11%]" />
            <col className="w-[11.11%]" />
            <col className="w-[11.11%]" />
            <col className="w-[11.11%]" />
            <col className="w-[11.11%]" />
            <col className="w-[11.11%]" />
            <col className="w-[11.12%]" />
          </colgroup>
          <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-2 py-3 text-center border-r border-zinc-800/80">Rank</th>
              <th className="px-2 py-3 text-center border-r border-zinc-800/80">Ticker</th>
              <th className="px-2 py-3 text-center border-r border-zinc-800/80">Tier</th>
              <th className="px-2 py-3 text-center border-r border-zinc-800/80">VWAP Pass</th>
              <th className="px-2 py-3 text-center border-r border-zinc-800/80">Base Price</th>
              <th className="px-2 py-3 text-center border-r border-zinc-800/80">Target Price</th>
              <th className="px-2 py-3 text-center border-r border-zinc-800/80">Profit</th>
              <th className="px-2 py-3 text-center border-r border-zinc-800/80">Status</th>
              <th className="px-2 py-3 text-center">Hit Days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                  Loading trade records...
                </td>
              </tr>
            ) : sortedTrades.length > 0 ? (
              sortedTrades.map((row, index) => {
                const rankVal = row.rank || row.Rank ? (String(row.rank || row.Rank).startsWith("#") ? row.rank || row.Rank : `#${row.rank || row.Rank}`) : `#${index + 1}`;
                const tickerVal = row.ticker || row.Ticker || "—";
                const dateVal = row.date || row.Date || "";
                const tierVal = row.tier || row.Tier || "0%";
                
                // Robust VWAP Pass evaluation
                const rawVwap = row.vwap_pass;
                const vwapStr = String(rawVwap || "").trim().toLowerCase();
                const isVwapPass = vwapStr === "yes" || vwapStr === "true" || vwapStr === "pass" || vwapStr === "1" || rawVwap === true || rawVwap === 1;

                const statusVal = row.status || row.STATUS || "HOLD";
                const statusLower = statusVal.toLowerCase();
                const isHit = statusLower.includes("hit") || statusLower.includes("win");

                const baseNum = Number(row.base_price_trade || row["BASE PRICE"] || 0);
                const targetNum = Number(row.target_price || row["TARGET PRICE"] || baseNum * 1.01);

                const rawProfit = row.profit != null ? row.profit : row.PROFIT;
                const profitVal = rawProfit != null ? Number(rawProfit) : targetNum - baseNum;

                const hitDayVal = row.hit_day != null ? row.hit_day : row["HIT DAY"];
                const hitDaysLabel = hitDayVal != null ? (Number(hitDayVal) === 0 ? "Same Day" : Number(hitDayVal) === 1 ? "Next Day" : `${hitDayVal} Days`) : "—";

                const hitTimeVal = row.hit_time || row["HIT TIME"] || "—";
                const hitDateVal = row.hit_date || row["HIT DATE"] || "";

                return (
                  <tr key={row.id || index} className="hover:bg-zinc-800/30 transition-colors">
                    {/* Rank Column */}
                    <td className="px-2 py-3 text-center border-r border-zinc-800/60 truncate">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800/60 text-zinc-300 border border-zinc-700/50">
                        {rankVal}
                      </span>
                    </td>

                    {/* Ticker Column (Ticker + Date) */}
                    <td className="px-2 py-3 text-center border-r border-zinc-800/60 truncate">
                      <div className="font-bold text-white font-sans text-xs">{tickerVal}</div>
                      <div className="text-[9px] text-zinc-500 font-mono mt-0.5">{formatDisplayDate(dateVal)}</div>
                    </td>

                    {/* Tier Column */}
                    <td className="px-2 py-3 text-center border-r border-zinc-800/60 truncate">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {tierVal}
                      </span>
                    </td>

                    {/* VWAP Pass Column (Green/Red Icons) */}
                    <td className="px-2 py-3 text-center border-r border-zinc-800/60 truncate">
                      {isVwapPass ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold" title="VWAP Pass: YES">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold" title="VWAP Pass: NO">
                          ✕
                        </span>
                      )}
                    </td>

                    {/* Base Price */}
                    <td className="px-2 py-3 text-center border-r border-zinc-800/60 text-zinc-200 font-mono truncate">
                      {baseNum > 0 ? `$${baseNum.toFixed(2)}` : "—"}
                    </td>

                    {/* Target Price */}
                    <td className="px-2 py-3 text-center border-r border-zinc-800/60 text-emerald-400 font-mono truncate">
                      {targetNum > 0 ? `$${targetNum.toFixed(2)}` : "—"}
                    </td>

                    {/* Profit */}
                    <td className={`px-2 py-3 text-center border-r border-zinc-800/60 font-mono font-semibold truncate ${isHit ? "text-emerald-400" : "text-amber-400/80"}`}>
                      {profitVal !== 0 ? (profitVal > 0 ? `+$${profitVal.toFixed(2)}` : `-$${Math.abs(profitVal).toFixed(2)}`) : "$0.00"}
                    </td>

                    {/* Status Column (Status + Hit Time + Hit Date) */}
                    <td className="px-2 py-3 text-center border-r border-zinc-800/60 truncate">
                      <span className={`inline-block font-bold px-1.5 py-0.5 rounded text-[10px] mb-1 ${isHit ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                        {statusVal}
                      </span>
                      <div className="text-zinc-200 font-mono text-[10px]">{hitTimeVal !== "—" ? hitTimeVal : "—"}</div>
                      <div className="text-[9px] text-zinc-500 font-mono mt-0.5">{hitDateVal ? formatDisplayDate(hitDateVal) : "—"}</div>
                    </td>

                    {/* Hit Days */}
                    <td className="px-2 py-3 text-center font-mono text-zinc-300 font-medium truncate">
                      {isHit ? hitDaysLabel : "—"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-zinc-500">
                  No records found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}