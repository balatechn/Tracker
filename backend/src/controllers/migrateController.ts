import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

// One-time migration endpoint: copies data from OLD_DATABASE_URL to current DATABASE_URL
// Remove this file after migration is complete

export async function migrateData(req: Request, res: Response): Promise<void> {
  const secret = req.headers['x-migrate-secret'];
  if (secret !== process.env.MIGRATE_SECRET) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const oldUrl = process.env.OLD_DATABASE_URL;
  if (!oldUrl) {
    res.status(400).json({ error: 'OLD_DATABASE_URL not set' });
    return;
  }

  const newPrisma = new PrismaClient();
  const oldPrisma = new PrismaClient({ datasources: { db: { url: oldUrl } } });

  try {
    // Entries
    const entries = await oldPrisma.entry.findMany();
    let entryCount = 0;
    for (const e of entries) {
      await newPrisma.entry.upsert({ where: { id: e.id }, update: e, create: e });
      entryCount++;
    }

    // Employees
    const employees = await oldPrisma.employee.findMany();
    let empCount = 0;
    for (const emp of employees) {
      await newPrisma.employee.upsert({ where: { id: emp.id }, update: emp, create: emp });
      empCount++;
    }

    // Users
    const users = await oldPrisma.user.findMany();
    let userCount = 0;
    for (const u of users) {
      await newPrisma.user.upsert({ where: { id: u.id }, update: u, create: u });
      userCount++;
    }

    res.json({
      success: true,
      migrated: { entries: entryCount, employees: empCount, users: userCount },
    });
  } catch (err: any) {
    console.error('Migration error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    await oldPrisma.$disconnect();
    await newPrisma.$disconnect();
  }
}
