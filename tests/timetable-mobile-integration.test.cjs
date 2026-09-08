'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const parser = require('../assets/timetable-campus-parser.js');
const mobileParser = require('../assets/timetable-mobile-text-parser.js');
const codec = require('../assets/timetable-codec.js');
const { fixture, expected, mobile, legacyTsv, expand, expandExpected } = require('./helpers/timetable-fixtures.cjs');
const settings = { semester: '2026-2027 学年第1学期', firstWeekDate: '2026-09-07', totalWeeks: 20 };
for (const file of ['qq-duplicated.anonymized.txt', 'single-table.anonymized.txt', 'tabbed.synthetic.txt']) {
  test(`actual campus entry and TT2 exact fields: ${file}`, () => {
    const r = parser.parseCampusTimetable(fixture(file), { html: '<table>invalid or stale HTML</table>' });
    assert.equal(r.courses.length, 20);
    assert.deepEqual(r.courses.map((c) => c.courseType), expected.map((c) => c.courseType));
    assert.deepEqual(expand(r.courses), expandExpected(expected));
    assert.deepEqual(expand(codec.decodeShareCode(codec.encodeShareCode({ courses: r.courses, settings })).courses), expandExpected(expected));
    assert.equal(r.meta.sourceLikelyComplete, false);
    assert.equal(r.completeness.verified, false);
    assert.equal(r.meta.requiresTermConfirmation, true);
    assert.equal(r.semester, undefined);
    assert.ok(r.sections.some((s) => s.kind === 'unscheduled'));
    assert.ok(r.diagnostics.some((d) => d.code === 'MISSING_LOCATION'));
  });
}
test('discrete sections and weeks survive adapter and codec without expansion', () => {
  const text = mobile('离散课程', '周日第1,3,5-6节{第1-3,5,7-8周}');
  const r = parser.parseCampusTimetable(text);
  assert.equal(r.courses.length, 9);
  assert.deepEqual(expand(r.courses), expandExpected(mobileParser.parse(text).courses));
  assert.deepEqual(expand(codec.decodeShareCode(codec.encodeShareCode({ courses: r.courses, settings })).courses), expand(r.courses));
  assert.ok(r.diagnostics.some((d) => d.code === 'EXACT_RANGES_SPLIT'));
});
test('100 varying discrete sets preserve exact time occupancy through protocol', () => {
  for (let i = 0; i < 100; i++) {
    const periods = Array.from({ length: 12 }, (_, p) => p + 1).filter((p) => (p + i) % 3 !== 0);
    const weeks = Array.from({ length: 20 }, (_, w) => w + 1).filter((w) => (w * 7 + i) % 5 < 2);
    const text = mobile('离散测试', `周二第${periods.join(',')}节{第${weeks.join(',')}周}`);
    const mapped = parser.parseCampusTimetable(text);
    assert.deepEqual(expand(mapped.courses), expandExpected(mobileParser.parse(text).courses));
  }
});
test('recognized malformed result exposes diagnostics and safe partial courses, never seven-column fallback', () => {
  assert.throws(() => parser.parseCampusTimetable(mobile() + mobile('坏课程', '周二第3,4节{第8-2周}'), { html: '<table></table>' }), (err) => {
    assert.equal(err.name, 'MobileTimetableParseError');
    assert.ok(err.adaptedResult.meta.hasBlockingErrors);
    assert.equal(err.result.stats.unresolvedRecords, 1);
    assert.equal(err.adaptedResult.courses.length, 1);
    assert.doesNotMatch(err.message, /七列|7 个/);
    return true;
  });
});
for (const time of ['周一第13,14节{第1-16周}', '周一第1,2节{第1-31周}', '周八第1,2节{第1-16周}']) {
  test(`school/protocol limits fail closed: ${time}`, () => assert.throws(() => parser.parseCampusTimetable(mobile('越界', time)), /越界|星期/));
}
test('exactly 200 mapped arrangements allowed, overflow blocks with visible partial result', () => {
  const text = Array.from({ length: 201 }, (_, i) => mobile('课程' + i)).join('\n');
  assert.equal(parser.parseCampusTimetable(text.slice(0, text.lastIndexOf('课程200'))).courses.length, 200);
  assert.throws(() => parser.parseCampusTimetable(text), (err) => {
    assert.ok(err.adaptedResult.meta.hasBlockingErrors);
    assert.equal(err.result.hasBlockingErrors, true);
    assert.equal(err.adaptedResult.courses.length, 200);
    assert.ok(err.adaptedResult.diagnostics.some((d) => d.code === 'TT2_COURSE_LIMIT'));
    return true;
  });
});
test('dedup retains differences in course nature and case', () => {
  const r = parser.parseCampusTimetable(mobile('CourseAI') + mobile('CourseAI').replace('必修', '选修') + mobile('Courseai'));
  assert.equal(r.courses.length, 3);
});
test('long consumer text is preserved but explicitly flagged for correction', () => {
  const r = parser.parseCampusTimetable(mobile('甲'.repeat(41)));
  assert.equal(r.courses[0].name.length, 41);
  assert.ok(r.diagnostics.some((d) => d.code === 'CONSUMER_TEXT_LIMIT'));
});
test('time after footer cannot silently vanish (including a repeated whole table)', () => {
  for (const label of ['未安排上课时间的课程：', '实践课(或无上课时间)信息：', '调、停（补）课信息：\n星期一星期二星期三星期四星期五星期六星期日']) {
    const result = mobileParser.parse(mobile() + '\n' + label + '\n' + mobile('第二份课表'));
    assert.ok(result.hasBlockingErrors);
    assert.equal(result.stats.scheduleMarkers, 2);
    assert.equal(result.stats.parsedRecords + result.stats.unresolvedRecords, 2);
    assert.ok(result.diagnostics.some((d) => d.code === 'SCHEDULE_AFTER_FOOTER'));
  }
});
test('non-numeric unknown fused venue blocks instead of becoming next course title', () => {
  const r = mobileParser.parse(mobile('甲', undefined, '新运动场').trimEnd() + mobile('乙'));
  assert.ok(r.hasBlockingErrors);
  assert.ok(r.diagnostics.some((d) => d.code === 'AMBIGUOUS_NAME_LOCATION'));
});
test('mixed old/new schedules cannot hide old records', () => {
  const r = mobileParser.parse(mobile() + '\n旧课\n必修\n2节/周(1-16)\n教师甲\n通明楼138');
  assert.ok(r.hasBlockingErrors);
  assert.ok(r.diagnostics.some((d) => d.code === 'MIXED_TIME_FORMATS'));
});
test('legacy TSV still checks all seven weekday columns', () => {
  const r = parser.parseCampusTimetable(legacyTsv());
  assert.equal(r.meta.sourceFormat, 'clipboard-text-7col');
  assert.equal(r.courses[0].weekday, 5);
  assert.throws(() => parser.parseCampusTimetable(legacyTsv().replace('第3节\t\t\t\t\t\t\t', '第3节\t\t\t')), /星期列/);
});
test('weekday-grouped Markdown remains explicitly unsupported', () => {
  const text = '| 星期一 | |\n1-2节 (1-13|单周)有机化学AI通明楼138';
  assert.equal(mobileParser.parse(text).recognized, false);
  assert.throws(() => parser.parseCampusTimetable(text));
});
test('resource load order, revisions and page-specific cache policy', () => {
  const html = fs.readFileSync(path.join(__dirname, '../timetable-converter.html'), 'utf8');
  const names = ['timetable-mobile-text-parser.js', 'timetable-campus-parser.js', 'timetable-converter.js'];
  const positions = names.map((n) => html.indexOf(`assets/${n}?rev=${n === 'timetable-converter.js' ? '20260908-optional1' : '20260908-paste2'}`));
  assert.ok(positions.every((p) => p > 0));
  assert.ok(positions[0] < positions[1] && positions[1] < positions[2]);
  const config = require('../edgeone.json');
  assert.ok(config.headers.find((h) => h.source === '/timetable-converter.html').headers.some((h) => h.key === 'Cache-Control' && h.value === 'no-cache'));
  assert.doesNotMatch(html, /userscript|\.user\.js|高级结构采集|用户脚本管理器/i);
  assert.equal(fs.existsSync(path.join(__dirname, '../assets/syuct-timetable-capture.user.js')), false);
  assert.ok(!config.headers.some((h) => /capture\.user/.test(h.source)));
  assert.doesNotMatch(html, /timetable-converter-guide|图文教程|插件/);
  assert.equal(fs.existsSync(path.join(__dirname, '../docs/timetable-converter-guide.pdf')), false);
  for (const text of ['本科课表', '硕士课表', '截图备用', '回到本页长按粘贴', '保存为 PDF']) assert.ok(html.includes(text));
});
test('actual mini-program decoder and import normalization (optional local consumer)', { skip: !process.env.SYUCT_MINI_STORE }, () => {
  const store = require(path.resolve(process.env.SYUCT_MINI_STORE));
  const miniCodec = require(path.join(path.dirname(path.resolve(process.env.SYUCT_MINI_STORE)), 'timetable-codec.js'));
  for (const text of [fixture('qq-duplicated.anonymized.txt'), mobile('离散测试', '周日第1,3,5-6节{第1-3,5,7-8周}')]) {
    const r = parser.parseCampusTimetable(text);
    const code = codec.encodeShareCode({ settings, courses: r.courses });
    assert.deepEqual(expand(miniCodec.decodeShareCode(code).courses), expand(r.courses));
    const imported = store.parseImportText(code);
    assert.equal(imported.courses.length, r.courses.length);
    assert.deepEqual(expand(imported.courses), expand(r.courses));
    assert.deepEqual(imported.settings, settings);
    const optionalSettings = { semester: '', firstWeekDate: '', totalWeeks: 20 };
    const optionalCode = codec.encodeShareCode({ settings: optionalSettings, courses: r.courses });
    assert.deepEqual(miniCodec.decodeShareCode(optionalCode).settings, optionalSettings);
    const optionalImport = store.parseImportText(optionalCode);
    assert.deepEqual(expand(optionalImport.courses), expand(r.courses));
    assert.deepEqual(optionalImport.settings, {
      ...optionalSettings, semester: store.defaultState().settings.semester
    });
  }
});
