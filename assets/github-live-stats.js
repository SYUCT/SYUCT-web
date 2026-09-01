(() => {
  'use strict';

  const API_URL = 'https://api.github.com/repos/SYUCT/SYUCT-web';
  const FALLBACK_URL = 'assets/github-stats.json';
  const CACHE_KEY = 'syuct:github-repo-stats:v3';
  const CACHE_TTL_MS = 60 * 60 * 1000;

  const toCount = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
  };

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
    if (stars === null || forks === null) return null;
    return { stars, forks };
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
      if (stars === null || forks === null || !Number.isFinite(fetchedAt)) return null;
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
        fetchedAt: Date.now()
      }));
    } catch (_) {
      // localStorage 不可用时仍可正常显示本次实时结果。
    }
  };

  const fetchJson = async (url, options) => {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };

  const loadFallback = async () => {
    const data = await fetchJson(FALLBACK_URL, { cache: 'no-store' });
    const stats = normalizeFallbackStats(data);
    if (!stats) throw new Error('Invalid fallback stats');
    render(stats);
  };

  const init = async () => {
    const starNodes = document.querySelectorAll('[data-github-stars]');
    const forkNodes = document.querySelectorAll('[data-github-forks]');
    if (!starNodes.length && !forkNodes.length) return;

    const cached = readCache();
    if (cached) render(cached);

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return;

    try {
      const data = await fetchJson(API_URL, {
        cache: 'no-store',
        headers: { Accept: 'application/vnd.github+json' }
      });
      const stats = normalizeApiStats(data);
      if (!stats) throw new Error('Invalid GitHub API response');
      render(stats);
      writeCache(stats);
    } catch (_) {
      if (!cached) {
        try {
          await loadFallback();
        } catch (_) {
          // API 和 fallback 都失败时保留 HTML 中现有数字。
        }
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
