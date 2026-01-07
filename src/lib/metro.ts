import axios from 'axios';
import metroPlatforms from '@/data/metro-platforms.json';

interface MetroPlatform {
    code: string;
    name: string;
    lines: string[];
    platform1: string[];
    platform2: string[];
}

const PLATFORMS: MetroPlatform[] = metroPlatforms as MetroPlatform[];

interface MetroTrain {
    wagons: number;
    estimated: number;
    direction: string;
    time: string;
    timeRounded: string;
}

interface MetroApiResponse {
    trains: MetroTrain[];
    trip: {
        fromStation: { code: string; name: string };
        toStation: { code: string; name: string };
        duration: number;
        line: string;
        transfer: boolean;
    };
    exits?: {
        origin: Array<{
            id: number;
            name: string;
            elevator: boolean;
            nocturnal: boolean;
        }>;
        destiny: Array<{
            id: number;
            name: string;
            elevator: boolean;
            nocturnal: boolean;
        }>;
    };
}

export interface Exit {
    id: number;
    name: string;
    elevator: boolean;
    nocturnal: boolean;
}

export interface MetroArrival {
    lineId: string;
    destination: string;
    etaMinutes: number;
    etaDisplay: string;
    platform?: string;
    wagons?: number;
    duration?: number;
    originExits?: Exit[];
    destinationExits?: Exit[];
}

/**
 * Fetch real-time data from Metro Bilbao API
 * Uses: https://api.metrobilbao.eus/metro/real-time/{origin}/{destination}
 */
async function fetchMetroRealtime(
    originCode: string,
    destinationCode: string
): Promise<MetroArrival[]> {
    try {
        const url = `https://api.metrobilbao.eus/metro/real-time/${originCode}/${destinationCode}`;
        console.log(`[Metro API] Fetching: ${url}`);
        
        const response = await axios.get<MetroApiResponse>(url, {
            timeout: 5000
        });

        console.log(`[Metro API] Response status: ${response.status}`);
        const data = response.data;
        const trains = data.trains || [];
        const lineId = data.trip?.line || 'L1/L2';
        const duration = data.trip?.duration;
        const originExits = data.exits?.origin;
        const destinationExits = data.exits?.destiny;

        console.log(`[Metro API] Got ${trains.length} trains, line: ${lineId}`);

        return trains.map((train: MetroTrain) => ({
            lineId: lineId,
            destination: train.direction,
            etaMinutes: train.estimated,
            etaDisplay: train.estimated <= 0 ? 'Ya aquí' : `${train.estimated} min`,
            platform: undefined,
            wagons: train.wagons,
            duration: duration,
            originExits: originExits,
            destinationExits: destinationExits
        }));
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(`[Metro API] Error ${error.response?.status} for ${originCode} to ${destinationCode}:`, error.message);
        } else {
            console.error(`[Metro API] Error fetching ${originCode} to ${destinationCode}:`, error);
        }
        return [];
    }
}

/**
 * Get all arrivals for a specific stop (both platforms)
 * This queries both platform directions and returns all trains
 */
export async function getMetroArrivalsByStop(stopCode: string): Promise<MetroArrival[]> {
    console.log(`[Metro] Getting arrivals for stop: ${stopCode}`);
    console.log(`[Metro] Total platforms in config: ${PLATFORMS.length}`);
    
    try {
        // Find the stop configuration
        const stopConfig = PLATFORMS.find(p => p.code === stopCode);
        if (!stopConfig) {
            console.error(`[Metro] Stop ${stopCode} not found in platforms configuration`);
            console.log(`[Metro] Available stops:`, PLATFORMS.map(p => p.code).join(', '));
            return [];
        }

        console.log(`[Metro] Found stop config:`, stopConfig);

        const allArrivals: MetroArrival[] = [];

        // Process Platform 1
        if (stopConfig.platform1.length > 0) {
            console.log(`[Metro] Querying Platform 1 destinations:`, stopConfig.platform1);
            for (const destCode of stopConfig.platform1) {
                console.log(`[Metro] Fetching ${stopCode} -> ${destCode}`);
                const arrivals = await fetchMetroRealtime(stopCode, destCode);
                console.log(`[Metro] Got ${arrivals.length} trains for platform 1`);
                allArrivals.push(...arrivals.map(a => ({ ...a, platform: 'Andén 1' })));
            }
        }

        // Process Platform 2
        if (stopConfig.platform2.length > 0) {
            console.log(`[Metro] Querying Platform 2 destinations:`, stopConfig.platform2);
            for (const destCode of stopConfig.platform2) {
                console.log(`[Metro] Fetching ${stopCode} -> ${destCode}`);
                const arrivals = await fetchMetroRealtime(stopCode, destCode);
                console.log(`[Metro] Got ${arrivals.length} trains for platform 2`);
                allArrivals.push(...arrivals.map(a => ({ ...a, platform: 'Andén 2' })));
            }
        }

        console.log(`[Metro] Total arrivals before sort: ${allArrivals.length}`);
        
        // Sort by ETA
        const sorted = allArrivals.sort((a, b) => a.etaMinutes - b.etaMinutes);
        console.log(`[Metro] Returning ${sorted.length} sorted arrivals`);
        
        return sorted;
    } catch (error) {
        console.error(`[Metro] Error in getMetroArrivalsByStop for ${stopCode}:`, error);
        return [];
    }
}

/**
 * Get stop name from code
 */
export function getStopName(stopCode: string): string {
    const stop = PLATFORMS.find(p => p.code === stopCode);
    return stop?.name || stopCode;
}

