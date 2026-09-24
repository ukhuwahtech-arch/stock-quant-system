import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 🛠️ Prevent Next.js from caching old API responses
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const { searchParams } = new URL(request.url);
  const targetDate = searchParams.get("date"); // e.g., "2026-09-10"

  try {
    if (targetDate) {
      // 📊 Fetch 1-minute intraday ticks + all technical indicators & pre-market institutional metrics
      const { data, error } = await supabase
        .from("stock_history")
        .select(`
          time, open, high, low, price, volume, 
          atr, rsi, macd, macd_signal, macd_hist, 
          vwap, dist_vwap, dist_open, dist_high, dist_low, 
          minutes_from_open, is_premarket
        `)
        .eq("symbol", symbol)
        .eq("date", targetDate)
        .eq("interval_type", "1m")
        .order("id", { ascending: true });

      if (error) throw error;

      return NextResponse.json({ symbol, chartData: data || [] });
    } else {
      // 🛠️ Override Supabase's default 1000-row limit to capture all 7 days of 1-minute ticks (~2730 rows)
      const { data, error } = await supabase
        .from("stock_history")
        .select("id, date, price")
        .eq("symbol", symbol)
        .eq("interval_type", "1m")
        .order("id", { ascending: false })
        .limit(5000);

      if (error) throw error;

      // Deduplicate by date to get unique days
      const uniqueDaysMap = new Map();
      data?.forEach((row) => {
        if (!uniqueDaysMap.has(row.date)) {
          const dateObj = new Date(row.date + "T00:00:00");
          uniqueDaysMap.set(row.date, {
            time: dateObj.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" }),
            rawDate: row.date,
            price: row.price,
          });
        }
      });

      const chartData = Array.from(uniqueDaysMap.values()).reverse().slice(-7);

      return NextResponse.json({ symbol, chartData });
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}