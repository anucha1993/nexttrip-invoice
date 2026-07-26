// ============================================================================
// Phone helpers — shared between the customer search / tour-api link routes.
// ----------------------------------------------------------------------------
// tour-api web_members store phones as MSISDN "66xxxxxxxxx", while invoice
// customers are typed by staff as "08x-xxx-xxxx" / "0xxxxxxxxx". To match the
// two we reduce both to a comparable key: digits only, drop the Thai "0" trunk
// prefix or the "66" country code, keep the last 9 significant digits.
// ============================================================================

/** Comparable phone key (last 9 digits, no trunk/country prefix). '' if empty. */
export function phoneKey(phone?: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  let s = digits;
  if (s.startsWith('66')) s = s.slice(2);
  else if (s.startsWith('0')) s = s.slice(1);
  return s.slice(-9);
}

/** True when two phone numbers refer to the same line (after normalization). */
export function phonesMatch(a?: string | null, b?: string | null): boolean {
  const ka = phoneKey(a);
  const kb = phoneKey(b);
  return ka !== '' && ka === kb;
}

/** Lower-cased, trimmed email key. '' if empty. */
export function emailKey(email?: string | null): string {
  return (email ?? '').trim().toLowerCase();
}

/** True when two emails are the same (case-insensitive). */
export function emailsMatch(a?: string | null, b?: string | null): boolean {
  const ka = emailKey(a);
  const kb = emailKey(b);
  return ka !== '' && ka === kb;
}
