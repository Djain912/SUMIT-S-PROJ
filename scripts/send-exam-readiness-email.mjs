// Exam-readiness email to users who took a free trial but never subscribed.
//   node --env-file=.env scripts/send-exam-readiness-email.mjs --test you@example.com   (one sample copy)
//   node --env-file=.env scripts/send-exam-readiness-email.mjs --dry                    (list recipients only)
//   node --env-file=.env scripts/send-exam-readiness-email.mjs --send                   (real send; idempotent)

import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Chartix <contact@chartix.in>';
const SUBJECT = 'One month to your CMT exam — are you ready?';
const TEMPLATE = readFileSync(new URL('./exam-readiness-email.html', import.meta.url), 'utf-8');
const STATE = new URL('./.exam-readiness-sent.json', import.meta.url);

const EXCLUDE = new Set([
  'admin@financeprep.com',
  'sumitsanghavi09@gmail.com',
  'jainsumit01usa@gmail.com',
  'storage4myfile@gmail.com',
  'rzyeditx@gmail.com',
  'penopeg798@candaba.com',
  'traderbtc569@gmail.com',
]);

const LEVEL = {
  LEVEL_1: { label: 'Level I', questions: '3,400+ Level I' },
  LEVEL_2: { label: 'Level II', questions: '1,000+ Level II' },
};

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function render(firstName, level) {
  const l = LEVEL[level] ?? LEVEL.LEVEL_1;
  return TEMPLATE
    .replaceAll('{{FIRST_NAME}}', esc(firstName))
    .replaceAll('{{LEVEL}}', l.label)
    .replaceAll('{{QUESTION_COUNT}}', l.questions);
}

async function recipients() {
  const now = new Date();
  const users = await prisma.user.findMany({
    include: {
      levelTrials: { orderBy: { startedAt: 'desc' } },
      payments: { where: { status: 'PAID' } },
      entitlements: { where: { expiresAt: { gt: now } } },
    },
  });
  return users
    .filter((u) => u.role !== 'ADMIN' && !EXCLUDE.has(u.email))
    .filter((u) => u.levelTrials.length > 0)
    .filter((u) => u.payments.length === 0 && !(u.premiumUntil && u.premiumUntil > now) && u.entitlements.length === 0)
    .map((u) => ({
      email: u.email,
      firstName: (u.fullName || '').trim().split(/\s+/)[0] || 'there',
      level: u.levelTrials[0].level, // most recent trial decides the level shown
    }));
}

async function send(to, firstName, level) {
  const { error } = await resend.emails.send({ from: FROM, to, subject: SUBJECT, html: render(firstName, level) });
  if (error) throw new Error(error.message || JSON.stringify(error));
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--test') {
    const to = args[1];
    if (!to) throw new Error('Usage: --test you@example.com');
    await send(to, 'Sumit', 'LEVEL_1');
    console.log(`Test sent to ${to}`);
    return;
  }

  const list = await recipients();
  if (args[0] === '--dry' || args[0] !== '--send') {
    const byLevel = list.reduce((a, r) => ((a[r.level] = (a[r.level] || 0) + 1), a), {});
    console.log(`${list.length} recipients`, byLevel);
    return;
  }

  const sent = new Set(existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf-8')) : []);
  let ok = 0, failed = 0;
  for (const r of list) {
    if (sent.has(r.email)) continue;
    try {
      await send(r.email, r.firstName, r.level);
      sent.add(r.email);
      writeFileSync(STATE, JSON.stringify([...sent], null, 2));
      ok++;
      console.log(`✓ ${r.email}`);
    } catch (e) {
      failed++;
      console.log(`✗ ${r.email} — ${e.message}`);
      if (/limit|quota/i.test(e.message)) { console.log('Daily quota reached — rerun tomorrow to continue.'); break; }
    }
    await new Promise((res) => setTimeout(res, 600));
  }
  console.log(`\nDone. Sent ${ok}, failed ${failed}, total sent so far ${sent.size}/${list.length}.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
