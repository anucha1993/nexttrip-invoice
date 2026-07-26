import mariadb from 'mariadb';
import { dbConfig } from './db-config';

const pool = mariadb.createPool({
  ...dbConfig,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
});

export default pool;
