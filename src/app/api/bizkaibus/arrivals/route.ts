import { NextResponse } from 'next/server';
import { getBizkaibusArrivals } from '@/lib/bizkaibus/api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const stopId = searchParams.get('stopId');

        if (!stopId) {
            return NextResponse.json(
                { error: 'stopId parameter is required' },
                { status: 400 }
            );
        }

        const arrivals = await getBizkaibusArrivals(stopId);

        return NextResponse.json({
            stopId,
            arrivals,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching Bizkaibus arrivals:', error);
        return NextResponse.json(
            { error: 'Failed to fetch arrivals', details: String(error) },
            { status: 500 }
        );
    }
}
