#!/usr/bin/env python3
"""
Infographic renderer for Chartix weekly/daily posts.
Produces styled 1200×675 dark-background PNG cards for X/Telegram.

Usage: python3 render_infographic.py <data.json> <output.png>

The JSON must have a `type` field selecting the template:
  sector_weekly      — horizontal ranked bar chart of all sectors
  breadth_snapshot   — % above MA gauges + A/D stat
  fno_positioning    — FII F&O scorecard table
  cash_flows         — FII vs DII weekly cash bar chart
  top_movers         — top & bottom movers ranked list
  fno_pcr            — put/call ratio visual
"""
import json
import sys
import math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import matplotlib.patheffects as pe

# ── Brand colours ─────────────────────────────────────────────────────────
BG        = '#0B0F17'      # near-black background
CARD      = '#141820'      # slightly lighter card surface
BORDER    = '#1E2535'      # subtle border
UP        = '#26A65B'      # green  — gains / bullish
DOWN      = '#E74C3C'      # red    — losses / bearish
NEUTRAL   = '#4A90D9'      # blue   — neutral data
GOLD      = '#F5A623'      # amber  — highlight / logo accent
WHITE     = '#FFFFFF'
MUTED     = '#8A94A6'      # secondary text
DIM       = '#3A4255'      # very dim — grid lines / dividers
LOGO_CLR  = '#4A90D9'      # Chartix blue

W, H = 1200, 675
DPI  = 100

def fig_base():
    fig = plt.figure(figsize=(W/DPI, H/DPI), dpi=DPI, facecolor=BG)
    return fig

def logo(fig, x=0.5, y=0.96, ha='center'):
    fig.text(x, y, 'Chartix.in', fontsize=11, color=LOGO_CLR,
             ha=ha, va='top', fontweight='bold',
             fontfamily='DejaVu Sans')

def watermark(fig):
    fig.text(0.99, 0.01, 'chartix.in  |  Data: NSE, CMC',
             fontsize=7.5, color=DIM, ha='right', va='bottom')

def title_box(fig, title, subtitle=None, y_title=0.92):
    fig.text(0.5, y_title, title, fontsize=18, color=WHITE,
             ha='center', va='top', fontweight='bold')
    if subtitle:
        fig.text(0.5, y_title - 0.07, subtitle, fontsize=11,
                 color=MUTED, ha='center', va='top')

def color_val(v):
    return UP if v >= 0 else DOWN

# ══════════════════════════════════════════════════════════════════════════════
# 1.  SECTOR WEEKLY
# ══════════════════════════════════════════════════════════════════════════════
def render_sector_weekly(data, out_path):
    sectors  = data['sectors']          # [{label, pct}, ...] sorted best→worst
    nifty    = data.get('nifty_pct', 0)
    date_str = data.get('date', '')

    fig = fig_base()
    logo(fig, x=0.97, ha='right')
    watermark(fig)

    title_box(fig,
              f'Sector Performance  —  Week ending {date_str}',
              f'Nifty 50  {nifty:+.1f}%  |  {len(sectors)} sectors tracked',
              y_title=0.95)

    ax = fig.add_axes([0.02, 0.04, 0.96, 0.77])
    ax.set_facecolor(BG)
    for sp in ax.spines.values(): sp.set_visible(False)
    ax.tick_params(left=False, bottom=False)

    labels = [s['label'] for s in sectors]
    values = [s['pct'] for s in sectors]
    colors = [UP if v >= 0 else DOWN for v in values]

    y = range(len(labels))
    bars = ax.barh(list(y), values, color=colors, height=0.65,
                   zorder=3, linewidth=0)

    # value labels
    for i, (v, bar) in enumerate(zip(values, bars)):
        xpos = v + (0.08 if v >= 0 else -0.08)
        ha   = 'left' if v >= 0 else 'right'
        ax.text(xpos, i, f'{v:+.1f}%', va='center', ha=ha,
                fontsize=9.5, color=WHITE, fontweight='bold')

    ax.set_yticks(list(y))
    ax.set_yticklabels(labels, fontsize=9.5, color=MUTED)
    ax.invert_yaxis()

    # zero line
    ax.axvline(0, color=DIM, linewidth=1.2, zorder=2)

    # faint grid
    ax.set_xticks([])
    ax.grid(axis='x', color=DIM, linewidth=0.4, zorder=1)

    # Nifty reference line
    ax.axvline(nifty, color=GOLD, linewidth=1.2, linestyle='--',
               zorder=4, alpha=0.8)
    ax.text(nifty, len(labels) - 0.5, f' Nifty {nifty:+.1f}%',
            color=GOLD, fontsize=8.5, va='bottom')

    max_abs = max(abs(v) for v in values) * 1.25 or 1
    ax.set_xlim(-max_abs, max_abs)

    plt.savefig(out_path, dpi=DPI, bbox_inches='tight',
                facecolor=BG, edgecolor='none')
    plt.close()


# ══════════════════════════════════════════════════════════════════════════════
# 2.  BREADTH SNAPSHOT
# ══════════════════════════════════════════════════════════════════════════════
def gauge_arc(ax, pct, label, cx, cy, r=0.38, lw=18):
    """Draw a half-circle gauge."""
    theta = np.linspace(np.pi, 0, 300)
    # background arc
    ax.plot(cx + r*np.cos(theta), cy + r*np.sin(theta),
            color=DIM, lw=lw, solid_capstyle='round', zorder=1)
    # filled arc proportional to pct (0-100)
    fill_theta = np.linspace(np.pi, np.pi - (pct/100)*np.pi, 300)
    clr = UP if pct > 55 else (DOWN if pct < 35 else NEUTRAL)
    ax.plot(cx + r*np.cos(fill_theta), cy + r*np.sin(fill_theta),
            color=clr, lw=lw, solid_capstyle='round', zorder=2)
    # number
    ax.text(cx, cy + 0.05, f'{pct:.0f}%', ha='center', va='center',
            fontsize=20, color=WHITE, fontweight='bold')
    ax.text(cx, cy - 0.13, label, ha='center', va='center',
            fontsize=9, color=MUTED)

def render_breadth_snapshot(data, out_path):
    p20  = data['pct_above_20']
    p50  = data['pct_above_50']
    p200 = data['pct_above_200']
    adv  = data['advances']
    dec  = data['declines']
    w_adv = data['weekly_advances']
    w_dec = data['weekly_declines']
    total = data['total']
    date_str = data.get('date', '')

    fig = fig_base()
    logo(fig, x=0.97, ha='right')
    watermark(fig)

    title_box(fig,
              f'Market Breadth Snapshot  —  {date_str}',
              f'{total} NSE stocks universe',
              y_title=0.95)

    ax = fig.add_axes([0, 0.05, 1, 0.78])
    ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    ax.set_aspect('auto'); ax.axis('off')
    ax.set_facecolor(BG)

    # 3 gauges
    gauge_arc(ax, p200, '% above 200-day MA', 0.18, 0.54)
    gauge_arc(ax, p50,  '% above 50-day MA',  0.50, 0.54)
    gauge_arc(ax, p20,  '% above 20-day MA',  0.82, 0.54)

    # divider
    ax.axhline(0.25, color=DIM, linewidth=0.8, xmin=0.05, xmax=0.95)

    # A/D stats row
    def stat_block(x, label, val, colour):
        ax.text(x, 0.18, val, ha='center', va='center',
                fontsize=22, color=colour, fontweight='bold')
        ax.text(x, 0.08, label, ha='center', va='center',
                fontsize=9, color=MUTED)

    daily_ratio = f'{adv/max(dec,1):.1f}:1'
    weekly_ratio = f'{w_adv/max(w_dec,1):.1f}:1'

    stat_block(0.15, 'Advances (day)', str(adv), UP)
    stat_block(0.35, 'Declines (day)', str(dec), DOWN)
    stat_block(0.55, 'Daily A/D ratio', daily_ratio,
               UP if adv > dec else DOWN)
    stat_block(0.75, 'Weekly A/D', weekly_ratio,
               UP if w_adv > w_dec else DOWN)
    stat_block(0.92, 'Unchanged', str(data.get('unchanged', total-adv-dec)),
               MUTED)

    plt.savefig(out_path, dpi=DPI, bbox_inches='tight',
                facecolor=BG, edgecolor='none')
    plt.close()


# ══════════════════════════════════════════════════════════════════════════════
# 3.  FII F&O POSITIONING SCORECARD
# ══════════════════════════════════════════════════════════════════════════════
def render_fno_positioning(data, out_path):
    date_str  = data.get('date', '')
    rows_data = data['rows']   # [{label, value, change, colour}, ...]

    fig = fig_base()
    logo(fig, x=0.97, ha='right')
    watermark(fig)

    title_box(fig,
              f'FII F&O Positioning  —  {date_str}',
              'NSE Participant-wise OI  |  Source: NSE Archives',
              y_title=0.95)

    ax = fig.add_axes([0.03, 0.04, 0.94, 0.76])
    ax.set_facecolor(BG)
    ax.axis('off')
    ax.set_xlim(0, 1); ax.set_ylim(0, 1)

    n = len(rows_data)
    row_h = 0.82 / (n + 1)
    header_y = 0.94

    # Header
    ax.text(0.02, header_y, 'Position', color=MUTED, fontsize=9.5, va='center')
    ax.text(0.50, header_y, 'Value (contracts)', color=MUTED, fontsize=9.5,
            va='center', ha='center')
    ax.text(0.82, header_y, 'Vs Last Week', color=MUTED, fontsize=9.5,
            va='center', ha='center')
    ax.text(0.97, header_y, 'Signal', color=MUTED, fontsize=9.5,
            va='center', ha='right')
    ax.axhline(header_y - 0.04, color=DIM, linewidth=0.8, xmin=0, xmax=1)

    for i, row in enumerate(rows_data):
        y = header_y - (i + 1) * row_h - 0.02
        clr = row.get('colour', WHITE)

        # alternating row background
        if i % 2 == 0:
            rect = FancyBboxPatch((0, y - row_h*0.4), 1, row_h*0.85,
                                  boxstyle='round,pad=0', facecolor='#111620',
                                  edgecolor='none', zorder=0)
            ax.add_patch(rect)

        ax.text(0.02, y, row['label'], color=WHITE, fontsize=10,
                va='center', fontweight='normal')
        ax.text(0.50, y, row['value'], color=clr, fontsize=11,
                va='center', ha='center', fontweight='bold')
        chg = row.get('change', '')
        if chg:
            chg_clr = UP if str(chg).startswith('+') else (DOWN if str(chg).startswith('-') else MUTED)
            ax.text(0.82, y, str(chg), color=chg_clr, fontsize=10,
                    va='center', ha='center')
        signal = row.get('signal', '')
        if signal:
            s_clr = UP if 'bull' in signal.lower() or 'long' in signal.lower() else \
                    DOWN if 'bear' in signal.lower() or 'short' in signal.lower() else NEUTRAL
            ax.text(0.97, y, signal, color=s_clr, fontsize=9,
                    va='center', ha='right')

    plt.savefig(out_path, dpi=DPI, bbox_inches='tight',
                facecolor=BG, edgecolor='none')
    plt.close()


# ══════════════════════════════════════════════════════════════════════════════
# 4.  FII / DII CASH FLOWS
# ══════════════════════════════════════════════════════════════════════════════
def render_cash_flows(data, out_path):
    days      = data['days']        # [{date, fii, dii}, ...]
    fii_total = data['fii_total']
    dii_total = data['dii_total']
    date_str  = data.get('date', '')

    fig = fig_base()
    logo(fig, x=0.97, ha='right')
    watermark(fig)

    combined = fii_total + dii_total
    sign = '+' if combined >= 0 else ''
    title_box(fig,
              f'FII / DII Cash Flows  —  Week ending {date_str}',
              f'Combined net: {sign}₹{abs(combined):,.0f} Cr',
              y_title=0.95)

    ax = fig.add_axes([0.08, 0.12, 0.88, 0.70])
    ax.set_facecolor(BG)
    for sp in ax.spines.values(): sp.set_color(DIM)
    ax.tick_params(colors=MUTED, labelsize=9)
    ax.xaxis.label.set_color(MUTED)

    n = len(days)
    x = np.arange(n)
    w = 0.32

    fii_vals = [d['fii'] for d in days]
    dii_vals = [d['dii'] for d in days]
    dates    = [d['date'] for d in days]

    bars_fii = ax.bar(x - w/2, fii_vals, width=w,
                      color=[UP if v >= 0 else DOWN for v in fii_vals],
                      label='FII', zorder=3, linewidth=0)
    bars_dii = ax.bar(x + w/2, dii_vals, width=w,
                      color=[NEUTRAL if v >= 0 else GOLD for v in dii_vals],
                      label='DII', zorder=3, linewidth=0, alpha=0.85)

    ax.axhline(0, color=DIM, linewidth=1, zorder=2)
    ax.set_xticks(x)
    ax.set_xticklabels(dates, rotation=30, ha='right', fontsize=8.5)
    ax.set_facecolor(BG)
    ax.grid(axis='y', color=DIM, linewidth=0.5, zorder=1)
    ax.tick_params(axis='y', colors=MUTED)

    # totals annotation
    def fmt_cr(v):
        return f'{"+" if v >= 0 else ""}₹{abs(v):,.0f} Cr'

    ax.text(0.02, 0.97, f'FII total: {fmt_cr(fii_total)}',
            transform=ax.transAxes, color=UP if fii_total >= 0 else DOWN,
            fontsize=10, fontweight='bold', va='top')
    ax.text(0.35, 0.97, f'DII total: {fmt_cr(dii_total)}',
            transform=ax.transAxes, color=NEUTRAL if dii_total >= 0 else GOLD,
            fontsize=10, fontweight='bold', va='top')

    leg = ax.legend(facecolor=CARD, edgecolor=DIM, labelcolor=WHITE,
                    fontsize=9, loc='lower right')

    plt.savefig(out_path, dpi=DPI, bbox_inches='tight',
                facecolor=BG, edgecolor='none')
    plt.close()


# ══════════════════════════════════════════════════════════════════════════════
# 5.  TOP / BOTTOM MOVERS
# ══════════════════════════════════════════════════════════════════════════════
def render_top_movers(data, out_path):
    top    = data['top']     # [{symbol, pct}, ...]
    bottom = data['bottom']
    total  = data.get('total', 0)
    date_str = data.get('date', '')

    fig = fig_base()
    logo(fig, x=0.97, ha='right')
    watermark(fig)

    title_box(fig,
              f'Week\'s Biggest Movers  —  {date_str}',
              f'{total} NSE stocks tracked this week',
              y_title=0.95)

    # Two columns
    for col, items, col_label, clr in [
        (0, top,    'Top Gainers', UP),
        (1, bottom, 'Biggest Declines', DOWN)
    ]:
        x0 = 0.03 + col * 0.50
        ax = fig.add_axes([x0, 0.06, 0.45, 0.78])
        ax.set_facecolor(CARD)
        ax.set_xlim(0, 1); ax.set_ylim(0, 1)
        ax.axis('off')

        # column header
        ax.text(0.5, 0.96, col_label, ha='center', va='top',
                color=clr, fontsize=13, fontweight='bold')
        ax.axhline(0.90, color=DIM, linewidth=0.8)

        row_h = 0.82 / max(len(items), 1)
        for i, item in enumerate(items):
            y = 0.88 - i * row_h
            rank_clr = GOLD if i == 0 else MUTED
            ax.text(0.04, y, f'#{i+1}', color=rank_clr, fontsize=9.5,
                    va='center', fontweight='bold')
            ax.text(0.15, y, item['symbol'], color=WHITE, fontsize=11,
                    va='center', fontweight='bold')
            pct_str = f'{item["pct"]:+.1f}%'
            ax.text(0.96, y, pct_str, color=clr, fontsize=12,
                    va='center', ha='right', fontweight='bold')
            ax.axhline(y - row_h * 0.45, color=DIM, linewidth=0.4,
                       xmin=0.02, xmax=0.98)

    plt.savefig(out_path, dpi=DPI, bbox_inches='tight',
                facecolor=BG, edgecolor='none')
    plt.close()


# ══════════════════════════════════════════════════════════════════════════════
# 6.  FII PCR VISUAL
# ══════════════════════════════════════════════════════════════════════════════
def render_fno_pcr(data, out_path):
    pcr        = data['pcr']
    put_oi     = data['put_oi']
    call_oi    = data['call_oi']
    prev_pcr   = data.get('prev_pcr')
    date_str   = data.get('date', '')
    history    = data.get('history', [])   # [{date, pcr}, ...]

    fig = fig_base()
    logo(fig, x=0.97, ha='right')
    watermark(fig)

    pcr_interp = 'Bearish hedge' if pcr > 1.5 else ('Bullish lean' if pcr < 0.8 else 'Neutral')
    title_box(fig,
              f'FII Index Options PCR  —  {date_str}',
              f'Put/Call Ratio: {pcr:.2f}  ({pcr_interp})',
              y_title=0.95)

    # Left: big PCR gauge / donut
    ax_left = fig.add_axes([0.03, 0.10, 0.38, 0.72])
    ax_left.set_facecolor(BG)
    ax_left.set_xlim(-1, 1); ax_left.set_ylim(-1, 1)
    ax_left.axis('off')

    # donut representing puts vs calls
    total = put_oi + call_oi or 1
    put_frac  = put_oi / total
    call_frac = call_oi / total

    theta1 = 90  # start at top
    ax_left.pie(
        [put_frac, call_frac],
        colors=[DOWN, UP],
        startangle=90,
        counterclock=False,
        wedgeprops=dict(width=0.38, edgecolor=BG, linewidth=2),
        radius=0.85,
    )
    ax_left.text(0, 0.12, f'{pcr:.2f}', ha='center', va='center',
                 fontsize=32, color=WHITE, fontweight='bold')
    ax_left.text(0, -0.14, 'PCR', ha='center', va='center',
                 fontsize=14, color=MUTED)

    # legend
    ax_left.text(-0.8, -0.72, '■', color=DOWN, fontsize=14)
    ax_left.text(-0.6, -0.72, f'Puts  {put_oi/1e5:.1f}L', color=WHITE, fontsize=9.5)
    ax_left.text(0.1,  -0.72, '■', color=UP,   fontsize=14)
    ax_left.text(0.3,  -0.72, f'Calls  {call_oi/1e5:.1f}L', color=WHITE, fontsize=9.5)

    # Right: PCR history line chart
    if history:
        ax_right = fig.add_axes([0.45, 0.15, 0.52, 0.62])
        ax_right.set_facecolor(BG)
        for sp in ax_right.spines.values(): sp.set_color(DIM)

        xs = list(range(len(history)))
        ys = [h['pcr'] for h in history]
        ax_right.plot(xs, ys, color=NEUTRAL, linewidth=2, zorder=3)
        ax_right.fill_between(xs, ys, alpha=0.15, color=NEUTRAL, zorder=2)
        ax_right.axhline(1.0, color=DIM, linewidth=1, linestyle='--', zorder=1)
        ax_right.axhline(1.5, color=DOWN, linewidth=0.8, linestyle=':', zorder=1, alpha=0.6)
        ax_right.axhline(0.8, color=UP,   linewidth=0.8, linestyle=':', zorder=1, alpha=0.6)
        # highlight latest
        ax_right.scatter([xs[-1]], [ys[-1]], color=GOLD, s=60, zorder=5)
        ax_right.text(xs[-1], ys[-1]+0.05, f'{ys[-1]:.2f}', color=GOLD,
                      fontsize=9, ha='center', zorder=6)
        ax_right.set_xticks([0, len(xs)//2, len(xs)-1])
        ax_right.set_xticklabels(
            [history[0]['date'], history[len(xs)//2]['date'], history[-1]['date']],
            fontsize=8, color=MUTED, rotation=15)
        ax_right.tick_params(axis='y', colors=MUTED, labelsize=8)
        ax_right.set_facecolor(BG)
        ax_right.grid(axis='y', color=DIM, linewidth=0.4)
        ax_right.set_title('PCR History', color=MUTED, fontsize=9.5, pad=6)

    # key stats below
    stats = [
        ('FII Put OI (Long)', f'{put_oi:,}'),
        ('FII Call OI (Long)', f'{call_oi:,}'),
        ('PCR today', f'{pcr:.2f}'),
        ('PCR last week', f'{prev_pcr:.2f}' if prev_pcr else '—'),
        ('Signal', pcr_interp),
    ]
    for i, (lbl, val) in enumerate(stats):
        y_pos = 0.11 - i * 0.02
        fig.text(0.46, y_pos, lbl + ':', color=MUTED, fontsize=8.5)
        fig.text(0.72, y_pos, val, color=WHITE, fontsize=8.5, fontweight='bold')

    plt.savefig(out_path, dpi=DPI, bbox_inches='tight',
                facecolor=BG, edgecolor='none')
    plt.close()


# ══════════════════════════════════════════════════════════════════════════════
# Dispatch
# ══════════════════════════════════════════════════════════════════════════════
RENDERERS = {
    'sector_weekly':   render_sector_weekly,
    'breadth_snapshot': render_breadth_snapshot,
    'fno_positioning': render_fno_positioning,
    'cash_flows':      render_cash_flows,
    'top_movers':      render_top_movers,
    'fno_pcr':         render_fno_pcr,
}

def main():
    if len(sys.argv) < 3:
        print('Usage: render_infographic.py <data.json> <output.png>', file=sys.stderr)
        sys.exit(1)
    with open(sys.argv[1]) as f:
        data = json.load(f)
    typ = data.get('type')
    if typ not in RENDERERS:
        print(f'Unknown type: {typ!r}. Available: {list(RENDERERS)}', file=sys.stderr)
        sys.exit(1)
    RENDERERS[typ](data, sys.argv[2])
    print(f'Saved: {sys.argv[2]}')

if __name__ == '__main__':
    main()
