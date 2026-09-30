import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import yahooFinance from 'yahoo-finance2';

// Initialize Supabase admin client (bypasses RLS for automated backend writes)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

const tickers = ["AMD", "ASML", "INTC", "MRVL", "AVGO", "NVDA", "MU", "TSM", "ARM", "PLTR", "SMCI", "QCOM", "AMAT", "LRCX"];

// Up-spec'd & Merged Gates Configuration
const GATES = {
  "Gate 80": { min_gap: 0.5,   max_gap: 2.5,   min_spread: 0.30, min_rvol: 1.5 },
  "Gate 70": { min_gap: 0.2,   max_gap: 3.5,   min_spread: 0.20, min_rvol: 1.3 },
  "Gate 60": { min_gap: -0.5,  max_gap: 3.5,   min_spread: -0.15, min_rvol: 0.8 }
};
const MAX_RVOL = 10.0;

export async function GET(request: Request) {
  // Security check for Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get current US Market date (America/New_York)
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const results = [];

  try {
    // --- 0. MULTI-DAY LOOKBACK CHECK ---
    // Scan older HOLD trades and check if they hit their target price today
    const { data: openTrades, error: openError } = await supabase
      .from("trade_results")
      .select("*")
      .eq("status", "HOLD")
      .lt("trade_date", todayStr)
      .limit(50);

    if (!openError && openTrades && openTrades.length > 0) {
      for (const oldTrade of openTrades) {
        const quote: any = await yahooFinance.quote(oldTrade.ticker);
        if (!quote) continue;

        const todayHigh = quote.regularMarketDayHigh || quote.regularMarketPrice || 0;

        if (todayHigh >= oldTrade.target_price) {
          const entryDate = new Date(oldTrade.trade_date);
          const currentDate = new Date(todayStr);
          const diffTime = Math.abs(currentDate.getTime() - entryDate.getTime());
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          const outcomePct = Number((((todayHigh - oldTrade.entry_price) / oldTrade.entry_price) * 100).toFixed(2));

          await supabase
            .from("trade_results")
            .update({
              profit_outcome: outcomePct,
              status: "HIT",
              hit_time: "10:30:00",
              hit_day: `Day ${diffDays}`,
              hit_date: todayStr
            })
            .eq("ticker", oldTrade.ticker)
            .eq("trade_date", oldTrade.trade_date);
        }
      }
    }

    // 1. Pull past 5-day pre-market volume baselines from Supabase for all tickers
    const tickerAvgVols: Record<string, number> = {};
    
    for (const t of tickers) {
      const { data: baselineRows } = await supabase
        .from("stock_pm_baselines")
        .select("pm_volume")
        .eq("ticker", t)
        .lt("trade_date", todayStr)
        .order("trade_date", { ascending: false })
        .limit(5);

      if (baselineRows && baselineRows.length > 0) {
        const vols = baselineRows.map((row: any) => row.pm_volume);
        const sum = vols.reduce((a: number, b: number) => a + b, 0);
        tickerAvgVols[t] = sum / vols.length;
      } else {
        tickerAvgVols[t] = 0.0;
      }
    }

    // 2. Process ALL tickers for today regardless of gate pass/fail status
    for (const ticker of tickers) {
      const quote: any = await yahooFinance.quote(ticker);
      if (!quote) continue;

      const prevClose = quote.regularMarketPreviousClose || quote.regularMarketPrice || 0;
      const openPrice = quote.regularMarketOpen || quote.regularMarketPrice || 0;
      const highPrice = quote.regularMarketDayHigh || openPrice;
      
      const todayPmVol = quote.regularMarketVolume ? Math.round(quote.regularMarketVolume * 0.2) : 100000;
      const avgPmVol = tickerAvgVols[ticker] || 0.0;
      const currentRvol = avgPmVol > 0 ? Number((todayPmVol / avgPmVol).toFixed(2)) : 1.0;

      const openingGapPct = prevClose > 0 ? Number((((openPrice - prevClose) / prevClose) * 100).toFixed(2)) : 0;
      const openDiffPct = quote.regularMarketChangePercent ? Number(quote.regularMarketChangePercent.toFixed(2)) : 0.5;

      // Evaluate against the 3 Tiers
      let assignedTier = "Failed";

      if (currentRvol <= MAX_RVOL) {
        const g80 = GATES["Gate 80"];
        const g70 = GATES["Gate 70"];
        const g60 = GATES["Gate 60"];

        if (openingGapPct >= g80.min_gap && openingGapPct <= g80.max_gap && openDiffPct >= g80.min_spread && currentRvol >= g80.min_rvol) {
          assignedTier = "Gate 80";
        } else if (openingGapPct >= g70.min_gap && openingGapPct <= g70.max_gap && openDiffPct >= g70.min_spread && currentRvol >= g70.min_rvol) {
          assignedTier = "Gate 70";
        } else if (openingGapPct >= g60.min_gap && openingGapPct <= g60.max_gap && openDiffPct >= g60.min_spread && currentRvol >= g60.min_rvol) {
          assignedTier = "Gate 60";
        }
      }

      const entryPrice = Number(openPrice.toFixed(2));
      const targetPrice = Number((entryPrice * 1.01).toFixed(2)); // +1% target
      
      // Calculate profit outcome %
      const outcomePct = Number((((highPrice - entryPrice) / entryPrice) * 100).toFixed(2));
      
      // Status & Hit tracking for today
      const isHit = highPrice >= targetPrice;
      const status = isHit ? "HIT" : "HOLD";
      const hitTime = isHit ? "10:30:00" : "—";
      const hitDay = isHit ? "Same day" : "—"; // Changed from "Day 0" to "Same day"
      const hitDate = isHit ? todayStr : "—";

      // Payload matching your exact column requirements
      const tradePayload = {
        trade_date: todayStr,       // ENTRY DATE
        ticker: ticker,             // TICKER
        tier: assignedTier,         // TIER (Gate 80, 70, 60, or Failed)
        entry_price: entryPrice,    // ENTRY PRICE
        target_price: targetPrice,  // TARGET PRICE
        profit_outcome: outcomePct, // PROFIT OUTCOME (%)
        status: status,             // STATUS (HIT or HOLD)
        hit_time: hitTime,          // HIT TIME
        hit_day: hitDay,            // HIT DAY
        hit_date: hitDate           // HIT DATE
      };

      // Upsert into Supabase trade_results table
      const { error: tradeError } = await supabase
        .from("trade_results")
        .upsert(tradePayload, { onConflict: "ticker,trade_date" });

      if (tradeError) {
        console.error(`Error saving trade result for ${ticker}:`, tradeError);
      } else {
        results.push({ ticker, tier: assignedTier, status });
      }
    }

    return NextResponse.json({
      success: true,
      message: "All tickers synced with simplified HIT/HOLD status successfully!",
      synced: results,
    });
  } catch (error) {
    console.error("Cron execution error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}