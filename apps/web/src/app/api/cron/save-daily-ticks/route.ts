import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateIndicators } from "../../../../lib/indicators";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CandleRecord {
  symbol: string;
  date: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  interval_type: string;
}

export async function GET(request: Request) {
  // 🔒 Security: Verify secret token
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Dynamically fetch ALL symbols from your Supabase sector_assets table
    const { data: assets, error: assetError } = await supabaseAdmin
      .from("sector_assets")
      .select("symbol");

    if (assetError || !assets || assets.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch assets from Supabase", details: assetError?.message },
        { status: 500 }
      );
    }

    const symbols = assets.map((a) => a.symbol);
    
    // Get accurate US Eastern date
    const nowNY = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
    const nyDateObj = new Date(nowNY);
    const y = nyDateObj.getFullYear();
    const m = String(nyDateObj.getMonth() + 1).padStart(2, "0");
    const d = String(nyDateObj.getDate()).padStart(2, "0");
    const today = `${y}-${m}-${d}`;

    let totalRecordsInserted = 0;

    // Approximate USD/KRW conversion rate for Hynix if pulling from KRX
    const KRW_TO_USD_RATE = 1386.0;

    for (const symbol of symbols) {
      // 🛠️ Fix: Retain full ticker for Yahoo Finance query (e.g., 000660.KS needs the .KS suffix)
      const yahooQuerySymbol = symbol === "SKHY" ? "000660.KS" : symbol;
      
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooQuerySymbol}?range=1d&interval=1m&includePrePost=true`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );

      const json = await res.json();
      const result = json.chart?.result?.[0];
      if (!result || !result.timestamp) continue;

      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];

      // 💱 Apply currency scale down if it's Hynix in KRW
      const scaleFactor = (symbol === "SKHY" || symbol === "000660.KS") ? KRW_TO_USD_RATE : 1.0;

      const rawRecords: CandleRecord[] = timestamps
        .map((ts: number, i: number): CandleRecord | null => {
          const close = quotes.close[i];
          if (close === null || close === undefined) return null;

          const dateObj = new Date(ts * 1000);
          
          const dateStr = dateObj.toLocaleDateString("en-US", {
            timeZone: "America/New_York",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          const [month, day, year] = dateStr.split("/");
          const actualDate = `${year}-${month}-${day}`;

          // 🛠️ Fix: Force 24-hour format (HH:mm:ss) so frontend JavaScript Date parsing doesn't crash
          const time = dateObj.toLocaleTimeString("en-US", { 
            timeZone: "America/New_York",
            hour: "2-digit", 
            minute: "2-digit", 
            second: "2-digit",
            hour12: false 
          });

          return {
            symbol, // Keeps clean database identifier (e.g., SKHY)
            date: actualDate,
            time,
            open: quotes.open?.[i] ? Number((quotes.open[i] / scaleFactor).toFixed(2)) : 0,
            high: quotes.high?.[i] ? Number((quotes.high[i] / scaleFactor).toFixed(2)) : 0,
            low: quotes.low?.[i] ? Number((quotes.low[i] / scaleFactor).toFixed(2)) : 0,
            close: Number((close / scaleFactor).toFixed(2)),
            volume: quotes.volume?.[i] || 0,
            interval_type: "1m",
          };
        })
        .filter((item: CandleRecord | null): item is CandleRecord => item !== null);

      if (rawRecords.length === 0) continue;

      // Compute ATR, RSI, MACD, VWAP, etc.
      const enhancedCandles = calculateIndicators(rawRecords) as (CandleRecord & {
        atr: number | null;
        rsi: number | null;
        macd: number | null;
        macd_signal: number | null;
        macd_hist: number | null;
        vwap: number;
        dist_vwap: number;
        dist_open: number;
        dist_high: number;
        dist_low: number;
        minutes_from_open: number;
        is_premarket: boolean;
      })[];

      const formattedRecords = enhancedCandles.map((rec) => ({
        symbol: rec.symbol,
        date: rec.date,
        time: rec.time,
        open: rec.open,
        high: rec.high,
        low: rec.low,
        price: rec.close, 
        volume: rec.volume,
        interval_type: rec.interval_type,
        atr: rec.atr,
        rsi: rec.rsi,
        macd: rec.macd,
        macd_signal: rec.macd_signal,
        macd_hist: rec.macd_hist,
        vwap: rec.vwap,
        dist_vwap: rec.dist_vwap,
        dist_open: rec.dist_open,
        dist_high: rec.dist_high,
        dist_low: rec.dist_low,
        minutes_from_open: rec.minutes_from_open,
        is_premarket: rec.is_premarket,
      }));

      // Deduplicate records to prevent PostgreSQL conflict errors
      const uniqueMap = new Map();
      formattedRecords.forEach((rec) => {
        if (rec) {
          const uniqueKey = `${rec.symbol}_${rec.date}_${rec.time}_${rec.interval_type}`;
          uniqueMap.set(uniqueKey, rec);
        }
      });
      const cleanRecords = Array.from(uniqueMap.values());

      const { error: upsertError } = await supabaseAdmin.from("stock_history").upsert(cleanRecords, {
        onConflict: "symbol,date,time,interval_type",
      });

      if (upsertError) {
        console.error(`Supabase Upsert Error for ${symbol}:`, upsertError.message);
      } else {
        totalRecordsInserted += cleanRecords.length;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Pre-market, USD conversion, OHLCV & indicators saved for all ${symbols.length} assets on ${today}`,
      totalRecordsInserted 
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}