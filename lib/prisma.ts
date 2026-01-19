import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import mariadb from 'mariadb';

// Create adapter with database config
const adapter = new PrismaMariaDb({
  host: '103.80.48.25',
  port: 3306,
  user: 'mailfore_nexttrip_invoice',
  password: 'G2pvPm5acsB*o_z0',
  database: 'nexttrip_invoice',
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
