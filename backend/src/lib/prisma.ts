import { PrismaClient } from '@prisma/client';

// Reused across warm serverless invocations so each instance holds a single connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
globalForPrisma.prisma = prisma;
