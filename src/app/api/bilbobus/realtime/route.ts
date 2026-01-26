import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface VehiclePosition {
    id: string;
    vehicle: {
        id: string;
        label: string;
    };
    trip: {
        tripId: string;
        routeId: string;
        startDate: string;
    };
    position: {
        latitude: number;
        longitude: number;
        bearing?: number;
        speed?: number;
    };
    timestamp: number;
}

async function fetchGTFSRT(): Promise<VehiclePosition[]> {
    try {
        const response = await fetch(
            'https://opendata.euskadi.eus/transport/moveuskadi/bilbobus/gtfsrt_bilbobus_vehicle_positions.pb',
            {
                method: 'GET',
                headers: {
                    'User-Agent': 'BilboTrans/1.0',
                },
                cache: 'no-store',
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        
        // Por ahora, retornamos array vacío hasta implementar decodificación protobuf
        // TODO: Implementar decodificación GTFS-RT con protobufjs
        console.log('GTFS-RT data size:', buffer.byteLength);
        return [];
    } catch (error) {
        console.error('Error fetching GTFS-RT:', error);
        return [];
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const routeId = searchParams.get('routeId');

        const vehicles = await fetchGTFSRT();

        let filteredVehicles = vehicles;
        if (routeId) {
            filteredVehicles = vehicles.filter(v => v.trip.routeId === routeId);
        }

        return NextResponse.json({
            vehicles: filteredVehicles,
            timestamp: new Date().toISOString(),
            count: filteredVehicles.length
        });
    } catch (error) {
        console.error('Error in realtime API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch realtime data', details: String(error) },
            { status: 500 }
        );
    }
}
