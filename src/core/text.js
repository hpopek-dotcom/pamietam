// Text helpers shared by search, timeline and UI.

/** Lowercase and strip Polish (and other) diacritics: "Żółw" -> "zolw". */
export function normalize(text) {
  return (text ?? '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Normalize while keeping a map from normalized index to original index,
 * so matches found in normalized text can be highlighted in the original.
 */
export function normalizeWithMap(text) {
  let normalized = '';
  const map = [];
  const chars = Array.from(text ?? '');
  let offset = 0;
  for (const ch of chars) {
    const n = normalize(ch);
    for (let i = 0; i < n.length; i++) map.push(offset);
    normalized += n;
    offset += ch.length;
  }
  map.push(offset);
  return { normalized, map };
}

/** "#Muzyka, pomysł  rodzina" -> ["muzyka", "pomysł", "rodzina"] */
export function parseTags(input) {
  const list = Array.isArray(input) ? input : String(input ?? '').split(/[,\s]+/);
  const seen = new Set();
  const tags = [];
  for (const raw of list) {
    const tag = String(raw).trim().replace(/^#+/, '').toLowerCase();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

export function firstLine(text, max = 80) {
  const line = (text ?? '').trim().split(/\r?\n/)[0] ?? '';
  return line.length > max ? line.slice(0, max - 1).trimEnd() + '…' : line;
}

export function displayTitle(entry) {
  return entry.title?.trim()
    || firstLine(entry.content)
    || (entry.source === 'voice' ? 'Nagranie głosowe' : 'Bez tytułu');
}

export function snippet(text, max = 160) {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? flat.slice(0, max - 1).trimEnd() + '…' : flat;
}

const pad = (n) => String(n).padStart(2, '0');

/** Local calendar day, e.g. "2026-10-31". */
export function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function monthKey(iso) {
  return dayKey(iso).slice(0, 7);
}

const dayFmt = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' });
const dateTimeFmt = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long', timeStyle: 'short' });

export const formatDay = (iso) => dayFmt.format(new Date(iso));
export const formatMonth = (iso) => monthFmt.format(new Date(iso));
export const formatTime = (iso) => timeFmt.format(new Date(iso));
export const formatDateTime = (iso) => dateTimeFmt.format(new Date(iso));

export function formatDuration(ms) {
  if (ms == null) return '';
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}
