import { NextRequest, NextResponse } from 'next/server';
import db2 from '@/lib/db2';

interface TourPeriod {
  id: number;
  startDate: string;
  endDate: string;
  price1: number;
  price2: number;
  price3: number;
  price4: number;
}

// GET - List tours from DB2 (read-only)
// Based on old system: tb_tour, tb_tour_period, tb_wholesale, tb_country
export async function GET(request: NextRequest) {
  let conn;
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const tourId = searchParams.get('tourId');
    const limit = parseInt(searchParams.get('limit') || '50');

    conn = await db2.getConnection();

    // If tourId is provided, return periods for that tour
    if (tourId) {
      const periodsQuery = `
        SELECT DISTINCT
          id,
          start_date as startDate,
          end_date as endDate,
          price1,
          price2,
          price3,
          price4
        FROM tb_tour_period
        WHERE tour_id = ?
          AND start_date >= CURDATE()
        GROUP BY start_date, end_date, price1, price2, price3, price4
        ORDER BY start_date ASC
      `;
      const periodsRows = await conn.query(periodsQuery, [tourId]);
      
      // Helper function to format date as YYYY-MM-DD in local timezone
      const formatLocalDate = (date: unknown): string | null => {
        if (!date) return null;
        if (date instanceof Date) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        // If already string, return as-is
        if (typeof date === 'string') {
          return date.split('T')[0];
        }
        return null;
      };

      const periods = periodsRows.map((row: Record<string, unknown>) => ({
        id: row.id ? Number(row.id) : null,
        startDate: formatLocalDate(row.startDate),
        endDate: formatLocalDate(row.endDate),
        price1: row.price1 ? Number(row.price1) : 0,
        price2: row.price2 ? Number(row.price2) : 0,
        price3: row.price3 ? Number(row.price3) : 0,
        price4: row.price4 ? Number(row.price4) : 0,
      }));

      return NextResponse.json(periods);
    }

    // Query based on old system structure (apiTourController.php)
    // Tables: tb_tour, tb_tour_period, tb_wholesale, tb_country, tb_airline
    let query = `
      SELECT DISTINCT
        t.id,
        t.code as tourCode,
        t.code1 as tourCode1,
        t.name as tourName,
        t.country_id as countryId,
        t.airline_id as airlineId,
        t.wholesale_id as wholesaleId,
        t.num_day as numDays,
        w.wholesale_name_th as wholesaleName
      FROM tb_tour t
      LEFT JOIN tb_wholesale w ON t.wholesale_id = w.id
      WHERE t.status = 'on'
    `;
    const params: (string | number)[] = [];

    if (search) {
      query += ` AND (t.code LIKE ? OR t.code1 LIKE ? OR t.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Show all tours (not only future dates) for flexibility
    query += ` ORDER BY t.id DESC LIMIT ?`;
    params.push(limit);

    const rows = await conn.query(query, params);

    // Convert BigInt to Number and parse country_id (stored as JSON like ["216"])
    const tours = rows.map((row: Record<string, unknown>) => {
      // Parse country_id from JSON string like ["216"] or "216"
      let countryId = null;
      if (row.countryId) {
        try {
          const countryIdStr = String(row.countryId).replace(/[\[\]"]/g, '').split(',')[0].trim();
          countryId = countryIdStr ? parseInt(countryIdStr) : null;
        } catch {
          countryId = null;
        }
      }

      return {
        id: row.id ? Number(row.id) : null,
        tourCode: row.tourCode || '',
        tourCode1: row.tourCode1 || null,
        tourName: row.tourName || '',
        countryId,
        airlineId: row.airlineId ? Number(row.airlineId) : null,
        wholesaleId: row.wholesaleId ? Number(row.wholesaleId) : null,
        wholesaleName: row.wholesaleName || null,
        numDays: row.numDays || null,
      };
    });

    return NextResponse.json(tours);
  } catch (error) {
    console.error('Error fetching tours from DB2:', error);
    // Return empty array if DB2 is not accessible
    return NextResponse.json([]);
  } finally {
    if (conn) conn.release();
  }
}
