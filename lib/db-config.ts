// Central database configuration, read from environment variables (.env).
// Do NOT hardcode credentials here — set them in .env:
//   DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
export const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};
