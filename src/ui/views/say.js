import { h, toast } from '../dom.js';
import { entryForm } from '../components/entryForm.js';
import { audioPlayer } from '../components/audioPlayer.js';
import { createRecorder, isRecordingSupported } from '../../audio/recorder.js';
import { formatDuration } from '../../core/text.js';

const ERROR_TEXT = {
  'not-allowed': 'brak zgody na rozpoznawanie mowy',
  'service-not-allowed': 'usługa rozpoznawania mowy jest niedostępna',
  'audio-capture': 'mikrofon jest zajęty przez nagrywanie (częste na Androidzie)',
  network: 'brak połączenia z usługą rozpoznawania mowy',
  'language-not-supported': 'język polski nie jest obsługiwany',
};

const MIC_ERROR_TEXT = {
  NotAllowedError: 'Brak zgody na użycie mikrofonu. Zezwól na mikrofon w ustawieniach przeglądarki i spróbuj ponownie.',
  NotFoundError: 'Nie znaleziono mikrofonu.',
  NotReadableError: 'Mikrofon jest zajęty przez inną aplikację.',
};

/**
 * Voice capture: recording starts immediately; after stopping the user reviews
 * and corrects the transcript, then saves. Audio is kept alongside the text.
 */
export async function sayView(ctx) {
  const provider = ctx.transcription;
  const recorder = createRecorder();
  let session = null;
  let timer = null;
  let player = null;
  let finished = false;

  const el = h('section', { class: 'view say' });
  const header = h('header', { class: 'topbar' },
    h('a', { class: 'back', href: '#/', onClick: (e) => {
      if (finished && !confirm('Odrzucić to nagranie?')) e.preventDefault();
    } }, '‹'),
    h('h1', {}, 'Powiedz'));

  const status = h('p', { class: 'muted center' }, 'Uruchamiam mikrofon…');
  const clock = h('div', { class: 'clock' }, '0:00');
  const live = h('p', { class: 'live-text' });
  const stopBtn = h('button', { class: 'btn record-stop', type: 'button', disabled: true, onClick: finish, 'aria-label': 'Zakończ nagrywanie' },
    h('span', { class: 'stop-square' }), 'Zakończ');
  const privacy = provider ? h('p', { class: 'privacy' }, provider.privacyNote) : null;

  el.append(header, h('div', { class: 'recording' },
    h('div', { class: 'pulse' }, clock), status, live, stopBtn, privacy));

  async function begin() {
    if (!isRecordingSupported()) {
      status.textContent = 'Ta przeglądarka nie obsługuje nagrywania dźwięku.';
      return;
    }
    try {
      await recorder.start();
    } catch (err) {
      status.textContent = MIC_ERROR_TEXT[err?.name] ?? `Nie udało się uruchomić mikrofonu: ${err.message}`;
      stopBtn.replaceWith(h('a', { class: 'btn', href: '#/new' }, '✍️ Napisz zamiast tego'));
      return;
    }
    if (provider) {
      try {
        session = provider.start({ lang: 'pl-PL', onUpdate: (text) => { live.textContent = text; } });
      } catch (err) {
        console.warn('Transkrypcja niedostępna', err);
      }
    }
    status.textContent = session ? 'Nagrywam i rozpoznaję mowę. Mów śmiało.' : 'Nagrywam (bez transkrypcji na żywo).';
    stopBtn.disabled = false;
    el.querySelector('.pulse').classList.add('active');
    timer = setInterval(() => { clock.textContent = formatDuration(recorder.elapsedMs()); }, 250);
  }

  async function finish() {
    stopBtn.disabled = true;
    clearInterval(timer);
    status.textContent = 'Kończę…';
    const [recording, transcription] = await Promise.all([
      recorder.stop(),
      session ? session.stop().catch(() => null) : Promise.resolve(null),
    ]);
    session = null;
    finished = true;
    review(recording, transcription);
  }

  function review(recording, transcription) {
    player = audioPlayer(recording.blob);
    const text = transcription?.text ?? '';
    let note = null;
    if (!provider) note = 'Ta przeglądarka nie rozpoznaje mowy — nagranie zostało zachowane, treść możesz wpisać ręcznie.';
    else if (!text && transcription?.error) note = `Transkrypcja nie powiodła się (${ERROR_TEXT[transcription.error] ?? transcription.error}). Nagranie zostało zachowane.`;
    else if (!text) note = 'Nie rozpoznano mowy. Nagranie zostało zachowane — możesz wpisać treść ręcznie.';

    const confidence = transcription?.confidence;
    const form = entryForm({
      content: text,
      contentLabel: 'Transkrypcja',
      placeholder: 'Popraw lub uzupełnij transkrypcję…',
      allowEmpty: true,
      extra: h('div', { class: 'voice-extra' },
        player.el,
        h('div', { class: 'card-meta' },
          h('span', {}, `Nagranie ${formatDuration(recording.durationMs)}`),
          typeof confidence === 'number' ? h('span', { class: 'badge' }, `pewność rozpoznania ${Math.round(confidence * 100)}%`) : null),
        note ? h('p', { class: 'note' }, note) : null),
      async onSave(values) {
        await ctx.service.createVoiceEntry({ space: ctx.space, ...values, recording, transcription });
        finished = false;
        toast('Zapisano');
        ctx.navigate('/', { replace: true });
      },
      onCancel() {
        if (!confirm('Odrzucić to nagranie?')) return;
        finished = false;
        ctx.navigate('/', { replace: true });
      },
    });
    el.replaceChildren(header, form.el);
  }

  begin();

  return {
    el,
    destroy() {
      clearInterval(timer);
      session?.abort();
      recorder.cancel();
      player?.destroy();
    },
  };
}
