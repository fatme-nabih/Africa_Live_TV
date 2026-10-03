// Génère public/maps/africa-countries.json : contours des pays d'Afrique pour le fond de carte sombre du Radar.
//
// Source : Natural Earth « Admin 0 – Countries » 1:50m, domaine public (https://www.naturalearthdata.com/about/terms-of-use/).
// Usage  : node scripts/build-africa-countries.mjs <ne_50m_admin_0_countries.geojson> [tolérance en degrés]
//
// Le fichier est servi par Africa Live lui-même : aucun appel à un serveur de tuiles tiers, une quarantaine de Ko
// compressés contre plus d'un Mo pour un fond vectoriel en tuiles (mesure du 3 octobre 2026, vue « tout le continent »).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [input, toleranceArg = '0.03'] = process.argv.slice(2);
if (!input) throw new Error('Usage : node scripts/build-africa-countries.mjs <ne_50m_admin_0_countries.geojson> [tolérance]');
const TOLERANCE = Number(toleranceArg);
const MIN_RING_AREA = 0.02; // degrés carrés : les îlots plus petits disparaissent, sauf le plus grand anneau d'un pays.
const output = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'maps', 'africa-countries.json');

function distanceToSegment(point, start, end) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Douglas-Peucker itératif (pas de récursion : certains contours ont des milliers de points). */
function simplify(points, tolerance) {
  if (points.length <= 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let max = 0;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const d = distanceToSegment(points[i], points[first], points[last]);
      if (d > max) { max = d; index = i; }
    }
    if (max > tolerance && index > 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return Math.abs(area / 2);
}

const round = value => Math.round(value * 1000) / 1000;
const source = JSON.parse(readFileSync(input, 'utf8'));
const features = [];

for (const feature of source.features) {
  const p = feature.properties;
  // Maurice et les Seychelles sont classées « haute mer » par Natural Earth mais figurent dans la liste du Radar.
  if (p.CONTINENT !== 'Africa' && !['MUS', 'SYC'].includes(p.ADM0_A3)) continue;
  // Somaliland n'a pas de code ISO propre : il fait partie de la Somalie dans la liste du Radar.
  let code = p.ISO_A2_EH && p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : p.ISO_A2 !== '-99' ? p.ISO_A2 : p.ADM0_A3 === 'SOL' ? 'SO' : null;
  if (!code) throw new Error(`Pays sans code : ${p.NAME}`);
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const kept = [];
  let largest = null;
  for (const polygon of polygons) {
    const outer = polygon[0];
    const area = ringArea(outer);
    if (!largest || area > largest.area) largest = { polygon, area };
    if (area >= MIN_RING_AREA) kept.push(polygon);
  }
  if (kept.length === 0) kept.push(largest.polygon);
  const simplified = kept
    .map(polygon => polygon.map(ring => simplify(ring, TOLERANCE).map(([x, y]) => [round(x), round(y)])).filter(ring => ring.length >= 4))
    .filter(polygon => polygon.length > 0);
  if (simplified.length === 0) continue;
  features.push({
    type: 'Feature',
    properties: { code },
    geometry: simplified.length === 1 ? { type: 'Polygon', coordinates: simplified[0] } : { type: 'MultiPolygon', coordinates: simplified },
  });
}

// Somaliland et Somalie partagent le code SO : on les fusionne en un MultiPolygon pour garder un identifiant unique par pays.
const merged = new Map();
for (const feature of features) {
  const existing = merged.get(feature.properties.code);
  if (!existing) { merged.set(feature.properties.code, feature); continue; }
  const toMulti = geometry => (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates);
  existing.geometry = { type: 'MultiPolygon', coordinates: [...toMulti(existing.geometry), ...toMulti(feature.geometry)] };
}

mkdirSync(dirname(output), { recursive: true });
const result = { type: 'FeatureCollection', features: [...merged.values()].sort((a, b) => a.properties.code.localeCompare(b.properties.code)) };
writeFileSync(output, JSON.stringify(result));
const bytes = Buffer.byteLength(JSON.stringify(result));
console.log(`${result.features.length} pays, ${(bytes / 1024).toFixed(1)} Ko (tolérance ${TOLERANCE}°) → ${output}`);
console.log('Codes :', result.features.map(f => f.properties.code).join(' '));
