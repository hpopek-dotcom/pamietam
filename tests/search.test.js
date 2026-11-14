import { test, assert } from './harness.js';
import { createEntry } from '../src/core/model.js';
import { searchEntries } from '../src/search/textSearch.js';
import { normalize, parseTags, displayTitle } from '../src/core/text.js';

const at = (iso) => new Date(iso);
const entries = [
  createEntry({ title: 'Śpiewnik', content: 'Pomysł: własne zestawy piosenek na spotkania.', tags: ['pomysł', 'muzyka'] }, at('2026-06-12T10:00:00Z')),
  createEntry({ content: 'Kupiłem nowe struny do gitary. Żółw w akwarium rośnie.', tags: ['muzyka'] }, at('2026-07-01T10:00:00Z')),
  createEntry({ content: 'Zadzwonić do Piotra w sprawie śpiewnika', tags: [] }, at('2026-08-01T10:00:00Z')),
];

const ids = (results) => results.map((r) => r.entry.id);

test('normalizacja usuwa polskie znaki', () => {
  assert.equal(normalize('Żółć Łąka ŚPIEWNIK'), 'zolc laka spiewnik');
});

test('wyszukiwanie ignoruje wielkość liter i polskie znaki', () => {
  assert.deepEqual(ids(searchEntries(entries, 'zolw')), [entries[1].id]);
  assert.deepEqual(ids(searchEntries(entries, 'GITARY')), [entries[1].id]);
});

test('trafienie w tytule jest wyżej niż w treści', () => {
  const found = ids(searchEntries(entries, 'spiewnik'));
  assert.deepEqual(found, [entries[0].id, entries[2].id]);
});

test('wszystkie słowa zapytania muszą wystąpić', () => {
  assert.deepEqual(ids(searchEntries(entries, 'piotra śpiewnika')), [entries[2].id]);
  assert.deepEqual(ids(searchEntries(entries, 'piotra gitary')), []);
});

test('filtrowanie po #tagu', () => {
  assert.deepEqual(ids(searchEntries(entries, '#muzyka')), [entries[1].id, entries[0].id]);
  assert.deepEqual(ids(searchEntries(entries, '#muzyka zestawy')), [entries[0].id]);
  assert.deepEqual(ids(searchEntries(entries, '#pomysl')), [entries[0].id], 'tag match without diacritics');
});

test('puste zapytanie nic nie zwraca', () => {
  assert.deepEqual(searchEntries(entries, '   '), []);
});

test('parsowanie tagów', () => {
  assert.deepEqual(parseTags('#Muzyka, pomysł  #muzyka ##ważne'), ['muzyka', 'pomysł', 'ważne']);
});

test('tytuł wyświetlany bez nadanego tytułu', () => {
  assert.equal(displayTitle(createEntry({ content: 'Pierwsza linia\ndruga' })), 'Pierwsza linia');
  assert.equal(displayTitle(createEntry({ source: 'voice' })), 'Nagranie głosowe');
});
