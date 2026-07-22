import { NextResponse } from 'next/server';
import { fetchCountries } from '@/lib/services/tour-api';

// GET - List all active countries from tour-api
export async function GET() {
  try {
    const countries = await fetchCountries();
    return NextResponse.json(countries);
  } catch (error) {
    console.error('Error fetching countries from tour-api:', error);
    return NextResponse.json([]);
  }
}
