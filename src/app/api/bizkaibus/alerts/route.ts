import { NextResponse } from 'next/server';
import { fetchAlerts } from '@/lib/bizkaibus/tq';

export const revalidate = 60;

export async function GET() {
    try {
        const alerts = await fetchAlerts();
        return NextResponse.json({ alerts, fetchedAt: Date.now() }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
    } catch {
        return NextResponse.json({ error: 'upstream unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
}
