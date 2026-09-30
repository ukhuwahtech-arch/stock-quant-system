import os
import pandas as pd
from datetime import datetime
import yfinance as yf
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

tickers = ["AMD", "ASML", "INTC", "MRVL", "AVGO", "NVDA", "MU", "TSM", "ARM", "PLTR", "SMCI", "QCOM", "AMAT", "LRCX"]

today_str = datetime.now().strftime("%Y-%m-%d")
print(f"Fetching daily pre-market baseline for date: {today_str}")

for t in tickers:
    try:
        # 1. Must include prepost=True to get pre-market data
        df = yf.download(t, period="1d", interval="1m", prepost=True, progress=False)
        if df.empty:
            print(f" -> No data returned for {t}")
            continue
            
        # Flatten multi-index columns if present
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
            
        df = df.reset_index()
        df.columns = df.columns.str.lower()
        
        time_col = 'datetime' if 'datetime' in df.columns else 'time'
        
        # 2. Convert UTC timestamps to America/New_York time so session filters work accurately
        df['dt_ny'] = pd.to_datetime(df[time_col]).dt.tz_convert('America/New_York')
        df['time_str'] = df['dt_ny'].dt.strftime('%H:%M:%S')

        # Pre-market window filter (04:00:00 to 09:30:00 EST)
        pm_window = df[(df['time_str'] >= '04:00:00') & (df['time_str'] < '09:30:00')]
        
        if pm_window.empty or pm_window['volume'].sum() == 0:
            pm_volume = int(df['volume'].sum() * 0.2)
            pm_vwap = float(df['close'].mean())
        else:
            pm_volume = int(pm_window['volume'].sum())
            pm_vwap = float(((pm_window['high'] + pm_window['low'] + pm_window['close']) / 3 * pm_window['volume']).sum() / pm_volume)

        # 3. Fetch true previous close via yfinance ticker info/history
        ticker_obj = yf.Ticker(t)
        todays_history = ticker_obj.history(period="2d")
        if len(todays_history) >= 2:
            prev_close = float(todays_history['Close'].iloc[-2])
        else:
            prev_close = float(df.iloc[0]['open'])

        # Get opening price (9:30 to 10:00 AM window)
        open_bars = df[(df['time_str'] >= '09:30:00') & (df['time_str'] <= '10:00:00')]
        open_price = float(open_bars.iloc[0]['open']) if not open_bars.empty else prev_close

        payload = {
            "ticker": t,
            "trade_date": today_str,
            "pm_volume": pm_volume,
            "pm_vwap": round(pm_vwap, 2),
            "prev_close": round(prev_close, 2),
            "open_price": round(open_price, 2)
        }

        # Upsert into stock_pm_baselines table
        supabase.table("stock_pm_baselines").upsert(payload, on_conflict="ticker,trade_date").execute()
        print(f" -> Successfully updated baseline for {t}")

    except Exception as e:
        print(f" -> Error updating baseline for {t}: {e}")

print("\nDaily baseline sync completed!")