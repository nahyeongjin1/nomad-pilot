/** Transform Unsplash image URL for optimized delivery (w=640, auto=format) */
export function optimizeImageUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.searchParams.set('w', '640');
  url.searchParams.delete('fm');
  url.searchParams.set('auto', 'format');
  return url.toString();
}

/** Build Unsplash attribution link with UTM parameters */
export function buildAttributionUrl(authorUrl: string): string {
  const url = new URL(authorUrl);
  url.searchParams.set('utm_source', 'nomad_pilot');
  url.searchParams.set('utm_medium', 'referral');
  return url.toString();
}
