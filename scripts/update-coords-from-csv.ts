import * as fs from 'fs';
import * as path from 'path';

const csvPath = path.join(process.cwd(), 'src/data/metro/estaciones.csv');
const jsonPath = path.join(process.cwd(), 'src/data/metro/stations.json');

function parseCSV(content: string) {
    const lines = content.split('\n');
    const coords: Record<string, { lat: number, lon: number }> = {};

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Comma separated, but handle quotes if any
        // The file seems simple: 74,ABA,Ascensor,43.26144,-2.92820,1,0
        // But some have quotes: 76,ABA,"Gran Vía",43.26134,-2.92783,1,0
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        if (parts.length >= 5) {
            const code = parts[1].trim();
            const latStr = parts[3].trim().replace(/"/g, '');
            const lonStr = parts[4].trim().replace(/"/g, '');

            const lat = parseFloat(latStr);
            const lon = parseFloat(lonStr);

            if (!isNaN(lat) && !isNaN(lon)) {
                // Take the first one found or average. Let's take the first one for simplicity
                if (!coords[code]) {
                    coords[code] = { lat, lon };
                }
            }
        }
    }
    return coords;
}

async function updateStations() {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const newCoords = parseCSV(csvContent);

    const stationsJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    let updatedCount = 0;
    for (const lineId in stationsJson) {
        const line = stationsJson[lineId];
        line.stations.forEach((station: any) => {
            const newCoord = newCoords[station.code];
            if (newCoord) {
                station.lat = newCoord.lat;
                station.lon = newCoord.lon;
                updatedCount++;
            }
        });
    }

    fs.writeFileSync(jsonPath, JSON.stringify(stationsJson, null, 4));
    console.log(`Updated ${updatedCount} station coordinates in stations.json`);
}

updateStations().catch(console.error);
