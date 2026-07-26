import { NextResponse } from 'next/server';
import { fetchWholesalers } from '@/lib/services/tour-api';

// GET - List all active wholesalers from tour-api
export async function GET() {
  try {
    const wholesales = await fetchWholesalers();
    return NextResponse.json(wholesales);
  } catch (error) {
    console.error('Error fetching wholesales from tour-api:', error);
    return NextResponse.json([]);
  }
}
