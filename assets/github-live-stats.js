(() => {
  'use strict';

  const API_URL = 'https://api.github.com/repos/SYUCT/SYUCT-web';
  const FALLBACK_URL = 'assets/github-stats.json';
  const CACHE_KEY = 'syuct:github-repo-stats:v3';
  const REQUEST_TIMEOUT_MS = 8000;
  const RETRY_INTERVAL_MS = 30000;

  const toCount = (value) => {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
  };

  const validTime = (value) => Number.isFinite(value) && value > 0 && value <= Date.now();

  const normalizeApiStats = (data) => {
    if (!data || typeof data !== 'object') return null;
    const stars = toCount(data.stargazers_count);
    const forks = toCount(data.forks_count);
    if (stars === null || forks === null) return null;
    return { stars, forks };
  };

  const normalizeFallbackStats = (data) => {
    if (!data || typeof data !== 'object') return null;
    const stars = toCount(data.stars);
    const forks = toCount(data.forks);
    const fetchedAt = Date.parse(data.updated_at);
    if (stars === null || forks === null || !validTime(fetchedAt)) return null;
    return { stars, forks, fetchedAt };
  };

  const render = ({ stars, forks }) => {
    const starsText = stars.toLocaleString('zh-CN');
    const forksText = forks.toLocaleString('zh-CN');
    document.querySelectorAll('[data-github-stars]').forEach((node) => {
      node.textContent = starsText;
    });
    document.querySelectorAll('[data-github-forks]').forEach((node) => {
      node.textContent = forksText;
    });
    document.querySelectorAll('.hero-github-inline').forEach((link) => {
      link.setAttribute('aria-label', `打开 GitHub 开源项目，${stars} 个 Star，${forks} 个 Fork`);
    });
  };

  const readCache = () => {
    try {
      const value = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!value || typeof value !== 'object') return null;
      const stars = toCount(value.stars);
      const forks = toCount(value.forks);
      const fetchedAt = Number(value.fetchedAt);
      if (stars === null || forks === null || !validTime(fetchedAt)) return null;
      return { stars, forks, fetchedAt };
    } catch (_) {
      return null;
    }
  };

  const writeCache = (stats) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        stars: stats.stars,
        forks: stats.forks,
        fetchedAt: stats.fetchedAt
      }));
    } catch (_) {
      // localStorage 不可用时仍可正常显示本次实时结果。
    }
  };

  const fetchJson = async (url, options) => {
    const controller = new AbortController();
    let timer;
    try {
      return await Promise.race([
        (async () => {
          const response = await fetch(url, { ...options, signal: controller.signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })(),
        new Promise((_, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new Error('Stats request timed out')); }, REQUEST_TIMEOUT_MS);
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  };

  const init = () => {
    const starNodes = document.querySelectorAll('[data-github-stars]');
    const forkNodes = document.querySelectorAll('[data-github-forks]');
    if (!starNodes.length && !forkNodes.length) return;

    const snapshot = document.querySelector('[data-github-stats-updated-at]');
    const htmlTime = Date.parse(snapshot && snapshot.getAttribute('data-github-stats-updated-at'));
    let latestTime = validTime(htmlTime) ? htmlTime : 0;
    // Compare observation times, not counts: real unstars must still be shown.
    const accept = (stats) => {
      if (!stats || stats.fetchedAt < latestTime) return;
      latestTime = stats.fetchedAt;
      render(stats);
    };
    accept(readCache());

    let inFlight = false;
    let lastAttempt = -Infinity;
    const refresh = async () => {
      if (inFlight || Date.now() - lastAttempt < RETRY_INTERVAL_MS) return;
      inFlight = true;
      lastAttempt = Date.now();
      try {
        const data = await fetchJson(API_URL, {
          cache: 'no-store',
          headers: { Accept: 'application/vnd.github+json' }
        });
        const stats = normalizeApiStats(data);
        if (!stats) throw new Error('Invalid GitHub API response');
        stats.fetchedAt = Date.now();
        accept(stats);
        writeCache(stats);
      } catch (_) {
        try {
          const data = await fetchJson(FALLBACK_URL, { cache: 'no-store' });
          accept(normalizeFallbackStats(data));
        } catch (_) {
          // Keep the latest known snapshot; never replace it with an older one.
        }
      } finally {
        inFlight = false;
      }
    };
    // A cache speeds up first paint, but never suppresses revalidation on load.
    refresh();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh();
    });
    window.addEventListener('online', refresh);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
