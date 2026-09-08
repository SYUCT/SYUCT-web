'use strict';
const fs = require('node:fs');
const path = require('node:path');
const fixture = (name) => fs.readFileSync(path.join(__dirname, '../fixtures/mobile-paste', name), 'utf8');
const expected = JSON.parse(fixture('expected-arrangements.json'));
const mobile = (name = '测试课程AI', time = '周一第1,2节{第1-13周|单周}', room = '通明楼138') =>
  `${name}\n必修\n${time}\n教师甲\n${room}\n`;
const weekdays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
const legacyCell = (name) => `${name}\n必修\n2节/周(1-16)\n教师甲\n通明楼138\n无方向`;
function legacyTsv(name = '旧版课程') {
  return ['时间\t' + weekdays.join('\t'), ...[1, 3, 5, 7, 9].map((section) =>
    `第${section}节\t` + Array.from({ length: 7 }, (_, i) => section === 1 && i === 4 ? legacyCell(name) : '').join('\t')),
  '实践课(或无上课时间)信息：', '调、停（补）课信息：'].join('\n');
}
function legacyHtml(name = 'HTML课程') {
  return '<table><tr><th>时间</th>' + weekdays.map((d) => `<th>${d}</th>`).join('') + '</tr>' +
    [1, 3, 5, 7, 9].map((section) => `<tr><td>第${section}节</td>` + Array.from({ length: 7 }, (_, i) =>
      `<td>${section === 1 && i === 4 ? legacyCell(name).replace(/\n/g, '<br>') : ''}</td>`).join('') + '</tr>').join('') + '</table>';
}
function expand(courses) {
  return courses.flatMap((c) => {
    const result = [];
    for (let week = c.startWeek; week <= c.endWeek; week += 1) {
      if (c.weekType === 'odd' && week % 2 !== 1 || c.weekType === 'even' && week % 2 !== 0) continue;
      for (let period = c.startSection; period <= c.endSection; period += 1) {
        result.push(JSON.stringify([c.name, c.teacher, c.room, c.weekday, period, week]));
      }
    }
    return result;
  }).sort();
}
function expandExpected(courses) {
  return courses.flatMap((c) => c.periods.flatMap((p) => c.weeks.map((w) =>
    JSON.stringify([c.name, c.teacher, c.location, c.weekday, p, w])))).sort();
}
module.exports = { fixture, expected, mobile, weekdays, legacyTsv, legacyHtml, expand, expandExpected };
