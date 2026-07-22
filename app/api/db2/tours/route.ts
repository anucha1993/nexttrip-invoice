import { NextRequest, NextResponse } from 'next/server';
import { fetchTours, fetchTourPeriods } from '@/lib/services/tour-api';

// GET - List tours (or periods for a tour) from the tour-api local catalog.
// Kept at this path for backward compatibility with the quotation form.
//   ?search=&limit=  -> tour list
//   ?tourId=         -> periods for the tour (price tiers mapped to price1-4)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const tourId = searchParams.get('tourId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // If tourId is provided, return periods for that tour
    if (tourId) {
      const periods = await fetchTourPeriods(parseInt(tourId, 10));
      return NextResponse.json(periods);
    }

    const tours = await fetchTours(search, limit);
    return NextResponse.json(tours);
  } catch (error) {
    console.error('Error fetching tours from tour-api:', error);
    // Return empty array if tour-api is not accessible
    return NextResponse.json([]);
  }
}
