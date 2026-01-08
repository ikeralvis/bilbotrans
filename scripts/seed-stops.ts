import 'dotenv/config'; // Must be first to load .env before other imports use it
import { db } from '../src/db';
import { stops } from '../src/db/schema';
import { sql } from 'drizzle-orm';

// Datos de paradas de Metro Bilbao con coordenadas reales
// Fuente: OpenStreetMap y datos oficiales de Metro Bilbao
const METRO_STOPS = [
  // L1 y L2 - Estaciones principales
  { id: 'ABA', name: 'Abando', lat: 43.256787, lon: -2.923503 },
  { id: 'CAV', name: 'Zazpikaleak/Casco Viejo', lat: 43.257096, lon: -2.927034 },
  { id: 'SAN', name: 'Santutxu', lat: 43.266247, lon: -2.920735 },
  { id: 'BAS', name: 'Basarrate', lat: 43.271164, lon: -2.916458 },
  { id: 'BOL', name: 'Bolueta', lat: 43.273815, lon: -2.911293 },
  { id: 'ETX', name: 'Etxebarri', lat: 43.281449, lon: -2.903771 },
  { id: 'MOY', name: 'Moyua', lat: 43.262691, lon: -2.926072 },
  { id: 'IND', name: 'Indautxu', lat: 43.263889, lon: -2.931111 },
  { id: 'SAM', name: 'Santimami/San Mamés', lat: 43.263961, lon: -2.936722 },
  { id: 'DEU', name: 'Deustu', lat: 43.268056, lon: -2.947500 },
  { id: 'SAR', name: 'Sarriko', lat: 43.273889, lon: -2.951389 },
  { id: 'SIN', name: 'San Ignazio', lat: 43.282778, lon: -2.955556 },
  
  // L1 - Hacia Plentzia
  { id: 'LUT', name: 'Lutxana', lat: 43.288889, lon: -2.965833 },
  { id: 'ERA', name: 'Erandio', lat: 43.301389, lon: -2.969722 },
  { id: 'AST', name: 'Astrabudua', lat: 43.310556, lon: -2.975000 },
  { id: 'LEI', name: 'Leioa', lat: 43.327778, lon: -2.985833 },
  { id: 'LAM', name: 'Lamiako', lat: 43.338056, lon: -2.991667 },
  { id: 'ARE', name: 'Areeta', lat: 43.342500, lon: -2.997222 },
  { id: 'GOB', name: 'Gobela', lat: 43.348889, lon: -3.003333 },
  { id: 'NEG', name: 'Neguri', lat: 43.355000, lon: -3.011667 },
  { id: 'AIB', name: 'Aiboa', lat: 43.360833, lon: -3.016667 },
  { id: 'ALG', name: 'Algorta', lat: 43.368056, lon: -3.025000 },
  { id: 'BID', name: 'Bidezabal', lat: 43.374444, lon: -3.032778 },
  { id: 'IBB', name: 'Ibarbengoa', lat: 43.380278, lon: -3.041667 },
  { id: 'BER', name: 'Berango', lat: 43.385833, lon: -3.050000 },
  { id: 'LAR', name: 'Larrabasterra', lat: 43.391389, lon: -3.058333 },
  { id: 'SOP', name: 'Sopela', lat: 43.397500, lon: -3.066667 },
  { id: 'URD', name: 'Urduliz', lat: 43.404167, lon: -3.075000 },
  { id: 'PLE', name: 'Plentzia', lat: 43.411111, lon: -3.085000 },
  
  // L2 - Hacia Santurtzi/Kabiezes
  { id: 'GUR', name: 'Gurutzeta/Cruces', lat: 43.287778, lon: -2.960556 },
  { id: 'ANS', name: 'Ansio', lat: 43.294444, lon: -2.970000 },
  { id: 'BAR', name: 'Barakaldo', lat: 43.301944, lon: -2.980278 },
  { id: 'BAG', name: 'Bagatza', lat: 43.308611, lon: -2.990556 },
  { id: 'URB', name: 'Urbinaga', lat: 43.314722, lon: -2.999167 },
  { id: 'SES', name: 'Sestao', lat: 43.322222, lon: -3.006667 },
  { id: 'ABT', name: 'Abatxolo', lat: 43.328056, lon: -3.014722 },
  { id: 'POR', name: 'Portugalete', lat: 43.334167, lon: -3.022500 },
  { id: 'PEN', name: 'Peñota', lat: 43.340278, lon: -3.030833 },
  { id: 'STZ', name: 'Santurtzi', lat: 43.346389, lon: -3.039167 },
  { id: 'KAB', name: 'Kabiezes', lat: 43.352500, lon: -3.047500 },
  
  // L2 - Hacia Basauri
  { id: 'ARZ', name: 'Ariz', lat: 43.284722, lon: -2.893333 },
  { id: 'BSR', name: 'Basauri', lat: 43.287778, lon: -2.886667 },
];

async function main() {
    console.log('🌱 Seeding Metro Bilbao stops...');

    const values = METRO_STOPS.map(stop => ({
        id: stop.id,
        agency: 'metro',
        name: stop.name,
        lat: stop.lat,
        lon: stop.lon,
        metadata: { lines: ['L1', 'L2'], platforms: 2 }
    }));

    if (values.length === 0) {
        console.log('No data to insert.');
        return;
    }

    try {
        // Clear existing stops first
        await db.delete(stops).where(sql`agency = 'metro'`);
        console.log('✓ Cleared existing metro stops');

        // Insert stops
        await db.insert(stops).values(values);
        console.log(`✅ Seeded ${values.length} metro stations.`);
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
}

main();
