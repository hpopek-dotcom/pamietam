import { openDatabase } from './data/db.js';
import { createEntryRepository } from './data/entryRepository.js';
import { createAudioRepository } from './data/audioRepository.js';
import { createEntryService } from './services/entryService.js';
import { selectTranscriptionProvider } from './ai/transcription/provider.js';
import { SPACES } from './core/model.js';
import { createRouter } from './ui/router.js';
import { h } from './ui/dom.js';
import { homeView } from './ui/views/home.js';
import { editorView } from './ui/views/editor.js';
import { sayView } from './ui/views/say.js';
import { entryView } from './ui/views/entry.js';
import { searchView } from './ui/views/search.js';

const SPACE_KEY = 'pamietam.space';

function readSpace() {
  try {
    const saved = localStorage.getItem(SPACE_KEY);
    if (Object.values(SPACES).includes(saved)) return saved;
  } catch { /* storage unavailable */ }
  return SPACES.PERSONAL;
}

function createAppContext({ service, transcription }) {
  const ctx = {
    service,
    transcription,
    space: readSpace(),
    setSpace(space) {
      ctx.space = space;
      document.documentElement.dataset.space = space;
      try { localStorage.setItem(SPACE_KEY, space); } catch { /* ignore */ }
    },
    navigate(path, { replace = false } = {}) {
      if (replace) location.replace(`#${path}`);
      else location.hash = path;
    },
  };
  document.documentElement.dataset.space = ctx.space;
  return ctx;
}

async function boot() {
  const db = await openDatabase();
  const service = createEntryService({
    entries: createEntryRepository(db),
    audio: createAudioRepository(db),
  });
  const ctx = createAppContext({ service, transcription: selectTranscriptionProvider() });

  createRouter({
    '/': homeView,
    '/new': editorView,
    '/say': sayView,
    '/search': searchView,
    '/entry/:id': entryView,
    '/entry/:id/edit': editorView,
  }, document.getElementById('app'), ctx,
  () => ({ el: h('section', { class: 'view' }, h('p', {}, 'Nie ma takiej strony. '), h('a', { href: '#/' }, 'Wróć')) }));

  navigator.storage?.persist?.().catch(() => {});
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker', err));
  }
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('app').textContent = `Nie udało się uruchomić aplikacji: ${err.message}`;
});
