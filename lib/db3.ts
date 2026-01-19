import mariadb from 'mariadb';

// DB3 - Read-Only Connection (nexttrip_web)
const db3 = mariadb.createPool({
  host: process.env.DB3_HOST || 'localhost',
  port: parseInt(process.env.DB3_PORT || '3306'),
  user: process.env.DB3_USERNAME,
  password: process.env.DB3_PASSWORD,
  database: process.env.DB3_DATABASE,
  connectionLimit: parseInt(process.env.DB3_CONNECTION_LIMIT || '5'),
});

export default db3;
