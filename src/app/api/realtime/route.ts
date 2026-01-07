import { NextResponse } from 'next/server';
import { getMetroArrivalsByStop } from '@/lib/metro';
import { getBilbobusRealtime } from '@/lib/bilbobus';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // This endpoint is for reference only
        // Real-time data is fetched directly from metrobilbao.eus API
        const response = NextResponse.json({
            metro: {
                status: 'ok',
                message: 'Use /metro/real-time/{origin}/{destination} for route data'
            },
            bilbobus: {
                status: 'coming_soon'
            }
        });

        return response;
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch', details: String(err) }, { status: 500 });
    }
}
