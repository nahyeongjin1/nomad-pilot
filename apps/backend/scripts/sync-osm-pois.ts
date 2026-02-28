/**
 * Production OSM POI Sync Pipeline
 *
 * Fetches OSM data via Overpass API and syncs to pois table with UPSERT.
 * Tracks sync timestamps for incremental updates and deactivation detection.
 *
 * Usage:
 *   npx ts-node scripts/sync-osm-pois.ts                # sync all cities
 *   npx ts-node scripts/sync-osm-pois.ts sync Tokyo     # sync single city
 *   npx ts-node scripts/sync-osm-pois.ts status         # show current counts
 *
 * Run from apps/backend/:
 *   cd apps/backend && npx ts-node scripts/sync-osm-pois.ts
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

interface PoiUpsert {
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
  openingHours: string | null; // jsonb stringified
  website: string | null;
  phone: string | null;
}

// ---------------------------------------------------------------------------
// Name selection (locale-aware)
// ---------------------------------------------------------------------------

const NAME_PRIORITY: Record<string, string[]> = {
  ko: ['name:ko', 'name:en', 'name', 'name:ja'],
  en: ['name:en', 'name', 'name:ja'],
};

const NAME_LOCAL_PRIORITY: Record<string, string[]> = {
  ko: ['name:ja', 'name'],
  en: ['name:ja', 'name'],
};

function selectName(
  tags: Record<string, string>,
  locale: string,
): string | null {
  const priority = NAME_PRIORITY[locale] ?? NAME_PRIORITY['en']!;
  for (const key of priority) {
    if (tags[key]) return tags[key];
  }
  return null;
}

function selectNameLocal(
  tags: Record<string, string>,
  locale: string,
): string | null {
  const priority = NAME_LOCAL_PRIORITY[locale] ?? NAME_LOCAL_PRIORITY['en']!;
  for (const key of priority) {
    if (tags[key]) return tags[key];
  }
  return null;
}

// ---------------------------------------------------------------------------
// OSM → PoiCategory mapping (same as benchmark)
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
// Transform OSM elements → POI upserts
// ---------------------------------------------------------------------------

const LOCALE = 'ko';

function buildOpeningHoursJson(raw: string): string {
  return JSON.stringify({ raw, parsed: false });
}

function transformElements(
  elements: OverpassElement[],
  cityId: string,
): PoiUpsert[] {
  const pois: PoiUpsert[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    if (!el.tags) continue;

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const osmId = `${el.type}/${el.id}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);

    const resolved = resolveCategory(el.tags);
    if (!resolved) continue;

    const name = selectName(el.tags, LOCALE);
    if (!name) continue;

    const nameLocal = selectNameLocal(el.tags, LOCALE);

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

    // Build tags from OSM metadata
    const poiTags: string[] = [];
    if (el.tags['cuisine']) {
      poiTags.push(
        ...el.tags['cuisine']
          .split(';')
          .map((v) => v.trim())
          .filter(Boolean),
      );
    }
    if (el.tags['wikidata']) poiTags.push('has_wikidata');
    if (el.tags['wikipedia']) poiTags.push('has_wikipedia');
    if (el.tags['opening_hours']) poiTags.push('has_hours');

    const openingHoursRaw = el.tags['opening_hours'] ?? null;
    const website = el.tags['website'] ?? null;
    const phone = el.tags['phone'] ?? null;

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
      openingHours: openingHoursRaw
        ? buildOpeningHoursJson(openingHoursRaw)
        : null,
      website: website ? website.slice(0, 1000) : null,
      phone: phone ? phone.slice(0, 50) : null,
    });
  }

  return pois;
}

// ---------------------------------------------------------------------------
// Batch UPSERT into DB
// ---------------------------------------------------------------------------

async function upsertPois(
  client: Client,
  pois: PoiUpsert[],
  syncTimestamp: Date,
): Promise<{ upserted: number }> {
  if (pois.length === 0) return { upserted: 0 };

  let upserted = 0;
  const PARAMS_PER_ROW = 16;

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
          `$${off + 9}::text[], $${off + 10}::pois_source_enum, $${off + 11}, $${off + 12}, ` +
          `$${off + 13}, $${off + 14}::jsonb, $${off + 15}, $${off + 16})`,
      );
      values.push(
        poi.cityId, //  1  city_id
        poi.name, //  2  name
        poi.nameLocal, //  3  name_local
        poi.lon, //  4  ST_MakePoint(lng, lat)
        poi.lat, //  5
        poi.category, //  6  category
        poi.subCategory, //  7  sub_category
        poi.sourceId, //  8  source_id
        poi.tags, //  9  tags
        'osm', // 10  source
        LOCALE, // 11  locale
        poi.address, // 12  address
        syncTimestamp, // 13  last_synced_at
        poi.openingHours, // 14  opening_hours (jsonb)
        poi.website, // 15  website
        poi.phone, // 16  phone
      );
    }

    const sql = `
      INSERT INTO pois (
        city_id, name, name_local, location, category, sub_category,
        source_id, tags, source, locale, address,
        last_synced_at, opening_hours, website, phone
      )
      VALUES ${placeholders.join(',\n             ')}
      ON CONFLICT (source, source_id) WHERE source_id IS NOT NULL
      DO UPDATE SET
        name = EXCLUDED.name,
        name_local = EXCLUDED.name_local,
        location = EXCLUDED.location,
        category = EXCLUDED.category,
        sub_category = EXCLUDED.sub_category,
        address = EXCLUDED.address,
        opening_hours = EXCLUDED.opening_hours,
        website = EXCLUDED.website,
        phone = EXCLUDED.phone,
        tags = EXCLUDED.tags,
        is_active = true,
        last_synced_at = EXCLUDED.last_synced_at,
        updated_at = NOW()
    `;

    const result = await client.query(sql, values);
    upserted += result.rowCount ?? 0;
  }

  return { upserted };
}

// ---------------------------------------------------------------------------
// Deactivation detection
// ---------------------------------------------------------------------------

async function deactivateStale(
  client: Client,
  cityId: string,
  syncStartedAt: Date,
): Promise<number> {
  const result = await client.query(
    `UPDATE pois
     SET is_active = false, updated_at = NOW()
     WHERE city_id = $1
       AND source = 'osm'
       AND last_synced_at < $2
       AND is_active = true`,
    [cityId, syncStartedAt],
  );
  return result.rowCount ?? 0;
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
// Sync (main operation)
// ---------------------------------------------------------------------------

async function syncCity(
  client: Client,
  city: CityRow,
  syncTimestamp: Date,
): Promise<{ upserted: number; deactivated: number }> {
  const bbox = CITY_BBOX[city.name_en];
  if (!bbox) {
    console.log(`  Skipping ${city.name_en}: no bbox defined`);
    return { upserted: 0, deactivated: 0 };
  }

  const elements = await fetchOverpassData(city.name_en, bbox);
  const pois = transformElements(elements, city.id);
  console.log(`  ${city.name_en}: ${pois.length} valid POIs after transform`);

  const { upserted } = await upsertPois(client, pois, syncTimestamp);
  const deactivated = await deactivateStale(client, city.id, syncTimestamp);

  console.log(
    `  ${city.name_en}: ${upserted} upserted, ${deactivated} deactivated\n`,
  );
  return { upserted, deactivated };
}

async function sync(cityFilter?: string): Promise<void> {
  console.log('=== OSM POI Sync Pipeline ===\n');
  const client = await getDbClient();
  const syncTimestamp = new Date();

  try {
    let cities = await getCities(client);
    if (cities.length === 0) {
      throw new Error('No Japanese cities found. Run migrations first.');
    }

    if (cityFilter) {
      cities = cities.filter(
        (c) => c.name_en.toLowerCase() === cityFilter.toLowerCase(),
      );
      if (cities.length === 0) {
        throw new Error(
          `City "${cityFilter}" not found. Available: ${(await getCities(client)).map((c) => c.name_en).join(', ')}`,
        );
      }
    }

    console.log(
      `Syncing ${cities.length} city(ies): ${cities.map((c) => c.name_en).join(', ')}\n`,
    );

    let totalUpserted = 0;
    let totalDeactivated = 0;

    for (let i = 0; i < cities.length; i++) {
      const city = cities[i]!;
      const result = await syncCity(client, city, syncTimestamp);
      totalUpserted += result.upserted;
      totalDeactivated += result.deactivated;

      // Overpass courtesy delay between city requests
      if (i < cities.length - 1) {
        console.log(
          `  Waiting ${OVERPASS_DELAY_MS / 1000}s before next city...\n`,
        );
        await new Promise((resolve) => setTimeout(resolve, OVERPASS_DELAY_MS));
      }
    }

    console.log('=== Sync Complete ===');
    console.log(`  Upserted:    ${totalUpserted}`);
    console.log(`  Deactivated: ${totalDeactivated}`);
    console.log(`  Timestamp:   ${syncTimestamp.toISOString()}\n`);

    await printStatus(client);
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

async function printStatus(client: Client): Promise<void> {
  const result = await client.query<{
    name_en: string;
    total: string;
    active: string;
    inactive: string;
    with_place_id: string;
    last_synced: string | null;
  }>(
    `SELECT
       c.name_en,
       COUNT(p.id)::text AS total,
       COUNT(p.id) FILTER (WHERE p.is_active)::text AS active,
       COUNT(p.id) FILTER (WHERE NOT p.is_active)::text AS inactive,
       COUNT(p.id) FILTER (WHERE p.google_place_id IS NOT NULL)::text AS with_place_id,
       MAX(p.last_synced_at)::text AS last_synced
     FROM cities c
     LEFT JOIN pois p ON c.id = p.city_id AND p.source = 'osm'
     WHERE c.country_code = 'JP'
     GROUP BY c.name_en
     ORDER BY c.name_en`,
  );

  console.log('=== POI Status ===');
  console.log('  City        | Active | Inactive | PlaceID | Last Synced');
  console.log(
    '  ------------|--------|----------|---------|--------------------',
  );
  for (const row of result.rows) {
    const name = row.name_en.padEnd(11);
    const active = row.active.padStart(6);
    const inactive = row.inactive.padStart(8);
    const placeId = row.with_place_id.padStart(7);
    const synced = row.last_synced
      ? new Date(row.last_synced).toISOString().slice(0, 19)
      : 'never';
    console.log(`  ${name} |${active} |${inactive} |${placeId} | ${synced}`);
  }
}

async function status(): Promise<void> {
  const client = await getDbClient();
  try {
    await printStatus(client);
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const command = process.argv[2];

if (command === 'status') {
  void status().catch((err: unknown) => {
    console.error('Status failed:', err);
    process.exit(1);
  });
} else if (command === 'sync' || command == null) {
  // "sync" or default (no args) → sync all; "sync Tokyo" → sync single city
  const cityFilter = command === 'sync' ? process.argv[3] : undefined;
  void sync(cityFilter).catch((err: unknown) => {
    console.error('Sync failed:', err);
    process.exit(1);
  });
} else {
  console.error(`Unknown command: ${command}`);
  console.error(
    'Usage: ts-node scripts/sync-osm-pois.ts [status|sync [CityName]]',
  );
  process.exit(1);
}
