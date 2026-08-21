#!/usr/bin/env python3
"""Renders one chart for the Chartix daily insight scan.

Usage: python3 render_chart.py <data.json> <output.png>

Dispatches on data['type']:
  'line'      — a price series with the extreme point highlighted, optional
                volume panel (index/sector 52-week highs/lows, stock breakouts)
  'bar_flow'  — a time series of signed bars, e.g. FII/DII daily net flow,
                with specific sessions (a streak, or today) highlighted
  'bar_rank'  — a ranked horizontal bar chart, e.g. sector rotation leaders

All three share the same visual language (clean white background, Chartix
palette, watermark) so the output looks like one consistent product.
"""
import sys
import json
import os
import textwrap
from datetime import datetime

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WATERMARK_PATH = os.path.join(SCRIPT_DIR, 'assets', 'chartix_watermark.png')

GREEN = '#047857'
BLUE = '#2563eb'
RED = '#dc2626'
GRAY = '#64748b'

plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.sans-serif': ['Helvetica Neue', 'Arial', 'DejaVu Sans'],
    'axes.facecolor': '#ffffff',
    'figure.facecolor': '#ffffff',
    'axes.spines.top': False,
    'axes.spines.right': False,
})


def add_titles(fig, title, subtitle, y_title=0.97, y_subtitle=0.905, line_gap=0.028):
    fig.suptitle(title, fontsize=16, fontweight='bold', color='#1e293b', y=y_title)
    if not subtitle:
        return
    # Wrap onto up to 2 lines instead of hard-truncating with "..." — a
    # mid-sentence cutoff looks unfinished and drops real information.
    lines = textwrap.wrap(subtitle, width=78, max_lines=2, placeholder=' …')
    for i, line in enumerate(lines):
        fig.text(0.5, y_subtitle - i * line_gap, line, ha='center', fontsize=9.5, color='#64748b', style='italic')
    return len(lines)


def add_watermark(fig):
    try:
        logo = Image.open(WATERMARK_PATH)
        wax = fig.add_axes([0.85, 0.01, 0.12, 0.05], anchor='SE', zorder=100)
        wax.imshow(logo)
        wax.axis('off')
        for child in wax.get_children():
            if hasattr(child, 'set_alpha'):
                child.set_alpha(0.3)
    except Exception as e:
        print(f"Watermark skipped: {e}", file=sys.stderr)


def render_line(data, out_path):
    rows = data['rows']
    dates = [datetime.fromisoformat(r['d'].replace('Z', '+00:00')) for r in rows]
    closes = [r['c'] for r in rows]
    volumes = [r.get('v', 0) for r in rows]
    hi = data['highlightIndex']
    show_volume = data.get('showVolume', False)

    if show_volume:
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(11, 6.5), height_ratios=[3, 1])
    else:
        fig, ax1 = plt.subplots(figsize=(11, 5.5))
        ax2 = None

    fig.subplots_adjust(top=0.86, bottom=0.10, left=0.08, right=0.95, hspace=0.15)
    n_lines = add_titles(fig, data['title'], data.get('subtitle', '')) or 0
    if n_lines >= 2:
        fig.subplots_adjust(top=0.80)

    ax1.plot(dates, closes, color=BLUE, linewidth=1.8, zorder=5)
    ax1.fill_between(dates, min(closes), closes, alpha=0.06, color=BLUE)

    hx, hy = dates[hi], closes[hi]
    color = GREEN if hy == max(closes) else RED
    ax1.plot(hx, hy, 'o', color=color, markersize=9, zorder=8)
    ax1.annotate(
        f'{hy:,.2f}',
        xy=(hx, hy), xytext=(0, 14 if hy == max(closes) else -20),
        textcoords='offset points', fontsize=10, fontweight='bold', color=color,
        ha='center',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor=color, alpha=0.95),
        zorder=9,
    )

    ax1.set_ylabel('Close', fontsize=10, color=GRAY)
    ax1.tick_params(colors='#94a3b8', labelsize=9)
    ax1.grid(True, alpha=0.1)
    ax1.xaxis.set_major_formatter(mdates.DateFormatter('%b %Y'))

    if show_volume and ax2:
        # Same date window as the price panel above (standard price+volume
        # convention — axes must line up). To stop an old listing-day/split
        # spike elsewhere in the history from swamping the y-axis and hiding
        # today's real signal, the axis is capped at a robust ceiling (3x the
        # 95th percentile of the window) and any bar taller than that is
        # visibly truncated with a "clipped" marker rather than silently cut.
        colors = ['#94a3b8'] * len(volumes)
        colors[hi] = color
        p95 = np.percentile(volumes, 95)
        ceiling = p95 * 3
        clipped = [v > ceiling for v in volumes]
        plot_values = [min(v, ceiling) for v in volumes]
        ax2.bar(dates, plot_values, color=colors, width=1.5, alpha=0.85)
        for d, v, was_clipped in zip(dates, volumes, clipped):
            if was_clipped:
                ax2.annotate('', xy=(d, ceiling), xytext=(d, ceiling * 1.12),
                             arrowprops=dict(arrowstyle='-|>', color='#dc2626', lw=1.2))
        ax2.set_ylim(0, ceiling * 1.18)
        ax2.set_ylabel('Volume', fontsize=9, color=GRAY)
        ax2.tick_params(colors='#94a3b8', labelsize=8)
        ax2.xaxis.set_major_formatter(mdates.DateFormatter('%b %Y'))
        ax2.grid(True, alpha=0.08)

    add_watermark(fig)
    fig.savefig(out_path, dpi=170, bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close()


def render_bar_flow(data, out_path):
    """FII/DII-style signed daily bars, with specific sessions highlighted."""
    rows = data['rows']
    dates = [datetime.fromisoformat(r['date'] + 'T00:00:00') if 'T' not in r['date'] else datetime.fromisoformat(r['date']) for r in rows]
    values = [r['value'] for r in rows]
    highlight = set(data.get('highlightIndices', []))

    fig, ax = plt.subplots(figsize=(11, 5.5))
    fig.subplots_adjust(top=0.86, bottom=0.14, left=0.10, right=0.95)
    n_lines = add_titles(fig, data['title'], data.get('subtitle', '')) or 0
    if n_lines >= 2:
        fig.subplots_adjust(top=0.80)

    colors = []
    for i, v in enumerate(values):
        if i in highlight:
            colors.append(GREEN if v >= 0 else RED)
        else:
            colors.append('#86efac' if v >= 0 else '#fca5a5')

    ax.bar(dates, values, color=colors, width=0.7, alpha=0.9)
    ax.axhline(y=0, color='#334155', linewidth=0.8)
    ax.set_ylabel('Net Flow (₹ Cr)', fontsize=10, color=GRAY)
    ax.tick_params(colors='#94a3b8', labelsize=9)
    ax.grid(True, alpha=0.1, axis='y')
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%d %b'))
    fig.autofmt_xdate(rotation=45)

    # Annotate the last highlighted bar with its value
    if highlight:
        last_hi = max(highlight)
        v = values[last_hi]
        ax.annotate(
            f'₹{abs(v):,.0f} Cr',
            xy=(dates[last_hi], v), xytext=(0, 10 if v >= 0 else -22),
            textcoords='offset points', fontsize=10, fontweight='bold',
            color=GREEN if v >= 0 else RED, ha='center',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white',
                      edgecolor=GREEN if v >= 0 else RED, alpha=0.95),
            zorder=9,
        )

    add_watermark(fig)
    fig.savefig(out_path, dpi=170, bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close()


def render_bar_rank(data, out_path):
    """Ranked horizontal bar chart, e.g. sector rotation leaders/laggards."""
    items = data['items']
    labels = [it['label'] for it in items]
    values = [it['value'] for it in items]
    highlight_labels = set(data.get('highlightLabels', []))

    fig, ax = plt.subplots(figsize=(10.5, max(4.2, len(items) * 0.42)))
    fig.subplots_adjust(top=0.86, bottom=0.08, left=0.30, right=0.90)
    n_lines = add_titles(fig, data['title'], data.get('subtitle', ''), y_title=0.975, y_subtitle=0.925, line_gap=0.024) or 0
    # A 2-line subtitle needs more headroom than a 1-line one, or its second
    # line crowds the plot area — tighten the axes top edge to compensate.
    if n_lines >= 2:
        fig.subplots_adjust(top=0.80)

    y_pos = list(range(len(labels)))[::-1]  # best at top
    colors = []
    for lab, v in zip(labels, values):
        if lab in highlight_labels:
            colors.append(GREEN if v >= 0 else RED)
        else:
            colors.append('#86efac' if v >= 0 else '#fca5a5')

    ax.barh(y_pos, values, color=colors, height=0.65, alpha=0.9)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(labels, fontsize=9.5, color='#334155')
    ax.axvline(x=0, color='#334155', linewidth=0.8)
    ax.set_xlabel('5-Session Return (%)', fontsize=10, color=GRAY)
    ax.tick_params(colors='#94a3b8', labelsize=9)
    ax.grid(True, alpha=0.1, axis='x')

    # Pad the x-axis well beyond the bar extremes so value labels at the
    # widest bars (best/worst — the two that matter most) never crowd the
    # y-axis or the right edge, regardless of how large those values are.
    vmin, vmax = min(values), max(values)
    span = max(vmax - vmin, 0.1)
    ax.set_xlim(vmin - span * 0.22, vmax + span * 0.22)

    for y, v in zip(y_pos, values):
        ax.annotate(f'{v:+.1f}%', xy=(v, y), xytext=(6 if v >= 0 else -6, 0),
                    textcoords='offset points', fontsize=8.5, color='#475569',
                    fontweight='bold', va='center', ha='left' if v >= 0 else 'right')

    add_watermark(fig)
    fig.savefig(out_path, dpi=170, bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close()


def main():
    if len(sys.argv) != 3:
        print("Usage: render_chart.py <data.json> <output.png>", file=sys.stderr)
        sys.exit(1)

    data_path, out_path = sys.argv[1], sys.argv[2]
    with open(data_path) as f:
        data = json.load(f)

    chart_type = data.get('type', 'line')
    if chart_type == 'line':
        render_line(data, out_path)
    elif chart_type == 'bar_flow':
        render_bar_flow(data, out_path)
    elif chart_type == 'bar_rank':
        render_bar_rank(data, out_path)
    else:
        print(f"Unknown chart type: {chart_type}", file=sys.stderr)
        sys.exit(1)

    print(f"Saved: {out_path}")


if __name__ == '__main__':
    main()
