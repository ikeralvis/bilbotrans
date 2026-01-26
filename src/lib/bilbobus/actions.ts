import bilbobusData from '@/data/bilbobus/data.json';
import { BilbobusLine, RouteVariant, BilbobusStop } from '@/lib/bilbobus/api';

interface BilbobusData {
    lines: Record<string, BilbobusLine>;
    stops: Record<string, BilbobusStop>;
}

/**
 * Obtiene todas las líneas de Bilbobus (para la homepage)
 */
export async function getAllBilbobusLinesAction(): Promise<BilbobusLine[]> {
    try {
        const data = bilbobusData as BilbobusData;
        const lines = Object.values(data.lines);
        return lines.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    } catch (error) {
        console.error('Error getting all Bilbobus lines:', error);
        return [];
    }
}
