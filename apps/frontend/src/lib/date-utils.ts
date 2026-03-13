/**
 * Convert period presets to dateFrom/dateTo for the flexible search API.
 */

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Get next occurrence of a weekday (0=Sun..6=Sat) from a given date */
function nextWeekday(from: Date, weekday: number): Date {
  const d = new Date(from);
  const diff = (weekday - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export type PeriodPreset = 'this-weekend' | 'next-weekend';

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

/**
 * Convert a period preset to a date range.
 * - "this-weekend": upcoming Friday to Saturday
 * - "next-weekend": following week's Friday to Saturday
 */
export function presetToDateRange(
  preset: PeriodPreset,
  today: Date = new Date(),
): DateRange {
  const friday = nextWeekday(today, 5); // Next Friday

  if (preset === 'this-weekend') {
    const saturday = new Date(friday);
    saturday.setDate(saturday.getDate() + 1);
    return { dateFrom: toDateStr(friday), dateTo: toDateStr(saturday) };
  }

  // next-weekend
  const nextFriday = new Date(friday);
  nextFriday.setDate(nextFriday.getDate() + 7);
  const nextSaturday = new Date(nextFriday);
  nextSaturday.setDate(nextSaturday.getDate() + 1);
  return { dateFrom: toDateStr(nextFriday), dateTo: toDateStr(nextSaturday) };
}

/**
 * Convert a month selection to a date range.
 * @param year e.g. 2026
 * @param month 1-indexed (1=Jan, 12=Dec)
 */
export function monthToDateRange(year: number, month: number): DateRange {
  const dateFrom = new Date(year, month - 1, 1);
  const dateTo = new Date(year, month, 0); // Last day of month
  return { dateFrom: toDateStr(dateFrom), dateTo: toDateStr(dateTo) };
}

/**
 * Generate selectable months: from current month + 1, up to 6 months ahead.
 */
export function getSelectableMonths(
  today: Date = new Date(),
): Array<{ year: number; month: number; label: string }> {
  const months: Array<{ year: number; month: number; label: string }> = [];
  const monthNames = [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ];

  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: monthNames[d.getMonth()]!,
    });
  }

  return months;
}

/**
 * Format a date string (YYYY-MM-DD) for display.
 * e.g. "2026-03-14" → "3/14(금)"
 */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayOfWeek = dayNames[d.getDay()];
  return `${month}/${day}(${dayOfWeek})`;
}

/**
 * Format ISO 8601 duration for display.
 * e.g. "PT2H30M" → "2h30m"
 */
export function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return isoDuration;
  const hours = match[1] ?? '0';
  const minutes = match[2] ?? '0';
  return minutes !== '0' ? `${hours}h${minutes}m` : `${hours}h`;
}
