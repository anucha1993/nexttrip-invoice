import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db-direct';
import { setSession } from '@/lib/auth';

export const runtime = 'nodejs';

function generateCuid() {
  return 'c' + crypto.randomBytes(12).toString('hex');
}

/**
 * Login is delegated to tour-api (single identity source). On success we
 * link/refresh a local `user_accounts` row (permissions are managed here,
 * independently from tour-api) and issue the invoice session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const base = process.env.TOUR_API_URL;
    if (!base) {
      console.error('Login: TOUR_API_URL is not configured');
      return NextResponse.json({ error: 'Auth service not configured' }, { status: 500 });
    }

    // 1) Verify credentials against tour-api.
    let apiRes: Response;
    try {
      apiRes = await fetch(`${base.replace(/\/$/, '')}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
    } catch (e) {
      console.error('Login: cannot reach tour-api', e);
      return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 });
    }

    if (apiRes.status === 401 || apiRes.status === 422) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    if (!apiRes.ok) {
      const text = await apiRes.text().catch(() => '');
      console.error('Login: tour-api error', apiRes.status, text.slice(0, 300));
      return NextResponse.json({ error: 'Auth service error' }, { status: 502 });
    }

    const data = await apiRes.json();
    const apiUser = data?.data?.user;
    if (!apiUser?.id || !apiUser?.email) {
      console.error('Login: unexpected tour-api response shape');
      return NextResponse.json({ error: 'Unexpected auth response' }, { status: 502 });
    }

    const externalId = Number(apiUser.id);
    const accountEmail = String(apiUser.email);
    const accountName = apiUser.name || accountEmail;
    const role = apiUser.role || null;

    // 2) Link/refresh the local account (identity from tour-api, permissions local).
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

    // 3) Invoice-side access gate (independent of tour-api).
    if (!localActive) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    }

    // 4) Resolve permissions from the assigned profile (if any).
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

    // 5) Issue the invoice session.
    await setSession({
      userId: accountId,
      externalId,
      email: accountEmail,
      name: accountName,
      role,
      profileId,
      profileCode,
      permissions,
    });

    return NextResponse.json({
      success: true,
      user: { id: accountId, email: accountEmail, name: accountName, role, profileCode },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
