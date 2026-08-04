// app/api/quotations/[id]/tour-info/route.ts
// PATCH - Update only the tour info fields of a quotation.
// Used by the Invoice edit page (/invoices/[id]/edit) so staff can fix tour
// details (tour code, country, airline, wholesaler, sale, num days) without
// having to leave the Invoice screen — this data actually lives on the
// linked quotation, not on the invoice itself.

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    const body = await request.json();
    conn = await pool.getConnection();

    const countryId = body.countryId !== undefined && body.countryId !== '' && body.countryId !== null
      ? Number(body.countryId) : null;
    const airlineId = body.airlineId !== undefined && body.airlineId !== '' && body.airlineId !== null
      ? Number(body.airlineId) : null;
    const wholesaleId = body.wholesaleId !== undefined && body.wholesaleId !== '' && body.wholesaleId !== null
      ? Number(body.wholesaleId) : null;
    const saleId = body.saleId !== undefined && body.saleId !== '' && body.saleId !== null
      ? Number(body.saleId) : null;

    const existing = await conn.query('SELECT id FROM quotations WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    await conn.query(
      `UPDATE quotations SET
        tourName = ?,
        ntCode = ?,
        customTourCode = ?,
        tourType = ?,
        countryId = ?,
        airlineId = ?,
        wholesaleId = ?,
        saleId = ?,
        numDays = ?,
        updatedAt = NOW()
      WHERE id = ?`,
      [
        body.tourName || '',
        body.ntCode || null,
        body.customTourCode || null,
        ['NORMAL', 'PROMOTION', 'FLASH_SALE'].includes(body.tourType) ? body.tourType : 'NORMAL',
        countryId,
        airlineId,
        wholesaleId,
        saleId,
        body.numDays || null,
        id,
      ]
    );

    const updated = await conn.query(
      `SELECT id, tourName, ntCode, customTourCode, tourType, countryId, airlineId, wholesaleId, saleId, numDays
       FROM quotations WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ quotation: updated[0] });
  } catch (error: any) {
    console.error('Error updating quotation tour info:', error);
    return NextResponse.json(
      { error: 'Failed to update tour info', details: error.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
