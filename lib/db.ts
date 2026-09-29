import mariadb from 'mariadb';
import { dbConfig } from './db-config';

// IMPORTANT: In Next.js dev mode, this module is re-evaluated on every Fast
// Refresh / file edit. Without caching the pool on `globalThis`, each reload
// would create a brand-new pool (10 more connections) while the previous
// pool's connections stay open (never closed) — silently exhausting the
// remote MySQL host's connection limit over a long dev session and causing
// unrelated requests (e.g. inbound webhooks) to hang/timeout waiting for a
// connection. Caching on `globalThis` survives module re-evaluation so only
// ONE pool (and its connectionLimit) ever exists per running process.
const globalForDb = globalThis as unknown as { __dbPool?: mariadb.Pool };

// NOTE: mariadb's pool eagerly opens `connectionLimit` idle connections at
// startup by default (fixed-pool behavior) — this is a permanent footprint
// per running process, NOT scaled to actual traffic. Keep this low since the
// remote DB user has a hard `max_user_connections` cap shared by every
// environment (dev + production) hitting it.
const pool =
  globalForDb.__dbPool ??
  mariadb.createPool({
    ...dbConfig,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '3', 10),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__dbPool = pool;
}

export default pool;
