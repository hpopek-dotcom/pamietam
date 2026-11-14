// Tiny test runner: test(name, fn), assertions, run() -> { passed, failed, results }.

const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export class AssertionError extends Error {}

export const assert = {
  ok(value, message = 'expected truthy value') {
    if (!value) throw new AssertionError(message);
  },
  equal(actual, expected, message) {
    if (actual !== expected) {
      throw new AssertionError(message ?? `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  deepEqual(actual, expected, message) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new AssertionError(message ?? `expected ${e}, got ${a}`);
  },
  async rejects(fn, message = 'expected rejection') {
    try { await fn(); } catch { return; }
    throw new AssertionError(message);
  },
};

export async function run() {
  const results = [];
  for (const t of tests) {
    const started = performance.now();
    try {
      await t.fn();
      results.push({ name: t.name, ok: true, ms: performance.now() - started });
    } catch (err) {
      results.push({ name: t.name, ok: false, error: err?.stack ?? String(err) });
    }
  }
  const failed = results.filter((r) => !r.ok).length;
  return { passed: results.length - failed, failed, results };
}
