import { dayKey, monthKey } from './text.js';

const byCreatedDesc = (a, b) => b.createdAt.localeCompare(a.createdAt);

/** Groups entries into months -> days, newest first. */
export function buildTimeline(entries) {
  const months = new Map();
  for (const entry of [...entries].sort(byCreatedDesc)) {
    const mKey = monthKey(entry.createdAt);
    const dKey = dayKey(entry.createdAt);
    if (!months.has(mKey)) months.set(mKey, { key: mKey, date: entry.createdAt, days: new Map() });
    const days = months.get(mKey).days;
    if (!days.has(dKey)) days.set(dKey, { key: dKey, date: entry.createdAt, entries: [] });
    days.get(dKey).entries.push(entry);
  }
  return [...months.values()].map((m) => ({ ...m, days: [...m.days.values()] }));
}
