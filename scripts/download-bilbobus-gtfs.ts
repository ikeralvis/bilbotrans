import https from 'https';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream, createReadStream } from 'fs';
import { parse } from 'csv-parse';
import AdmZip from 'adm-zip';

const GTFS_URL = 'https://opendata.euskadi.eus/transport/moveuskadi/bilbobus/gtfs_bilbobus.zip';
const TEMP_DIR = path.join(process.cwd(), 'temp');
const DATA_DIR = path.join(process.cwd(), 'src/data/bilbobus');
const ZIP_FILE = path.join(TEMP_DIR, 'gtfs_bilbobus.zip');
const EXTRACT_DIR = path.join(TEMP_DIR, 'gtfs_extract');

interface Stop {
    id: string;
    name: string;
    lat: number;
    lon: number;
    lines: string[];
}

interface Line {
    id: string;
    name: string;
    stops: string[];
}

interface StopInternal {
    stop_id: string;
    stop_code?: string;
    stop_name: string;
    stop_lat: string;
    stop_lon: string;
}

interface RouteInternal {
    route_id: string;
    route_short_name: string;
    route_long_name: string;
}

interface TripInternal {
    trip_id: string;
    route_id: string;
}

interface StopTimeInternal {
    trip_id: string;
    stop_id: string;
    stop_sequence: string;
}

async function downloadFile(url: string, dest: string): Promise<void> {
    console.log(`📥 Descargando desde ${url}...`);
    
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Seguir redirección
                if (response.headers.location) {
                    downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                    return;
                }
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }

            const file = createWriteStream(dest);
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log('✅ Descarga completada');
                resolve();
            });
        }).on('error', reject);
    });
}

function extractZip(zipPath: string, extractTo: string): void {
    console.log('📦 Extrayendo archivos...');
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractTo, true);
    console.log('✅ Archivos extraídos');
}

async function parseCSV<T>(filePath: string): Promise<T[]> {
    const records: T[] = [];
    const parser = createReadStream(filePath).pipe(
        parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
        })
    );

    for await (const record of parser) {
        records.push(record as T);
    }

    return records;
}

async function processGTFS(): Promise<void> {
    console.log('\n🔄 Procesando archivos GTFS...');

    // 1. Cargar stops.txt
    console.log('📍 Cargando paradas...');
    const stopsData = await parseCSV<StopInternal>(path.join(EXTRACT_DIR, 'stops.txt'));
    const stopMap = new Map<string, Stop>();
    const stopIdToCode = new Map<string, string>();

    for (const stop of stopsData) {
        // Usar stop_code si existe, sino usar stop_id
        const code = stop.stop_code || stop.stop_id;
        stopIdToCode.set(stop.stop_id, code);
        stopMap.set(code, {
            id: code,
            name: stop.stop_name,
            lat: parseFloat(stop.stop_lat),
            lon: parseFloat(stop.stop_lon),
            lines: []
        });
    }

    // 2. Cargar routes.txt
    console.log('🚍 Cargando líneas...');
    const routesData = await parseCSV<RouteInternal>(path.join(EXTRACT_DIR, 'routes.txt'));
    const routeMap = new Map<string, Line>();
    const routeIdToShortName = new Map<string, string>();

    for (const route of routesData) {
        routeIdToShortName.set(route.route_id, route.route_short_name);
        routeMap.set(route.route_short_name, {
            id: route.route_short_name,
            name: route.route_long_name,
            stops: []
        });
    }

    // 3. Cargar trips.txt
    console.log('🗺️  Cargando viajes...');
    const tripsData = await parseCSV<TripInternal>(path.join(EXTRACT_DIR, 'trips.txt'));
    const tripToRoute = new Map<string, string>();

    for (const trip of tripsData) {
        const routeShortName = routeIdToShortName.get(trip.route_id);
        if (routeShortName) {
            tripToRoute.set(trip.trip_id, routeShortName);
        }
    }

    // 4. Cargar stop_times.txt y relacionar
    console.log('⏱️  Procesando horarios...');
    const stopTimesData = await parseCSV<StopTimeInternal>(path.join(EXTRACT_DIR, 'stop_times.txt'));
    const lineStops = new Map<string, Set<string>>();

    for (const stopTime of stopTimesData) {
        const lineId = tripToRoute.get(stopTime.trip_id);
        const stopCode = stopIdToCode.get(stopTime.stop_id);

        if (lineId && stopCode) {
            // Agregar parada a línea
            if (!lineStops.has(lineId)) {
                lineStops.set(lineId, new Set());
            }
            lineStops.get(lineId)!.add(stopCode);

            // Agregar línea a parada
            const stop = stopMap.get(stopCode);
            if (stop && !stop.lines.includes(lineId)) {
                stop.lines.push(lineId);
            }
        }
    }

    // Actualizar stops en líneas
    for (const [lineId, stops] of lineStops.entries()) {
        const line = routeMap.get(lineId);
        if (line) {
            line.stops = Array.from(stops);
        }
    }

    // 5. Convertir a objetos finales
    const stopsObject: Record<string, Stop> = {};
    for (const [key, value] of stopMap.entries()) {
        stopsObject[key] = value;
    }

    const linesObject: Record<string, Line> = {};
    for (const [key, value] of routeMap.entries()) {
        linesObject[key] = value;
    }

    // 6. Guardar archivo JSON
    const outputData = {
        lines: linesObject,
        stops: stopsObject,
        metadata: {
            generated: new Date().toISOString(),
            totalStops: Object.keys(stopsObject).length,
            totalLines: Object.keys(linesObject).length,
            source: 'OpenData Euskadi - GTFS Bilbobus'
        }
    };

    // Crear directorio si no existe
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const outputPath = path.join(DATA_DIR, 'data.json');
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');

    console.log(`\n✅ Datos procesados y guardados en: ${outputPath}`);
    console.log(`📊 Estadísticas:`);
    console.log(`   - Paradas: ${outputData.metadata.totalStops}`);
    console.log(`   - Líneas: ${outputData.metadata.totalLines}`);
}

async function cleanup(): Promise<void> {
    console.log('\n🧹 Limpiando archivos temporales...');
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    console.log('✅ Limpieza completada');
}

async function main(): Promise<void> {
    try {
        console.log('🚀 Iniciando descarga y procesamiento de GTFS Bilbobus\n');

        // Crear directorios temporales
        fs.mkdirSync(TEMP_DIR, { recursive: true });
        fs.mkdirSync(EXTRACT_DIR, { recursive: true });

        // Descargar
        await downloadFile(GTFS_URL, ZIP_FILE);

        // Extraer
        extractZip(ZIP_FILE, EXTRACT_DIR);

        // Procesar
        await processGTFS();

        // Limpiar
        await cleanup();

        console.log('\n🎉 ¡Proceso completado exitosamente!');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
