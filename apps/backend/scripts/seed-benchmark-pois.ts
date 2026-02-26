/**
 * Benchmark POI Seeder
 *
 * Fetches real OSM data via Overpass API for 6 Japanese cities
 * and loads it into the pois table for spatial query benchmarking.
 *
 * Usage:
 *   npx ts-node scripts/seed-benchmark-pois.ts          # seed
 *   npx ts-node scripts/seed-benchmark-pois.ts clean     # delete seeded data
 *
 * Run from apps/backend/:
 *   cd apps/backend && npx ts-node scripts/seed-benchmark-pois.ts
 *
 * Overpass API docs: https://wiki.openstreetmap.org/wiki/Overpass_API
 * - Rate limit: < 10,000 queries/day, < 1GB/day
 * - POST body: data=<url-encoded-query>
 * - bbox order: (south,west,north,east)
 */

import { Client } from 'pg';
import 'dotenv/config';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const BATCH_SIZE = 500;
// Overpass API: < 10,000 queries/day. Our queries are heavy (22 subqueries each),
// so 15s between cities is conservative enough to avoid 429.
const OVERPASS_DELAY_MS = 15_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CityRow {
  id: string;
  name_en: string;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface PoiInsert {
  cityId: string;
  name: string;
  nameLocal: string | null;
  lat: number;
  lon: number;
  category: string;
  subCategory: string | null;
  address: string | null;
  sourceId: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// OSM → PoiCategory mapping
// ---------------------------------------------------------------------------

interface OsmMapping {
  tag: string;
  values: string[];
  category: string;
  subCategoryFrom?: string;
}

const OSM_MAPPINGS: OsmMapping[] = [
  {
    tag: 'amenity',
    values: ['restaurant', 'fast_food', 'food_court', 'bbq'],
    category: 'restaurant',
    subCategoryFrom: 'cuisine',
  },
  {
    tag: 'amenity',
    values: ['cafe', 'ice_cream'],
    category: 'cafe',
  },
  {
    tag: 'amenity',
    values: ['bar', 'pub', 'biergarten', 'nightclub'],
    category: 'nightlife',
  },
  {
    tag: 'tourism',
    values: ['attraction', 'viewpoint', 'artwork'],
    category: 'attraction',
  },
  {
    tag: 'tourism',
    values: ['museum', 'gallery'],
    category: 'museum',
  },
  {
    tag: 'amenity',
    values: ['place_of_worship'],
    category: 'temple_shrine',
  },
  {
    tag: 'leisure',
    values: ['park', 'garden', 'nature_reserve', 'playground'],
    category: 'park',
  },
  {
    tag: 'shop',
    values: [
      'supermarket',
      'convenience',
      'department_store',
      'mall',
      'clothes',
      'gift',
      'books',
      'electronics',
      'variety_store',
    ],
    category: 'shopping',
  },
  {
    tag: 'amenity',
    values: ['theatre', 'cinema', 'arts_centre'],
    category: 'entertainment',
  },
  {
    tag: 'amenity',
    values: ['bus_station', 'ferry_terminal'],
    category: 'transport_hub',
  },
  {
    tag: 'railway',
    values: ['station', 'halt'],
    category: 'transport_hub',
  },
];

// Bounding boxes: (south,west,north,east) per Overpass QL spec
const CITY_BBOX: Record<string, string> = {
  Tokyo: '35.55,139.50,35.82,139.92',
  Osaka: '34.55,135.35,34.80,135.65',
  Kyoto: '34.90,135.65,35.10,135.85',
  Fukuoka: '33.48,130.28,33.70,130.52',
  Sapporo: '42.95,141.20,43.18,141.50',
  Naha: '26.15,127.60,26.35,127.78',
};

// ---------------------------------------------------------------------------
// Overpass query builder
// ---------------------------------------------------------------------------

function buildOverpassQuery(bbox: string): string {
  const nodeQueries: string[] = [];
  const wayQueries: string[] = [];

  for (const mapping of OSM_MAPPINGS) {
    const valuePattern = mapping.values.join('|');
    nodeQueries.push(`node["${mapping.tag}"~"^(${valuePattern})$"](${bbox});`);
    wayQueries.push(`way["${mapping.tag}"~"^(${valuePattern})$"](${bbox});`);
  }

  // [out:json] → JSON response
  // [timeout:120] → 2 min timeout (default is 3 min, but explicit is clearer)
  // out center body → includes center coords for ways
  return `[out:json][timeout:120];
(
  ${nodeQueries.join('\n  ')}
  ${wayQueries.join('\n  ')}
);
out center body;`;
}

// ---------------------------------------------------------------------------
// Category resolution
// ---------------------------------------------------------------------------

function resolveCategory(
  tags: Record<string, string>,
): { category: string; subCategory: string | null } | null {
  for (const mapping of OSM_MAPPINGS) {
    const tagValue = tags[mapping.tag];
    if (tagValue && mapping.values.includes(tagValue)) {
      const subCategory = mapping.subCategoryFrom
        ? (tags[mapping.subCategoryFrom] ?? null)
        : (tagValue ?? null);
      return { category: mapping.category, subCategory };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fetch from Overpass API
// ---------------------------------------------------------------------------

async function fetchOverpassData(
  cityName: string,
  bbox: string,
): Promise<OverpassElement[]> {
  const query = buildOverpassQuery(bbox);
  console.log(`  Fetching ${cityName} (bbox: ${bbox})...`);

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < MAX_RETRIES
      ) {
        console.log(
          `  ${cityName}: HTTP ${response.status}, retry ${attempt}/${MAX_RETRIES}...`,
        );
        await new Promise((r) => setTimeout(r, OVERPASS_DELAY_MS * attempt));
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Overpass API error for ${cityName}: ${response.status} - ${text.slice(0, 200)}`,
        );
      }

      const data = (await response.json()) as OverpassResponse;
      console.log(`  ${cityName}: ${data.elements.length} raw elements`);
      return data.elements;
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      console.log(
        `  ${cityName}: fetch error, retry ${attempt}/${MAX_RETRIES}...`,
      );
      await new Promise((r) => setTimeout(r, OVERPASS_DELAY_MS * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(
    `Overpass fetch failed for ${cityName} after ${MAX_RETRIES} retries`,
  );
}

// ---------------------------------------------------------------------------
// Transform OSM elements → POI inserts
// ---------------------------------------------------------------------------

function transformElements(
  elements: OverpassElement[],
  cityId: string,
): PoiInsert[] {
  const pois: PoiInsert[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    if (!el.tags) continue;

    // node → lat/lon direct, way → center.lat/center.lon
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const osmId = `${el.type}/${el.id}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);

    const resolved = resolveCategory(el.tags);
    if (!resolved) continue;

    // Require at least one name
    const name =
      el.tags['name:en'] || el.tags['name'] || el.tags['name:ja'] || null;
    if (!name) continue;

    const nameLocal = el.tags['name:ja'] || el.tags['name'] || null;

    const address =
      el.tags['addr:full'] ||
      [
        el.tags['addr:city'],
        el.tags['addr:street'],
        el.tags['addr:housenumber'],
      ]
        .filter(Boolean)
        .join(' ') ||
      null;

    const poiTags: string[] = ['benchmark-seed'];
    if (el.tags['cuisine']) poiTags.push(...el.tags['cuisine'].split(';'));
    if (el.tags['opening_hours']) poiTags.push('has_hours');

    pois.push({
      cityId,
      name,
      nameLocal: nameLocal !== name ? nameLocal : null,
      lat,
      lon,
      category: resolved.category,
      subCategory: resolved.subCategory,
      address: address || null,
      sourceId: osmId,
      tags: poiTags,
    });
  }

  return pois;
}

// ---------------------------------------------------------------------------
// Batch insert into DB
// ---------------------------------------------------------------------------

function escapeArrayLiteral(tags: string[]): string {
  if (tags.length === 0) return '{}';
  const escaped = tags.map(
    (t) => `"${t.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`,
  );
  return `{${escaped.join(',')}}`;
}

async function insertPois(client: Client, pois: PoiInsert[]): Promise<number> {
  if (pois.length === 0) return 0;

  let inserted = 0;
  const PARAMS_PER_ROW = 12;

  for (let i = 0; i < pois.length; i += BATCH_SIZE) {
    const batch = pois.slice(i, i + BATCH_SIZE);
    const values: unknown[] = [];
    const placeholders: string[] = [];

    for (let j = 0; j < batch.length; j++) {
      const poi = batch[j]!;
      const off = j * PARAMS_PER_ROW;
      placeholders.push(
        `($${off + 1}, $${off + 2}, $${off + 3}, ` +
          `ST_SetSRID(ST_MakePoint($${off + 4}, $${off + 5}), 4326)::geography, ` +
          `$${off + 6}::pois_category_enum, $${off + 7}, $${off + 8}, ` +
          `$${off + 9}, $${off + 10}::pois_source_enum, $${off + 11}, $${off + 12})`,
      );
      values.push(
        poi.cityId, // $1  city_id
        poi.name, // $2  name
        poi.nameLocal, // $3  name_local
        poi.lon, // $4  ST_MakePoint(lng, lat)
        poi.lat, // $5
        poi.category, // $6  category
        poi.subCategory, // $7  sub_category
        poi.sourceId, // $8  source_id
        escapeArrayLiteral(poi.tags), // $9 tags
        'osm', // $10 source
        'ja', // $11 locale
        true, // $12 is_active
      );
    }

    const sql = `
      INSERT INTO pois (city_id, name, name_local, location, category, sub_category, source_id, tags, source, locale, is_active)
      VALUES ${placeholders.join(',\n             ')}
      ON CONFLICT (source, source_id) WHERE source_id IS NOT NULL DO NOTHING
    `;

    const result = await client.query(sql, values);
    inserted += result.rowCount ?? 0;
  }

  return inserted;
}

// ---------------------------------------------------------------------------
// DB helper
// ---------------------------------------------------------------------------

async function getDbClient(): Promise<Client> {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'nomad_pilot',
  });
  await client.connect();
  return client;
}

async function getCities(client: Client): Promise<CityRow[]> {
  const result = await client.query<CityRow>(
    `SELECT id, name_en FROM cities WHERE country_code = 'JP' AND is_active = true ORDER BY name_en`,
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  console.log('=== Benchmark POI Seeder ===\n');
  const client = await getDbClient();

  try {
    const cities = await getCities(client);
    if (cities.length === 0) {
      throw new Error('No Japanese cities found. Run migrations first.');
    }
    console.log(
      `Found ${cities.length} cities: ${cities.map((c) => c.name_en).join(', ')}\n`,
    );

    let totalInserted = 0;

    for (const city of cities) {
      const bbox = CITY_BBOX[city.name_en];
      if (!bbox) {
        console.log(`  Skipping ${city.name_en}: no bbox defined`);
        continue;
      }

      // Skip cities that already have benchmark POI data
      const existing = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM pois
         WHERE city_id = $1 AND 'benchmark-seed' = ANY(tags)`,
        [city.id],
      );
      const existingCount = parseInt(existing.rows[0]?.count ?? '0', 10);
      if (existingCount > 0) {
        console.log(
          `  ${city.name_en}: already has ${existingCount} POIs, skipping`,
        );
        continue;
      }

      const elements = await fetchOverpassData(city.name_en, bbox);
      const pois = transformElements(elements, city.id);
      console.log(
        `  ${city.name_en}: ${pois.length} valid POIs after transform`,
      );

      const inserted = await insertPois(client, pois);
      console.log(`  ${city.name_en}: ${inserted} inserted\n`);
      totalInserted += inserted;

      // Overpass courtesy delay between city requests
      await new Promise((resolve) => setTimeout(resolve, OVERPASS_DELAY_MS));
    }

    // Print summary
    console.log('=== Summary ===');
    const countResult = await client.query<{ name_en: string; count: string }>(
      `SELECT c.name_en, COUNT(p.id)::text as count
       FROM cities c LEFT JOIN pois p ON c.id = p.city_id
       WHERE c.country_code = 'JP'
       GROUP BY c.name_en ORDER BY c.name_en`,
    );
    for (const row of countResult.rows) {
      console.log(`  ${row.name_en}: ${row.count} POIs`);
    }
    console.log(`\nTotal inserted this run: ${totalInserted}`);
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// Clean
// ---------------------------------------------------------------------------

async function clean(): Promise<void> {
  console.log('=== Cleaning benchmark POI data ===\n');
  const client = await getDbClient();

  try {
    const result = await client.query(
      `DELETE FROM pois WHERE 'benchmark-seed' = ANY(tags)`,
    );
    console.log(`Deleted ${result.rowCount ?? 0} POIs`);
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const command = process.argv[2];

if (command === 'clean') {
  void clean().catch((err: unknown) => {
    console.error('Clean failed:', err);
    process.exit(1);
  });
} else {
  void seed().catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
