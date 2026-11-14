import { h } from '../dom.js';
import { entryCard } from '../components/entryCard.js';
import { buildTimeline } from '../../core/timeline.js';
import { formatDay, formatMonth } from '../../core/text.js';
import { SPACES } from '../../core/model.js';

const SPACE_LABELS = { [SPACES.PERSONAL]: 'Osobiste', [SPACES.WORK]: 'Praca' };

export function spaceSwitch(ctx, onChange) {
  const buttons = Object.entries(SPACE_LABELS).map(([space, label]) =>
    h('button', {
      type: 'button',
      class: space === ctx.space ? 'seg active' : 'seg',
      'aria-pressed': String(space === ctx.space),
      onClick: () => { ctx.setSpace(space); onChange(); },
    }, label));
  return h('div', { class: 'segmented', role: 'group', 'aria-label': 'Przestrzeń' }, buttons);
}

function timeline(entries) {
  if (!entries.length) {
    return h('div', { class: 'empty' },
      h('p', {}, 'Jeszcze nic tu nie ma.'),
      h('p', { class: 'muted' }, 'Napisz albo powiedz pierwszą myśl — porządek przyjdzie później.'));
  }
  return h('div', { class: 'timeline' }, buildTimeline(entries).map((month) =>
    h('section', { class: 'month' },
      h('h2', { class: 'month-label' }, formatMonth(month.date)),
      month.days.map((day) => h('div', { class: 'day' },
        h('h3', { class: 'day-label' }, formatDay(day.date)),
        day.entries.map((e) => entryCard(e)),
      )),
    )));
}

export async function homeView(ctx) {
  const el = h('section', { class: 'view home' });

  async function render() {
    const entries = await ctx.service.listEntries(ctx.space);
    const searchInput = h('input', { class: 'field search-field', type: 'search', placeholder: 'Szukaj we wpisach…', 'aria-label': 'Szukaj', enterKeyHint: 'search' });
    el.replaceChildren(
      h('header', { class: 'topbar' },
        h('h1', { class: 'brand' }, 'Pamiętam'),
        spaceSwitch(ctx, render),
      ),
      h('div', { class: 'capture' },
        h('a', { class: 'capture-btn write', href: '#/new' }, h('span', { class: 'icon' }, '✍️'), 'Nowa notatka'),
        h('a', { class: 'capture-btn say', href: '#/say' }, h('span', { class: 'icon' }, '🎙️'), 'Powiedz'),
      ),
      h('form', { class: 'search-bar', role: 'search', onSubmit: (e) => {
        e.preventDefault();
        if (searchInput.value.trim()) ctx.navigate(`/search?q=${encodeURIComponent(searchInput.value.trim())}`);
      } }, searchInput),
      timeline(entries),
    );
  }

  await render();
  return { el };
}
