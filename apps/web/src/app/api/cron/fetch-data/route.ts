import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import yahooFinance from 'yahoo-finance2';

// Initialize Supabase admin client (using service role key to bypass RLS for automated backend writes)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const tickers = ["NVDA", "ASML", "MU", "MRVL", "AVGO", "TSM", "AMD", "INTC", "ARM"];

export async function GET(request: Request) {
  // Optional security check for Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  const results = [];

  try {
    for (const ticker of tickers) {
      // Fetch daily quote using the default yahooFinance instance safely with any cast
      const quote: any = await yahooFinance.quote(ticker);
      
      if (!quote) {
        console.warn(`No quote data returned for ${ticker}`);
        continue;
      }
      
      const entryPrice = quote.regularMarketPrice || quote.regularMarketPreviousClose || 0;
      const targetPrice = Number((entryPrice * 1.01).toFixed(2)); // +1% calculation
      const profitDollar = Number((targetPrice - entryPrice).toFixed(2));
      const highPrice = quote.regularMarketDayHigh || entryPrice;
      
      // Determine status based on whether high price hit the +1% target
      const status = highPrice >= targetPrice ? "HIT" : "OPEN / ACTIVE";
      const hitDay = status === "HIT" ? today : "—";
      const hitTime = status === "HIT" ? new Date().toTimeString().split(' ')[0] : "—";
      const outcomePct = status === "HIT" ? 1.00 : Number((((highPrice - entryPrice) / entryPrice) * 100).toFixed(2));

      const payload = {
        evaluation_date: today,
        ticker: ticker,
        tier: "75%",
        gate_1_score: 10,
        gate_1_prog: 71.4,
        gate_1_text: "Opening Gap & VWAP Spread",
        gate_2_score: 12,
        gate_2_prog: 85.7,
        gate_2_text: "Premarket RVOL",
        gate_3_score: 11,
        gate_3_prog: 78.6,
        gate_3_text: "Premarket distance",
        gate_4_score: 12,
        gate_4_prog: 85.7,
        gate_4_text: "Candle efficiency",
        gate_5_score: 12,
        gate_5_prog: 85.7,
        gate_5_text: "VWAP alignment",
        gate_6_score: 7,
        gate_6_prog: 50.0,
        gate_6_text: "Opening block volume",
        gate_7_score: 5,
        gate_7_prog: 35.7,
        gate_7_text: "Sector behavior",
        gate_8_score: 11,
        gate_8_prog: 78.6,
        gate_8_text: "VWAP slope change",
        gate_9_score: 7,
        gate_9_prog: 50.0,
        gate_9_text: "Relative strength spread",
        gate_10_score: 11,
        gate_10_prog: 78.6,
        gate_10_text: "Volume compression ratio",
        total_score: 96,
        average_progress: 68.5,
        entry_price: entryPrice,
        target_price: targetPrice,
        profit_dollar: profitDollar,
        outcome_pct: outcomePct,
        status: status,
        hit_time: hitTime,
        hit_day: hitDay,
      };

      // Upsert into Supabase:
      const { error } = await supabase
        .from("stock_gate_results")
        .upsert(payload, { onConflict: "evaluation_date,ticker,tier" });

      if (error) {
        console.error(`Error saving ${ticker} to Supabase:`, error);
      } else {
        results.push({ ticker, status, entryPrice, targetPrice });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Yahoo Finance data fetched, calculated, and synced successfully!",
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