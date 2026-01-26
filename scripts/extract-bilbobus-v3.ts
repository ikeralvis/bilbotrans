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

interface RouteVariant {
    id: string;           // ej: "01_SEM_IDA", "01A_SEM_VLT"
    name: string;         // ej: "ARANGOITI-PLAZA CIRCULAR - Ruta de ida..."
    direction: 'IDA' | 'VUELTA' | 'OTHER';
    stops: string[];      // IDs de paradas en orden
}

interface Line {
    id: string;           // ej: "01"
    name: string;         // ej: "ARANGOITI - PLAZA CIRCULAR"
    variants: RouteVariant[];
    allStops: string[];   // Todas las paradas únicas de todas las variantes
}

// Líneas a procesar
const LINE_IDS = [
    '01', '03', '10', '11', '13', '18', '22', '27', '28', '30',
    '34', '38', '40', '43', '48', '50', '55', '56', '57', '58',
    '62', '71', '72', '75', '76', '77', '85', '88',
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9',
    'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8'
];

function httpsGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: 30000 }, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

function extractRouteVariants(html: string): { id: string; name: string }[] {
    const variants: { id: string; name: string }[] = [];
    
    // Buscar todas las opciones del select
    const optionRegex = /<option\s+value="([^"]+)"[^>]*>([^<]+)<\/option>/g;
    let match;
    
    while ((match = optionRegex.exec(html)) !== null) {
        const id = match[1].trim();
        const name = match[2].trim();
        
        // Solo incluir rutas válidas (no vacías)
        if (id && name && !id.includes('undefined')) {
            variants.push({ id, name });
        }
    }
    
    return variants;
}

function extractStopsFromHtml(html: string): { id: string; name: string; lat: number; lon: number }[] {
    const stops: { id: string; name: string; lat: number; lon: number }[] = [];
    
    // Buscar filas de la tabla con paradas
    // El patrón es: id="ida_XXXX" o id="vuelta_XXXX" seguido del nombre
    const rowRegex = /id="(?:ida|vuelta)_(\d+)"[^>]*>.*?fa-map-marker">&nbsp;<\/span>([^<]+)<.*?google\.com\/maps\/place\/([\d.-]+),([\d.-]+)/gs;
    
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
        const stopId = match[1];
        const stopName = match[2].trim();
        const lat = parseFloat(match[3]);
        const lon = parseFloat(match[4]);
        
        // Evitar duplicados
        if (!stops.find(s => s.id === stopId)) {
            stops.push({ id: stopId, name: stopName, lat, lon });
        }
    }
    
    // Si no encontramos con el patrón complejo, intentar uno más simple
    if (stops.length === 0) {
        // Patrón alternativo: buscar IDs de parada
        const idRegex = /id="(?:ida|vuelta)_(\d+)"/g;
        const nameRegex = /fa-map-marker">&nbsp;<\/span>([^<]+)</g;
        const coordRegex = /google\.com\/maps\/place\/([\d.-]+),([\d.-]+)/g;
        
        const ids: string[] = [];
        const names: string[] = [];
        const coords: { lat: number; lon: number }[] = [];
        
        while ((match = idRegex.exec(html)) !== null) {
            ids.push(match[1]);
        }
        while ((match = nameRegex.exec(html)) !== null) {
            names.push(match[1].trim());
        }
        while ((match = coordRegex.exec(html)) !== null) {
            coords.push({ lat: parseFloat(match[1]), lon: parseFloat(match[2]) });
        }
        
        for (let i = 0; i < ids.length; i++) {
            stops.push({
                id: ids[i],
                name: names[i] || `Parada ${ids[i]}`,
                lat: coords[i]?.lat || 43.263,
                lon: coords[i]?.lon || -2.935
            });
        }
    }
    
    return stops;
}

function extractStopOrder(html: string): string[] {
    const order: string[] = [];
    const idRegex = /id="(?:ida|vuelta)_(\d+)"/g;
    let match;
    
    while ((match = idRegex.exec(html)) !== null) {
        const stopId = match[1];
        if (!order.includes(stopId)) {
            order.push(stopId);
        }
    }
    
    return order;
}

function getDirection(routeId: string): 'IDA' | 'VUELTA' | 'OTHER' {
    if (routeId.includes('_IDA')) return 'IDA';
    if (routeId.includes('_VLT')) return 'VUELTA';
    return 'OTHER';
}

async function getLineData(lineId: string): Promise<{ line: Line; stops: { id: string; name: string; lat: number; lon: number }[] }> {
    const allStops: { id: string; name: string; lat: number; lon: number }[] = [];
    const variants: RouteVariant[] = [];
    let lineName = '';
    
    try {
        // Obtener página principal de la línea
        const mainUrl = `https://www.bilbao.eus/cs/Satellite/bilbobus/es/linea?temporada_linea=21&codLinea=${lineId}`;
        console.log(`\n📍 Línea ${lineId}...`);
        
        const mainHtml = await httpsGet(mainUrl);
        
        // Extraer nombre de la línea del título
        const titleMatch = mainHtml.match(/<h2[^>]*>L[ií]nea\s+\d+[A-Za-z]*:\s*([^<]+)<\/h2>/i);
        lineName = titleMatch ? titleMatch[1].trim() : `Línea ${lineId}`;
        
        // Extraer todas las variantes de ruta del select
        const routeVariants = extractRouteVariants(mainHtml);
        console.log(`   Variantes encontradas: ${routeVariants.length}`);
        
        // Procesar cada variante
        for (const variant of routeVariants) {
            try {
                const variantUrl = `https://www.bilbao.eus/cs/Satellite/bilbobus/es/linea?rutaAct=${variant.id}&temporada_linea=21&codLinea=${lineId}`;
                const variantHtml = await httpsGet(variantUrl);
                
                // Extraer paradas de esta variante
                const variantStops = extractStopsFromHtml(variantHtml);
                const stopOrder = extractStopOrder(variantHtml);
                
                // Agregar paradas nuevas al conjunto global
                for (const stop of variantStops) {
                    if (!allStops.find(s => s.id === stop.id)) {
                        allStops.push(stop);
                    }
                }
                
                // Crear la variante
                variants.push({
                    id: variant.id,
                    name: variant.name,
                    direction: getDirection(variant.id),
                    stops: stopOrder
                });
                
                console.log(`   ✓ ${variant.id}: ${stopOrder.length} paradas`);
                
                // Pequeña pausa entre requests
                await new Promise(r => setTimeout(r, 300));
                
            } catch (err) {
                console.log(`   ✗ ${variant.id}: Error`);
            }
        }
        
        // Si no se encontraron variantes en el select, usar la página principal
        if (variants.length === 0) {
            const mainStops = extractStopsFromHtml(mainHtml);
            const stopOrder = extractStopOrder(mainHtml);
            
            for (const stop of mainStops) {
                allStops.push(stop);
            }
            
            variants.push({
                id: `${lineId}_DEFAULT`,
                name: lineName,
                direction: 'IDA',
                stops: stopOrder
            });
            
            console.log(`   ✓ Default: ${stopOrder.length} paradas`);
        }
        
    } catch (error) {
        console.error(`   ✗ Error general: ${(error as Error).message}`);
    }
    
    const allStopIds = [...new Set(variants.flatMap(v => v.stops))];
    
    return {
        line: {
            id: lineId,
            name: lineName,
            variants,
            allStops: allStopIds
        },
        stops: allStops
    };
}

async function main() {
    console.log('🚌 Extrayendo datos completos de Bilbobus');
    console.log('   Incluyendo todas las variantes IDA/VUELTA\n');
    
    const lines: Record<string, Line> = {};
    const stops: Record<string, Stop> = {};
    
    let processedLines = 0;
    
    for (const lineId of LINE_IDS) {
        try {
            const { line, stops: lineStops } = await getLineData(lineId);
            
            // Guardar línea
            lines[lineId] = line;
            
            // Guardar paradas
            for (const stop of lineStops) {
                if (!stops[stop.id]) {
                    stops[stop.id] = {
                        id: stop.id,
                        name: stop.name,
                        lat: stop.lat,
                        lon: stop.lon,
                        lines: []
                    };
                }
                
                if (!stops[stop.id].lines.includes(lineId)) {
                    stops[stop.id].lines.push(lineId);
                }
            }
            
            processedLines++;
            
            // Pausa entre líneas
            await new Promise(r => setTimeout(r, 500));
            
        } catch (error) {
            console.error(`Error en línea ${lineId}:`, error);
        }
    }
    
    // Guardar resultado
    const outputData = {
        lines,
        stops,
        metadata: {
            generated: new Date().toISOString(),
            totalStops: Object.keys(stops).length,
            totalLines: Object.keys(lines).length,
            totalVariants: Object.values(lines).reduce((sum, l) => sum + l.variants.length, 0),
            source: 'Bilbobus Web (bilbao.eus)',
            features: [
                'Multiple route variants per line',
                'IDA/VUELTA directions',
                'Real stop names',
                'GPS coordinates',
                'Stop order per variant'
            ]
        }
    };
    
    // Crear directorio si no existe
    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2), 'utf-8');
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ Datos guardados en: ${OUTPUT_PATH}`);
    console.log(`\n📊 Estadísticas:`);
    console.log(`   - Líneas procesadas: ${processedLines}`);
    console.log(`   - Total paradas: ${outputData.metadata.totalStops}`);
    console.log(`   - Total variantes: ${outputData.metadata.totalVariants}`);
}

main().catch(console.error);
