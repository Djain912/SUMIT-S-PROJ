import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { readFileSync } from 'fs';

// Load .env manually
const envFile = readFileSync('.env', 'utf-8');
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  process.env[key] = val;
}

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'admin@financeprep.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';
const ADMIN_PROVIDER_ID = `credentials:${ADMIN_EMAIL}`;

// Simple bcrypt-compatible hash using Node.js crypto
// We use bcryptjs in the app, so we need to use it here too via dynamic import
async function hashPassword(password) {
  const { default: bcrypt } = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

async function main() {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      providerAccountId: ADMIN_PROVIDER_ID,
      email: ADMIN_EMAIL,
      fullName: 'Super Admin',
      role: 'ADMIN',
      isPremium: true,
      passwordHash,
    },
    update: {
      role: 'ADMIN',
      isPremium: true,
      passwordHash,
      providerAccountId: ADMIN_PROVIDER_ID,
    },
  });

  console.log(`✓ Admin user ready: ${admin.email} (role: ${admin.role})`);
  console.log(`\nAdmin login details:`);
  console.log(`  URL:      http://localhost:3000/sign-in`);
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`\nChange ADMIN_PASSWORD in .env before production use.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
