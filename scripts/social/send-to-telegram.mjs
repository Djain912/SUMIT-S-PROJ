// Delivers a day's insight-scan output to Telegram — one message per
// finding (chart + caption if it has a chart, text-only if not), so you can
// scroll through on your phone each morning and forward whichever you like
// straight into X.
//
// Usage: node scripts/social/send-to-telegram.mjs <output-dir>
//   (normally called automatically by daily-insight-scan.mjs, not run directly)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal .env loader — deliberately doesn't depend on Prisma being imported
// first (which incidentally loads .env as a side effect elsewhere in this
// project); this script has no DB dependency of its own.
function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"([^"]*)"\s*$/) || line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(\S*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
loadEnv();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : null;

export function isConfigured() {
  return !!(TOKEN && CHAT_ID);
}

async function sendMessage(text) {
  const res = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error('Telegram sendMessage failed: ' + JSON.stringify(data));
}

async function sendPhoto(filePath, caption) {
  const form = new FormData();
  form.append('chat_id', CHAT_ID);
  if (caption) form.append('caption', caption.slice(0, 1024)); // Telegram's caption limit
  form.append('parse_mode', 'HTML');
  const buffer = fs.readFileSync(filePath);
  form.append('photo', new Blob([buffer]), path.basename(filePath));
  const res = await fetch(`${API}/sendPhoto`, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.ok) throw new Error('Telegram sendPhoto failed: ' + JSON.stringify(data));
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function deliverToTelegram(outDir, dateLabel, findings) {
  if (!isConfigured()) {
    console.log('[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping delivery.');
    return;
  }
  if (findings.length === 0) {
    await sendMessage(`📊 <b>Chartix Daily Insight Scan — ${escapeHtml(dateLabel)}</b>\n\nNo sufficiently extreme, verifiable finding today. Skip posting rather than force one.`);
    return;
  }

  await sendMessage(`📊 <b>Chartix Daily Insight Scan — ${escapeHtml(dateLabel)}</b>\n${findings.length} verified findings below, ranked best first. Chart (if any) comes right after each one.`);

  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    const caption = `<b>[${escapeHtml(f.category)}]</b>\n\n${escapeHtml(f.headline)}` +
      (f.detail ? `\n\n${escapeHtml(f.detail)}` : '') +
      (f.implication ? `\n\n<i>${escapeHtml(f.implication)}</i>` : '') +
      (f.tags ? `\n\n${escapeHtml(f.tags)}` : '');

    const chartPath = path.join(outDir, `chart_${i + 1}.png`);
    if (fs.existsSync(chartPath)) {
      await sendPhoto(chartPath, caption);
    } else {
      await sendMessage(caption);
    }
  }

  await sendMessage(`✅ That's all ${findings.length} — pick one, copy a caption from <code>report.md</code> if you want a different phrasing, and post.`);
}

// Allow standalone re-delivery: node send-to-telegram.mjs <output-dir>
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const outDir = process.argv[2];
  if (!outDir || !fs.existsSync(path.join(outDir, 'findings.json'))) {
    console.error('Usage: node send-to-telegram.mjs <output-dir>  (must contain findings.json)');
    process.exit(1);
  }
  const findings = JSON.parse(fs.readFileSync(path.join(outDir, 'findings.json'), 'utf-8'));
  const dateLabel = path.basename(outDir);
  deliverToTelegram(outDir, dateLabel, findings)
    .then(() => console.log('Delivered to Telegram.'))
    .catch((e) => { console.error('Delivery failed:', e); process.exit(1); });
}
