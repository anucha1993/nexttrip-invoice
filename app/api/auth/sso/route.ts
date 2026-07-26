import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/auth';
import { resolveInvoiceSession, AccountDisabledError } from '@/lib/account-session';

export const runtime = 'nodejs';

/**
 * Resolve the app's PUBLIC origin from proxy headers. Behind Plesk/nginx the
 * Node server binds to 0.0.0.0:3002, and `request.nextUrl.origin` can report
 * that internal address — which the browser cannot reach. Prefer the forwarded
 * Host/Proto (falling back to the raw Host header, then nextUrl.origin in dev).
 */
function publicOrigin(request: NextRequest): string {
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '')
    .split(',')[0]
    .trim();
  if (!host || host.startsWith('0.0.0.0')) {
    return request.nextUrl.origin;
  }
  const proto =
    (request.headers.get('x-forwarded-proto') || '').split(',')[0].trim() ||
    (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/**
 * SSO handoff from tour-backend (admin CRM). The admin posts its tour-api
 * Sanctum bearer token here; we verify it against tour-api (the shared identity
 * source), then link/refresh the local account and issue the invoice session
 * cookie — no second login required.
 *
 * The token is verified server-side and never stored. Run behind HTTPS in
 * production so the bearer token is not exposed in transit. The redirect target
 * is a fixed internal path (no open-redirect from user input).
 */
export async function POST(request: NextRequest) {
  const origin = publicOrigin(request);
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}`, origin), 303);

  // 1) Extract the tour-api bearer token (form POST, JSON, or Authorization header).
  let token: string | null = null;
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const body = await request.json();
      token = typeof body?.token === 'string' ? body.token : null;
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const form = await request.formData();
      const value = form.get('token');
      token = typeof value === 'string' ? value : null;
    }
  } catch {
    token = null;
  }
  if (!token) {
    const authHeader = request.headers.get('authorization') || '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.slice(7).trim();
    }
  }
  if (!token) return fail('sso_missing');

  // 2) Verify the token against tour-api (authoritative identity source).
  const base = process.env.TOUR_API_URL;
  if (!base) {
    console.error('SSO: TOUR_API_URL is not configured');
    return fail('sso_config');
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(`${base.replace(/\/$/, '')}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    console.error('SSO: cannot reach tour-api', e);
    return fail('sso_unavailable');
  }

  if (!apiRes.ok) {
    // 401/403 => invalid or expired token.
    return fail('sso_invalid');
  }

  const data = await apiRes.json();
  // tour-api GET /auth/me => { success, data: { id, name, email, role, ... } }
  const apiUser = data?.data;
  if (!apiUser?.id || !apiUser?.email) {
    console.error('SSO: unexpected tour-api /auth/me response shape');
    return fail('sso_shape');
  }

  // 3) Link/refresh the local account and resolve permissions (shared with login).
  let payload;
  try {
    payload = await resolveInvoiceSession(apiUser);
  } catch (e) {
    if (e instanceof AccountDisabledError) return fail('sso_disabled');
    console.error('SSO: failed to resolve invoice session', e);
    return fail('sso_error');
  }

  // 4) Issue the invoice session cookie and land on the dashboard.
  const response = NextResponse.redirect(new URL('/', origin), 303);
  await setSessionCookie(response, payload);
  return response;
}
