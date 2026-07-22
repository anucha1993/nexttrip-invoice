import path from 'node:path';
import { defineConfig } from 'prisma/config';
import 'dotenv/config';

const {
  DB_HOST,
  DB_PORT = '3306',
  DB_USERNAME = '',
  DB_PASSWORD = '',
  DB_DATABASE = '',
} = process.env;

const DATABASE_URL = `mysql://${encodeURIComponent(DB_USERNAME)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: DATABASE_URL,
  },
});
