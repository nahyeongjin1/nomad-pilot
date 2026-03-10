/** Transform Unsplash image URL for optimized delivery (w=640, auto=format) */
export function optimizeImageUrl(url: string): string {
  return url.replace(/w=\d+/, 'w=640').replace(/fm=\w+/, 'auto=format');
}

/** Build Unsplash attribution link with UTM parameters */
export function buildAttributionUrl(authorUrl: string): string {
  const url = new URL(authorUrl);
  url.searchParams.set('utm_source', 'nomad_pilot');
  url.searchParams.set('utm_medium', 'referral');
  return url.toString();
}
