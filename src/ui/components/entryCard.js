import { h, highlight } from '../dom.js';
import { displayTitle, formatTime, formatDateTime, snippet } from '../../core/text.js';

export function tagChips(tags, linkable = true) {
  if (!tags?.length) return null;
  return h('div', { class: 'tags' }, tags.map((t) => linkable
    ? h('a', { class: 'tag', href: `#/search?q=${encodeURIComponent('#' + t)}`, onClick: (e) => e.stopPropagation() }, `#${t}`)
    : h('span', { class: 'tag' }, `#${t}`)));
}

/** Timeline / search result card. `terms` enables highlighting. */
export function entryCard(entry, { terms = [], showDate = false } = {}) {
  const title = displayTitle(entry);
  const body = entry.title?.trim() ? snippet(entry.content) : snippet(entry.content.split(/\r?\n/).slice(1).join(' '));
  return h('a', { class: 'card', href: `#/entry/${entry.id}`, dataset: { id: entry.id } },
    h('div', { class: 'card-meta' },
      h('span', {}, showDate ? formatDateTime(entry.createdAt) : formatTime(entry.createdAt)),
      entry.source === 'voice' ? h('span', { class: 'badge', title: 'Wpis głosowy' }, '🎙️') : null,
    ),
    h('div', { class: 'card-title' }, highlight(title, terms)),
    body ? h('div', { class: 'card-body' }, highlight(body, terms)) : null,
    tagChips(entry.tags),
  );
}
