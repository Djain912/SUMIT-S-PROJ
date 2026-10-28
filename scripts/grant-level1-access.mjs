// Grant Level 1 access (1-year trial) to specific users
// node scripts/grant-level1-access.mjs

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
const prisma = new PrismaClient();

// Customer emails live in a git-ignored file (repo is public).
const EMAILS = JSON.parse(readFileSync('scripts/private-email-lists.json', 'utf-8')).grantLevel1Access;

const ONE_YEAR = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

async function main() {
  for (const email of EMAILS) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`✗ Not found: ${email}`);
      continue;
    }

    const result = await prisma.levelTrial.upsert({
      where: { userId_level: { userId: user.id, level: 'LEVEL_1' } },
      create: {
        userId: user.id,
        level: 'LEVEL_1',
        startedAt: new Date(),
        expiresAt: ONE_YEAR,
      },
      update: {
        expiresAt: ONE_YEAR,
      },
    });

    console.log(`✓ ${email} — Level 1 access granted until ${ONE_YEAR.toDateString()}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
