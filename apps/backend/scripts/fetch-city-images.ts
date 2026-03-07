/**
 * Unsplash City Image Fetcher
 *
 * Fetches representative city images from Unsplash API for 6 Japanese cities.
 * Outputs SQL UPDATE statements to paste into a seed migration.
 *
 * Usage:
 *   cd apps/backend && npx ts-node scripts/fetch-city-images.ts
 *
 * Requires:
 *   UNSPLASH_ACCESS_KEY in .env (root)
 *
 * This script is a one-time dev tool — NOT a runtime dependency.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

if (!ACCESS_KEY) {
  console.error('Error: UNSPLASH_ACCESS_KEY is not set in .env');
  process.exit(1);
}

interface UnsplashPhoto {
  urls: { regular: string };
  user: { name: string; links: { html: string } };
  links: { download_location: string };
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
}

const CITIES = [
  { nameEn: 'Tokyo', query: 'Tokyo city skyline' },
  { nameEn: 'Osaka', query: 'Osaka city skyline' },
  { nameEn: 'Kyoto', query: 'Kyoto temple' },
  { nameEn: 'Fukuoka', query: 'Fukuoka city' },
  { nameEn: 'Sapporo', query: 'Sapporo city' },
  { nameEn: 'Naha', query: 'Naha Okinawa city' },
];

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

async function fetchImage(query: string): Promise<UnsplashPhoto | null> {
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '1');
  url.searchParams.set('orientation', 'landscape');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });

  if (!res.ok) {
    console.error(`Unsplash API error: ${res.status} ${res.statusText}`);
    return null;
  }

  const data = (await res.json()) as UnsplashSearchResponse;
  return data.results[0] ?? null;
}

async function triggerDownload(downloadLocation: string): Promise<void> {
  const url = new URL(downloadLocation);
  // Preserve existing query params (ixid etc.)
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });

  if (!res.ok) {
    console.warn(`Download trigger failed: ${res.status}`);
  }
}

async function main() {
  const sqlStatements: string[] = [];

  for (const city of CITIES) {
    console.error(`Fetching image for ${city.nameEn}...`);

    const photo = await fetchImage(city.query);
    if (!photo) {
      console.error(`  No results for ${city.nameEn}`);
      sqlStatements.push(`-- No image found for ${city.nameEn}`);
      continue;
    }

    // Trigger download tracking (Unsplash API policy)
    await triggerDownload(photo.links.download_location);

    const imageUrl = photo.urls.regular;
    const authorName = photo.user.name;
    const authorUrl = photo.user.links.html;

    console.error(`  Image: ${authorName} — ${imageUrl.substring(0, 60)}...`);

    sqlStatements.push(
      `UPDATE cities SET image_url = '${escapeSql(imageUrl)}',` +
        ` image_author_name = '${escapeSql(authorName)}',` +
        ` image_author_url = '${escapeSql(authorUrl)}'` +
        ` WHERE name_en = '${escapeSql(city.nameEn)}';`,
    );
  }

  console.log('\n-- Generated SQL for seed migration:');
  console.log(sqlStatements.join('\n'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
