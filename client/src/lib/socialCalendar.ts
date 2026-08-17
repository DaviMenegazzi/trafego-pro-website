export type SocialCalendarDay = { key: string; date: Date; inMonth: boolean };

export function buildSocialCalendarMonth(cursor: Date): SocialCalendarDay[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`, date, inMonth: date.getMonth() === cursor.getMonth() };
  });
}

export function socialCalendarKey(value: string | Date): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
