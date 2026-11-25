// Copia el catálogo de Bizkaibus generado en el repo hermano `bizkaitrans` (paradas con sus líneas, lista de líneas y
// recorridos por sentido) a `src/data/bizkaibus/catalog/`. Allí se regenera con `npm run data:bizkaibus-lines`.
//
// Uso: node scripts/sync-bizkaibus-catalog.mjs [ruta/a/bizkaitrans/src/data/bizkaibus]

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] ?? path.join(root, '..', 'bizkaitrans', 'src', 'data', 'bizkaibus');
const out = path.join(root, 'src', 'data', 'bizkaibus', 'catalog');

const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'));

const stops = await readJson(path.join(src, 'stops.json'));
const lines = await readJson(path.join(src, 'lines.json'));

const detail = {};
for (const file of (await readdir(path.join(src, 'lines'))).filter((f) => f.endsWith('.json'))) {
    const d = await readJson(path.join(src, 'lines', file));
    detail[d.code] = { code: d.code, name: d.name, directions: d.directions };
}

await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'stops.json'), JSON.stringify(stops));
await writeFile(path.join(out, 'lines.json'), JSON.stringify(lines));
await writeFile(path.join(out, 'lines-detail.json'), JSON.stringify(detail));
console.log(`${stops.length} paradas, ${lines.length} líneas, ${Object.keys(detail).length} recorridos → ${path.relative(root, out)}`);
