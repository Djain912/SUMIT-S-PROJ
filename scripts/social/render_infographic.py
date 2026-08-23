#!/usr/bin/env python3
"""
Chartix infographic renderer — clean light theme, professional analyst style.
1200×675 @ 150 DPI.  All templates use flat pixel coordinates (0,0 = top-left)
to avoid matplotlib sub-axes clipping and coordinate confusion.

Usage: python3 render_infographic.py <data.json> <output.png>
"""
import json, sys, math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch

# ─────────────────────────────────────────────────────────────
# Design tokens
# ─────────────────────────────────────────────────────────────
BG        = '#FFFFFF'
SURFACE   = '#F7F8FA'
BORDER    = '#E4E7EC'
TEXT      = '#111827'
TEXT2     = '#6B7280'
TEXT3     = '#9CA3AF'
UP        = '#16A34A'
DOWN      = '#DC2626'
BLUE      = '#2563EB'
AMBER     = '#D97706'
UP_FILL   = '#DCFCE7'
DOWN_FILL = '#FEE2E2'
BLUE_FILL = '#DBEAFE'
DIVIDER   = '#F3F4F6'

W, H  = 1200, 675
DPI   = 150
PAD   = 36    # standard left/right margin in px


# ─────────────────────────────────────────────────────────────
# Pixel-coordinate canvas helpers
# ─────────────────────────────────────────────────────────────
def _px_fig():
    """Single axis covering full canvas; (0,0) = top-left, y grows downward."""
    fig, ax = plt.subplots(figsize=(W/DPI, H/DPI), dpi=DPI)
    fig.subplots_adjust(0, 0, 1, 1)
    ax.set_xlim(0, W)
    ax.set_ylim(H, 0)   # inverted y: 0 at top
    ax.axis('off')
    ax.set_facecolor(BG)
    fig.patch.set_facecolor(BG)
    return fig, ax

def _header(ax, title, subtitle='', date=''):
    """Standard top accent bar + title block."""
    ax.add_patch(patches.Rectangle((0, 0), W, 22, facecolor=BLUE, zorder=5))
    ax.text(16,   30, 'Chartix.in', fontsize=9, color=BLUE,
            fontweight='bold', va='top', zorder=5)
    if date:
        ax.text(W-16, 30, date, fontsize=9, color=TEXT2,
                va='top', ha='right', zorder=5)
    ax.text(W/2, 42, title, fontsize=18, color=TEXT,
            fontweight='bold', ha='center', va='top', zorder=5)
    if subtitle:
        ax.text(W/2, 76, subtitle, fontsize=10.5, color=TEXT2,
                ha='center', va='top', zorder=5)

def _footer(ax):
    ax.text(W/2, H-8, 'Data: NSE  |  chartix.in',
            ha='center', va='bottom', fontsize=7.5, color=TEXT3)

def _card(ax, x, y, w, h, fc=SURFACE, ec=BORDER, lw=1.2, r=10, zorder=2):
    """Rounded-rectangle card in pixel coords."""
    ax.add_patch(FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f'round,pad=0,rounding_size={r}',
        facecolor=fc, edgecolor=ec, linewidth=lw, zorder=zorder,
        clip_on=False))

def _hbar(ax, x, y, w, h, pct, track=BORDER, fill=BLUE, zorder=3):
    """Horizontal progress bar."""
    ax.add_patch(patches.Rectangle((x, y), w, h, facecolor=track, zorder=zorder))
    ax.add_patch(patches.Rectangle(
        (x, y), w * min(max(pct/100, 0), 1), h,
        facecolor=fill, alpha=0.8, zorder=zorder+1))

def _save(out):
    plt.savefig(out, dpi=DPI, facecolor=BG)
    plt.close()
    print(f'Saved: {out}')

def color_val(v): return UP if v >= 0 else DOWN
def fmt_cr(v):    return f'{"+" if v>=0 else "-"}₹{abs(v):,.0f} Cr'


# ═══════════════════════════════════════════════════════════════
# 1. SECTOR WEEKLY — horizontal bar chart
# ═══════════════════════════════════════════════════════════════
def render_sector_weekly(data, out):
    sectors  = data['sectors']   # [{label, pct}] best → worst
    nifty    = data.get('nifty_pct', 0)
    date_str = data.get('date', '')

    fig, ax_canvas = _px_fig()
    _header(ax_canvas, 'Weekly Sector Performance',
            f'Nifty 50  {nifty:+.2f}%', date_str)
    _footer(ax_canvas)

    # chart area as a proper axes embedded in canvas
    # left=220px for labels, right margin=60px, top=110px, bottom=36px
    L, R, T, B = 220, 60, 112, 36
    ax = fig.add_axes([L/W, B/H, (W-L-R)/W, (H-T-B)/H])
    ax.set_facecolor(BG)
    for sp in ['top', 'right', 'bottom']: ax.spines[sp].set_visible(False)
    ax.spines['left'].set_color(BORDER)
    ax.tick_params(left=False, bottom=False, labelsize=9.5, colors=TEXT2)

    labels = [s['label'] for s in sectors]
    values = [s['pct']   for s in sectors]
    colors = [UP if v >= 0 else DOWN for v in values]
    y      = list(range(len(sectors)))

    bars = ax.barh(y, values, color=colors, height=0.60,
                   zorder=3, linewidth=0, alpha=0.88)
    for i, (v, bar) in enumerate(zip(values, bars)):
        pad = max(abs(v)*0.04, 0.06)
        xpos = v + pad if v >= 0 else v - pad
        ax.text(xpos, i, f'{v:+.2f}%', va='center',
                ha='left' if v >= 0 else 'right',
                fontsize=9, color=UP if v >= 0 else DOWN, fontweight='bold')

    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=9.5, color=TEXT)
    ax.invert_yaxis()
    ax.axvline(0, color=BORDER, linewidth=1.2, zorder=2)
    ax.axvline(nifty, color=BLUE, linewidth=1.4, linestyle='--', zorder=4, alpha=0.7)
    ax.text(nifty, -0.8, f'Nifty {nifty:+.2f}%',
            color=BLUE, fontsize=8, va='top', ha='center', zorder=5)
    ax.set_axisbelow(True)
    ax.xaxis.set_tick_params(labelsize=8.5, colors=TEXT2)
    ax.grid(axis='x', color=DIVIDER, linewidth=0.8, zorder=0)
    ax.set_xticks([])
    max_abs = max(abs(v) for v in values) * 1.35 or 1
    ax.set_xlim(-max_abs, max_abs)

    _save(out)


# ═══════════════════════════════════════════════════════════════
# 2. BREADTH SNAPSHOT — pixel-flat layout
# ═══════════════════════════════════════════════════════════════
def render_breadth_snapshot(data, out):
    p20   = data['pct_above_20']
    p50   = data['pct_above_50']
    p200  = data['pct_above_200']
    adv   = data['advances']
    dec   = data['declines']
    w_adv = data['weekly_advances']
    w_dec = data['weekly_declines']
    total = data['total']
    date  = data.get('date', '')

    fig, ax = _px_fig()
    _header(ax, 'Market Breadth Snapshot',
            f'{total} NSE stocks tracked', date)
    _footer(ax)

    ax.text(W/2, 110, '% OF STOCKS ABOVE MOVING AVERAGE',
            fontsize=8, color=TEXT3, ha='center', va='top', fontweight='bold')

    # ── 3 MA tiles ──
    GAP    = 28
    tile_w = (W - 2*PAD - 2*GAP) // 3
    tile_h = 232
    tile_y = 130

    tile_defs = [
        (p200, '200-Day MA', 'Long-term trend',
         UP if p200 > 55 else (DOWN if p200 < 35 else BLUE)),
        (p50,  '50-Day MA',  'Intermediate trend',
         UP if p50  > 55 else (DOWN if p50  < 35 else BLUE)),
        (p20,  '20-Day MA',  'Short-term trend',
         UP if p20  > 55 else (DOWN if p20  < 35 else BLUE)),
    ]
    for i, (val, ma_lbl, trend_lbl, clr) in enumerate(tile_defs):
        tx = PAD + i * (tile_w + GAP)
        cx = tx + tile_w / 2
        _card(ax, tx, tile_y, tile_w, tile_h, zorder=2)
        ax.text(cx, tile_y + 26, ma_lbl, ha='center', va='top',
                fontsize=11, color=TEXT2, fontweight='bold', zorder=3)
        ax.text(cx, tile_y + tile_h/2 - 8, f'{val:.0f}%',
                ha='center', va='center',
                fontsize=46, color=clr, fontweight='bold', zorder=3)
        ax.text(cx, tile_y + tile_h - 44, trend_lbl,
                ha='center', va='top',
                fontsize=9, color=TEXT3, zorder=3)
        _hbar(ax, tx+24, tile_y+tile_h-20, tile_w-48, 8,
              val, track=BORDER, fill=clr, zorder=3)

    # ── divider ──
    div_y = tile_y + tile_h + 22
    ax.add_patch(patches.Rectangle(
        (PAD, div_y), W-2*PAD, 1, facecolor=BORDER, zorder=2))
    ax.text(W/2, div_y+8, 'ADVANCE / DECLINE',
            ha='center', va='top', fontsize=8, color=TEXT3, fontweight='bold')

    # ── 6 A/D KPI boxes ──
    ad_items = [
        ('Advances\nToday',   str(adv),                       UP),
        ('Declines\nToday',   str(dec),                       DOWN),
        ('Daily A/D',         f'{adv/max(dec,1):.1f}:1',     UP if adv>dec else DOWN),
        ('Weekly\nAdvances',  str(w_adv),                     UP),
        ('Weekly\nDeclines',  str(w_dec),                     DOWN),
        ('Weekly A/D',        f'{w_adv/max(w_dec,1):.1f}:1', UP if w_adv>w_dec else DOWN),
    ]
    ad_y  = div_y + 32
    ad_h  = H - ad_y - 28
    AD_G  = 12
    ad_w  = (W - 2*PAD - 5*AD_G) // 6
    for i, (lbl, val, clr) in enumerate(ad_items):
        bx = PAD + i*(ad_w+AD_G)
        cx = bx + ad_w/2
        _card(ax, bx, ad_y, ad_w, ad_h, r=8, zorder=2)
        ax.text(cx, ad_y + ad_h*0.36, val,
                ha='center', va='center',
                fontsize=20, color=clr, fontweight='bold', zorder=3)
        ax.text(cx, ad_y + ad_h*0.72, lbl,
                ha='center', va='center',
                fontsize=8.5, color=TEXT2, zorder=3, linespacing=1.4)

    _save(out)


# ═══════════════════════════════════════════════════════════════
# 3. FII F&O POSITIONING SCORECARD — table rows
# ═══════════════════════════════════════════════════════════════
def render_fno_positioning(data, out):
    date = data.get('date', '')
    rows = data['rows']   # [{label, value, change, colour, signal}]

    fig, ax = _px_fig()
    _header(ax, 'FII F&O Positioning Scorecard',
            'NSE Participant-wise Open Interest', date)
    _footer(ax)

    # table starts below header subtitle
    TABLE_TOP  = 108
    TABLE_BOT  = H - 36
    TABLE_H    = TABLE_BOT - TABLE_TOP
    n          = len(rows)
    ROW_H      = TABLE_H / (n + 1.2)   # +1.2 reserves space for header row

    # column x positions (pixels)
    COL = {
        'label':  PAD + 8,
        'value':  580,
        'change': 810,
        'signal': 1060,
    }

    # ── header row ──
    hdr_y = TABLE_TOP + 4
    for key, lbl in [('label','Position / Metric'), ('value','Contracts'),
                     ('change','Wk Change'), ('signal','Signal')]:
        ha = 'left' if key == 'label' else 'center'
        ax.text(COL[key], hdr_y, lbl, va='top', ha=ha,
                fontsize=9, color=TEXT2, fontweight='bold')
    ax.add_patch(patches.Rectangle(
        (PAD, TABLE_TOP + ROW_H*0.9), W-2*PAD, 1,
        facecolor=BORDER, zorder=2))

    # ── data rows ──
    for i, row in enumerate(rows):
        ry = TABLE_TOP + ROW_H * (i + 1.3)   # top of row
        cy = ry + ROW_H * 0.45               # vertical centre

        # alternating stripe
        if i % 2 == 0:
            ax.add_patch(patches.Rectangle(
                (PAD, ry), W-2*PAD, ROW_H*0.92,
                facecolor=SURFACE, zorder=1))

        # label
        ax.text(COL['label'], cy, row['label'],
                va='center', ha='left', fontsize=10.5, color=TEXT)

        # value
        clr = row.get('colour', TEXT)
        ax.text(COL['value'], cy, str(row['value']),
                va='center', ha='center',
                fontsize=12, color=clr, fontweight='bold')

        # change
        chg = str(row.get('change', ''))
        if chg:
            chg_clr = UP if chg.startswith('+') else DOWN if chg.startswith('-') else TEXT2
            ax.text(COL['change'], cy, chg,
                    va='center', ha='center', fontsize=10, color=chg_clr)

        # signal pill
        sig = row.get('signal', '')
        if sig:
            sig_clr = (UP   if any(w in sig.lower() for w in ['bull','long','buy'])  else
                       DOWN if any(w in sig.lower() for w in ['bear','short','sell','hedge']) else
                       BLUE)
            pill_w, pill_h = 160, ROW_H * 0.68
            pill_x = COL['signal'] - pill_w/2
            pill_y = cy - pill_h/2
            _card(ax, pill_x, pill_y, pill_w, pill_h,
                  fc=(UP_FILL if sig_clr==UP else DOWN_FILL if sig_clr==DOWN else BLUE_FILL),
                  ec=sig_clr, lw=0.8, r=6, zorder=3)
            ax.text(COL['signal'], cy, sig,
                    va='center', ha='center',
                    fontsize=9, color=sig_clr, fontweight='bold', zorder=4)

    _save(out)


# ═══════════════════════════════════════════════════════════════
# 4. FII / DII CASH FLOWS — KPI strip + grouped bar chart
# ═══════════════════════════════════════════════════════════════
def render_cash_flows(data, out):
    days      = data['days']
    fii_total = data['fii_total']
    dii_total = data['dii_total']
    date      = data.get('date', '')
    combined  = fii_total + dii_total

    fig, ax_canvas = _px_fig()
    _header(ax_canvas, 'FII / DII Weekly Cash Flows',
            f'Combined net: {"+" if combined>=0 else ""}₹{abs(combined):,.0f} Cr', date)
    _footer(ax_canvas)

    # ── KPI strip: 3 cards below header ──
    KPI_Y, KPI_H = 108, 80
    KPI_W = 280
    KPI_G = (W - 2*PAD - 3*KPI_W) // 2
    kpis  = [
        ('FII Net (Week)', fmt_cr(fii_total), color_val(fii_total)),
        ('DII Net (Week)', fmt_cr(dii_total), color_val(dii_total)),
        ('Combined',       fmt_cr(combined),  color_val(combined)),
    ]
    for i, (lbl, val, clr) in enumerate(kpis):
        kx = PAD + i*(KPI_W+KPI_G)
        cx = kx + KPI_W/2
        _card(ax_canvas, kx, KPI_Y, KPI_W, KPI_H, r=8, zorder=2)
        ax_canvas.text(cx, KPI_Y+24, val,
                       ha='center', va='top',
                       fontsize=16, color=clr, fontweight='bold', zorder=3)
        ax_canvas.text(cx, KPI_Y+58, lbl,
                       ha='center', va='top',
                       fontsize=9, color=TEXT2, zorder=3)

    # ── grouped bar chart ──
    CHART_T = KPI_Y + KPI_H + 18
    CHART_B = 36
    L, R = 72, 40
    ax = fig.add_axes([L/W, CHART_B/H, (W-L-R)/W, (H-CHART_T-CHART_B)/H])
    ax.set_facecolor(BG)
    for sp in ['top','right']: ax.spines[sp].set_visible(False)
    for sp in ['left','bottom']: ax.spines[sp].set_color(BORDER)
    ax.tick_params(colors=TEXT2, labelsize=9.5)

    n        = len(days)
    x        = np.arange(n)
    bw       = 0.32
    fii_vals = [d['fii'] for d in days]
    dii_vals = [d['dii'] for d in days]
    xlabels  = [d['date'] for d in days]

    ax.bar(x-bw/2, fii_vals, width=bw,
           color=[UP if v>=0 else DOWN for v in fii_vals],
           label='FII', zorder=3, linewidth=0, alpha=0.85)
    ax.bar(x+bw/2, dii_vals, width=bw,
           color=[BLUE if v>=0 else AMBER for v in dii_vals],
           label='DII', zorder=3, linewidth=0, alpha=0.85)

    for i2, (fv, dv) in enumerate(zip(fii_vals, dii_vals)):
        for val2, offset in [(fv, -bw/2), (dv, bw/2)]:
            ypos = val2 + (80 if val2>=0 else -80)
            ax.text(i2+offset, ypos, f'{val2:+,.0f}',
                    ha='center', va='bottom' if val2>=0 else 'top',
                    fontsize=7.5, color=TEXT2)

    ax.axhline(0, color=BORDER, linewidth=1.2, zorder=2)
    ax.set_xticks(x)
    ax.set_xticklabels(xlabels, fontsize=9)
    ax.set_axisbelow(True)
    ax.grid(axis='y', color=DIVIDER, linewidth=0.8)
    ax.set_ylabel('₹ Crore', fontsize=9, color=TEXT2)

    from matplotlib.patches import Patch
    ax.legend(handles=[
        Patch(facecolor=UP,    alpha=0.85, label='FII Buy'),
        Patch(facecolor=DOWN,  alpha=0.85, label='FII Sell'),
        Patch(facecolor=BLUE,  alpha=0.85, label='DII Buy'),
        Patch(facecolor=AMBER, alpha=0.85, label='DII Sell'),
    ], loc='upper right', fontsize=8.5, framealpha=0.9, edgecolor=BORDER)

    _save(out)


# ═══════════════════════════════════════════════════════════════
# 5. TOP / BOTTOM MOVERS — side-by-side panels
# ═══════════════════════════════════════════════════════════════
def render_top_movers(data, out):
    top    = data['top'][:8]
    bottom = data['bottom'][:8]
    total  = data.get('total', 0)
    date   = data.get('date', '')

    fig, ax = _px_fig()
    _header(ax, "Week's Top & Bottom Movers",
            f'{total} NSE stocks tracked', date)
    _footer(ax)

    PANEL_TOP = 108
    PANEL_BOT = H - 36
    PANEL_H   = PANEL_BOT - PANEL_TOP
    PANEL_W   = (W - 2*PAD - 24) // 2   # 24px gap between panels

    def draw_panel(items, px, color, fill, header_lbl):
        cx    = px + PANEL_W/2
        # header pill
        _card(ax, px, PANEL_TOP, PANEL_W, 36,
              fc=fill, ec=color, lw=1.2, r=8, zorder=2)
        ax.text(cx, PANEL_TOP+18, header_lbl,
                ha='center', va='center',
                fontsize=12, color=color, fontweight='bold', zorder=3)

        n    = len(items)
        rows_h = PANEL_H - 44
        rh   = rows_h / max(n, 1)
        for i, item in enumerate(items):
            ry = PANEL_TOP + 44 + i*rh
            row_fill = fill if i % 2 == 0 else BG
            _card(ax, px+2, ry+2, PANEL_W-4, rh-4,
                  fc=row_fill, ec='none', lw=0, r=4, zorder=2)

            row_cy = ry + rh/2
            rank_clr = AMBER if i == 0 else TEXT3
            ax.text(px+28, row_cy, f'#{i+1}',
                    ha='center', va='center',
                    fontsize=9, color=rank_clr, fontweight='bold', zorder=3)
            ax.text(px+56, row_cy, item['symbol'],
                    ha='left', va='center',
                    fontsize=11, color=TEXT, fontweight='bold', zorder=3)
            ax.text(px+PANEL_W-16, row_cy, f'{item["pct"]:+.2f}%',
                    ha='right', va='center',
                    fontsize=11, color=color, fontweight='bold', zorder=3)
            # mini bar
            bar_max = 200
            bar_len = min(abs(item['pct']) / 15, 1.0) * bar_max
            bar_x   = px + PANEL_W - 16 - bar_max - 8
            ax.add_patch(patches.Rectangle(
                (bar_x, row_cy+4), bar_len, rh*0.2,
                facecolor=color, alpha=0.25, zorder=2))

    draw_panel(top,    PAD,            UP,   UP_FILL,   '▲  Top Gainers')
    draw_panel(bottom, PAD+PANEL_W+24, DOWN, DOWN_FILL, '▼  Biggest Declines')

    _save(out)


# ═══════════════════════════════════════════════════════════════
# 6. FII PCR — donut + KPI strip + history line
# ═══════════════════════════════════════════════════════════════
def render_fno_pcr(data, out):
    pcr      = data['pcr']
    put_oi   = data['put_oi']
    call_oi  = data['call_oi']
    prev_pcr = data.get('prev_pcr')
    date     = data.get('date', '')
    history  = data.get('history', [])

    interp  = ('Bearish hedge — FIIs holding more puts than calls' if pcr > 1.5 else
               'Bullish lean — FIIs holding more calls than puts'  if pcr < 0.8 else
               'Neutral positioning')
    pcr_clr = DOWN if pcr > 1.5 else (UP if pcr < 0.8 else BLUE)

    fig, ax_canvas = _px_fig()
    _header(ax_canvas, 'FII Index Options — Put / Call Ratio', interp, date)
    _footer(ax_canvas)

    # Pixel layout constants
    CONTENT_TOP = 108    # px below which all content lives
    CONTENT_BOT = H - 36
    CONTENT_H   = CONTENT_BOT - CONTENT_TOP   # 531 px

    LEFT_W  = 400        # donut panel width
    GAP     = 24
    RIGHT_X = PAD + LEFT_W + GAP              # 460 px
    RIGHT_W = W - RIGHT_X - PAD              # 704 px

    KPI_H   = 88
    KPI_TOP = CONTENT_TOP
    KPI_BOT = KPI_TOP + KPI_H

    LABEL_Y = KPI_BOT + 10
    CHART_TOP_PX = LABEL_Y + 18              # line chart starts here
    CHART_H_PX   = CONTENT_BOT - CHART_TOP_PX

    # ── LEFT: donut axes (figure fractions, y from bottom) ──
    # Spans content_top to content_bot
    donut_bottom = (H - CONTENT_BOT) / H      # from figure bottom
    donut_height = CONTENT_H / H
    ax_l = fig.add_axes([PAD/W, donut_bottom, LEFT_W/W, donut_height])
    ax_l.set_facecolor(BG)
    ax_l.axis('off')
    ax_l.set_xlim(-1, 1); ax_l.set_ylim(-1.1, 1.1)

    tot = put_oi + call_oi or 1
    ax_l.pie([put_oi/tot, call_oi/tot],
             colors=[DOWN, UP], startangle=90, counterclock=False,
             wedgeprops=dict(width=0.42, edgecolor='white', linewidth=3),
             radius=0.72)
    ax_l.text(0,  0.10, f'{pcr:.2f}', ha='center', va='center',
              fontsize=38, color=pcr_clr, fontweight='bold')
    ax_l.text(0, -0.16, 'PCR', ha='center', va='center',
              fontsize=13, color=TEXT2, fontweight='bold')
    # legend text at bottom of donut area
    ax_l.text(-0.92, -0.82, '●', color=DOWN, fontsize=14, va='center')
    ax_l.text(-0.72, -0.82, f'Puts  {put_oi/1e5:.1f}L  ({put_oi/tot*100:.0f}%)',
              color=TEXT, fontsize=9, va='center')
    ax_l.text(-0.92, -0.98, '●', color=UP,   fontsize=14, va='center')
    ax_l.text(-0.72, -0.98, f'Calls {call_oi/1e5:.1f}L  ({call_oi/tot*100:.0f}%)',
              color=TEXT, fontsize=9, va='center')

    # ── RIGHT TOP: 4 KPI cards drawn on pixel canvas ──
    KPI_G = 12
    KPI_W = (RIGHT_W - 3*KPI_G) // 4
    kpis  = [
        ('PCR Today', f'{pcr:.2f}',                            pcr_clr),
        ('Last Week', f'{prev_pcr:.2f}' if prev_pcr else '—',  TEXT2),
        ('Put OI',    f'{put_oi/1e5:.1f}L',                    DOWN),
        ('Call OI',   f'{call_oi/1e5:.1f}L',                   UP),
    ]
    for i, (lbl, val, clr) in enumerate(kpis):
        kx = RIGHT_X + i*(KPI_W+KPI_G)
        cx = kx + KPI_W/2
        _card(ax_canvas, kx, KPI_TOP, KPI_W, KPI_H, r=8, zorder=2)
        ax_canvas.text(cx, KPI_TOP+20, val,
                       ha='center', va='top',
                       fontsize=18, color=clr, fontweight='bold', zorder=3)
        ax_canvas.text(cx, KPI_TOP+58, lbl,
                       ha='center', va='top',
                       fontsize=9, color=TEXT2, zorder=3)

    # ── section label above line chart ──
    ax_canvas.text(RIGHT_X + RIGHT_W/2, LABEL_Y,
                   'PCR History  ·  dashed lines: 0.8 (bullish) / 1.5 (bearish)',
                   ha='center', va='top', fontsize=8, color=TEXT3)

    # ── RIGHT BOTTOM: PCR history line chart ──
    if history:
        # figure-fraction coords for the line chart axes
        chart_bottom = (H - CONTENT_BOT) / H          # same bottom as donut
        chart_height = CHART_H_PX / H
        chart_top_frac = chart_bottom + chart_height   # top of chart in fig coords

        ax_r = fig.add_axes([RIGHT_X/W, chart_bottom, RIGHT_W/W, chart_height])
        ax_r.set_facecolor(BG)
        for sp in ['top', 'right']: ax_r.spines[sp].set_visible(False)
        for sp in ['left', 'bottom']: ax_r.spines[sp].set_color(BORDER)
        ax_r.tick_params(colors=TEXT2, labelsize=8.5)

        xs = list(range(len(history)))
        ys = [h['pcr'] for h in history]
        ax_r.plot(xs, ys, color=BLUE, linewidth=2.2, zorder=4)
        ax_r.fill_between(xs, ys, min(ys)*0.95, alpha=0.10, color=BLUE)
        ax_r.axhline(1.5, color=DOWN, linewidth=1, linestyle='--', alpha=0.6)
        ax_r.axhline(0.8, color=UP,   linewidth=1, linestyle='--', alpha=0.6)
        ax_r.axhline(1.0, color=TEXT3, linewidth=0.8)
        ax_r.scatter([xs[-1]], [ys[-1]], color=pcr_clr, s=55, zorder=6)
        ax_r.annotate(f'{ys[-1]:.2f}', (xs[-1], ys[-1]),
                      textcoords='offset points', xytext=(6, 4),
                      fontsize=9, color=pcr_clr, fontweight='bold')
        step = max(1, len(xs)//5)
        tick_idx = list(range(0, len(xs), step))
        ax_r.set_xticks(tick_idx)
        ax_r.set_xticklabels([history[j]['date'] for j in tick_idx],
                              fontsize=7.5, rotation=20, ha='right')
        ax_r.set_ylabel('PCR', fontsize=9, color=TEXT2)
        ax_r.set_axisbelow(True)
        ax_r.grid(axis='y', color=DIVIDER, linewidth=0.8)

    _save(out)


# ═══════════════════════════════════════════════════════════════
# Dispatch
# ═══════════════════════════════════════════════════════════════
RENDERERS = {
    'sector_weekly':    render_sector_weekly,
    'breadth_snapshot': render_breadth_snapshot,
    'fno_positioning':  render_fno_positioning,
    'cash_flows':       render_cash_flows,
    'top_movers':       render_top_movers,
    'fno_pcr':          render_fno_pcr,
}

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: render_infographic.py <data.json> <output.png>')
        sys.exit(1)
    with open(sys.argv[1]) as f:
        payload = json.load(f)
    template = payload.get('template')
    if template not in RENDERERS:
        print(f'Unknown template "{template}". Options: {list(RENDERERS)}')
        sys.exit(1)
    RENDERERS[template](payload, sys.argv[2])
