import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TripSchedule {
    trains: TrainSchedule[];
    trip: TripInfo;
}

interface TrainSchedule {
    departure: string;
    arrival: string;
    duration: number;
    line: string;
    transfer: boolean;
    transferStation?: string;
}

interface TripInfo {
    fromStation: { code: string; name: string };
    toStation: { code: string; name: string };
    duration: number;
    line: string;
    transfer: boolean;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('dest');

    if (!origin || !destination) {
        return NextResponse.json(
            { error: 'Origin and destination are required' },
            { status: 400 }
        );
    }

    try {
        // Usar el endpoint real-time que devuelve los itinerarios correctos
        const url = `https://api.metrobilbao.eus/metro/real-time/${origin}/${destination}`;
        
        const response = await fetch(url, { next: { revalidate: 60 } });

        if (!response.ok) {
            throw new Error('Failed to fetch schedule');
        }

        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching trip schedule:', error);
        return NextResponse.json(
            { error: 'Failed to fetch schedule', trains: [], trip: null },
            { status: 500 }
        );
    }
}
