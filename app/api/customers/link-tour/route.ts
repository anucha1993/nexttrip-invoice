import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import type { PoolConnection } from 'mariadb';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { phoneKey, phonesMatch, emailKey, emailsMatch } from '@/lib/phone';

export const runtime = 'nodejs';

const CUSTOMER_COLS = `id, code, name, taxId, email, phone, fax, customerFrom, socialId,
  address, source, contactName, contactPhone, notes, isActive, externalId, externalSource`;

function generateCuid() {
  return 'c' + crypto.randomBytes(12).toString('hex');
}

async function generateCustomerCode(conn: PoolConnection): Promise<string> {
  const rows = await conn.query(
    `SELECT code FROM customers WHERE code LIKE 'CUS%' ORDER BY code DESC LIMIT 1`
  );
  if (rows.length === 0) return 'CUS0001';
  const numPart = parseInt(String(rows[0].code).replace('CUS', ''), 10) || 0;
  return `CUS${(numPart + 1).toString().padStart(4, '0')}`;
}

async function fetchCustomer(conn: PoolConnection, id: string) {
  const rows = await conn.query(`SELECT ${CUSTOMER_COLS} FROM customers WHERE id = ?`, [id]);
  if (!rows.length) return null;
  return { ...rows[0], isActive: !!rows[0].isActive };
}

// ---------------------------------------------------------------------------
// POST /api/customers/link-tour
// Pulls a tour-api person into the invoice as a billing customer, linking it
// via (externalSource, externalId).
//   * customerId provided  -> UPDATE that customer + (re)link  ("Update")
//   * no customerId         -> de-dupe then create-or-link     ("Add")
// Body: { customerId?, externalSource, externalId, name, email?, phone? }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  let conn;
  try {
    await requireAuth();

    const body = await request.json();
    const externalSource = body.externalSource === 'booking' ? 'booking' : body.externalSource === 'member' ? 'member' : null;
    const externalId = Number(body.externalId);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;
    const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null;
    const customerId = typeof body.customerId === 'string' && body.customerId ? body.customerId : null;

    if (!externalSource || !Number.isInteger(externalId) || externalId <= 0) {
      return NextResponse.json({ error: 'externalSource (member|booking) and externalId are required' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    conn = await pool.getConnection();
    const now = new Date();

    // --- Update an explicitly chosen customer (the "Update" action) ---
    if (customerId) {
      const target = await fetchCustomer(conn, customerId);
      if (!target) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
      await conn.query(
        `UPDATE customers
           SET name = ?, email = COALESCE(?, email), phone = COALESCE(?, phone),
               externalId = ?, externalSource = ?, updatedAt = ?
         WHERE id = ?`,
        [name, email, phone, externalId, externalSource, now, customerId]
      );
      return NextResponse.json(await fetchCustomer(conn, customerId));
    }

    // --- Create / link (the "Add" action) ---
    // 1) already linked to this exact tour record?
    const linkedRows = await conn.query(
      `SELECT ${CUSTOMER_COLS} FROM customers WHERE externalSource = ? AND externalId = ? LIMIT 1`,
      [externalSource, externalId]
    );
    if (linkedRows.length > 0) {
      return NextResponse.json({ ...linkedRows[0], isActive: !!linkedRows[0].isActive });
    }

    // 2) de-dupe by email / normalized phone, then link the existing record
    const eKey = emailKey(email);
    const pKey = phoneKey(phone);
    if (eKey || pKey) {
      const where: string[] = [];
      const params: string[] = [];
      if (eKey) {
        where.push(`LOWER(email) = ?`);
        params.push(eKey);
      }
      if (pKey) {
        where.push(`REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '') LIKE ?`);
        params.push(`%${pKey}`);
      }
      const candidates = await conn.query(
        `SELECT ${CUSTOMER_COLS} FROM customers WHERE ${where.join(' OR ')} LIMIT 50`,
        params
      );
      const dup = (Array.isArray(candidates) ? candidates : []).find(
        (c: { email: string | null; phone: string | null }) =>
          (eKey && emailsMatch(c.email, email)) || (pKey && phonesMatch(c.phone, phone))
      );
      if (dup) {
        await conn.query(
          `UPDATE customers
             SET email = COALESCE(email, ?), phone = COALESCE(phone, ?),
                 externalId = ?, externalSource = ?, updatedAt = ?
           WHERE id = ?`,
          [email, phone, externalId, externalSource, now, dup.id]
        );
        return NextResponse.json(await fetchCustomer(conn, dup.id));
      }
    }

    // 3) create a fresh customer linked to the tour record
    const id = generateCuid();
    const code = await generateCustomerCode(conn);
    const source = externalSource === 'booking' ? 'booking' : 'other';
    await conn.query(
      `INSERT INTO customers
         (id, code, name, email, phone, source, externalId, externalSource, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, code, name, email, phone, source, externalId, externalSource, true, now, now]
    );
    return NextResponse.json(await fetchCustomer(conn, id), { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error linking tour customer:', message);
    return NextResponse.json({ error: 'Failed to link tour customer', details: message }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
