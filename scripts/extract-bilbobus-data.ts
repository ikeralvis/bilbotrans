import https from 'https';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const OUTPUT_PATH = path.join(process.cwd(), 'src/data/bilbobus/data.json');

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

// Líneas extraídas del GTFS routes.txt (26 enero 2026)
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
    { id: '76', name: 'ARTAZU/XALBADOR  - MOYÚA' },
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
    // Líneas Gautxori (nocturnas)
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
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function getLineStops(lineId: string): Promise<{ stopId: string; stopName: string }[]> {
    try {
        console.log(`Obteniendo paradas de línea ${lineId}...`);
        
        // Intenta obtener info de la línea desde la página web
        const url = `https://www.bilbao.eus/cs/Satellite/bilbobus/es/linea?codLinea=${lineId}`;
        const html = await httpsGet(url);
        
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        
        const stops: { stopId: string; stopName: string }[] = [];
        
        // Buscar paradas en el HTML (pueden estar en diferentes formatos)
        const stopElements = doc.querySelectorAll('[data-codparada], .parada, .stop');
        
        stopElements.forEach(el => {
            const stopId = el.getAttribute('data-codparada') || el.getAttribute('id');
            const stopName = el.textContent?.trim();
            
            if (stopId && stopName) {
                stops.push({ stopId, stopName });
            }
        });
        
        // Si no encontramos paradas en el HTML, usar la API AJAX
        if (stops.length === 0) {
            const ajaxUrl = `https://www.bilbao.eus/cs/Satellite?pagename=Bilbaonet/Comunes/Presentacion/BBUS_pintarRecorrido_Ajax&codLinea=${lineId}&temporada=21&language=es`;
            const response = await httpsGet(ajaxUrl);
            const data = JSON.parse(response);
            
            if (Array.isArray(data)) {
                data.forEach(item => {
                    if (item.codParada) {
                        stops.push({
                            stopId: item.codParada,
                            stopName: item.nombreParada || `Parada ${item.codParada}`
                        });
                    }
                });
            }
        }
        
        console.log(`  ✓ ${stops.length} paradas encontradas`);
        return stops;
    } catch (error) {
        console.error(`  ✗ Error en línea ${lineId}:`, error);
        return [];
    }
}

async function main() {
    console.log('🚀 Extrayendo datos de Bilbobus desde API web\n');
    
    const lines: Record<string, Line> = {};
    const stops: Record<string, Stop> = {};
    
    // Procesar cada línea
    for (const lineInfo of KNOWN_LINES) {
        const lineStops = await getLineStops(lineInfo.id);
        
        // Agregar línea
        lines[lineInfo.id] = {
            id: lineInfo.id,
            name: lineInfo.name,
            stops: lineStops.map(s => s.stopId)
        };
        
        // Agregar paradas
        for (const { stopId, stopName } of lineStops) {
            if (!stops[stopId]) {
                stops[stopId] = {
                    id: stopId,
                    name: stopName,
                    lat: 43.2630, // Coordenadas default de Bilbao
                    lon: -2.9350,
                    lines: []
                };
            }
            
            if (!stops[stopId].lines.includes(lineInfo.id)) {
                stops[stopId].lines.push(lineInfo.id);
            }
        }
        
        // Pequeña pausa para no saturar el servidor
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Guardar resultado
    const outputData = {
        lines,
        stops,
        metadata: {
            generated: new Date().toISOString(),
            totalStops: Object.keys(stops).length,
            totalLines: Object.keys(lines).length,
            source: 'Bilbobus Web API',
            note: 'Coordinates are approximate (Bilbao center). Update with real coordinates if available.'
        }
    };
    
    // Crear directorio si no existe
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
