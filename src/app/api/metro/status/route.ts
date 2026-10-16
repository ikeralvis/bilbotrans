import { NextResponse } from 'next/server';
import { fetchServiceStatus } from '@/lib/metro/client';

export const revalidate = 60;

export async function GET() {
    const data = await fetchServiceStatus();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } });
}
