import crypto from 'crypto';
import { query } from '@/lib/db-direct';

/** Thrown when a matched local account exists but is disabled. */
export class AccountDisabledError extends Error {
  constructor() {
    super('Account is disabled');
    this.name = 'AccountDisabledError';
  }
}

/** Identity fields as returned by tour-api (single identity source). */
export interface ApiUser {
  id: number | string;
  email: string;
  name?: string | null;
  role?: string | null;
}

/** Payload stored in the invoice session cookie. */
export interface InvoiceSessionPayload {
  userId: string;
  externalId: number;
  email: string;
  name: string;
  role: string | null;
  profileId: string | null;
  profileCode: string | null;
  permissions: string[];
}

function generateCuid() {
  return 'c' + crypto.randomBytes(12).toString('hex');
}

/**
 * Links/refreshes the local `user_accounts` row for a tour-api-authenticated
 * user and resolves their invoice permissions. Identity comes from tour-api;
 * permissions are managed locally. Shared by password login and SSO handoff so
 * both paths behave identically.
 *
 * @throws {AccountDisabledError} when the matched local account is disabled.
 */
export async function resolveInvoiceSession(apiUser: ApiUser): Promise<InvoiceSessionPayload> {
  const externalId = Number(apiUser.id);
  const accountEmail = String(apiUser.email);
  const accountName = apiUser.name || accountEmail;
  const role = apiUser.role || null;

  // Link/refresh the local account (identity from tour-api, permissions local).
  const existing = await query(
    `SELECT id, profileId, isActive FROM user_accounts WHERE externalId = ? OR email = ? LIMIT 1`,
    [externalId, accountEmail]
  );

  let accountId: string;
  let profileId: string | null;
  let localActive = true;

  if (existing.length > 0) {
    accountId = existing[0].id;
    profileId = existing[0].profileId ?? null;
    localActive = !!existing[0].isActive;
    await query(
      `UPDATE user_accounts SET externalId = ?, email = ?, name = ?, role = ?, updatedAt = NOW() WHERE id = ?`,
      [externalId, accountEmail, accountName, role, accountId]
    );
  } else {
    // First login: allow in immediately with NO permissions until an admin
    // assigns a profile.
    accountId = generateCuid();
    profileId = null;
    await query(
      `INSERT INTO user_accounts (id, externalId, email, name, role, profileId, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, NULL, 1, NOW(), NOW())`,
      [accountId, externalId, accountEmail, accountName, role]
    );
  }

  // Invoice-side access gate (independent of tour-api).
  if (!localActive) {
    throw new AccountDisabledError();
  }

  // Resolve permissions from the assigned profile (if any).
  let profileCode: string | null = null;
  let permissions: string[] = [];
  if (profileId) {
    const prof = await query(`SELECT code FROM profiles WHERE id = ? LIMIT 1`, [profileId]);
    profileCode = prof.length > 0 ? prof[0].code : null;
    const perms = await query(
      `SELECT perm.code
       FROM profile_permissions pp
       JOIN permissions perm ON pp.permissionId = perm.id
       WHERE pp.profileId = ?`,
      [profileId]
    );
    permissions = perms.map((p: { code: string }) => p.code);
  }

  return {
    userId: accountId,
    externalId,
    email: accountEmail,
    name: accountName,
    role,
    profileId,
    profileCode,
    permissions,
  };
}
