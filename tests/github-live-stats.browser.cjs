'use strict';
// Optional Playwright check of the real homepage; API responses are controlled.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) || file.includes('/.git/') || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end(); return;
  }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.SYUCT_CHROMIUM ? { executablePath: process.env.SYUCT_CHROMIUM } : {}) });
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const scenario of [
      { name:'fresh old cache refreshes', cached:11, api:12, expected:12 },
      { name:'offline keeps newer cache', cached:13, offline:true, expected:13 },
      { name:'actual decrease accepted', cached:12, api:11, expected:11 },
      { name:'no cache and API unavailable uses shipped fallback', offline:true, expected:12 }
    ]) {
      const context = await browser.newContext({ viewport: {width:390,height:844} });
      let apiCalls = 0; const errors = [];
      await context.route('**/*', route => {
        const url = route.request().url();
        if (url.startsWith('https://api.github.com/repos/SYUCT/SYUCT-web')) {
          apiCalls++;
          return scenario.offline ? route.abort() : route.fulfill({ json: {stargazers_count:scenario.api,forks_count:2} });
        }
        return url.startsWith(base + '/') ? route.continue() : route.abort();
      });
      if (scenario.cached != null) await context.addInitScript(stars => {
        localStorage.setItem('syuct:github-repo-stats:v3', JSON.stringify({stars,forks:2,fetchedAt:Date.now()-1000}));
      }, scenario.cached);
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/index.html', {waitUntil:'networkidle'});
      await page.waitForFunction(expected => document.querySelector('[data-github-stars]').textContent === String(expected), scenario.expected);
      assert.equal(apiCalls, 1);
      assert.equal(await page.locator('[data-github-forks]').textContent(), '2');
      assert.match(await page.locator('.hero-github-inline').getAttribute('aria-label'), new RegExp(scenario.expected + ' 个 Star'));
      assert.deepEqual(errors, []);
      console.log('PASS ' + scenario.name);
      await context.close();
    }
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
