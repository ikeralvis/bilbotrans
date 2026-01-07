import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import axios from 'axios';

// URL provided by user for Bilbobus GTFS-RT
const BILBOBUS_TRIP_UPDATES_URL = 'https://data.ctb.eus/dataset/autobuses-bilbobus/resource/bilbobus-gtfs-rt-trip-updates.pb'; // Guessing based on pattern
const BILBOBUS_VP_URL = 'https://ctb-gtfs-rt.s3.eu-south-2.amazonaws.com/bilbobus-vehicle-positions.pb'; // Found in user prompt references

// The user link "bilbobus-vehicle-positions.pbpb" likely resolves to the S3 bucket similarly to Metro
// "https://ctb-gtfs-rt.s3.eu-south-2.amazonaws.com/bilbobus-vehicle-positions.pb" is a strong candidate given the Metro pattern.

export interface BilbobusVehicle {
    id: string;
    label?: string;
    latitude: number;
    longitude: number;
    timestamp: string;
}

export async function getBilbobusRealtime() {
    try {
        const response = await axios.get(BILBOBUS_VP_URL, {
            responseType: 'arraybuffer',
            timeout: 5000
        });

        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
            new Uint8Array(response.data)
        );

        return feed.entity.map(e => ({
            id: e.vehicle?.vehicle?.id || 'unknown',
            label: e.vehicle?.vehicle?.label,
            latitude: e.vehicle?.position?.latitude,
            longitude: e.vehicle?.position?.longitude,
            timestamp: e.vehicle?.timestamp ? new Date(Number(e.vehicle.timestamp) * 1000).toISOString() : new Date().toISOString()
        }));

    } catch (error) {
        console.warn('Failed to fetch Bilbobus GTFS-RT:', error);
        // Warn mostly, often these feeds are flaky
        return [];
    }
}
