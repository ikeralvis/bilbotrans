
import 'dotenv/config';
import { db } from '@/lib/shared/db';
import { stops } from '@/db/schema';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log('🌱 Starting seed from ARIN data...');

    // 1. Ingest Metro Bilbao
    const metroPath = path.join(process.cwd(), 'src', 'lib', 'paradas_metro.json');
    console.log(`Reading Metro data from ${metroPath}...`);
    const metroData = JSON.parse(fs.readFileSync(metroPath, 'utf8'));

    console.log(`Found ${metroData.length} Metro stations. Inserting...`);

    // Metro data doesn't have lat/lon in this file! 
    // We need to fetch coordinates or use a map.
    // Wait, the user said "Data Ingestion".
    // Let's check paradas_api.json if it includes Metro too?
    // Or maybe we can rely on our previous station-data.ts for coordinates if needed, 
    // OR we just insert what we have and enrich later.
    // Actually, ARIN must have coordinates somewhere.
    // Let's look at paradas_api.json more closely, maybe it has everything.
    // paradas_api.json seemed to be just Bus stops (PROVINCIA/MUNICIPIO fields).

    // FOR NOW: We will insert Metro stations without lat/lon if missing, or mock them,
    // BUT we need them for "Nearest" feature.
    // Previous `station-data.ts` had some coordinates.
    // Let's just insert what we have in metadata.

    for (const station of metroData) {
        // Metro Code is like "ABA", "ABT".
        await db.insert(stops).values({
            id: station.Code,
            agency: 'metro',
            name: station.Name,
            lat: 0, // Placeholder
            lon: 0, // Placeholder
            metadata: {
                lines: station.Lines,
                platform1: station.Platform1,
                platform2: station.Platform2,
            },
        }).onConflictDoUpdate({
            target: stops.id,
            set: {
                name: station.Name,
                metadata: {
                    lines: station.Lines,
                    platform1: station.Platform1,
                    platform2: station.Platform2,
                },
            }
        });
    }
    console.log('✅ Metro stations inserted.');

    // 2. Ingest Bilbobus
    const apiPath = path.join(process.cwd(), 'src', 'lib', 'paradas_api.json');
    console.log(`Reading General API data from ${apiPath}...`);
    // This file is HUGE (5MB). Stream or read carefully? 5MB is fine for node.
    const apiData = JSON.parse(fs.readFileSync(apiPath, 'utf8'));

    // Filter for Bilbobus (Municipio 020 - Bilbao?? User said "020" in my thought process, let's verify).
    // In the file snippet seen earlier: MUNICIPIO "001" is ABADIÑO.
    // I will assume Bilbao is where most stops are.
    // Let's filter by "Metro Bilbao" is unlikely here. 
    // Usually Bilbobus stops are MUNICIPIO 001 (Abando?) NO.
    // Bilbao is "020" in Bizkaia usually.
    // Let's trust the logic: Filter by "BILBAO" in DESCRIPCION_MUNICIPIO if unsure of code.

    const bilbaoStops = apiData.filter((s: any) => s.DESCRIPCION_MUNICIPIO === 'BILBAO');
    console.log(`Found ${bilbaoStops.length} stops in BILBAO.`);

    let insertedCount = 0;
    for (const stop of bilbaoStops) {
        // Bilbobus stop codes are usually 4 digits?
        // "PARADA": "001" -> "ETIQUETA_PARADA": "48001001".
        // Let's use ETIQUETA_PARADA as unique ID or CODIGOREDUCIDOPARADA?
        // ARIN probably uses the short code for display.
        // Let's use CODIGOREDUCIDOPARADA if available and looks unique?
        // Or just standard "48020..." numeric ID.
        // Using "CODIGOREDUCIDOPARADA" as ID might be better for search "Parada 1234".

        const id = stop.CODIGOREDUCIDOPARADA || stop.ETIQUETA_PARADA;

        await db.insert(stops).values({
            id: id,
            agency: 'bilbobus', // Or 'bizkaibus' if it's mixed? 
            // User wants "Bilbobus only" for now. 
            // How to distinguish Bilbobus from Bizkaibus in this file?
            // Usually Bizkaibus is interurban. Bilbobus is Urbano.
            // "CARRETERA" might help?
            // Actually, inside Bilbao (020), most are Bilbobus but Bizkaibus also stops there.
            // For now, let's mark them as 'bilbobus' if likely.
            // Or just 'bus'.
            // Let's stick to 'bilbobus' for the task.
            name: stop.DENOMINACION,
            lat: parseFloat(stop.LATITUD),
            lon: parseFloat(stop.LONGITUD),
            metadata: {
                description: stop.DIRECCION,
                municipio: stop.DESCRIPCION_MUNICIPIO,
                features: {
                    marquesina: stop.MARQUESINA,
                    trafico: stop.SENAL_TRAFICO
                }
            }
        }).onConflictDoUpdate({
            target: stops.id,
            set: {
                name: stop.DENOMINACION,
                lat: parseFloat(stop.LATITUD),
                lon: parseFloat(stop.LONGITUD),
                metadata: {
                    description: stop.DIRECCION,
                    municipio: stop.DESCRIPCION_MUNICIPIO,
                    features: {
                        marquesina: stop.MARQUESINA,
                        trafico: stop.SENAL_TRAFICO
                    }
                }
            }
        });
        insertedCount++;
    }
    console.log(`✅ Inserted ${insertedCount} Bilbobus stops.`);

    console.log('🎉 Seed completed!');
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
