import 'dotenv/config';
import { db } from '@/lib/shared/db';
import { stops } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const platformsData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'src/data/metro/platforms.json'), 'utf-8')
);

async function extractMetroCoordinates() {
    console.log('Extracting metro station coordinates...');

    const stationsWithCoords: any = {};

    for (const platform of platformsData) {
        try {
            const result = await db
                .select()
                .from(stops)
                .where(eq(stops.id, platform.code))
                .limit(1);

            if (result.length > 0 && result[0].lat && result[0].lon) {
                stationsWithCoords[platform.code] = {
                    code: platform.code,
                    name: platform.name,
                    lat: result[0].lat,
                    lon: result[0].lon,
                    lines: platform.lines
                };
                console.log(`✓ ${platform.code}: ${platform.name} - ${result[0].lat}, ${result[0].lon}`);
            } else {
                console.log(`✗ ${platform.code}: ${platform.name} - NO COORDINATES`);
            }
        } catch (error) {
            console.error(`Error fetching ${platform.code}:`, error);
        }
    }

    // Organize by line
    const lineData: any = {
        L1: { id: 'L1', name: 'Etxebarri - Plentzia', color: '#f97316', stations: [] },
        L2: { id: 'L2', name: 'Basauri - Kabiezes', color: '#16a34a', stations: [] }
    };

    // Add stations to their respective lines
    Object.values(stationsWithCoords).forEach((station: any) => {
        station.lines.forEach((lineId: string) => {
            if (lineData[lineId]) {
                lineData[lineId].stations.push({
                    code: station.code,
                    name: station.name,
                    lat: station.lat,
                    lon: station.lon
                });
            }
        });
    });

    // Save to file
    const outputPath = path.join(process.cwd(), 'src/data/metro/stations.json');
    fs.writeFileSync(outputPath, JSON.stringify(lineData, null, 2));
    console.log(`\n✓ Saved to ${outputPath}`);
    console.log(`L1: ${lineData.L1.stations.length} stations`);
    console.log(`L2: ${lineData.L2.stations.length} stations`);
}

extractMetroCoordinates()
    .then(() => {
        console.log('\nDone!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
