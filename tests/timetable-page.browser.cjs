'use strict';
// Actual HTTP page + real script URLs. Playwright is an optional test dependency;
// use NODE_PATH for a preinstalled runtime without changing the site lockfile.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const codec = require('../assets/timetable-codec.js');
const { fixture, expected, mobile, legacyTsv, legacyHtml, expand, expandExpected } = require('./helpers/timetable-fixtures.cjs');
const root = path.resolve(__dirname, '..');
const output = path.resolve(process.env.SYUCT_BROWSER_OUTPUT || path.join(root, 'tmp/timetable-browser'));
const checks = [], errors = [], missing = [], external = [], requests = [], served = [];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.pdf': 'application/pdf', '.wasm': 'application/wasm', '.gz': 'application/gzip', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  served.push(url.pathname + url.search);
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) || file.includes('/.git/') || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end(); return;
  }
  res.setHeader('Content-Type', (mime[path.extname(file)] || 'application/octet-stream') + (['.html', '.js', '.css', '.json'].includes(path.extname(file)) ? '; charset=utf-8' : ''));
  res.setHeader('Cache-Control', path.extname(file) === '.html' ? 'no-cache' : 'public, max-age=7200');
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.SYUCT_CHROMIUM ? { executablePath: process.env.SYUCT_CHROMIUM } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    // Do not permit private timetable data to leave the local test server.
    await context.route(/https?:\/\//, (route) => {
      if (route.request().url().startsWith(base + '/')) return route.continue();
      external.push(route.request().url()); return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => { if (r.status() >= 400) missing.push(r.url()); });
    page.on('request', (r) => requests.push(r.url()));
    page.setDefaultTimeout(15000);
    async function check(name, action) {
      await action(); checks.push(name); console.log('PASS ' + name);
    }
    async function paste(text, html = '', replaceAll = true) {
      await page.evaluate(({ text, html, replaceAll }) => {
        const input = document.querySelector('#rawTimetable');
        if (replaceAll) input.select(); else input.setSelectionRange(input.value.length, input.value.length);
        const data = new DataTransfer();
        data.setData('text/plain', text);
        if (html) data.setData('text/html', html);
        input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      }, { text, html, replaceAll });
    }
    async function parse(text, html = '') {
      await paste(text, html);
      await page.locator('#recognizeBtn').click();
    }
    async function confirmMobile() {
      await page.locator('#ocrReviewConfirm').check();
      await page.locator('#semester').fill('2026-2027 学年第1学期');
      await page.locator('#mobileTermConfirm').check();
    }
    async function decoded() {
      await page.locator('#generateBtn').click();
      const code = await page.locator('#shareCode').inputValue();
      assert.ok(code.startsWith('SYUCT-TT2:'), await page.locator('#recognizeStatusMessage').textContent());
      return codec.decodeShareCode(code);
    }
    async function noCode() {
      assert.equal(await page.locator('#generateBtn').isDisabled(), true);
      assert.equal(await page.locator('#copyCodeBtn').isDisabled(), true);
      assert.equal(await page.locator('#shareCode').inputValue(), '');
    }
    await page.goto(base + '/timetable-converter.html', { waitUntil: 'networkidle' });
    await check('actual HTTP scripts load; paste is primary; no eager OCR/PDF engine download', async () => {
      assert.equal(await page.locator('#textSourcePanel').isVisible(), true);
      assert.equal(await page.evaluate(() => typeof SYUCTMobileTextParser.parse), 'function');
      for (const n of ['timetable-mobile-text-parser', 'timetable-campus-parser', 'timetable-converter']) {
        const revision = n === 'timetable-converter' ? '20260908-optional1' : '20260908-paste2';
        assert.ok(requests.some((url) => url.endsWith(`${n}.js?rev=${revision}`)));
      }
      assert.equal(requests.some((url) => /\/tesseract\/|\/pdfjs\//.test(url)), false);
      assert.equal(await page.locator('#semester').inputValue(), '');
      assert.equal(await page.locator('#textSourceTab').textContent(), '本科课表');
      assert.equal(await page.locator('#pdfSourceTab').textContent(), '硕士课表');
      assert.equal(await page.locator('a[href*="timetable-converter-guide"]').count(), 0);
      assert.match(await page.locator('#textSourcePanel').textContent(), /回到本页长按粘贴/);
      fs.mkdirSync(output, { recursive: true });
      await page.screenshot({ path: path.join(output, 'mobile-import-guide.png'), animations: 'disabled' });
    });
    await check('40-marker paste produces 20 exact arrangements and 13 course names, ignoring stale HTML', async () => {
      await parse(fixture('qq-duplicated.anonymized.txt'), legacyHtml('不应出现的旧课'));
      assert.equal(await page.locator('.tt-course-card').count(), 20);
      assert.equal(await page.locator('#arrangementCount').textContent(), '20');
      assert.equal(await page.locator('#uniqueCourseCount').textContent(), '13');
      assert.match(await page.locator('#pasteStats').textContent(), /去重 20 条 · 未解决 0 条/);
      assert.equal(await page.locator('#semester').inputValue(), '');
      assert.equal(await page.locator('#firstWeekDate').inputValue(), '');
      await noCode();
    });
    await check('missing room, unscheduled notes and source diagnostics visible', async () => {
      assert.equal(await page.locator('[data-code="MISSING_LOCATION"]').count(), 1);
      assert.match(await page.locator('#pasteSections').textContent(), /创造性思维与创新方法/);
      assert.equal(await page.locator('#coursePreview').getByText('创造性思维与创新方法', { exact: true }).count(), 0);
      assert.match(await page.locator('#pasteStats').textContent(), /不代表复制完整/);
    });
    await check('mobile and desktop layout; real page screenshots', async () => {
      fs.mkdirSync(output, { recursive: true });
      for (const [label, width, height] of [['mobile', 390, 844], ['desktop', 1280, 900]]) {
        await page.setViewportSize({ width, height });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.evaluate(() => window.scrollTo(0, document.querySelector('#recognizeResult').getBoundingClientRect().top + scrollY - 85));
        await page.screenshot({ path: path.join(output, `${label}.png`), animations: 'disabled' });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
      await page.screenshot({ path: path.join(output, 'mobile-dark.png'), animations: 'disabled' });
      await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
    });
    await check('blank semester and date generate TT2 after both confirmations', async () => {
      await page.locator('#mobileTermConfirm').check();
      await noCode();
      await page.locator('#ocrReviewConfirm').check();
      const result = await decoded();
      assert.deepEqual(result.settings, { semester: '', firstWeekDate: '', totalWeeks: 20 });
      assert.deepEqual(expand(result.courses), expandExpected(expected));
      await page.locator('#mobileTermConfirm').uncheck();
      await noCode();
    });
    await check('course and term confirmations required; exact generated TT2 matches golden data', async () => {
      await page.locator('#ocrReviewConfirm').check();
      assert.equal(await page.locator('#generateBtn').isDisabled(), true);
      await confirmMobile();
      assert.deepEqual(expand((await decoded()).courses), expandExpected(expected));
    });
    await check('editing course invalidates code and confirmation, then uses edited room', async () => {
      const card = page.locator('.tt-course-card').first();
      await card.locator('summary').click();
      await card.getByLabel('教室', { exact: true }).fill('通明楼203');
      await noCode();
      assert.equal(await page.locator('#ocrReviewConfirm').isChecked(), false);
      await page.locator('#ocrReviewConfirm').check();
      assert.equal((await decoded()).courses[0].room, '通明楼203');
    });
    await check('editing semester invalidates code and term confirmation', async () => {
      await page.locator('#semester').fill('2027-2028 学年第1学期');
      await noCode();
      assert.equal(await page.locator('#mobileTermConfirm').isChecked(), false);
      await page.locator('#mobileTermConfirm').check();
      assert.equal((await decoded()).settings.semester, '2027-2028 学年第1学期');
    });
    await check('clearing a previously filled semester does not reuse it or block generation', async () => {
      await page.locator('#semester').fill('');
      await noCode();
      await page.locator('#mobileTermConfirm').check();
      assert.deepEqual((await decoded()).settings, { semester: '', firstWeekDate: '', totalWeeks: 20 });
    });
    await check('plain-text re-paste clears previous HTML and confirmation', async () => {
      await parse(legacyTsv(), legacyHtml('HTML课程'));
      assert.equal((await decoded()).courses[0].name, 'HTML课程');
      await parse(legacyTsv('纯文本新课'));
      assert.equal((await decoded()).courses[0].name, '纯文本新课');
    });
    await check('HTML without plain text clears cached result and cannot reuse old table', async () => {
      await paste('', legacyHtml('空纯文本的HTML'));
      await noCode();
      await page.locator('#recognizeBtn').click();
      assert.equal((await decoded()).courses[0].name, '纯文本新课');
    });
    await check('paste without clipboardData still invalidates old result', async () => {
      await page.evaluate(() => document.querySelector('#rawTimetable').dispatchEvent(new Event('paste', { bubbles: true })));
      await noCode();
      await page.locator('#recognizeBtn').click();
      assert.equal((await decoded()).courses[0].name, '纯文本新课');
    });
    await check('partial paste cannot use fragment HTML as entire timetable', async () => {
      await paste('\n多余文字', legacyHtml('只存在于局部HTML'), false);
      await noCode();
      await page.locator('#recognizeBtn').click();
      assert.equal((await decoded()).courses[0].name, '纯文本新课');
    });
    await check('manual input edit resets result and HTML; reparse reads new text', async () => {
      await parse(legacyTsv(), legacyHtml('将过期的HTML'));
      await page.locator('#rawTimetable').fill(mobile('编辑后的课程'));
      await noCode();
      assert.equal(await page.locator('#recognizeResult').isHidden(), true);
      await page.locator('#recognizeBtn').click();
      await confirmMobile();
      assert.equal((await decoded()).courses[0].name, '编辑后的课程');
    });
    await check('generation rechecks latest input even if script changed value without input event', async () => {
      await page.evaluate(() => { document.querySelector('#rawTimetable').value = 'changed silently'; });
      await page.locator('#generateBtn').click();
      assert.equal(await page.locator('#shareCode').inputValue(), '');
      assert.equal(await page.locator('#copyCodeBtn').isDisabled(), true);
    });
    await check('clear and invalid parse never leave previous code or courses', async () => {
      await page.locator('#rawTimetable').fill(''); await noCode();
      await page.locator('#recognizeBtn').click();
      assert.equal(await page.locator('#recognizeResult').isHidden(), true);
      assert.equal(await page.locator('.tt-course-card').count(), 0);
    });
    await check('partial errors preserve safe previews and all diagnostics, generation remains blocked', async () => {
      await parse(mobile('有效课程') + mobile('坏课程', '周二第3,4节{第8-2周}'));
      assert.equal(await page.locator('.tt-course-card').count(), 1);
      assert.equal(await page.locator('#ocrReviewConfirm').isDisabled(), true);
      assert.match(await page.locator('#pasteStats').textContent(), /未解决 1 条/);
      assert.ok(await page.locator('[data-severity="error"]').count());
      await noCode();
    });
    await check('correcting failed input and repasting succeeds with fresh confirmation', async () => {
      await parse(mobile('修正课程'));
      await noCode();
      await confirmMobile();
      assert.equal((await decoded()).courses[0].name, '修正课程');
    });
    await check('semester cannot hide later courses; invalid date and long consumer text block generation', async () => {
      await page.locator('#totalWeeks').fill('5');
      await page.locator('#mobileTermConfirm').check();
      await page.locator('#generateBtn').click();
      assert.equal(await page.locator('#shareCode').inputValue(), '');
      assert.match(await page.locator('#recognizeStatusMessage').textContent(), /小于课程结束周/);
      await page.locator('#totalWeeks').fill('20');
      await page.locator('#firstWeekDate').fill('2026-09-08');
      await page.locator('#mobileTermConfirm').check();
      await page.locator('#generateBtn').click();
      assert.match(await page.locator('#recognizeStatusMessage').textContent(), /星期一/);
      await page.locator('#firstWeekDate').fill('');
      await page.locator('#semester').fill('学'.repeat(41));
      await page.locator('#mobileTermConfirm').check();
      await page.locator('#generateBtn').click();
      assert.equal(await page.locator('#shareCode').inputValue(), '');
      assert.match(await page.locator('#recognizeStatusMessage').textContent(), /学期名称限 40 字/);
      await parse(mobile('长'.repeat(41)));
      await confirmMobile();
      await page.locator('#generateBtn').click();
      assert.equal(await page.locator('#shareCode').inputValue(), '');
      assert.match(await page.locator('#recognizeStatusMessage').textContent(), /40 字/);
    });
    await check('course names and footer HTML are inert text; no student header reflected', async () => {
      const title = '<img src=x onerror="window.PWNED=1">';
      await parse('学号：PRIVATE-ID\n' + mobile(title) + '\n未安排上课时间的课程：\n<script>window.PWNED=2</script>');
      assert.equal(await page.locator('.tt-course-card summary strong').textContent(), title);
      assert.equal(await page.locator('#coursePreview img, #pasteSections script').count(), 0);
      assert.equal(await page.evaluate(() => window.PWNED), undefined);
      assert.doesNotMatch(await page.locator('#recognizeResult').textContent(), /PRIVATE-ID/);
    });
    await check('deleting final course prevents empty generated code', async () => {
      await parse(mobile());
      await page.locator('.tt-course-card summary').click();
      await page.locator('.tt-course-remove').click();
      await noCode();
      await page.locator('#ocrReviewConfirm').check();
      assert.equal(await page.locator('#generateBtn').isDisabled(), true);
    });
    await check('legacy invalid TSV still rejects missing columns', async () => {
      await parse(legacyTsv().replace('第3节\t\t\t\t\t\t\t', '第3节\t\t\t'));
      assert.match(await page.locator('#recognizeStatusMessage').textContent(), /星期列/);
      await noCode();
    });
    await check('valid rowspan/colspan HTML survives missing plain-text slots', async () => {
      const html = legacyHtml('合并表格课').replace('<th>时间</th>', '<th colspan="2">时间</th>')
        .replace('<td>第1节</td>', '<td rowspan="5">上午</td><td>第1节</td>');
      await parse(legacyTsv().replace('第3节\t\t\t\t\t\t\t', '第3节\t\t\t'), html);
      const courses = (await decoded()).courses;
      assert.equal(courses[0].name, '合并表格课');
      assert.equal(courses[0].weekday, 5);
    });
    await check('legacy Markdown table works; weekday-grouped Markdown reports unsupported', async () => {
      const text = '| 时间 | 星期一 | 星期二 | 星期三 | 星期四 | 星期五 | 星期六 | 星期日 |\n' +
        '| 第9节 | 晚课<br>必修<br>2节/周(1-8)<br>教师甲<br>通明楼138 | | | | | | |\n实践课(或无上课时间)信息：';
      await parse(text);
      assert.equal((await decoded()).courses[0].name, '晚课');
      await parse('| 星期一 | |\n1-2节 (1-13|单周)课程');
      await noCode();
    });
    await check('tab changes invalidate results and retain separate graduate file input', async () => {
      await parse(mobile());
      await page.locator('#pdfSourceTab').click();
      await noCode();
      assert.equal(await page.locator('#pdfSourcePanel').isVisible(), true);
      assert.equal(await page.locator('#mobileTermPanel').isHidden(), true);
      assert.match(await page.locator('#pdfSourcePanel').textContent(), /保存为 PDF/);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(output, 'mobile-masters-guide.png'), animations: 'disabled' });
    });
    await check('real two-page PDF upload → PDF.js text coordinates → review → TT2', async () => {
      await page.locator('#graduatePdfInput').setInputFiles(path.join(__dirname, 'fixtures/mobile-paste/graduate.synthetic.pdf'));
      await page.locator('#graduatePdfRecognizeBtn').click();
      await page.waitForFunction(() => !document.querySelector('#graduatePdfRecognizeBtn').disabled);
      assert.equal(await page.locator('.tt-course-card').count(), 2, await page.locator('#recognizeStatusMessage').textContent());
      await noCode();
      await page.locator('#ocrReviewConfirm').check();
      const courses = (await decoded()).courses;
      assert.deepEqual(courses.map((c) => [c.name, c.teacher, c.room, c.weekday, c.startSection, c.endSection, c.startWeek, c.endWeek]), [
        ['现代设计方法', '测试甲', '瑞师楼（原3号教学楼）222', 2, 1, 2, 2, 17],
        ['研究生美育', '测试甲', '瑞师楼（原3号教学楼）226', 3, 9, 10, 10, 17]
      ]);
      assert.ok(requests.some((url) => url.includes('pdf.worker.min.js')));
      assert.equal(page.workers().length, 0, 'PDF loading task must release its worker after reading');
      const images = await page.evaluate(async () => {
        const pdfjs = await import('./assets/pdfjs/pdf.min.js?rev=6.2.108-import1');
        const loading = pdfjs.getDocument({ url: './tests/fixtures/mobile-paste/graduate.synthetic.pdf',
          cMapUrl: new URL('./assets/pdfjs/cmaps/', document.baseURI).href, cMapPacked: true,
          standardFontDataUrl: new URL('./assets/pdfjs/standard_fonts/', document.baseURI).href,
          wasmUrl: new URL('./assets/pdfjs/wasm/', document.baseURI).href });
        const doc = await loading.promise;
        const images = [];
        for (let n = 1; n <= doc.numPages; n++) {
          const p = await doc.getPage(n); const viewport = p.getViewport({ scale: 1.4 });
          const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height;
          await p.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          images.push(canvas.toDataURL('image/png').split(',')[1]);
        }
        await loading.destroy(); return images;
      });
      images.forEach((image, i) => fs.writeFileSync(path.join(output, `graduate-page-${i + 1}.png`), Buffer.from(image, 'base64')));
    });
    await check('repeated PDF reading invalidates confirmation and releases its worker', async () => {
      await page.locator('#graduatePdfRecognizeBtn').click();
      await page.waitForFunction(() => !document.querySelector('#graduatePdfRecognizeBtn').disabled);
      assert.equal(await page.locator('.tt-course-card').count(), 2);
      await noCode();
      assert.equal(page.workers().length, 0);
    });
    await check('bad replacement PDF resets previous generated result', async () => {
      await page.locator('#graduatePdfInput').setInputFiles({ name: 'bad.pdf', mimeType: 'application/pdf', buffer: Buffer.from('invalid pdf') });
      await noCode();
      await page.locator('#graduatePdfRecognizeBtn').click();
      await page.waitForFunction(() => !document.querySelector('#graduatePdfRecognizeBtn').disabled);
      assert.match(await page.locator('#recognizeStatusMessage').textContent(), /有效的 PDF/);
      await noCode();
    });
    await check('real Canvas grid → local Tesseract OCR → editable review → TT2', async () => {
      await page.locator('#imageSourceTab').click();
      const imageData = await page.evaluate(() => {
        const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1800;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 1600, 1800);
        ctx.strokeStyle = 'black'; ctx.lineWidth = 2;
        const line = (x0, y0, x1, y1) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
        [100, 150, 200, 380, 560, 740, 920, 1100, 1280, 1460].forEach((x) => line(x, 200, x, 1600));
        [200, 250, 300, 520, 740, 880, 1020, 1600].forEach((y) => line(200, y, 1460, y));
        [300, 410, 520, 630, 740, 810, 880, 950, 1020, 1310, 1600].forEach((y) => line(150, y, 200, y));
        ctx.fillStyle = 'black'; ctx.font = '22px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
        ['高等数学', '必修', '2节/周(1-16)', '测试甲', '通明楼138', '无方向'].forEach((text, i) => ctx.fillText(text, 290, 338 + i * 30));
        return canvas.toDataURL('image/png').split(',')[1];
      });
      await page.locator('#ocrImageInput').setInputFiles({ name: 'synthetic-grid.png', mimeType: 'image/png', buffer: Buffer.from(imageData, 'base64') });
      await page.waitForFunction(() => !document.querySelector('#ocrRecognizeBtn').disabled);
      await page.locator('#ocrRecognizeBtn').click();
      await page.waitForFunction(() => !document.querySelector('#ocrRecognizeBtn').disabled, null, { timeout: 120000 });
      assert.equal(await page.locator('.tt-course-card').count(), 1, await page.locator('#recognizeStatusMessage').textContent());
      await noCode();
      await page.locator('#ocrReviewConfirm').check();
      const [course] = (await decoded()).courses;
      assert.equal(course.name, '高等数学');
      assert.equal(course.weekday, 1); assert.equal(course.startSection, 1); assert.equal(course.endSection, 2);
      assert.equal(course.startWeek, 1); assert.equal(course.endWeek, 16);
      assert.ok(requests.some((url) => url.includes('tesseract.min.js')));
    });
    await check('page reload loads new parser; privacy, resources and page errors', async () => {
      await page.reload({ waitUntil: 'networkidle' });
      await parse(fixture('qq-duplicated.anonymized.txt'));
      assert.equal(await page.locator('.tt-course-card').count(), 20);
      assert.deepEqual(errors, []);
      assert.deepEqual(missing, []);
      assert.deepEqual(external, []);
    });
    await check('real HTTP cache reuses versioned scripts and revalidates HTML (unrouted context)', async () => {
      // Playwright routing disables HTTP cache. Use a fresh, unrouted context for
      // this check, with only local synthetic inputs and no user browser profile.
      const cachedContext = await browser.newContext({ serviceWorkers: 'block' });
      try {
        const cachedPage = await cachedContext.newPage();
        cachedPage.on('request', (r) => { if (!r.url().startsWith(base + '/')) external.push(r.url()); });
        cachedPage.on('pageerror', (e) => errors.push(e.message));
        cachedPage.on('response', (r) => { if (r.status() >= 400) missing.push(r.url()); });
        const scriptUrls = ['timetable-mobile-text-parser', 'timetable-campus-parser', 'timetable-converter']
          .map((name) => `/assets/${name}.js?rev=${name === 'timetable-converter' ? '20260908-optional1' : '20260908-paste2'}`);
        const count = (url) => served.filter((entry) => entry === url).length;
        await cachedPage.goto(base + '/timetable-converter.html', { waitUntil: 'networkidle' });
        const scriptCounts = scriptUrls.map(count), htmlCount = count('/timetable-converter.html');
        await cachedPage.goto('about:blank');
        await cachedPage.goto(base + '/timetable-converter.html', { waitUntil: 'networkidle' });
        assert.deepEqual(scriptUrls.map(count), scriptCounts, 'fresh versioned scripts should be served from browser cache');
        assert.ok(count('/timetable-converter.html') > htmlCount, 'HTML must reach the server again');
        assert.equal(await cachedPage.evaluate((text) => SYUCTTimetableParser.parseCampusTimetable(text).courses.length,
          fixture('qq-duplicated.anonymized.txt')), 20);
        assert.deepEqual(errors, []); assert.deepEqual(missing, []); assert.deepEqual(external, []);
      } finally { await cachedContext.close(); }
    });
    const report = { browser: browser.version(), scope: 'Actual localhost page; synthetic ClipboardEvent (not OS/phone clipboard); real local PDF.js and Tesseract',
      passed: checks.length, checks, pageErrors: errors, missingResources: missing, externalRequests: external };
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
})().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });
