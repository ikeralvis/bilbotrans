import { NextResponse } from 'next/server';
import { getAllBilbobusLines, getBilbobusLineDetails } from '@/lib/bilbobus/api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const lineId = searchParams.get('lineId');

        if (lineId) {
            // Get specific line details
            const line = getBilbobusLineDetails(lineId);

            if (!line) {
                return NextResponse.json(
                    { error: 'Line not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json(line);
        }

        // Get all lines
        const lines = getAllBilbobusLines();

        return NextResponse.json({
            lines,
            count: lines.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching Bilbobus lines:', error);
        return NextResponse.json(
            { error: 'Failed to fetch lines', details: String(error) },
            { status: 500 }
        );
    }
}
