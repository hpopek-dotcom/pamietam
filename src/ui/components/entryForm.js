import { h } from '../dom.js';

/**
 * Shared editor fields for text notes, voice review and editing.
 * Nothing is required: the user may save just content, or just a recording.
 */
export function entryForm({ title = '', content = '', tags = [], contentLabel = 'Treść',
  placeholder = 'Co chcesz zapamiętać?', saveLabel = 'Zapisz', allowEmpty = false, onSave, onCancel, extra = null }) {
  const titleInput = h('input', { class: 'field title-field', type: 'text', value: title, placeholder: 'Tytuł (opcjonalnie)', 'aria-label': 'Tytuł' });
  const contentInput = h('textarea', { class: 'field content-field', value: content, placeholder, rows: 8, 'aria-label': contentLabel });
  const tagsInput = h('input', { class: 'field tags-field', type: 'text', value: tags.map((t) => `#${t}`).join(' '),
    placeholder: 'Tagi, np. #pomysł #muzyka (opcjonalnie)', 'aria-label': 'Tagi', autocapitalize: 'none' });
  const saveButton = h('button', { class: 'btn primary', type: 'submit' }, saveLabel);

  const values = () => ({ title: titleInput.value, content: contentInput.value, tags: tagsInput.value });
  const isEmpty = () => !titleInput.value.trim() && !contentInput.value.trim();

  async function submit(e) {
    e?.preventDefault();
    if (!allowEmpty && isEmpty()) { contentInput.focus(); return; }
    saveButton.disabled = true;
    try {
      await onSave(values());
    } finally {
      saveButton.disabled = false;
    }
  }

  contentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e);
  });

  const el = h('form', { class: 'entry-form', onSubmit: submit },
    extra,
    contentInput,
    titleInput,
    tagsInput,
    h('div', { class: 'actions' },
      h('button', { class: 'btn ghost', type: 'button', onClick: () => onCancel(values(), isEmpty()) }, 'Anuluj'),
      saveButton,
    ),
  );

  return { el, contentInput, setContent: (text) => { contentInput.value = text; }, isEmpty };
}
