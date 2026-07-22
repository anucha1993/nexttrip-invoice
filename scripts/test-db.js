require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const mariadb = require('mariadb');

async function test() {
  const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectionLimit: 10,
    acquireTimeout: 30000,
    connectTimeout: 30000,
  });

  // Test raw connection first
  console.log('Testing raw connection...');
  try {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT COUNT(*) as cnt FROM profiles');
    console.log('Raw query result:', rows);
    conn.release();
  } catch (e) {
    console.error('Raw connection error:', e.message);
  }

  const adapter = new PrismaMariaDb(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Has profile?', 'profile' in prisma);

  try {
    const profiles = await prisma.profile.findMany();
    console.log('Profiles:', profiles.length);
    console.log(JSON.stringify(profiles, null, 2));
  } catch (error) {
    console.error('Prisma Error:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
