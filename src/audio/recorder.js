// Thin wrapper over getUserMedia + MediaRecorder.

const PREFERRED_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export function isRecordingSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

function pickMimeType() {
  return PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) ?? '';
}

export function createRecorder() {
  let stream = null;
  let recorder = null;
  let chunks = [];
  let startedAt = 0;
  let recordedAt = null;

  function releaseStream() {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  }

  return {
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mimeType = pickMimeType();
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.start(1000);
      startedAt = performance.now();
      recordedAt = new Date().toISOString();
    },

    elapsedMs: () => (startedAt ? performance.now() - startedAt : 0),

    /** @returns {Promise<{blob: Blob, mimeType: string, durationMs: number, recordedAt: string}>} */
    stop() {
      return new Promise((resolve, reject) => {
        if (!recorder || recorder.state === 'inactive') {
          reject(new Error('Nagrywanie nie jest aktywne'));
          return;
        }
        const durationMs = Math.round(performance.now() - startedAt);
        recorder.onstop = () => {
          const mimeType = recorder.mimeType || chunks[0]?.type || 'audio/webm';
          releaseStream();
          resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType, durationMs, recordedAt });
        };
        recorder.onerror = (e) => { releaseStream(); reject(e.error ?? new Error('Błąd nagrywania')); };
        recorder.stop();
      });
    },

    cancel() {
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
      releaseStream();
    },
  };
}
