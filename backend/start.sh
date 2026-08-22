#!/bin/sh
set -e

echo "Pushing database schema..."
if [ "$RESET_DB" = "true" ]; then
  echo "RESET_DB=true detected — wiping database..."
  npx prisma db push --force-reset
else
  npx prisma db push --accept-data-loss
fi

echo "Seeding admin user if needed..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log('Admin already exists, skipping.');
    return;
  }
  const hash = await bcrypt.hash('Admin@123', 12);
  await prisma.user.create({ data: { username: 'admin', password: hash } });
  console.log('Seeded: admin / Admin@123');
}

seed()
  .catch(e => { console.error('Seed error:', e.message); })
  .finally(() => prisma.\$disconnect());
"

echo "Starting API server..."
exec node dist/index.js
