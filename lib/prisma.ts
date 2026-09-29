import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { dbConfig } from './db-config';

// Create adapter with database config (from .env)
// NOTE: mariadb's pool eagerly opens `connectionLimit` idle connections at
// startup (fixed-pool behavior) — keep this low since the remote DB user
// has a hard `max_user_connections` cap shared by every environment (dev +
// production) hitting it.
const adapter = new PrismaMariaDb({
  ...dbConfig,
  connectionLimit: 3,
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
