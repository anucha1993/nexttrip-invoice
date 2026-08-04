// lib/quotation-share-token.ts
// Signed, stateless tokens for sharing a quotation PDF via a public link (no login
// required) that expires after a set duration (default 7 days) — used by the
// "สร้างลิงก์ PDF" button on the Quotation tab. Uses the same JWT secret/library
// (jose) as the login session in lib/auth.ts, but a distinct `purpose` claim so a
// share link can never be mistaken for / substituted with a login session token.

import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'your-secret-key-min-32-chars-long');

const PURPOSE = 'quotation-pdf-share';

/** Create a signed share token for one quotation's PDF, valid for `expiresIn` (default 7 days). */
export async function createQuotationShareToken(
  quotationId: number,
  expiresIn: string = '7d'
): Promise<string> {
  return await new SignJWT({ purpose: PURPOSE, quotationId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/** Verify a share token belongs to (and is not expired for) the given quotation. */
export async function verifyQuotationShareToken(token: string, quotationId: number): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.purpose === PURPOSE && Number(payload.quotationId) === quotationId;
  } catch {
    return false;
  }
}
