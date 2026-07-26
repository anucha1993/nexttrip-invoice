import { NextRequest, NextResponse } from 'next/server';
import { setSession } from '@/lib/auth';
import { resolveInvoiceSession, AccountDisabledError } from '@/lib/account-session';

export const runtime = 'nodejs';

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

    // 2) Link/refresh the local account and resolve permissions.
    let payload;
    try {
      payload = await resolveInvoiceSession(apiUser);
    } catch (e) {
      if (e instanceof AccountDisabledError) {
        return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
      }
      throw e;
    }

    // 3) Issue the invoice session.
    await setSession(payload);

    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        profileCode: payload.profileCode,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
