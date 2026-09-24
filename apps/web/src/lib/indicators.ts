// apps/web/src/lib/indicators.ts

export function calculateIndicators<T extends { symbol: string; date: string; time: string; open: number; high: number; low: number; close: number; volume: number }>(candles: T[]) {
  // 🛡️ Guard against empty candle arrays
  if (!candles || candles.length === 0) return [];

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  // 1. True Range & ATR (14-period)
  const trs: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const h = highs[i] ?? 0;
    const l = lows[i] ?? 0;
    
    if (i === 0) {
      trs.push(h - l);
    } else {
      const prevClose = closes[i - 1] ?? 0;
      const h_l = h - l;
      const h_pc = Math.abs(h - prevClose);
      const l_pc = Math.abs(l - prevClose);
      trs.push(Math.max(h_l, h_pc, l_pc));
    }
  }
  
  const atrWindow = 14;
  const atrs = trs.map((_, i, arr) => {
    if (i < atrWindow - 1) return null;
    const slice = arr.slice(i - atrWindow + 1, i + 1);
    return Number((slice.reduce((a, b) => a + b, 0) / atrWindow).toFixed(4));
  });

  // 2. RSI (14-period with Wilder's Smoothing)
  const rsis: (number | null)[] = new Array(candles.length).fill(null);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < candles.length; i++) {
    const currentClose = closes[i] ?? 0;
    const prevClose = closes[i - 1] ?? 0;
    const change = currentClose - prevClose;
    
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= atrWindow) {
      gains += gain;
      losses += loss;
      if (i === atrWindow) {
        const avgGain = gains / atrWindow;
        const avgLoss = losses / atrWindow;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsis[i] = Number((100 - (100 / (1 + rs))).toFixed(2));
      }
    } else {
      const avgGain = (gains * (atrWindow - 1) + gain) / atrWindow;
      const avgLoss = (losses * (atrWindow - 1) + loss) / atrWindow;
      gains = avgGain;
      losses = avgLoss;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsis[i] = Number((100 - (100 / (1 + rs))).toFixed(2));
    }
  }

  // 3. MACD (12, 26, 9 EMA)
  const k12 = 2 / (12 + 1);
  const k26 = 2 / (26 + 1);
  const k9 = 2 / (9 + 1);

  let ema12: number = closes[0] ?? 0;
  let ema26: number = closes[0] ?? 0;
  let macdSignal: number = 0;

  const macdLines: (number | null)[] = [];
  const signalLines: (number | null)[] = [];
  const histograms: (number | null)[] = [];

  closes.forEach((c, i) => {
    const close = c ?? 0;
    if (i === 0) {
      ema12 = close;
      ema26 = close;
    } else {
      ema12 = (close * k12) + (ema12 * (1 - k12));
      ema26 = (close * k26) + (ema26 * (1 - k26));
    }
    const macdLine = ema12 - ema26;
    macdLines.push(macdLine);

    if (i === 0) {
      macdSignal = macdLine;
    } else {
      macdSignal = (macdLine * k9) + (macdSignal * (1 - k9));
    }
    signalLines.push(macdSignal);
    histograms.push(macdLine - macdSignal);
  });

  // 4. Intraday Structure Features: VWAP, Key Levels, Time-of-Day
  let cumulativeTPV = 0;
  let cumulativeVol = 0;
  const dayOpenPrice = candles[0]?.open ?? closes[0] ?? 0; // 🛠️ Fixed undefined fallback
  let runningHigh = -Infinity;
  let runningLow = Infinity;

  // Merge back into the original records structure with all technical properties
  return candles.map((candle, i) => {
    const typicalPrice = ((candle.high ?? candle.close) + (candle.low ?? candle.close) + candle.close) / 3;
    const vol = candle.volume ?? 0;
    
    cumulativeTPV += typicalPrice * vol;
    cumulativeVol += vol;
    const vwap = cumulativeVol > 0 ? Number((cumulativeTPV / cumulativeVol).toFixed(4)) : candle.close;

    if (candle.high > runningHigh) runningHigh = candle.high;
    if (candle.low < runningLow) runningLow = candle.low;

    const candleDate = new Date(`${candle.date} ${candle.time}`);
    const hours = candleDate.getHours();
    const minutes = candleDate.getMinutes();
    const totalMinutesFromMidnight = hours * 60 + minutes;
    const minutesFromOpen = totalMinutesFromMidnight - 570; // 9:30 AM EST is 570 minutes from midnight
    const isPremarket = totalMinutesFromMidnight < 570;

    return {
      ...candle,
      atr: atrs[i] ?? null,
      rsi: rsis[i] ?? null,
      macd: macdLines[i] !== undefined ? Number(macdLines[i]?.toFixed(4)) : null,
      macd_signal: signalLines[i] !== undefined ? Number(signalLines[i]?.toFixed(4)) : null,
      macd_hist: histograms[i] !== undefined ? Number(histograms[i]?.toFixed(4)) : null,
      vwap,
      dist_vwap: Number((candle.close - vwap).toFixed(4)),
      dist_open: Number((candle.close - dayOpenPrice).toFixed(4)),
      dist_high: Number((candle.close - runningHigh).toFixed(4)),
      dist_low: Number((candle.close - runningLow).toFixed(4)),
      minutes_from_open: minutesFromOpen,
      is_premarket: isPremarket,
    };
  });
}