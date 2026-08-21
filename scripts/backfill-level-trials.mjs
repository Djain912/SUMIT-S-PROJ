// One-time, idempotent backfill: every existing user with the old global
// trial fields set (User.trialStartedAt/trialExpiresAt) gets an equivalent
// LevelTrial(level: LEVEL_1) row, preserving their original timestamps
// exactly (no re-clocking to now — that would hand out free extra days).
//
// Safe to re-run: uses upsert with update:{} so reruns are no-ops.
// Run with: node scripts/backfill-level-trials.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { trialStartedAt: { not: null }, trialExpiresAt: { not: null } },
    select: {
      id: true,
      email: true,
      trialStartedAt: true,
      trialExpiresAt: true,
      activity: { select: { lastDripDay: true } },
    },
  });

  console.log(`Found ${users.length} users with a legacy trial to backfill.`);

  let created = 0;
  let skipped = 0;

  for (const u of users) {
    const existing = await prisma.levelTrial.findUnique({
      where: { userId_level: { userId: u.id, level: 'LEVEL_1' } },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.levelTrial.create({
      data: {
        userId: u.id,
        level: 'LEVEL_1',
        startedAt: u.trialStartedAt,
        expiresAt: u.trialExpiresAt,
        lastDripDay: u.activity?.lastDripDay ?? null,
      },
    });
    created++;
  }

  const now = new Date();
  const stillActive = await prisma.levelTrial.count({
    where: { level: 'LEVEL_1', expiresAt: { gt: now } },
  });
  const level2Count = await prisma.levelTrial.count({ where: { level: 'LEVEL_2' } });

  console.log('');
  console.log('=== Backfill summary ===');
  console.log('Users scanned:', users.length);
  console.log('LevelTrial rows created:', created);
  console.log('Already existed (skipped):', skipped);
  console.log('Currently-active LEVEL_1 trials after backfill:', stillActive);
  console.log('LEVEL_2 trials created (should be 0):', level2Count);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
