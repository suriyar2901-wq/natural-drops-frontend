import { formatClockAmPm } from './formatters';

const minutesOf = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

const ymd = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDays = (value?: string | null) => {
  if (value == null || value.trim() === '') return [0, 1, 2, 3, 4, 5, 6];
  return value.split(',').map((part) => Number(part.trim())).filter((day) => day >= 0 && day <= 6);
};

const parseLeaves = (value?: string | null) =>
  String(value || '').split(',').map((part) => part.trim()).filter((part) => /^\d{4}-\d{2}-\d{2}$/.test(part));

const dayName = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

export const shopAvailability = (
  openTime?: string | null,
  closeTime?: string | null,
  openDays?: string | null,
  leaveDates?: string | null,
  now = new Date(),
) => {
  const open = String(openTime || '').slice(0, 5);
  const close = String(closeTime || '').slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(open) || !/^\d{2}:\d{2}$/.test(close)) {
    return { openNow: true, nextLabel: '', openLabel: '', closeLabel: '', hasHours: false };
  }
  const openMin = minutesOf(open);
  const closeMin = minutesOf(close);
  const openLabel = formatClockAmPm(open);
  const closeLabel = formatClockAmPm(close);
  if (closeMin <= openMin) {
    return { openNow: true, nextLabel: '', openLabel, closeLabel, hasHours: false };
  }
  const days = parseDays(openDays);
  const leaves = new Set(parseLeaves(leaveDates));
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayKey = ymd(now);
  const todayOpen = days.includes(now.getDay()) && !leaves.has(todayKey);
  const openNow = todayOpen && nowMin >= openMin && nowMin < closeMin;

  let nextLabel = '';
  if (!openNow) {
    for (let offset = 0; offset < 60; offset += 1) {
      const date = new Date(now);
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() + offset);
      if (!days.includes(date.getDay()) || leaves.has(ymd(date))) continue;
      if (offset === 0 && nowMin >= closeMin) continue;
      if (offset === 0) nextLabel = `today at ${openLabel}`;
      else if (offset === 1) nextLabel = `tomorrow at ${openLabel}`;
      else nextLabel = `${dayName(date)} at ${openLabel}`;
      break;
    }
  }
  return { openNow, nextLabel, openLabel, closeLabel, hasHours: true };
};
