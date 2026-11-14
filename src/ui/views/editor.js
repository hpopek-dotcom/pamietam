import { h, toast } from '../dom.js';
import { entryForm } from '../components/entryForm.js';
import { audioPlayer } from '../components/audioPlayer.js';

/** New text note (no params) or editing an existing entry (params.id). */
export async function editorView(ctx, params) {
  const existing = params.id ? await ctx.service.getEntry(params.id) : null;
  if (params.id && !existing) return { el: h('section', { class: 'view' }, h('p', {}, 'Nie znaleziono wpisu.')) };

  let player = null;
  let extra = null;
  if (existing?.source === 'voice') {
    const recording = existing.audioId ? await ctx.service.getAudio(existing.audioId) : null;
    if (recording) player = audioPlayer(recording.blob);
    const original = existing.transcript?.original ?? '';
    extra = h('div', { class: 'voice-extra' },
      player?.el,
      original ? h('details', { class: 'original' },
        h('summary', {}, 'Oryginalna transkrypcja'),
        h('p', { class: 'pre' }, original),
        h('button', { class: 'btn small', type: 'button', onClick: () => form.setContent(original) }, 'Przywróć oryginał'),
      ) : null,
    );
  }

  const form = entryForm({
    title: existing?.title ?? '',
    content: existing?.content ?? '',
    tags: existing?.tags ?? [],
    contentLabel: existing?.source === 'voice' ? 'Transkrypcja' : 'Treść',
    allowEmpty: existing?.source === 'voice',
    extra,
    async onSave(values) {
      if (existing) {
        await ctx.service.updateEntry(existing.id, values);
        toast('Zapisano zmiany');
        ctx.navigate(`/entry/${existing.id}`, { replace: true });
      } else {
        await ctx.service.createTextEntry({ space: ctx.space, ...values });
        toast('Zapisano');
        ctx.navigate('/', { replace: true });
      }
    },
    onCancel(_values, empty) {
      if (!existing && !empty && !confirm('Odrzucić tę notatkę?')) return;
      history.back();
    },
  });

  const el = h('section', { class: 'view editor' },
    h('header', { class: 'topbar' },
      h('a', { class: 'back', href: existing ? `#/entry/${existing.id}` : '#/' }, '‹'),
      h('h1', {}, existing ? 'Edycja wpisu' : 'Nowa notatka'),
    ),
    form.el,
  );
  requestAnimationFrame(() => form.contentInput.focus());

  return { el, destroy: () => player?.destroy() };
}
