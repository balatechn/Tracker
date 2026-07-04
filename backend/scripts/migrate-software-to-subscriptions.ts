import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HARDWARE_CATEGORIES = new Set([
  'Laptop', 'Desktop', 'Phone/Mobile', 'Tablet', 'Monitor',
  'Printer', 'Scanner', 'Server', 'Networking', 'UPS',
  'Projector', 'Camera', 'Other Hardware',
]);

async function main() {
  // Find all entries that are software/subscription types (not hardware)
  const softwareEntries = await prisma.entry.findMany({
    where: {
      OR: [
        { category: null },
        { category: { notIn: [...HARDWARE_CATEGORIES] } },
      ],
    },
  });

  console.log(`Found ${softwareEntries.length} software/subscription entries to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const entry of softwareEntries) {
    // Check if already migrated (by name)
    const existing = await prisma.subscription.findFirst({
      where: { name: entry.serviceName },
    });

    if (existing) {
      console.log(`  SKIP (exists): ${entry.serviceName}`);
      skipped++;
      continue;
    }

    // Map category to subscription type
    const typeMap: Record<string, string> = {
      'Domain': 'Domain',
      'SAAS': 'SAAS',
      'AMC': 'AMC',
      'Software': 'Software',
      'License': 'License',
      'Microsoft 365': 'Microsoft 365',
      'Microsoft365': 'Microsoft 365',
      'Antivirus': 'Antivirus',
      'Cloud': 'Cloud',
      'Email Service': 'Email Service',
      'Security': 'Security',
      'ERP/CRM': 'ERP/CRM',
    };

    const type = entry.category ? (typeMap[entry.category] ?? 'Other') : 'Other';

    await prisma.subscription.create({
      data: {
        srNo: entry.srNo,
        name: entry.serviceName,
        type,
        billingCompany: entry.billingCompany,
        registrar: entry.vendor,
        expiryDate: entry.expiryDate,
        autoRenewal: entry.autoRenewal,
        owner: entry.owner,
        criticality: entry.criticality,
        lastRenewalDate: entry.lastRenewalDate,
        renewalPeriod: entry.renewalPeriod,
        annualCost: entry.annualCost,
        paymentMethod: entry.paymentMethod,
        invoiceRef: entry.invoiceRef,
        financeEmail: entry.financeEmail,
        adminEmail: entry.adminEmail,
        vendorEmail: entry.vendorEmail,
        remarks: entry.remarks,
      },
    });

    console.log(`  MIGRATED: ${entry.serviceName} → ${type}`);
    migrated++;
  }

  console.log(`\nDone: ${migrated} migrated, ${skipped} skipped`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
