export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getUpcomingDates(baseIso: string, count = 12): Array<{
  iso: string;
  weekdayShort: string;
  dayNum: string;
  monthShort: string;
  isToday: boolean;
  dayOfWeek: number;
}> {
  const base = parseISODate(baseIso);
  const items = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    items.push({
      iso: formatDateISO(d),
      weekdayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: String(d.getDate()).padStart(2, '0'),
      monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
      isToday: i === 0,
      dayOfWeek: d.getDay(),
    });
  }
  return items;
}

export function formatReadableDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = parseISODate(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  if (Number.isNaN(h)) return time24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr} ${suffix}`;
}
