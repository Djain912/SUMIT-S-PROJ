#!/usr/bin/env python3
"""Scans commodities (gold, silver, crude, nat gas, agriculturals, etc.) for
the daily insight scan, plus one classic macro ratio (Silver/Gold).

Reads from local parquet files: 20 raw commodity series (spot/futures-style,
USD-denominated). Finds: 52-week high/low, tightest N-session range, biggest
single-day mover, and the Silver/Gold ratio if it's at a notable extreme.

Outputs one JSON object to stdout — consumed by daily-insight-scan.mjs.

Same data-quality sanity ceiling as scan_stock_universe.py (single-day move
> 40% anywhere in the window skips that instrument) — commodities don't have
splits, but bad prints / contract-roll artifacts in raw futures-style data
are a real equivalent risk.
"""
import json
import os

import pandas as pd
import numpy as np

DATA_ROOT = '/Users/sumitjain/Documents/Positional Strategy/data/ohlcv_commodities'
MAX_SINGLE_DAY_MOVE = 0.40

DISPLAY_NAME = {
    'XAUUSD': 'Gold', 'XAGUSD': 'Silver', 'COPPER': 'Copper',
    'WTICRUDE': 'WTI Crude Oil', 'BRENT': 'Brent Crude Oil', 'NATGAS': 'Natural Gas',
    'RBOB': 'RBOB Gasoline', 'HEATOIL': 'Heating Oil', 'CORN': 'Corn', 'WHEAT': 'Wheat',
    'SOYBEAN': 'Soybeans', 'SOYMEAL': 'Soybean Meal', 'SOYOIL': 'Soybean Oil',
    'COFFEE': 'Coffee', 'COTTON': 'Cotton', 'COCOA': 'Cocoa', 'SUGAR': 'Sugar',
    'OJUICE': 'Orange Juice', 'LCATTLE': 'Live Cattle', 'LHOGS': 'Lean Hogs',
    'FCATTLE': 'Feeder Cattle',
}


def load(symbol):
    fp = os.path.join(DATA_ROOT, f'{symbol}_1d.parquet')
    if not os.path.exists(fp):
        return None
    df = pd.read_parquet(fp).sort_index()
    return df if len(df) >= 150 else None


def series_rows(df, window):
    w = df.iloc[-window:]
    return [
        {'d': str(idx.date()), 'c': float(row['Close']), 'v': float(row.get('Volume', 0) or 0)}
        for idx, row in w.iterrows()
    ]


def main():
    findings = []
    biggest = None

    for symbol, name in DISPLAY_NAME.items():
        df = load(symbol)
        if df is None:
            continue
        closes = df['Close'].to_numpy(dtype=float)

        window = min(252, len(df))
        w_closes = closes[-window:]
        daily_ret = np.abs(np.diff(w_closes) / w_closes[:-1])
        if len(daily_ret) and np.nanmax(daily_ret) > MAX_SINGLE_DAY_MOVE:
            continue  # data-quality guard — likely a bad print or contract-roll artifact

        last_close = closes[-1]
        last_date = df.index[-1]
        is_high = last_close == np.max(w_closes)
        is_low = last_close == np.min(w_closes)

        if is_high or is_low:
            findings.append({
                'symbol': symbol, 'name': name, 'kind': 'extreme',
                'isHigh': bool(is_high), 'window': int(window),
                'lastClose': float(last_close), 'lastDate': str(last_date.date()),
                'series': series_rows(df, window),
            })

        # Tightest range in trailing 100 sessions
        range_window = min(100, len(df))
        rw = df.iloc[-range_window:]
        ranges = (rw['High'].to_numpy(dtype=float) - rw['Low'].to_numpy(dtype=float)) / rw['Close'].to_numpy(dtype=float) * 100
        today_range = ranges[-1]
        if range_window >= 40 and today_range == np.min(ranges):
            findings.append({
                'symbol': symbol, 'name': name, 'kind': 'tight_range',
                'window': int(range_window), 'rangePct': float(today_range),
                'lastDate': str(last_date.date()),
                'series': series_rows(df, range_window),
            })

        if len(closes) >= 2 and closes[-2] > 0:
            chg = (closes[-1] - closes[-2]) / closes[-2] * 100
            if abs(chg) <= MAX_SINGLE_DAY_MOVE * 100 and abs(chg) > 3:
                if biggest is None or abs(chg) > abs(biggest['chg']):
                    biggest = {'symbol': symbol, 'name': name, 'chg': float(chg), 'lastDate': str(last_date.date())}

    # Silver/Gold ratio — a classic macro relative-strength pair, both USD-denominated
    ratio_finding = None
    gold, silver = load('XAUUSD'), load('XAGUSD')
    if gold is not None and silver is not None:
        merged = gold[['Close']].join(silver[['Close']], lsuffix='_gold', rsuffix='_silver', how='inner')
        if len(merged) >= 150:
            ratio = merged['Close_silver'] / merged['Close_gold']
            window = min(252, len(ratio))
            r_window = ratio.iloc[-window:]
            last_ratio = r_window.iloc[-1]
            is_high = last_ratio == r_window.max()
            is_low = last_ratio == r_window.min()
            if is_high or is_low:
                ratio_finding = {
                    'pair': 'Silver/Gold', 'isHigh': bool(is_high), 'window': int(window),
                    'lastRatio': float(last_ratio), 'lastDate': str(r_window.index[-1].date()),
                    'series': [{'d': str(idx.date()), 'c': float(v), 'v': 0} for idx, v in r_window.items()],
                }

    result = {
        'commodityFindings': findings,
        'biggestMover': biggest,
        'ratioFinding': ratio_finding,
    }
    print(json.dumps(result))


if __name__ == '__main__':
    main()
