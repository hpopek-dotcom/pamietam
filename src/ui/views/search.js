import { h } from '../dom.js';
import { entryCard } from '../components/entryCard.js';
import { searchEntries, parseQuery } from '../../search/textSearch.js';
import { spaceSwitch } from './home.js';

export async function searchView(ctx, _params, query) {
  let entries = await ctx.service.listEntries(ctx.space);
  const input = h('input', { class: 'field search-field', type: 'search', value: query.get('q') ?? '',
    placeholder: 'Słowa lub #tag…', 'aria-label': 'Szukaj', enterKeyHint: 'search' });
  const results = h('div', { class: 'results' });

  function run() {
    const q = input.value;
    history.replaceState(null, '', `#/search?q=${encodeURIComponent(q)}`);
    const found = searchEntries(entries, q);
    const { terms } = parseQuery(q);
    if (!q.trim()) {
      results.replaceChildren(h('p', { class: 'muted' }, 'Wpisz słowo, frazę lub #tag. Wielkość liter i polskie znaki nie mają znaczenia.'));
    } else if (!found.length) {
      results.replaceChildren(h('p', { class: 'muted' }, 'Nic nie znaleziono.'));
    } else {
      results.replaceChildren(
        h('p', { class: 'muted' }, `Znaleziono: ${found.length}`),
        ...found.map((r) => entryCard(r.entry, { terms, showDate: true })));
    }
  }

  async function onSpaceChange() {
    entries = await ctx.service.listEntries(ctx.space);
    el.querySelector('.segmented').replaceWith(spaceSwitch(ctx, onSpaceChange));
    run();
  }

  input.addEventListener('input', run);
  const el = h('section', { class: 'view search' },
    h('header', { class: 'topbar' },
      h('a', { class: 'back', href: '#/' }, '‹'),
      h('h1', {}, 'Szukaj'),
      spaceSwitch(ctx, onSpaceChange),
    ),
    h('form', { class: 'search-bar', role: 'search', onSubmit: (e) => { e.preventDefault(); input.blur(); } }, input),
    results,
  );
  run();
  requestAnimationFrame(() => input.focus());
  return { el };
}
