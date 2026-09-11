const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
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
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const link = page.getByRole('link', {name:'下载化大课表 App，安卓 APK 安装包'});
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
    assert.equal(download.suggestedFilename(), 'SYUCT-Timetable.apk');
    assert.equal(await download.failure(), null);
    const bytes = fs.readFileSync(await download.path());
    assert.deepEqual(bytes, fs.readFileSync(path.join(root, 'downloads/SYUCT-Timetable.apk')));
    assert.equal(bytes.subarray(0, 2).toString(), 'PK');
    await page.locator('.hero-actions-home').screenshot({path:'/private/tmp/syuct-app-download-buttons.png'});
    console.log('PASS 手机首页四个按钮、无横向溢出、APK 下载内容完整');
  } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
