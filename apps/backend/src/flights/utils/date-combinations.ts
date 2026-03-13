/**
 * Generate departure/return date combinations for flexible flight search.
 *
 * For a given date range and nights range, produces all (departureDate, returnDate) pairs
 * where departureDate falls on a Friday or Saturday within [dateFrom, dateTo].
 */

export interface DateCombination {
  departureDate: string; // YYYY-MM-DD
  returnDate: string; // YYYY-MM-DD
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Generate date combinations:
 * - Iterates each day in [dateFrom, dateTo]
 * - Filters to Friday (5) and Saturday (6) departures
 * - For each departure, generates return dates for nightsFrom..nightsTo
 */
export function generateDateCombinations(
  dateFrom: string,
  dateTo: string,
  nightsFrom: number,
  nightsTo: number,
): DateCombination[] {
  const combinations: DateCombination[] = [];
  const start = new Date(dateFrom + 'T00:00:00Z');
  const end = new Date(dateTo + 'T00:00:00Z');

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dayOfWeek = d.getUTCDay(); // 0=Sun, 5=Fri, 6=Sat
    if (dayOfWeek !== 5 && dayOfWeek !== 6) continue;

    for (let nights = nightsFrom; nights <= nightsTo; nights++) {
      const returnDate = new Date(d);
      returnDate.setUTCDate(returnDate.getUTCDate() + nights);
      combinations.push({
        departureDate: toDateStr(d),
        returnDate: toDateStr(returnDate),
      });
    }
  }

  return combinations;
}
