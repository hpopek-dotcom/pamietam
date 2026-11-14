// Hash router. A view is (ctx, params, query) => { el, destroy? } (or a Promise of it).

function compile(pattern) {
  const keys = [];
  const source = pattern.replace(/:([a-zA-Z]+)/g, (_, key) => { keys.push(key); return '([^/]+)'; });
  return { re: new RegExp(`^${source}$`), keys };
}

export function createRouter(routes, outlet, ctx, notFound) {
  const compiled = Object.entries(routes).map(([pattern, view]) => ({ view, ...compile(pattern) }));
  let current = null;
  let token = 0;

  async function render() {
    const [path, qs = ''] = (location.hash.slice(1) || '/').split('?');
    const query = new URLSearchParams(qs);
    let view = notFound;
    const params = {};
    for (const route of compiled) {
      const m = route.re.exec(path);
      if (m) {
        view = route.view;
        route.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        break;
      }
    }

    const mine = ++token;
    current?.destroy?.();
    current = null;
    try {
      const result = await view(ctx, params, query);
      if (mine !== token) { result.destroy?.(); return; }
      outlet.replaceChildren(result.el);
      current = result;
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      if (mine === token) outlet.replaceChildren(errorBox(err));
    }
  }

  window.addEventListener('hashchange', render);
  render();
  return { render };
}

function errorBox(err) {
  const el = document.createElement('div');
  el.className = 'view error-box';
  el.textContent = `Coś poszło nie tak: ${err?.message ?? err}`;
  return el;
}
