import mariadb from 'mariadb';

// DB2 - Read-Only Connection (spgcen_web_sync)
const db2 = mariadb.createPool({
  host: process.env.DB2_HOST || 'localhost',
  port: parseInt(process.env.DB2_PORT || '3306'),
  user: process.env.DB2_USER,
  password: process.env.DB2_PASSWORD,
  database: process.env.DB2_NAME,
  connectionLimit: parseInt(process.env.DB2_CONNECTION_LIMIT || '5'),
});

export default db2;
