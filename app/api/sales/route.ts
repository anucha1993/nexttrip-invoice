import { NextResponse } from 'next/server';
import { fetchSales } from '@/lib/services/tour-api';

// GET - List all active sales staff from tour-api (users with role "sale")
export async function GET() {
  try {
    const sales = await fetchSales();
    return NextResponse.json(sales);
  } catch (error) {
    console.error('Error fetching sales from tour-api:', error);
    return NextResponse.json([]);
  }
}

