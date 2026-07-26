// scripts/run-migration.mjs
// Usage: node scripts/run-migration.mjs <migration-file>
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mariadb from 'mariadb';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-migration.mjs <sql-file>');
  process.exit(1);
}
const abs = path.resolve(file);
let sql = fs.readFileSync(abs, 'utf8');
// strip -- line comments so they don't confuse the splitter
sql = sql
  .split(/\r?\n/)
  .map((line) => line.replace(/--.*$/, ''))
  .join('\n');

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 2,
  multipleStatements: true,
});

// Split by ';' at end of line — naive but works for this migration
const statements = sql
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const conn = await pool.getConnection();
try {
  for (const stmt of statements) {
    if (!stmt) continue;
    process.stdout.write(`▶ ${stmt.slice(0, 80).replace(/\s+/g, ' ')}...\n`);
    try {
      await conn.query(stmt);
      console.log('  ✓ OK');
    } catch (e) {
      // Ignore "duplicate column" / "duplicate key" so migration is re-runnable
      const msg = e.message || String(e);
      if (/Duplicate column|Duplicate key name|already exists/i.test(msg)) {
        console.log(`  ⚠ skipped: ${msg}`);
      } else {
        console.error(`  ✗ ${msg}`);
        throw e;
      }
    }
  }
  console.log('\n✅ MIGRATION DONE');
} finally {
  conn.release();
  await pool.end();
}
