import { normalize, normalizeWithMap } from '../core/text.js';

/** Minimal element builder: h('button', { class: 'x', onClick }, 'Text', child). */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key in el && !key.includes('-')) el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Text with <mark> around every (diacritics-insensitive) occurrence of the terms. */
export function highlight(text, terms) {
  const frag = document.createDocumentFragment();
  const source = text ?? '';
  const needles = terms.map(normalize).filter(Boolean);
  if (!needles.length) { frag.append(source); return frag; }

  const { normalized, map } = normalizeWithMap(source);
  const ranges = [];
  for (const needle of needles) {
    let from = 0;
    let idx;
    while ((idx = normalized.indexOf(needle, from)) !== -1) {
      ranges.push([map[idx], map[idx + needle.length]]);
      from = idx + needle.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);

  let pos = 0;
  for (const [start, end] of ranges) {
    if (start < pos) continue;
    frag.append(source.slice(pos, start), h('mark', {}, source.slice(start, end)));
    pos = end;
  }
  frag.append(source.slice(pos));
  return frag;
}

export function toast(message) {
  const el = h('div', { class: 'toast', role: 'status' }, message);
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('visible'));
  setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => el.remove(), 300);
  }, 2200);
}
