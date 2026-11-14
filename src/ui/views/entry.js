import { h, toast } from '../dom.js';
import { audioPlayer } from '../components/audioPlayer.js';
import { tagChips } from '../components/entryCard.js';
import { displayTitle, formatDateTime, formatDuration } from '../../core/text.js';

export async function entryView(ctx, params) {
  const entry = await ctx.service.getEntry(params.id);
  if (!entry) {
    return { el: h('section', { class: 'view' },
      h('header', { class: 'topbar' }, h('a', { class: 'back', href: '#/' }, '‹'), h('h1', {}, 'Wpis')),
      h('p', {}, 'Nie znaleziono wpisu — mógł zostać usunięty.')) };
  }

  const recording = entry.audioId ? await ctx.service.getAudio(entry.audioId) : null;
  const player = recording ? audioPlayer(recording.blob) : null;
  const original = entry.transcript?.original ?? '';
  const edited = entry.source === 'voice' && original && original !== entry.content;

  async function remove() {
    const what = entry.audioId ? 'Usunąć ten wpis razem z nagraniem?' : 'Usunąć ten wpis?';
    if (!confirm(`${what} Tej operacji nie można cofnąć.`)) return;
    await ctx.service.deleteEntry(entry.id);
    toast('Usunięto wpis');
    ctx.navigate('/', { replace: true });
  }

  const el = h('section', { class: 'view entry' },
    h('header', { class: 'topbar' },
      h('a', { class: 'back', href: '#/', onClick: (e) => { e.preventDefault(); history.length > 1 ? history.back() : ctx.navigate('/'); } }, '‹'),
      h('h1', {}, displayTitle(entry)),
    ),
    h('div', { class: 'card-meta' },
      h('span', {}, formatDateTime(entry.createdAt)),
      h('span', { class: 'badge' }, entry.source === 'voice' ? '🎙️ głosowy' : '✍️ tekstowy'),
      entry.updatedAt !== entry.createdAt ? h('span', { class: 'muted' }, `edytowano ${formatDateTime(entry.updatedAt)}`) : null,
    ),
    tagChips(entry.tags),
    player ? h('div', { class: 'voice-extra' },
      player.el,
      h('div', { class: 'card-meta' },
        h('span', {}, `Nagrano ${formatDateTime(recording.recordedAt)}`),
        recording.durationMs ? h('span', {}, formatDuration(recording.durationMs)) : null),
    ) : null,
    entry.content ? h('div', { class: 'content pre' }, entry.content) : h('p', { class: 'muted' }, 'Brak treści.'),
    edited ? h('details', { class: 'original' },
      h('summary', {}, 'Oryginalna transkrypcja (przed poprawkami)'),
      h('p', { class: 'pre' }, original)) : null,
    h('div', { class: 'actions' },
      h('button', { class: 'btn danger ghost', type: 'button', onClick: remove }, 'Usuń'),
      h('a', { class: 'btn primary', href: `#/entry/${entry.id}/edit` }, 'Edytuj'),
    ),
  );

  return { el, destroy: () => player?.destroy() };
}
