import path from 'node:path';
import { defineConfig } from 'prisma/config';

const DATABASE_URL = "mysql://mailfore_nexttrip_invoice:G2pvPm5acsB*o_z0@103.80.48.25:3306/nexttrip_invoice";

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: DATABASE_URL,
  },
});
