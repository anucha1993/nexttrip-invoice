import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import type { PoolConnection } from 'mariadb';
import pool from '@/lib/db';
import { phoneKey } from '@/lib/phone';

// ---------------------------------------------------------------------------
// Inbound webhook: tour-api calls this when a booking is CONFIRMED.
// It auto-creates a NEW quotation (INBOUND flow). Idempotent on bookingCode.
// Auth: shared secret in the `X-Webhook-Secret` header (must match tour-api).
// ---------------------------------------------------------------------------

interface BookingPayload {
  bookingId?: number | string;
  bookingCode?: string;
  status?: string;
  source?: string | null;
  providerBookingRef?: string | null;
  confirmedAt?: string | null;
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  tour?: {
    tourId?: number | null;
    periodId?: number | null;
    tourCode?: string | null;
    wholesalerTourCode?: string | null;
    title?: string | null;
    durationDays?: number | null;
    durationNights?: number | null;
    wholesalerId?: number | null;
    wholesalerName?: string | null;
    countryId?: number | null;
    countryName?: string | null;
    airlineId?: number | null;
    airlineName?: string | null;
  };
  travel?: {
    departureDate?: string | null;
    returnDate?: string | null;
  };
  pax?: {
    adult?: number;
    adultSingle?: number;
    childBed?: number;
    childNoBed?: number;
    infant?: number;
  };
  prices?: {
    adult?: number;
    single?: number;
    childBed?: number;
    childNoBed?: number;
    infant?: number;
    total?: number;
    currency?: string;
  };
  saleCode?: string | null;
  specialRequest?: string | null;
}

function generateCuid() {
  return 'c' + crypto.randomBytes(12).toString('hex');
}

/** Constant-time comparison that never throws on length mismatch. */
function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function generateCustomerCode(conn: PoolConnection): Promise<string> {
  const rows = await conn.query(
    `SELECT code FROM customers WHERE code LIKE 'CUS%' ORDER BY code DESC LIMIT 1`
  );
  if (rows.length === 0) return 'CUS0001';
  const numPart = parseInt(String(rows[0].code).replace('CUS', ''), 10) || 0;
  return `CUS${(numPart + 1).toString().padStart(4, '0')}`;
}

async function generateQuotationNumber(conn: PoolConnection): Promise<string> {
  const now = new Date();
  const prefix = `QT${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}`;
  const rows = await conn.query(
    `SELECT quotationNumber FROM quotations WHERE quotationNumber LIKE ? ORDER BY quotationNumber DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let next = 1;
  if (rows.length > 0) {
    next = (parseInt(String(rows[0].quotationNumber).slice(-4), 10) || 0) + 1;
  }
  return `${prefix}${next.toString().padStart(4, '0')}`;
}

/** Find an existing customer by email or normalized phone, else create one.
 *  New customers are linked back to the booking via (externalSource, externalId). */
async function findOrCreateCustomer(
  conn: PoolConnection,
  customer: BookingPayload['customer'],
  source: string | null | undefined,
  bookingCode: string,
  bookingId?: number | string | null
): Promise<string> {
  const email = customer?.email?.trim() || null;
  const phone = customer?.phone?.trim() || null;
  const name =
    `${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`.trim() ||
    email ||
    phone ||
    `Booking ${bookingCode}`;

  // Match by email OR normalized phone so "08x..." and stored "66x..." collapse
  // to the same customer instead of creating a duplicate.
  const pKey = phoneKey(phone);
  if (email || pKey) {
    const where: string[] = [];
    const params: string[] = [];
    if (email) {
      where.push('LOWER(email) = ?');
      params.push(email.toLowerCase());
    }
    if (pKey) {
      where.push(`REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '') LIKE ?`);
      params.push(`%${pKey}`);
    }
    const existing = await conn.query(
      `SELECT id FROM customers WHERE ${where.join(' OR ')} LIMIT 1`,
      params
    );
    if (existing.length > 0) return String(existing[0].id);
  }

  const id = generateCuid();
  const code = await generateCustomerCode(conn);
  const now = new Date();
  const extId =
    bookingId != null && Number.isInteger(Number(bookingId)) ? Number(bookingId) : null;
  await conn.query(
    `INSERT INTO customers (id, code, name, email, phone, source, externalId, externalSource, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, code, name, email, phone, source || 'booking', extId, extId ? 'booking' : null, true, now, now]
  );
  return id;
}

interface LineItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function buildItems(payload: BookingPayload): LineItem[] {
  const pax = payload.pax ?? {};
  const prices = payload.prices ?? {};
  const tiers: Array<{ name: string; qty: number; price: number }> = [
    { name: 'ค่าทัวร์ผู้ใหญ่ (พักคู่)', qty: pax.adult ?? 0, price: prices.adult ?? 0 },
    { name: 'ค่าทัวร์ผู้ใหญ่ (พักเดี่ยว)', qty: pax.adultSingle ?? 0, price: prices.single ?? 0 },
    { name: 'ค่าทัวร์เด็ก (มีเตียง)', qty: pax.childBed ?? 0, price: prices.childBed ?? 0 },
    { name: 'ค่าทัวร์เด็ก (ไม่มีเตียง)', qty: pax.childNoBed ?? 0, price: prices.childNoBed ?? 0 },
    { name: 'ค่าทัวร์ทารก', qty: pax.infant ?? 0, price: prices.infant ?? 0 },
  ];

  const items: LineItem[] = tiers
    .filter((t) => t.qty > 0)
    .map((t) => ({
      productName: t.name,
      quantity: t.qty,
      unitPrice: round2(t.price),
      amount: round2(t.qty * t.price),
    }));

  // Fallback: no per-tier data but a total exists -> single line.
  if (items.length === 0) {
    const total = round2(prices.total ?? 0);
    const qty =
      (pax.adult ?? 0) +
        (pax.adultSingle ?? 0) +
        (pax.childBed ?? 0) +
        (pax.childNoBed ?? 0) +
        (pax.infant ?? 0) || 1;
    items.push({
      productName: 'ค่าทัวร์',
      quantity: qty,
      unitPrice: round2(total / qty),
      amount: total,
    });
  }

  return items;
}

export async function POST(request: NextRequest) {
  // 1) Verify shared secret.
  const expected = process.env.INVOICE_WEBHOOK_SECRET || '';
  if (!expected) {
    console.error('❌ booking-confirmed webhook: INVOICE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  const provided = request.headers.get('x-webhook-secret') || '';
  if (!secretsMatch(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: BookingPayload;
  try {
    payload = (await request.json()) as BookingPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const bookingCode = payload.bookingCode?.trim();
  if (!bookingCode) {
    return NextResponse.json({ error: 'bookingCode is required' }, { status: 422 });
  }

  const tourName =
    payload.tour?.title?.trim() ||
    payload.tour?.tourCode?.trim() ||
    payload.tour?.wholesalerTourCode?.trim() ||
    `Booking ${bookingCode}`;

  let conn: PoolConnection | undefined;
  try {
    conn = await pool.getConnection();

    // 2) Idempotency: one quotation per bookingCode.
    const dupe = await conn.query(
      `SELECT id, quotationNumber FROM quotations WHERE bookingCode = ? LIMIT 1`,
      [bookingCode]
    );
    if (dupe.length > 0) {
      return NextResponse.json({
        success: true,
        deduped: true,
        id: Number(dupe[0].id),
        quotationNumber: dupe[0].quotationNumber,
      });
    }

    const items = buildItems(payload);
    const subtotal = round2(items.reduce((sum, it) => sum + it.amount, 0));

    const pax = payload.pax ?? {};
    const paxCount =
      (pax.adult ?? 0) +
      (pax.adultSingle ?? 0) +
      (pax.childBed ?? 0) +
      (pax.childNoBed ?? 0) +
      (pax.infant ?? 0);

    const days = payload.tour?.durationDays ?? null;
    const nights = payload.tour?.durationNights ?? (days !== null ? days - 1 : null);
    const numDays = days !== null ? `${days}D${nights ?? days - 1}N` : null;

    const countryId = payload.tour?.countryId ?? null;
    const airlineId = payload.tour?.airlineId ?? null;
    const wholesaleId = payload.tour?.wholesalerId ?? null;

    const now = new Date();
    const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await conn.beginTransaction();

    const customerId = await findOrCreateCustomer(
      conn,
      payload.customer,
      payload.source,
      bookingCode,
      payload.bookingId
    );
    const quotationNumber = await generateQuotationNumber(conn);

    const notesParts = [
      `Auto-created from booking ${bookingCode}`,
      payload.providerBookingRef ? `Provider ref: ${payload.providerBookingRef}` : null,
      payload.saleCode ? `Sale code: ${payload.saleCode}` : null,
      payload.specialRequest ? `Request: ${payload.specialRequest}` : null,
    ].filter(Boolean);

    const result = await conn.query(
      `INSERT INTO quotations (
        quotationNumber, customerId, tourName, bookingCode, customTourCode,
        countryId, airlineId, wholesaleId, departureDate, returnDate,
        numDays, paxCount, saleId, quotationDate, validUntil,
        depositAmount, fullPaymentAmount,
        subtotal, discountAmount, vatExemptAmount, preTaxAmount, vatAmount,
        grandTotal, withholdingTax, hasWithholdingTax, commission,
        status, paymentStatus, notes, createdById,
        vatMode, preVatAmount, includeVatAmount, netPayable, noCost,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        quotationNumber,
        customerId,
        tourName,
        bookingCode,
        payload.tour?.wholesalerTourCode || null,
        countryId,
        airlineId,
        wholesaleId,
        payload.travel?.departureDate || null,
        payload.travel?.returnDate || null,
        numDays,
        paxCount,
        null, // saleId: booking gives a string sale_code, not a numeric invoice sale id
        now,
        validUntil,
        0, // depositAmount
        subtotal, // fullPaymentAmount
        subtotal, // subtotal
        0, // discountAmount
        0, // vatExemptAmount
        subtotal, // preTaxAmount
        0, // vatAmount
        subtotal, // grandTotal
        0, // withholdingTax
        false, // hasWithholdingTax
        0, // commission
        'NEW',
        'UNPAID',
        notesParts.join('\n'),
        'system',
        'EXCLUDE',
        subtotal, // preVatAmount
        subtotal, // includeVatAmount
        subtotal, // netPayable
        false, // noCost
      ]
    );

    const quotationId = Number(result.insertId);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await conn.query(
        `INSERT INTO quotation_items (
          quotationId, productName, quantity, unitPrice, amount,
          itemType, vatType, hasWithholdingTax, sortOrder, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [quotationId, it.productName, it.quantity, it.unitPrice, it.amount, 'INCOME', 'NO_VAT', false, i]
      );
    }

    await conn.commit();

    return NextResponse.json(
      { success: true, id: quotationId, quotationNumber, customerId },
      { status: 201 }
    );
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {
        /* ignore rollback errors */
      }
    }
    console.error('❌ booking-confirmed webhook failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to create quotation',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
