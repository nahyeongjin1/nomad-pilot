import { describe, expect, it } from 'vitest';
import { optimizeImageUrl, buildAttributionUrl } from './unsplash';

describe('optimizeImageUrl', () => {
  it('replaces w= and fm= params', () => {
    const url =
      'https://images.unsplash.com/photo-123?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080';
    const result = optimizeImageUrl(url);
    expect(result).toContain('w=640');
    expect(result).toContain('auto=format');
    expect(result).not.toContain('w=1080');
    expect(result).not.toContain('fm=jpg');
  });
});

describe('buildAttributionUrl', () => {
  it('appends UTM params', () => {
    const url = buildAttributionUrl('https://unsplash.com/@photographer');
    expect(url).toBe(
      'https://unsplash.com/@photographer?utm_source=nomad_pilot&utm_medium=referral',
    );
  });
});
