import { h } from '../dom.js';

/** <audio> for a Blob; call destroy() to release the object URL. */
export function audioPlayer(blob) {
  const url = URL.createObjectURL(blob);
  const el = h('audio', { class: 'audio', controls: true, preload: 'metadata', src: url });

  // Chrome's MediaRecorder writes WebM without a duration, so the player shows 0:00
  // until played through. Seeking far ahead makes the browser compute the real length.
  el.addEventListener('loadedmetadata', () => {
    if (el.duration !== Infinity) return;
    el.addEventListener('durationchange', function reset() {
      if (el.duration === Infinity) return;
      el.removeEventListener('durationchange', reset);
      el.currentTime = 0;
    });
    el.currentTime = 1e101;
  }, { once: true });

  return { el, destroy: () => URL.revokeObjectURL(url) };
}
