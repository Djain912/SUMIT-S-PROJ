#!/usr/bin/env python3
"""Scans the full India + US stock universes for the daily insight scan.

Reads from local parquet files (not the narrower 454-symbol Postgres
stock_eod table) — 1,873 India stocks + 4,976 US stocks, daily OHLCV.

Finds: 52-week-high/low breakouts with volume confirmation (top 3 per
market), and the single biggest daily mover per market.

Outputs one JSON object to stdout — consumed by daily-insight-scan.mjs.

Data-quality safeguards (both required — see MAX_SINGLE_DAY_MOVE below):
  1. Any stock with a >40% single-day return anywhere in its trailing-year
     window is skipped outright. Real stocks essentially never move that
     much in one regular session (India has 5/10/20% circuit limits on most
     names); it's almost always an unadjusted split/bonus/rights issue
     showing up as a fake price cliff in raw data.
  2. For India specifically, any 52-week high/low within 15 days of a real
     bonus/split ex-date (from the NSE corporate-actions history) is
     dropped too, even if it slipped past the ratio filter.
US data is typically already split-adjusted (this feed is a yfinance
backup, which auto-adjusts by default) — the ratio filter is the backstop
there since no equivalent corporate-actions file is available for the US side.
"""
import sys
import json
import glob
import os
from datetime import datetime

import pandas as pd
import numpy as np

DATA_ROOT = '/Users/sumitjain/Documents/Positional Strategy/data'
CORP_ACTIONS_PATH = os.path.join(DATA_ROOT, 'nse_corporate_actions.json')
MAX_SINGLE_DAY_MOVE = 0.40  # 40% sanity ceiling


def load_corp_action_dates():
    try:
        with open(CORP_ACTIONS_PATH) as f:
            actions = json.load(f)
    except Exception as e:
        print(f"Warning: could not load corporate actions ({e}) — India high/low "
              f"findings will rely on the single-day-move filter only.", file=sys.stderr)
        return {}
    by_symbol = {}
    for a in actions:
        subj = (a.get('subject') or '').lower()
        if not any(k in subj for k in ('bonus', 'split', 'sub-division', 'sub division')):
            continue
        sym, ex = a.get('symbol'), a.get('exDate')
        if not sym or not ex or ex == '-':
            continue
        try:
            d = datetime.strptime(ex, '%d-%b-%Y')
        except ValueError:
            continue
        by_symbol.setdefault(sym, []).append(d)
    return by_symbol


def has_nearby_corp_action(symbol_bare, target_date, corp_actions, window_days=15):
    for d in corp_actions.get(symbol_bare, []):
        if abs((d - target_date).days) <= window_days:
            return True
    return False


def scan_market(dir_path, market_label, corp_actions, strip_suffix):
    findings = []
    biggest = None
    files = sorted(glob.glob(os.path.join(dir_path, '*.parquet')))

    for fp in files:
        raw_symbol = os.path.basename(fp).replace('_1d.parquet', '')
        symbol = raw_symbol.replace(strip_suffix, '') if strip_suffix else raw_symbol

        try:
            df = pd.read_parquet(fp)
        except Exception:
            continue
        if len(df) < 150:
            continue
        df = df.sort_index()
        closes = df['Close'].to_numpy(dtype=float)
        vols = df['Volume'].to_numpy(dtype=float)
        dates = df.index

        window = min(252, len(df))
        w_closes = closes[-window:]

        # Safeguard 1: reject the whole stock if any single-day return in
        # the window is implausibly large.
        daily_ret = np.abs(np.diff(w_closes) / w_closes[:-1])
        if len(daily_ret) and np.nanmax(daily_ret) > MAX_SINGLE_DAY_MOVE:
            continue

        last_close = closes[-1]
        last_date = dates[-1]
        is_high = last_close == np.max(w_closes)
        is_low = last_close == np.min(w_closes)

        if is_high or is_low:
            target = last_date.to_pydatetime() if hasattr(last_date, 'to_pydatetime') else last_date
            # Safeguard 2 (India only): reject if a real corporate action
            # landed near this date, even if the ratio filter missed it.
            if corp_actions and has_nearby_corp_action(symbol, target, corp_actions):
                continue

            vol_window = vols[-21:-1]
            avg_vol20 = float(np.nanmean(vol_window)) if len(vol_window) else 0.0
            vol_ratio = (float(vols[-1]) / avg_vol20) if avg_vol20 > 0 else 0.0
            if vol_ratio >= 1.5:
                # Include the plotting window so the Node orchestrator can
                # hand this straight to render_chart.py without a second
                # data-fetch step — Python already has the DataFrame open.
                w_dates = dates[-window:]
                series = [
                    {'d': str(getattr(dd, 'date', lambda: dd)()), 'c': float(cc), 'v': float(vv)}
                    for dd, cc, vv in zip(w_dates, w_closes, vols[-window:])
                ]
                findings.append({
                    'market': market_label,
                    'symbol': symbol,
                    'isHigh': bool(is_high),
                    'window': int(window),
                    'volRatio': vol_ratio,
                    'lastClose': float(last_close),
                    'lastDate': str(getattr(last_date, 'date', lambda: last_date)()),
                    'avgVol20': avg_vol20,
                    'lastVol': float(vols[-1]),
                    'series': series,
                })

        if len(closes) >= 2 and closes[-2] > 0:
            chg = (closes[-1] - closes[-2]) / closes[-2] * 100
            if abs(chg) <= MAX_SINGLE_DAY_MOVE * 100:
                if biggest is None or abs(chg) > abs(biggest['chg']):
                    biggest = {
                        'market': market_label, 'symbol': symbol, 'chg': float(chg),
                        'lastDate': str(getattr(last_date, 'date', lambda: last_date)()),
                    }

    findings.sort(key=lambda f: f['volRatio'], reverse=True)
    return findings[:3], biggest


def main():
    corp_actions = load_corp_action_dates()

    india_findings, india_biggest = scan_market(
        os.path.join(DATA_ROOT, 'ohlcv'), 'India', corp_actions, strip_suffix='.NS')
    us_findings, us_biggest = scan_market(
        os.path.join(DATA_ROOT, 'ohlcv_us'), 'US', corp_actions=None, strip_suffix=None)

    result = {
        'stockFindings': india_findings + us_findings,
        'biggestMovers': [m for m in (india_biggest, us_biggest) if m],
    }
    print(json.dumps(result))


if __name__ == '__main__':
    main()
