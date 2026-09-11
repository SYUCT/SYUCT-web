const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  const types = {'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.apk':'application/vnd.android.package-archive'};
  try { res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.CHROME_PATH || undefined});
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const origin = 'http://127.0.0.1:' + server.address().port;
    await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
    await page.goto(origin + '/index.html');
    assert.equal(await page.locator('.hero-actions-home .btn').count(), 4);
    const buttonBoxes = () => page.locator('.hero-actions-home .btn').evaluateAll(async nodes => {
      // Allow the existing .btn transitions to finish after viewport changes.
      nodes.forEach(node => node.getBoundingClientRect());
      await Promise.all(nodes.flatMap(node => node.getAnimations()).map(animation => animation.finished.catch(() => {})));
      return nodes.map(node => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x, y, width, height, fits: node.scrollWidth <= node.clientWidth };
      });
    });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      for (const width of [320, 360, 390, 430, 650]) {
        await page.setViewportSize({width, height:844});
        const boxes = await buttonBoxes();
        assert.equal(boxes[0].y, boxes[1].y);
        assert.equal(boxes[2].y, boxes[3].y);
        assert.equal(boxes[0].x, boxes[2].x);
        assert.equal(boxes[1].x, boxes[3].x);
        assert.ok(boxes[2].y >= boxes[0].y + boxes[0].height + 9);
        assert.ok(boxes.every(box => Math.abs(box.width - boxes[0].width) < 1 && box.height >= 50 && box.fits));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
    }
    // The mobile-only CSS must not alter desktop geometry.
    const originalCss = execFileSync('git', ['show', 'HEAD:assets/styles.css'], {cwd:root, encoding:'utf8'});
    for (const width of [900, 1440]) {
      await page.setViewportSize({width, height:1000});
      const current = await buttonBoxes();
      await page.route('**/assets/styles.css*', route => route.fulfill({contentType:'text/css', body:originalCss}));
      await page.reload();
      assert.deepEqual(await buttonBoxes(), current);
      await page.unroute('**/assets/styles.css*');
      await page.reload();
    }
    await page.setViewportSize({width:390,height:844});
    const link = page.getByRole('link', {name:'下载化大课表 App，安卓 APK 安装包'});
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
    assert.equal(download.suggestedFilename(), 'SYUCT-Timetable.apk');
    assert.equal(await download.failure(), null);
    const bytes = fs.readFileSync(await download.path());
    assert.deepEqual(bytes, fs.readFileSync(path.join(root, 'downloads/SYUCT-Timetable.apk')));
    assert.equal(bytes.subarray(0, 2).toString(), 'PK');
    await page.evaluate(() => window.scrollTo(0, window.scrollY + document.querySelector('.hero-actions-home').getBoundingClientRect().top - 200));
    await page.screenshot({path:'/private/tmp/syuct-app-download-buttons.png',animations:'disabled'});
    await page.goto(origin + '/timetable-converter.html');
    assert.match(await page.locator('.tt-app-guide').innerText(), /优先使用 App · 仅支持安卓/);
    assert.match(await page.locator('.tt-app-guide').innerText(), /App「设置」中复制课表码/);
    assert.equal(await page.locator('#textSourcePanel').isVisible(), true);
    const [appDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', {name:'下载安卓 App'}).click()]);
    assert.equal(await appDownload.failure(), null);
    assert.deepEqual(fs.readFileSync(await appDownload.path()), bytes);
    for (const width of [320, 390, 650, 1440]) {
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path:'/private/tmp/syuct-converter-app-guide.png',animations:'disabled'});
    console.log('PASS 深浅色手机首页两行两列、桌面布局不变、两处 APK 下载完整、安卓 App 引导和网页入口');
  } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
