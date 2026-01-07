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
    const date = searchParams.get('date'); // DD-MM-YYYY
    const hourStart = searchParams.get('hourStart') || '6';
    const hourEnd = searchParams.get('hourEnd') || '23';
    const lang = searchParams.get('lang') || 'es';

    if (!origin || !destination) {
        return NextResponse.json(
            { error: 'Origin and destination are required' },
            { status: 400 }
        );
    }

    // Formato fecha actual si no se proporciona
    const today = new Date();
    const formattedDate = date || `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

    const language = lang === 'eu' ? 'eu' : 'es';

    try {
        const url = `https://api.metrobilbao.eus/metro/obtain-schedule-of-trip/${origin}/${destination}/${hourStart}/${hourEnd}/${formattedDate}/${language}`;
        
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
