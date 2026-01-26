import https from 'https';
import fs from 'fs';
import path from 'path';

const OUTPUT_PATH = path.join(process.cwd(), 'src/data/bilbobus/data.json');

interface Stop {
    id: string;
    name: string;
    lat: number;
    lon: number;
    lines: string[];
}

interface Route {
    id: string;
    name: string;
    direction: 'IDA' | 'VUELTA';
    stops: string[];
}

interface Line {
    id: string;
    name: string;
    routes: {
        ida?: Route;
        vuelta?: Route;
    };
    stops: string[]; // All unique stops
}

// Líneas conocidas
const KNOWN_LINES = [
    { id: '01', name: 'ARANGOITI - PLAZA CIRCULAR' },
    { id: '03', name: 'PLAZA CIRCULAR - OTXARKOAGA' },
    { id: '10', name: 'ELORRIETA - PLAZA CIRCULAR' },
    { id: '11', name: 'DEUSTU - ATXURI' },
    { id: '13', name: 'SAN IGNACIO - TXURDINAGA' },
    { id: '18', name: 'SAN IGNACIO - ZORROTZA' },
    { id: '22', name: 'SARRIKUE - ATXURI' },
    { id: '27', name: 'ARABELLA - BETOLATZA' },
    { id: '28', name: 'URIBARRI - ALTAMIRA' },
    { id: '30', name: 'TXURDINAGA - MIRIBILLA' },
    { id: '34', name: 'OTXARKOAGA - SANTUTXU' },
    { id: '38', name: 'OTXARKOAGA - INTERMODAL' },
    { id: '40', name: 'LA PEÑA - PLAZA CIRCULAR' },
    { id: '43', name: 'GARAIZAR - SANTUTXU' },
    { id: '48', name: 'SANTUTXU - LEZEAGA' },
    { id: '50', name: 'BUIA - LA PEÑA' },
    { id: '55', name: 'MINA DEL MORRO-MIRIBILLA' },
    { id: '56', name: 'LA PEÑA - SAGRADO CORAZÓN' },
    { id: '57', name: 'MIRIBILLA - HOSPITAL BASURTO' },
    { id: '58', name: 'MONTE CARAMELO - ATXURI' },
    { id: '62', name: 'SAGRADO CORAZÓN - ARABELLA' },
    { id: '71', name: 'MIRIBILLA - SAN IGNACIO' },
    { id: '72', name: 'LARRASKITU - CASTAÑOS' },
    { id: '75', name: 'SAN ADRIAN - ATXURI' },
    { id: '76', name: 'ARTAZU/XALBADOR - MOYÚA' },
    { id: '77', name: 'PEÑASCAL - MINA DEL MORRO' },
    { id: '85', name: 'ZAZPILANDA - ATXURI' },
    { id: '88', name: 'KASTREXANA - INDAUTXU' },
    { id: 'A1', name: 'ASUNCION - PLAZA CIRCULAR' },
    { id: 'A2', name: 'SOLOKOETXE - PLAZA CIRCULAR' },
    { id: 'A3', name: 'OLABEAGA - MOYUA' },
    { id: 'A4', name: 'ZORROTZAURRE - DEUSTU' },
    { id: 'A5', name: 'PRIM - PLAZA CIRCULAR' },
    { id: 'A6', name: 'ARANGOITI - DEUSTU' },
    { id: 'A7', name: 'ARTXANDA - ARENAL' },
    { id: 'A8', name: 'SAN JUSTO - AMETZOLA' },
    { id: 'A9', name: 'HOSPITAL SANTA MARINA - ABANDO' },
    { id: 'G1', name: 'ARABELLA - PLAZA CIRCULAR' },
    { id: 'G2', name: 'OTXARKOAGA - PLAZA CIRCULAR' },
    { id: 'G3', name: 'LARRASKITU - PLAZA CIRCULAR' },
    { id: 'G4', name: 'LA PEÑA - PLAZA CIRCULAR' },
    { id: 'G5', name: 'MIRIBILLA - PLAZA CIRCULAR' },
    { id: 'G6', name: 'ZORROTZA - PLAZA CIRCULAR' },
    { id: 'G7', name: 'MINA DEL MORRO - PLAZA CIRCULAR' },
    { id: 'G8', name: 'ARANGOITI - PLAZA CIRCULAR' },
];

function httpsGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 30000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

function extractStopsFromHtml(html: string, direction: 'ida' | 'vuelta'): { stopId: string; stopName: string; lat: number; lon: number; correspondencias: string[] }[] {
    const stops: { stopId: string; stopName: string; lat: number; lon: number; correspondencias: string[] }[] = [];
    
    // Pattern to find stop rows: id="ida_5518" or id="vuelta_5518"
    const idPattern = new RegExp(`id="${direction}_(\\d+)"`, 'g');
    
    // Pattern to find stop name after fa-map-marker
    const namePattern = /fa-map-marker">&nbsp;<\/span>([^<]+)</g;
    
    // Pattern to find Google Maps coordinates
    const coordPattern = /google\.com\/maps\/place\/([\d.-]+),([\d.-]+)/g;
    
    // Pattern to find correspondencias (other lines)
    const corrPattern = /codLinea=([A-Za-z0-9]+)&amp;temporada_linea/g;
    
    let match;
    const stopIds: string[] = [];
    const stopNames: string[] = [];
    const coords: { lat: number; lon: number }[] = [];
    
    // Extract stop IDs
    while ((match = idPattern.exec(html)) !== null) {
        stopIds.push(match[1]);
    }
    
    // Extract stop names
    while ((match = namePattern.exec(html)) !== null) {
        stopNames.push(match[1].trim());
    }
    
    // Extract coordinates
    while ((match = coordPattern.exec(html)) !== null) {
        coords.push({
            lat: parseFloat(match[1]),
            lon: parseFloat(match[2])
        });
    }
    
    // Combine data
    for (let i = 0; i < stopIds.length; i++) {
        stops.push({
            stopId: stopIds[i],
            stopName: stopNames[i] || `Parada ${stopIds[i]}`,
            lat: coords[i]?.lat || 43.263,
            lon: coords[i]?.lon || -2.935,
            correspondencias: []
        });
    }
    
    return stops;
}

function extractRoutesFromHtml(html: string): { ida: string | null; vuelta: string | null } {
    const routes = { ida: null as string | null, vuelta: null as string | null };
    
    // Pattern to find route options
    const idaMatch = html.match(/value="(\d+_SEM_IDA)"/);
    const vueltaMatch = html.match(/value="(\d+_SEM_VLT)"/);
    
    if (idaMatch) routes.ida = idaMatch[1];
    if (vueltaMatch) routes.vuelta = vueltaMatch[1];
    
    return routes;
}

async function getLineData(lineId: string): Promise<{ stops: { stopId: string; stopName: string; lat: number; lon: number }[]; routes: { ida: string[]; vuelta: string[] } }> {
    const allStops: { stopId: string; stopName: string; lat: number; lon: number }[] = [];
    const routes = { ida: [] as string[], vuelta: [] as string[] };
    
    try {
        // First, get the main page to discover available routes
        const mainUrl = `https://www.bilbao.eus/cs/Satellite/bilbobus/es/linea?temporada_linea=21&codLinea=${lineId}`;
        console.log(`  Obteniendo info de línea ${lineId}...`);
        
        const mainHtml = await httpsGet(mainUrl);
        
        // Try to get IDA route
        const idaUrl = `https://www.bilbao.eus/cs/Satellite/bilbobus/es/linea?rutaAct=${lineId}_SEM_IDA&temporada_linea=21&codLinea=${lineId}`;
        try {
            const idaHtml = await httpsGet(idaUrl);
            const idaStops = extractStopsFromHtml(idaHtml, 'ida');
            
            for (const stop of idaStops) {
                routes.ida.push(stop.stopId);
                if (!allStops.find(s => s.stopId === stop.stopId)) {
                    allStops.push(stop);
                }
            }
            console.log(`    ✓ IDA: ${idaStops.length} paradas`);
        } catch (err) {
            console.log(`    ⚠ IDA: No disponible`);
        }
        
        // Try to get VUELTA route
        const vueltaUrl = `https://www.bilbao.eus/cs/Satellite/bilbobus/es/linea?rutaAct=${lineId}_SEM_VLT&temporada_linea=21&codLinea=${lineId}`;
        try {
            const vueltaHtml = await httpsGet(vueltaUrl);
            const vueltaStops = extractStopsFromHtml(vueltaHtml, 'vuelta');
            
            for (const stop of vueltaStops) {
                routes.vuelta.push(stop.stopId);
                if (!allStops.find(s => s.stopId === stop.stopId)) {
                    allStops.push(stop);
                }
            }
            console.log(`    ✓ VUELTA: ${vueltaStops.length} paradas`);
        } catch (err) {
            console.log(`    ⚠ VUELTA: No disponible`);
        }
        
        // If no IDA/VUELTA found, try default extraction
        if (allStops.length === 0) {
            const defaultStops = extractStopsFromHtml(mainHtml, 'ida');
            for (const stop of defaultStops) {
                routes.ida.push(stop.stopId);
                allStops.push(stop);
            }
            console.log(`    ✓ Default: ${defaultStops.length} paradas`);
        }
        
    } catch (error) {
        console.error(`  ✗ Error en línea ${lineId}:`, (error as Error).message);
    }
    
    return { stops: allStops, routes };
}

async function main() {
    console.log('🚌 Extrayendo datos de Bilbobus con IDA/VUELTA\n');
    
    const lines: Record<string, Line> = {};
    const stops: Record<string, Stop> = {};
    
    // Process each line
    for (const lineInfo of KNOWN_LINES) {
        const data = await getLineData(lineInfo.id);
        
        // Add line
        lines[lineInfo.id] = {
            id: lineInfo.id,
            name: lineInfo.name,
            routes: {
                ida: data.routes.ida.length > 0 ? {
                    id: `${lineInfo.id}_IDA`,
                    name: `${lineInfo.name} - IDA`,
                    direction: 'IDA',
                    stops: data.routes.ida
                } : undefined,
                vuelta: data.routes.vuelta.length > 0 ? {
                    id: `${lineInfo.id}_VLT`,
                    name: `${lineInfo.name} - VUELTA`,
                    direction: 'VUELTA',
                    stops: data.routes.vuelta
                } : undefined
            },
            stops: [...new Set([...data.routes.ida, ...data.routes.vuelta])]
        };
        
        // Add stops
        for (const stop of data.stops) {
            if (!stops[stop.stopId]) {
                stops[stop.stopId] = {
                    id: stop.stopId,
                    name: stop.stopName,
                    lat: stop.lat,
                    lon: stop.lon,
                    lines: []
                };
            }
            
            if (!stops[stop.stopId].lines.includes(lineInfo.id)) {
                stops[stop.stopId].lines.push(lineInfo.id);
            }
        }
        
        // Small delay to not overload server
        await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    // Save result
    const outputData = {
        lines,
        stops,
        metadata: {
            generated: new Date().toISOString(),
            totalStops: Object.keys(stops).length,
            totalLines: Object.keys(lines).length,
            source: 'Bilbobus Web (bilbao.eus)',
            features: ['IDA/VUELTA routes', 'Real stop names', 'GPS coordinates']
        }
    };
    
    // Create directory if needed
    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2), 'utf-8');
    
    console.log(`\n✅ Datos guardados en: ${OUTPUT_PATH}`);
    console.log(`📊 Estadísticas:`);
    console.log(`   - Paradas: ${outputData.metadata.totalStops}`);
    console.log(`   - Líneas: ${outputData.metadata.totalLines}`);
}

main().catch(console.error);
