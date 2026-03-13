import { generateDateCombinations } from './date-combinations.js';

describe('generateDateCombinations', () => {
  it('should return Friday and Saturday departures only', () => {
    // 2026-03-13 (Fri) to 2026-03-15 (Sun)
    const result = generateDateCombinations('2026-03-13', '2026-03-15', 2, 2);

    const departureDates = result.map((r) => r.departureDate);
    // Only Fri 3/13 and Sat 3/14 should be included
    expect(departureDates).toContain('2026-03-13');
    expect(departureDates).toContain('2026-03-14');
    expect(departureDates).not.toContain('2026-03-15'); // Sunday
  });

  it('should generate correct return dates based on nights range', () => {
    // Single Friday, 1-3 nights
    const result = generateDateCombinations('2026-03-13', '2026-03-13', 1, 3);

    expect(result).toHaveLength(3);
    expect(result).toEqual([
      { departureDate: '2026-03-13', returnDate: '2026-03-14' }, // 1 night
      { departureDate: '2026-03-13', returnDate: '2026-03-15' }, // 2 nights
      { departureDate: '2026-03-13', returnDate: '2026-03-16' }, // 3 nights
    ]);
  });

  it('should return empty for a range with no Friday/Saturday', () => {
    // 2026-03-16 (Mon) to 2026-03-19 (Thu)
    const result = generateDateCombinations('2026-03-16', '2026-03-19', 1, 2);

    expect(result).toHaveLength(0);
  });

  it('should handle a full month range', () => {
    // April 2026: has ~4 Fridays and 4 Saturdays = 8 departure days
    const result = generateDateCombinations('2026-04-01', '2026-04-30', 2, 2);

    // Each departure day generates 1 combination (2 nights only)
    // Fridays: 3, 10, 17, 24 = 4, Saturdays: 4, 11, 18, 25 = 4 → 8 total
    expect(result).toHaveLength(8);
    expect(result.every((r) => r.returnDate > r.departureDate)).toBe(true);
  });

  it('should handle weekend range with multiple night options', () => {
    // One weekend (Fri + Sat), 1-2 nights = 2 days × 2 nights = 4 combos
    const result = generateDateCombinations('2026-03-13', '2026-03-14', 1, 2);

    expect(result).toHaveLength(4);
  });
});
