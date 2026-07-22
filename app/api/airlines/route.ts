import { NextResponse } from 'next/server';
import { fetchAirlines } from '@/lib/services/tour-api';

// GET - List all active airlines from tour-api (transports of type "airline")
export async function GET() {
  try {
    const airlines = await fetchAirlines();
    return NextResponse.json(airlines);
  } catch (error) {
    console.error('Error fetching airlines from tour-api:', error);
    return NextResponse.json([]);
  }
}
