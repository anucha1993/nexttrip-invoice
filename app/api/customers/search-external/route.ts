import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { searchTourCustomers } from '@/lib/services/tour-api';
import { phoneKey, phonesMatch, emailKey, emailsMatch } from '@/lib/phone';

export const runtime = 'nodejs';

const CUSTOMER_COLS = `id, code, name, taxId, email, phone, fax, customerFrom, socialId,
  address, source, contactName, contactPhone, notes, isActive, externalId, externalSource`;

interface LocalCustomerRow {
  id: string;
  code: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  fax: string | null;
  customerFrom: string | null;
  socialId: string | null;
  address: string | null;
  source: string | null;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
  isActive: number | boolean;
  externalId: number | null;
  externalSource: string | null;
}

function serializeCustomer(row: LocalCustomerRow) {
  return { ...row, isActive: !!row.isActive };
}

const norm = (v?: string | null) => (v ?? '').trim().toLowerCase();

// ---------------------------------------------------------------------------
// GET /api/customers/search-external?q=...
// Searches tour-api (web members + guest bookings) and annotates every result
// with how it maps to a local invoice customer (linked / matched / none).
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  let conn;
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || searchParams.get('search') || '').trim();
    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const tourResults = await searchTourCustomers(q);
    if (tourResults.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Build a WHERE that finds any local customer possibly matching a result:
    // by explicit external link, by email, or by normalized phone suffix.
    const memberIds = tourResults.filter((r) => r.source === 'member').map((r) => r.externalId);
    const bookingIds = tourResults.filter((r) => r.source === 'booking').map((r) => r.externalId);
    const emails = [...new Set(tourResults.map((r) => emailKey(r.email)).filter(Boolean))];
    const keys = [...new Set(tourResults.map((r) => phoneKey(r.phone)).filter(Boolean))];

    const where: string[] = [];
    const params: (string | number)[] = [];
    if (memberIds.length) {
      where.push(`(externalSource = 'member' AND externalId IN (${memberIds.map(() => '?').join(',')}))`);
      params.push(...memberIds);
    }
    if (bookingIds.length) {
      where.push(`(externalSource = 'booking' AND externalId IN (${bookingIds.map(() => '?').join(',')}))`);
      params.push(...bookingIds);
    }
    if (emails.length) {
      where.push(`LOWER(email) IN (${emails.map(() => '?').join(',')})`);
      params.push(...emails);
    }
    for (const k of keys) {
      // Strip non-digits from the stored phone so "083-086-8988" still matches.
      where.push(`REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '') LIKE ?`);
      params.push(`%${k}`);
    }

    let locals: LocalCustomerRow[] = [];
    if (where.length) {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT ${CUSTOMER_COLS} FROM customers WHERE ${where.join(' OR ')} LIMIT 200`,
        params
      );
      locals = Array.isArray(rows) ? rows : [];
    }

    const results = tourResults.map((r) => {
      // 1) explicit external link  2) email  3) normalized phone
      let local =
        locals.find((l) => l.externalSource === r.source && Number(l.externalId) === r.externalId) || null;
      const linked = !!local;
      if (!local && emailKey(r.email)) {
        local = locals.find((l) => emailsMatch(l.email, r.email)) || null;
      }
      if (!local && phoneKey(r.phone)) {
        local = locals.find((l) => phonesMatch(l.phone, r.phone)) || null;
      }

      if (!local) {
        return { ...r, match: { status: 'none' as const } };
      }

      const nameDiff = !!r.name && norm(local.name) !== norm(r.name);
      const emailDiff = !!emailKey(r.email) && emailKey(local.email) !== emailKey(r.email);
      const phoneDiff = !!phoneKey(r.phone) && phoneKey(local.phone) !== phoneKey(r.phone);

      return {
        ...r,
        match: {
          status: linked ? ('linked' as const) : ('matched' as const),
          customerId: local.id,
          differs: nameDiff || emailDiff || phoneDiff,
          customer: serializeCustomer(local),
        },
      };
    });

    return NextResponse.json({ results });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error searching external customers:', message);
    return NextResponse.json({ error: 'Failed to search tour customers', details: message }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
