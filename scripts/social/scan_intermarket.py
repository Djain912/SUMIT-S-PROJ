#!/usr/bin/env python3
"""Intermarket relationship scanner for the daily insight scan.

Computes cross-market signals that are actually rare and macro-meaningful —
not price-level facts anyone can see on a chart, but *relationship* signals
that tell a story about where global capital is positioned and what that
implies for Indian equities.

Three signals:
  1. Copper/Gold ratio — the classic growth-vs-haven barometer.
     Copper = industrial demand / global growth expectations.
     Gold = safe-haven demand / real-rate sensitivity.
     When the ratio falls, growth expectations are falling relative to fear.
     When it rises, the opposite. Both multi-year extremes AND 200-MA
     crossovers are flagged — the crossover is the directional change signal.

  2. Brent crude crossing its 200-session MA — the most watched level for
     India macro: crude above 200-MA = pressure on India's current account
     deficit (India imports ~85% of its oil), historically a headwind for
     INR and for FII inflows into Indian equities.

  3. Silver/Gold ratio — risk appetite within the metals complex.
     Silver outperforming = risk-on in commodities; underperforming = risk-off.

All three use the same 756-session (3-year) window for extremes to ensure
genuine rarity — 52-week highs are too common in trending markets to be
worth posting.
"""
import json
import os
import numpy as np
import pandas as pd

DATA_ROOT = '/Users/sumitjain/Documents/Positional Strategy/data/ohlcv_commodities'
MAX_SINGLE_DAY_MOVE = 0.40
CROSS_LOOKBACK = 5  # sessions to detect a fresh MA crossover


def load(symbol):
    fp = os.path.join(DATA_ROOT, f'{symbol}_1d.parquet')
    if not os.path.exists(fp):
        return None
    df = pd.read_parquet(fp).sort_index()
    return df if len(df) >= 250 else None


def quality_ok(closes):
    daily = np.abs(np.diff(closes) / closes[:-1])
    return len(daily) == 0 or float(np.nanmax(daily)) <= MAX_SINGLE_DAY_MOVE


def rolling_ma(arr, n):
    return pd.Series(arr).rolling(n, min_periods=n).mean().to_numpy()


def ratio_series_rows(dates, values, window):
    idx = dates[-window:]
    vals = values[-window:]
    return [{'d': str(d.date()), 'c': float(v), 'v': 0}
            for d, v in zip(idx, vals) if not np.isnan(v)]


def main():
    findings = []

    # ── 1. Copper / Gold ratio ─────────────────────────────────────────────
    copper = load('COPPER')
    gold = load('XAUUSD')

    if copper is not None and gold is not None:
        mg = copper[['Close']].join(gold[['Close']], lsuffix='_cu', rsuffix='_au', how='inner')
        if len(mg) >= 400:
            cu = mg['Close_cu'].to_numpy(dtype=float)
            au = mg['Close_au'].to_numpy(dtype=float)

            if quality_ok(cu) and quality_ok(au):
                ratio = cu / au
                window = min(756, len(ratio))
                rw = ratio[-window:]
                last = rw[-1]

                ma200 = rolling_ma(ratio, 200)

                # 3-year extreme
                is_high = last >= np.nanmax(rw)
                is_low = last <= np.nanmin(rw)

                # Fresh 200-MA crossover in last CROSS_LOOKBACK sessions
                cross_up = cross_down = False
                if len(ma200) > CROSS_LOOKBACK + 1 and not np.isnan(ma200[-CROSS_LOOKBACK - 1]):
                    cross_up = (ratio[-CROSS_LOOKBACK - 1] < ma200[-CROSS_LOOKBACK - 1]) and (ratio[-1] > ma200[-1])
                    cross_down = (ratio[-CROSS_LOOKBACK - 1] > ma200[-CROSS_LOOKBACK - 1]) and (ratio[-1] < ma200[-1])

                if is_high or is_low or cross_up or cross_down:
                    kind = 'extreme' if (is_high or is_low) else 'ma_cross'
                    direction = 'high' if (is_high or cross_up) else 'low'
                    findings.append({
                        'id': 'copper_gold_ratio',
                        'kind': kind,
                        'direction': direction,
                        'window': int(window),
                        'lastRatio': float(last),
                        'ma200': float(ma200[-1]) if not np.isnan(ma200[-1]) else None,
                        'lastDate': str(mg.index[-1].date()),
                        'copperClose': float(cu[-1]),
                        'goldClose': float(au[-1]),
                        'series': ratio_series_rows(mg.index, ratio, window),
                    })

    # ── 2. Brent crude vs 200-session MA ──────────────────────────────────
    brent = load('BRENT')

    if brent is not None:
        closes = brent['Close'].to_numpy(dtype=float)
        if quality_ok(closes) and len(closes) >= 250:
            ma200 = rolling_ma(closes, 200)
            window = min(756, len(closes))
            wc = closes[-window:]

            is_high = closes[-1] >= np.nanmax(wc)
            is_low = closes[-1] <= np.nanmin(wc)

            cross_above = cross_below = False
            if len(ma200) > CROSS_LOOKBACK + 1 and not np.isnan(ma200[-CROSS_LOOKBACK - 1]):
                cross_above = (closes[-CROSS_LOOKBACK - 1] < ma200[-CROSS_LOOKBACK - 1]) and (closes[-1] > ma200[-1])
                cross_below = (closes[-CROSS_LOOKBACK - 1] > ma200[-CROSS_LOOKBACK - 1]) and (closes[-1] < ma200[-1])

            if is_high or is_low or cross_above or cross_below:
                kind = 'extreme' if (is_high or is_low) else 'ma_cross'
                direction = 'above' if (is_high or cross_above) else 'below'
                display_window = int(window) if (is_high or is_low) else 200
                findings.append({
                    'id': 'brent_ma200',
                    'kind': kind,
                    'direction': direction,
                    'window': display_window,
                    'lastClose': float(closes[-1]),
                    'ma200': float(ma200[-1]) if not np.isnan(ma200[-1]) else None,
                    'lastDate': str(brent.index[-1].date()),
                    'series': ratio_series_rows(brent.index, closes, min(300, len(closes))),
                })

    # ── 3. Silver / Gold ratio ─────────────────────────────────────────────
    silver = load('XAGUSD')

    if silver is not None and gold is not None:
        mg = gold[['Close']].join(silver[['Close']], lsuffix='_au', rsuffix='_ag', how='inner')
        if len(mg) >= 400:
            au = mg['Close_au'].to_numpy(dtype=float)
            ag = mg['Close_ag'].to_numpy(dtype=float)

            if quality_ok(au) and quality_ok(ag):
                ratio = ag / au
                window = min(756, len(ratio))
                rw = ratio[-window:]
                last = rw[-1]
                is_high = last >= np.nanmax(rw)
                is_low = last <= np.nanmin(rw)

                if is_high or is_low:
                    findings.append({
                        'id': 'silver_gold_ratio',
                        'kind': 'extreme',
                        'direction': 'high' if is_high else 'low',
                        'window': int(window),
                        'lastRatio': float(last),
                        'lastDate': str(mg.index[-1].date()),
                        'series': ratio_series_rows(mg.index, ratio, window),
                    })

    print(json.dumps({'findings': findings}))


if __name__ == '__main__':
    main()
