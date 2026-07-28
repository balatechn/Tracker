import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getEntityManagers(req: Request, res: Response) {
  try {
    const managers = await prisma.entityManager.findMany({ orderBy: { entityName: 'asc' } });
    res.json(managers);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch entity managers' });
  }
}

export async function createEntityManager(req: Request, res: Response) {
  try {
    const { entityName, managerName, managerEmail } = req.body;
    if (!entityName || !managerName || !managerEmail) {
      res.status(400).json({ error: 'entityName, managerName, managerEmail are required' });
      return;
    }
    const em = await prisma.entityManager.create({ data: { entityName, managerName, managerEmail } });
    res.status(201).json(em);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      res.status(409).json({ error: 'Entity already exists' });
      return;
    }
    console.error(e);
    res.status(500).json({ error: 'Failed to create entity manager' });
  }
}

export async function updateEntityManager(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const existing = await prisma.entityManager.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
    const { entityName, managerName, managerEmail } = req.body;
    const em = await prisma.entityManager.update({
      where: { id },
      data: {
        entityName: entityName ?? existing.entityName,
        managerName: managerName ?? existing.managerName,
        managerEmail: managerEmail ?? existing.managerEmail,
      },
    });
    res.json(em);
  } catch (e: any) {
    if (e?.code === 'P2002') { res.status(409).json({ error: 'Entity name already used' }); return; }
    console.error(e);
    res.status(500).json({ error: 'Failed to update entity manager' });
  }
}

export async function deleteEntityManager(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const existing = await prisma.entityManager.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
    await prisma.entityManager.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete entity manager' });
  }
}
