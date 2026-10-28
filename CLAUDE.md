# Chartix.in — project context

CMT (Chartered Market Technician) exam-prep site + free market tools. Owner: Sumit Jain (non-coder; explain changes in plain language, one clear recommendation).
Stack: Next.js (App Router) + Prisma + Neon Postgres, Vercel **Hobby** plan, Resend (email), Upstash Redis, Telegram bot. Repo `Djain912/SUMIT-S-PROJ`, branch `master` (auto-deploys to Vercel on push).
Local path: `/Users/sumitjain/Documents/SUMIT/Chartix.in /SUMIT-S-PROJ-master` (trailing space after `Chartix.in` — always quote). Secrets live in `.env` (gitignored).
NOT the news bot: that is `/Users/sumitjain/Downloads/stock_intelligence_system`.

## Hard rules
- **The GitHub repo is PUBLIC.** Never commit customer emails/PII (`scripts/.*-sent.json` stay local), `.env`, paid course content (L3 notes/cases/MCQs, question batches, `prisma/backups`) or business analytics.
- Customer emails are sent only from `contact@chartix.in` (never a personal Gmail). Founder address is `sumit@chartix.in`.
- Every bulk send script must skip `scripts/email-unsubscribed.json`. Trial-drip cron does NOT check it yet (known gap).
- Chartix is global: L3 cases/MCQs use US$ and international names, not ₹/NSE.
- Vercel Hobby allows only once-per-day cron expressions. `*/30` or any sub-daily expression FAILS the whole deploy. Use separate hourly entries instead. After pushing, check the Vercel status on the commit before telling the user it is live.

## FII / DII tool (/tools/fii-dii)
- Pages read **Neon only** (`getCashDays`, 15-min cache + tag revalidation). No client-side "live" overlay — we tried it and removed it; the main panel shows the newest stored session.
- `/api/cron/fii-dii-log` pulls NSE cash API + F&O archive CSVs, upserts, revalidates, then sends Telegram posts (Redis dedup). Needs `CRON_SECRET`.
- Schedule (vercel.json): hourly entries 13:00–17:00 UTC (6:30–10:30 PM IST; Hobby fires anywhere inside the hour) + 02:30 UTC `?run=morning` catch-up. Evening runs return early once today's cash + F&O are stored.
- `/api/fii-dii/history` returns the latest N rows (desc + take + reverse); an old bug returned the oldest N.
- NSE blocks datacenter IPs sometimes; NSE publishes anywhere from ~6 to 9+ PM IST.

## Marketing / analytics state (Oct 2026)
- Google Ads: India + US + UAE targeted, Singapore excluded (bot traffic), negative keywords added. Conversion = real GA4 `sign_up` event (old page-view based `ads_conversion_Sign_Up_1` demoted; its GA4 rule may still exist, safe to delete). Re-evaluate ad performance ~Nov 11 2026 with clean data before changing budget.
- Claude for Startups: Team plan (2 Standard seats) free until Oct 14 2027, then full price on the card on file; $1,000 API credits in Console (keep auto-reload OFF).

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
