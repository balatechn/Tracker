#!/bin/sh
set -e

echo "Pushing database schema..."
npx prisma db push --accept-data-loss

echo "Checking if seeding is needed..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }

  const hash = await bcrypt.hash('Admin@123', 12);
  await prisma.user.create({ data: { username: 'admin', password: hash } });

  const entries = [
    { srNo: 1, serviceName: 'iskytransport.com', category: 'Domain', vendor: 'CloudFlare', expiryDate: new Date('2027-04-28'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High', renewalPeriod: 1, remarks: 'Renewed & Moved Domain to CloudFlare-27-4-2026' },
    { srNo: 2, serviceName: 'nationalconsultingindia.com', category: 'Domain', vendor: 'CloudFlare', expiryDate: new Date('2027-05-17'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High', renewalPeriod: 1, remarks: '17 May 2026 (Renewed)' },
    { srNo: 3, serviceName: 'nationalgroupindia.com', category: 'Domain', vendor: 'GoDaddy.com, LLC', expiryDate: new Date('2026-09-03'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High', renewalPeriod: 1, annualCost: 1617, remarks: 'Renewed & Moved Domain to CloudFlare' },
    { srNo: 4, serviceName: 'nationalresourcesindia.com', category: 'Domain', vendor: 'CloudFlare', expiryDate: new Date('2027-05-17'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High', renewalPeriod: 1, remarks: 'Renewed & Moved Domain to CloudFlare' },
    { srNo: 5, serviceName: 'reinlandautocorp.com', category: 'Domain', vendor: 'CloudFlare', expiryDate: new Date('2027-05-17'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High', renewalPeriod: 1, remarks: 'Renewed & Moved Domain to CloudFlare' },
    { srNo: 6, serviceName: 'spa.com', category: 'Domain', vendor: 'CloudFlare', expiryDate: new Date('2026-06-18'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'Low' },
    { srNo: 7, serviceName: 'pana.com', category: 'Domain', vendor: 'CloudFlare', expiryDate: new Date('2026-06-18'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'Low' },
    { srNo: 8, serviceName: 'nationalinfrabuild.com', category: 'Domain', expiryDate: new Date('2030-11-01'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High' },
    { srNo: 9, serviceName: 'Tacitine FireWall', category: 'AMC', vendor: 'Tacitine', autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High' },
    { srNo: 10, serviceName: 'Microsoft 365 Mail (Reinland)', category: 'Microsoft365', billingCompany: 'Reinland', vendor: 'PaceInfo', autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High' },
    { srNo: 11, serviceName: 'Microsoft 365 Mail (National Consulting)', category: 'Microsoft365', billingCompany: 'National Consulting', vendor: 'PaceInfo', autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High' },
    { srNo: 12, serviceName: 'Microsoft Business App (Word, Excel, PPT)', category: 'Microsoft365', vendor: 'PaceInfo', autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High' },
    { srNo: 13, serviceName: 'Sophos XDR', category: 'Antivirus', vendor: 'Rochana', expiryDate: new Date('2026-06-04'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High', lastRenewalDate: new Date('2026-04-28'), annualCost: 129431, remarks: 'Anti Virus Software' },
  ];

  for (const entry of entries) {
    await prisma.entry.create({ data: entry });
  }

  console.log('Seeded: admin / Admin@123 + 13 entries');
}

seed()
  .catch(e => { console.error('Seed error:', e.message); })
  .finally(() => prisma.\$disconnect());
"

echo "Starting API server..."
exec node dist/index.js
