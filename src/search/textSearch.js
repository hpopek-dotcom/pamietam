import { normalize } from '../core/text.js';

// Classic search: every term must appear somewhere (diacritics-insensitive);
// "#tag" terms must match a tag. Title hits rank above tag hits above content hits.
// Semantic search (embeddings) will live next to this module behind the same call shape.

const WEIGHTS = { title: 3, tags: 2, content: 1 };

export function parseQuery(query) {
  const terms = [];
  const tags = [];
  for (const token of normalize(query).split(/\s+/).filter(Boolean)) {
    if (token.startsWith('#')) {
      const tag = token.replace(/^#+/, '');
      if (tag) tags.push(tag);
    } else {
      terms.push(token);
    }
  }
  return { terms, tags };
}

function scoreEntry(entry, { terms, tags }) {
  const entryTags = entry.tags.map(normalize);
  if (!tags.every((t) => entryTags.some((et) => et.startsWith(t)))) return 0;

  const title = normalize(entry.title);
  const content = normalize(entry.content);
  const tagText = entryTags.join(' ');
  let score = tags.length;
  for (const term of terms) {
    let termScore = 0;
    if (title.includes(term)) termScore += WEIGHTS.title;
    if (tagText.includes(term)) termScore += WEIGHTS.tags;
    if (content.includes(term)) termScore += WEIGHTS.content;
    if (!termScore) return 0;
    score += termScore;
  }
  return score;
}

/** @returns {{entry: Object, score: number}[]} best first, ties newest first */
export function searchEntries(entries, query) {
  const parsed = parseQuery(query);
  if (!parsed.terms.length && !parsed.tags.length) return [];
  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, parsed) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.createdAt.localeCompare(a.entry.createdAt));
}
