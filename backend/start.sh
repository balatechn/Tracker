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
  const existing = await prisma.user.findFirst({ where: { username: 'admin' } });
  if (existing) {
    if (existing.role !== 'admin') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'admin' } });
      console.log('Fixed admin role to admin.');
    } else {
      console.log('Admin already exists, skipping.');
    }
    return;
  }
  const hash = await bcrypt.hash('Admin@123', 12);
  await prisma.user.create({ data: { username: 'admin', password: hash, role: 'admin' } });
  console.log('Seeded: admin / Admin@123');
}

seed()
  .catch(e => { console.error('Seed error:', e.message); })
  .finally(() => prisma.\$disconnect());
"

echo "Cleaning up legacy Rainland/NCPL data..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function cleanup() {
  const delEmp = await prisma.employee.deleteMany({
    where: { OR: [
      { email: { contains: 'rainlandautocorp.com' } },
      { company: { in: ['RAINLAND', 'Rainland', 'NCPL', 'National Consulting Private Limited'] } },
    ]},
  });
  const delAsset = await prisma.hardwareAsset.updateMany({
    where: { billingCompany: { in: ['RAINLAND', 'Rainland', 'NCPL'] } },
    data: { billingCompany: null },
  });
  if (delEmp.count > 0) console.log('Removed ' + delEmp.count + ' legacy employees.');
  if (delAsset.count > 0) console.log('Cleared billingCompany on ' + delAsset.count + ' assets.');
}
cleanup().catch(e => console.error('Cleanup error:', e.message)).finally(() => prisma.\$disconnect());
"

echo "Starting API server..."
exec node dist/index.js
