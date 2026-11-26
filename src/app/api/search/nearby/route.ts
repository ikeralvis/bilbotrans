import { NextResponse, type NextRequest } from 'next/server';
import { nearbyAll } from '@/lib/search/unified';

/**
 * Paradas cercanas de todas las redes. Las coordenadas se redondean a ~100 m antes de llegar aquí
 * (`NearbyAll`), así que la respuesta se puede cachear sin guardar la posición exacta de nadie.
 */
export function GET(req: NextRequest) {
    const lat = Number(req.nextUrl.searchParams.get('lat'));
    const lon = Number(req.nextUrl.searchParams.get('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return NextResponse.json({ error: 'lat/lon no válidos' }, { status: 400 });
    }
    return NextResponse.json({ stops: nearbyAll(lat, lon) }, {
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
}
