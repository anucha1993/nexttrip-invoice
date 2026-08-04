import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { notifyBookingInvoiceStatus, TourApiError } from '@/lib/services/tour-api';

// ---------------------------------------------------------------------------
// POST /api/quotations/[id]/convert-from-booking
// -----------------------------------------------------------------------------
// Confirms an auto-created "from booking" quotation that's been reviewed by
// staff. Flips bookingSyncStatus PENDING_REVIEW -> CONVERTED and notifies
// tour-api (best-effort) with the quotation number so the booking admin can
// display it. Does NOT change the quotation's normal `status`/`paymentStatus`
// — those keep meaning what they already mean elsewhere in the app.
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    conn = await pool.getConnection();

    const rows = await conn.query(
      `SELECT id, quotationNumber, bookingId, bookingSyncStatus FROM quotations WHERE id = ? LIMIT 1`,
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }
    const quotation = rows[0];

    if (quotation.bookingId == null) {
      return NextResponse.json(
        { error: 'Quotation was not created from a booking' },
        { status: 422 }
      );
    }
    if (quotation.bookingSyncStatus === 'CONVERTED') {
      return NextResponse.json({
        success: true,
        alreadyConverted: true,
        quotationNumber: quotation.quotationNumber,
      });
    }

    await conn.query(
      `UPDATE quotations SET bookingSyncStatus = 'CONVERTED', bookingConvertedAt = NOW(), updatedAt = NOW() WHERE id = ?`,
      [id]
    );

    let notified = true;
    let notifyError: string | undefined;
    try {
      await notifyBookingInvoiceStatus({
        bookingId: Number(quotation.bookingId),
        status: 'quotation_created',
        quotationId: Number(quotation.id),
        quotationNumber: quotation.quotationNumber,
      });
    } catch (err) {
      // Never fail the convert action on a callback error — tour-api may be
      // temporarily unreachable; the quotation is already usable locally.
      notified = false;
      notifyError = err instanceof TourApiError ? err.message : String(err);
      console.error('⚠️ convert-from-booking: tour-api callback failed:', notifyError);
    }

    return NextResponse.json({
      success: true,
      quotationNumber: quotation.quotationNumber,
      notified,
      notifyError,
    });
  } catch (error) {
    console.error('❌ convert-from-booking failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to convert booking quotation',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
