// Assign the ADMIN profile to an invoice user_accounts row.
//
// Identity is verified by tour-api at login; this script grants invoice-side
// permissions to a bootstrap admin so they can manage other users via the UI.
//
// Usage:
//   node --env-file=.env scripts/assign-admin.mjs                 # all role='admin' accounts with no profile
//   node --env-file=.env scripts/assign-admin.mjs user@email.com  # a specific account
import mariadb from 'mariadb';

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 2,
});

const email = process.argv[2] || null;
let conn;
try {
  conn = await pool.getConnection();

  const admin = await conn.query(`SELECT id FROM profiles WHERE code = 'ADMIN' LIMIT 1`);
  if (admin.length === 0) {
    console.error('ERROR: ADMIN profile not found. Seed profiles first.');
    process.exitCode = 1;
  } else {
    const adminProfileId = admin[0].id;

    const targets = email
      ? await conn.query('SELECT id, email, profileId FROM user_accounts WHERE email = ?', [email])
      : await conn.query(`SELECT id, email, profileId FROM user_accounts WHERE role = 'admin' AND profileId IS NULL`);

    if (targets.length === 0) {
      console.log(JSON.stringify({ assigned: 0, note: email ? `No account with email ${email}` : 'No role=admin accounts without a profile' }));
    } else {
      for (const t of targets) {
        await conn.query('UPDATE user_accounts SET profileId = ?, updatedAt = ? WHERE id = ?', [adminProfileId, new Date(), t.id]);
      }
      const after = await conn.query(
        `SELECT ua.email, ua.role, p.code AS profile FROM user_accounts ua
         LEFT JOIN profiles p ON ua.profileId = p.id
         WHERE ua.id IN (?)`,
        [targets.map(t => t.id)]
      );
      console.log(JSON.stringify({ assigned: targets.length, accounts: after }, null, 2));
    }
  }
} catch (e) {
  console.error('ASSIGN_ERROR:', e.message);
  process.exitCode = 1;
} finally {
  if (conn) conn.release();
  await pool.end();
}
