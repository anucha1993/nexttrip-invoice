import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { dbConfig } from './db-config';

// Create adapter with database config (from .env)
const adapter = new PrismaMariaDb({
  ...dbConfig,
  connectionLimit: 10,
});

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

if (!global.__prisma) {
  global.__prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });
}

export const prisma = global.__prisma;
export default prisma;
