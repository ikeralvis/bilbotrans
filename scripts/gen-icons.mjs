// Genera los iconos PWA (192/512/96 + favicon) desde public/icons/icon.svg. Uso: node scripts/gen-icons.mjs
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_PATH || 'sharp');
const svg = await readFile('public/icons/icon.svg');

for (const size of [96, 192, 512]) {
    await sharp(svg, { density: 384 }).resize(size, size).png().toFile(`public/icons/icon-${size}x${size}.png`);
}
await sharp(svg, { density: 384 }).resize(32, 32).png().toFile('src/app/icon.png');
await sharp(svg, { density: 384 }).resize(180, 180).png().toFile('src/app/apple-icon.png');
console.log('icons ok');
