import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import mariadb from 'mariadb';

const pool = mariadb.createPool({
  host: '103.80.48.25',
  port: 3306,
  user: 'mailfore_nexttrip_invoice',
  password: 'G2pvPm5acsB*o_z0',
  database: 'nexttrip_invoice',
  connectionLimit: 5,
});

const adapter = new PrismaMariaDb(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const profiles = await prisma.profile.findMany();
  console.log('Profiles found:', profiles.length);
  console.log(JSON.stringify(profiles, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
