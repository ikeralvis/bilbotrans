import { NextResponse, type NextRequest } from 'next/server';
import { searchAll } from '@/lib/search/unified';

/** Búsqueda en los catálogos estáticos de todas las redes. Sin datos en vivo: se cachea en el CDN. */
export function GET(req: NextRequest) {
    const q = (req.nextUrl.searchParams.get('q') ?? '').slice(0, 60);
    return NextResponse.json(searchAll(q), {
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
}
