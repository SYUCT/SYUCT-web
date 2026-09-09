'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/github-live-stats.js'), 'utf8');
const NOW = Date.parse('2026-09-09T10:00:00Z');
const flush = () => new Promise(resolve => setImmediate(resolve));
const stats = (stars, age = 1000) => ({ stars, forks: 2, fetchedAt: NOW - age });
const json = data => ({ ok: true, json: async () => data });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

function run(options = {}) {
  let now = NOW, timerId = 0;
  const calls = [], history = [], writes = [], timers = new Map(), handlers = {};
  const stars = { get textContent() { return history.at(-1) || '12'; }, set textContent(v) { history.push(v); } };
  const link = { getAttribute: () => new Date(NOW - (options.htmlAge || 60000)).toISOString(), setAttribute() {} };
  const document = {
    readyState: 'complete', visibilityState: 'visible',
    querySelectorAll: s => options.empty ? [] : s === '[data-github-stars]' ? [stars] : s === '[data-github-forks]' ? [{}] : [link],
    querySelector: () => options.oldHtml ? null : link,
    addEventListener: (name, fn) => { handlers[name] = fn; }
  };
  const context = {
    Date: class extends Date { static now() { return now; } }, AbortController,
    document, window: { addEventListener: (name, fn) => { handlers[name] = fn; } },
    localStorage: {
      getItem: () => { if (options.storageError) throw Error('denied'); return options.rawCache || JSON.stringify(options.cache || null); },
      setItem: (key, value) => { if (options.storageError) throw Error('denied'); writes.push(JSON.parse(value)); }
    },
    setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id),
    fetch: async (url, config) => {
      calls.push({ url, config });
      if (url.startsWith('https://')) {
        if (options.apiError) throw Error('offline');
        return options.api ? options.api() : json({ stargazers_count: 12, forks_count: 2 });
      }
      if (options.fallbackError) throw Error('offline');
      return json(options.fallback || { stars: 12, forks: 2, updated_at: new Date(NOW - 30000).toISOString() });
    }
  };
  vm.runInNewContext(source, context);
  return { calls, history, writes, timers, stars, handlers, document,
    advance: n => { now += n; }, timeout: () => { const fns = [...timers.values()]; timers.clear(); fns.forEach(fn => fn()); } };
}

test('fresh cached 11 never suppresses the API refresh to 12', async () => {
  const r = run({ cache: stats(11) }); await flush();
  assert.equal(r.calls.length, 1); assert.equal(r.stars.textContent, '12');
  assert.equal(r.writes[0].stars, 12); assert.equal(r.timers.size, 0);
});
test('cache older than the shipped HTML cannot repaint 12 as 11', async () => {
  const pending = deferred(); const r = run({ cache: stats(11, 120000), api: () => pending.promise });
  assert.equal(r.history.length, 0); assert.equal(r.stars.textContent, '12');
  pending.resolve(json({ stargazers_count: 12, forks_count: 2 })); await flush();
});
test('API failure still checks a newer fallback when an old cache exists', async () => {
  const r = run({ apiError: true, cache: stats(11, 120000), htmlAge: 180000 }); await flush();
  assert.equal(r.calls.length, 2); assert.equal(r.stars.textContent, '12'); assert.equal(r.writes.length, 0);
});
test('older fallback cannot overwrite a newer cached 13', async () => {
  const r = run({ apiError: true, cache: stats(13) }); await flush();
  assert.equal(r.stars.textContent, '13');
});
test('real star/fork decreases and zero are accepted, not clamped to maxima', async () => {
  for (const count of [11, 0]) {
    const r = run({ cache: stats(12), api: () => json({ stargazers_count: count, forks_count: 0 }) });
    await flush(); assert.equal(r.stars.textContent, String(count)); assert.equal(r.writes[0].forks, 0);
  }
});
test('invalid counts do not become zero or fractional counts', async () => {
  for (const count of [null, '', '12', -1, 1.5, Infinity]) {
    const r = run({ api: () => json({ stargazers_count: count, forks_count: 2 }) }); await flush();
    assert.equal(r.stars.textContent, '12'); assert.equal(r.writes.length, 0); assert.equal(r.calls.length, 2);
  }
});
test('malformed or future caches cannot replace the current HTML', async () => {
  for (const rawCache of ['bad json', JSON.stringify(stats(99, -3600000)), JSON.stringify({stars: null, forks: 2, fetchedAt: NOW})]) {
    const r = run({ rawCache, apiError: true, fallbackError: true }); await flush(); assert.equal(r.stars.textContent, '12');
  }
});
test('blocked storage and both-network failures are non-fatal', async () => {
  const r = run({ storageError: true }); await flush(); assert.equal(r.stars.textContent, '12');
  const offline = run({ cache: stats(13), apiError: true, fallbackError: true }); await flush();
  assert.equal(offline.stars.textContent, '13'); assert.equal(offline.timers.size, 0);
});
test('timeout falls back and ignores a late API response', async () => {
  const pending = deferred(); const r = run({ api: () => pending.promise });
  r.timeout(); await flush(); assert.equal(r.stars.textContent, '12');
  assert.equal(r.calls[0].config.signal.aborted, true);
  pending.resolve(json({ stargazers_count: 11, forks_count: 2 })); await flush();
  assert.equal(r.stars.textContent, '12'); assert.equal(r.writes.length, 0);
});
test('visibility/online retries are single-flight and throttled, not hourly cached', async () => {
  const pending = deferred(); let attempts = 0;
  const r = run({ api: () => ++attempts === 1 ? pending.promise : json({stargazers_count:13,forks_count:2}) });
  r.advance(30001); r.handlers.online(); assert.equal(r.calls.length, 1);
  pending.resolve(json({stargazers_count:12,forks_count:2})); await flush();
  r.document.visibilityState = 'hidden'; r.handlers.visibilitychange(); assert.equal(r.calls.length, 1);
  r.document.visibilityState = 'visible'; r.handlers.visibilitychange(); await flush();
  assert.equal(r.calls.length, 2); assert.equal(r.stars.textContent, '13');
  r.handlers.online(); assert.equal(r.calls.length, 2);
});
test('HTTP 403 and invalid fallback timestamps retain the latest snapshot', async () => {
  const r = run({ api: () => ({ok:false,status:403}), fallback: {stars:10,forks:2,updated_at:'invalid'} });
  await flush(); assert.equal(r.stars.textContent, '12');
});
test('old HTML still gets fresh data; pages without stats make no requests', async () => {
  const r = run({ oldHtml: true, cache: stats(11) }); await flush(); assert.equal(r.stars.textContent, '12');
  const empty = run({ empty:true }); assert.equal(empty.calls.length, 0);
});
