import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'your-secret-key-min-32-chars-long');

export const AUTH_COOKIE_NAME = 'auth-token';
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false, // Allow HTTP for development
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
};

export async function createToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) return null;

  return await verifyToken(token);
}

export async function setSession(payload: any) {
  const token = await createToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
}

/**
 * Sets the invoice session cookie directly on a NextResponse (e.g. a redirect).
 * Use this when returning a custom response, since cookies() from next/headers
 * is not merged into a manually-constructed NextResponse.
 */
export async function setSessionCookie(response: NextResponse, payload: any) {
  const token = await createToken(payload);
  response.cookies.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
  return response;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
