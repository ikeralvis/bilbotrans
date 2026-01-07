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

// New API response structure for /api/stations/{code}
interface StationApiTrain {
    Destination: string;
    Direction: string | number;
    Length: number;
    Minutes: number;
    Time: string;
    line: string;
}

interface StationApiResponse {
    id: number;
    name: string;
    code: string;
    line: string[];
    exits: Array<{
        id: number;
        name: string;
        address: string;
        elevator: boolean;
        nocturnal: boolean;
        wheelchairAccessible: boolean;
        latitude: string;
        longitude: string;
    }>;
    platforms: {
        Station: string;
        StationId: string;
        Platforms: StationApiTrain[][];
        Entrances?: Array<{
            id: number;
            name: string;
            message_es: string;
            message_eu: string;
        }>;
    };
    issues: Array<{
        title?: string;
        description?: string;
    }>;
}

export interface Exit {
    id: number;
    name: string;
    elevator: boolean;
    nocturnal: boolean;
    wheelchairAccessible?: boolean;
    address?: string;
}

export interface MetroArrival {
    lineId: string;
    destination: string;
    etaMinutes: number;
    etaDisplay: string;
    platform?: string;
    wagons?: number;
    time?: string;
}

export interface StationInfo {
    code: string;
    name: string;
    lines: string[];
    exits: Exit[];
    issues: Array<{ title?: string; description?: string }>;
    platform1: MetroArrival[];
    platform2: MetroArrival[];
}

/**
 * Fetch station info with real-time arrivals from Metro Bilbao API
 * Uses: https://api.metrobilbao.eus/api/stations/{stationCode}?lang={lang}
 * This is the preferred endpoint as it returns correct line info for each train
 */
export async function getStationInfo(stationCode: string, lang: string = 'es'): Promise<StationInfo | null> {
    try {
        const url = `https://api.metrobilbao.eus/api/stations/${stationCode}?lang=${lang}`;
        console.log(`[Metro API] Fetching station: ${url}`);
        
        const response = await axios.get<StationApiResponse>(url, {
            timeout: 8000
        });

        const data = response.data;
        console.log(`[Metro API] Got station ${data.name} with ${data.platforms?.Platforms?.length || 0} platforms`);

        // Parse platform 1 trains (index 0)
        const platform1Trains: MetroArrival[] = (data.platforms?.Platforms?.[0] || []).map((train: StationApiTrain) => ({
            lineId: train.line || 'L1',
            destination: train.Destination,
            etaMinutes: train.Minutes,
            etaDisplay: train.Minutes <= 0 ? 'Ya aquí' : `${train.Minutes} min`,
            platform: 'Andén 1',
            wagons: train.Length,
            time: train.Time
        }));

        // Parse platform 2 trains (index 1)
        const platform2Trains: MetroArrival[] = (data.platforms?.Platforms?.[1] || []).map((train: StationApiTrain) => ({
            lineId: train.line || 'L2',
            destination: train.Destination,
            etaMinutes: train.Minutes,
            etaDisplay: train.Minutes <= 0 ? 'Ya aquí' : `${train.Minutes} min`,
            platform: 'Andén 2',
            wagons: train.Length,
            time: train.Time
        }));

        // Parse exits
        const exits: Exit[] = (data.exits || []).map(exit => ({
            id: exit.id,
            name: exit.name,
            elevator: exit.elevator,
            nocturnal: exit.nocturnal,
            wheelchairAccessible: exit.wheelchairAccessible,
            address: exit.address
        }));

        // Sort trains by arrival time
        const sortedPlatform1 = [...platform1Trains].sort((a, b) => a.etaMinutes - b.etaMinutes);
        const sortedPlatform2 = [...platform2Trains].sort((a, b) => a.etaMinutes - b.etaMinutes);

        return {
            code: data.code,
            name: data.name,
            lines: data.line || [],
            exits,
            issues: data.issues || [],
            platform1: sortedPlatform1,
            platform2: sortedPlatform2
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(`[Metro API] Error ${error.response?.status} for station ${stationCode}:`, error.message);
        } else {
            console.error(`[Metro API] Error fetching station ${stationCode}:`, error);
        }
        return null;
    }
}

/**
 * Get all arrivals for a specific stop (both platforms)
 * Now uses the simplified /api/stations endpoint
 */
export async function getMetroArrivalsByStop(stopCode: string, lang: string = 'es'): Promise<MetroArrival[]> {
    console.log(`[Metro] Getting arrivals for stop: ${stopCode}`);
    
    try {
        const stationInfo = await getStationInfo(stopCode, lang);
        
        if (!stationInfo) {
            console.error(`[Metro] Could not get station info for ${stopCode}`);
            return [];
        }

        // Combine both platforms and sort by ETA
        const allArrivals = [...stationInfo.platform1, ...stationInfo.platform2];
        return allArrivals.sort((a, b) => a.etaMinutes - b.etaMinutes);
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

/**
 * Get all Metro lines a station serves
 */
export function getStationLines(stopCode: string): string[] {
    const stop = PLATFORMS.find(p => p.code === stopCode);
    return stop?.lines || [];
}

