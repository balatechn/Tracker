import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function listCredentials(_req: Request, res: Response) {
  const creds = await prisma.credential.findMany({ orderBy: [{ srNo: 'asc' }, { id: 'asc' }] });
  res.json(creds);
}

export async function createCredential(req: Request, res: Response) {
  const data = req.body;
  if (data.lastUpdated) data.lastUpdated = new Date(data.lastUpdated);
  const cred = await prisma.credential.create({ data });
  res.status(201).json(cred);
}

export async function updateCredential(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  const data = req.body;
  if (data.lastUpdated) data.lastUpdated = new Date(data.lastUpdated);
  const cred = await prisma.credential.update({ where: { id }, data });
  res.json(cred);
}

export async function deleteCredential(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  await prisma.credential.delete({ where: { id } });
  res.json({ message: 'Deleted' });
}
