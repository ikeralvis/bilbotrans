import { NextResponse } from 'next/server';
import { getBilbobusArrivals } from '@/lib/bilbobus/api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const lineId = searchParams.get('lineId');

        if (!lineId) {
            return NextResponse.json(
                { error: 'lineId parameter is required' },
                { status: 400 }
            );
        }

        const arrivals = await getBilbobusArrivals(lineId);

        return NextResponse.json({
            lineId,
            arrivals,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching Bilbobus arrivals:', error);
        return NextResponse.json(
            { error: 'Failed to fetch arrivals', details: String(error) },
            { status: 500 }
        );
    }
}
