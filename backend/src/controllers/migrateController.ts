import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HARDWARE_CATEGORIES = new Set([
  'Laptop', 'Desktop', 'Phone/Mobile', 'Tablet', 'Monitor',
  'Printer', 'Scanner', 'Server', 'Networking', 'UPS',
  'Projector', 'Camera', 'Other Hardware',
]);

const TYPE_MAP: Record<string, string> = {
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

export async function migrateSoftwareToSubscriptions(_req: Request, res: Response): Promise<void> {
  const softwareEntries = await prisma.entry.findMany({
    where: {
      OR: [
        { category: null },
        { category: { notIn: [...HARDWARE_CATEGORIES] } },
      ],
    },
  });

  let migrated = 0;
  let skipped = 0;
  const results: string[] = [];

  for (const entry of softwareEntries) {
    const existing = await prisma.subscription.findFirst({
      where: { name: entry.serviceName },
    });

    if (existing) {
      skipped++;
      results.push(`SKIP: ${entry.serviceName}`);
      continue;
    }

    const type = entry.category ? (TYPE_MAP[entry.category] ?? 'Other') : 'Other';

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

    migrated++;
    results.push(`MIGRATED: ${entry.serviceName} → ${type}`);
  }

  res.json({ migrated, skipped, total: softwareEntries.length, results });
}
