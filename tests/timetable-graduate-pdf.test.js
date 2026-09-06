'use strict';

const assert = require('assert');
const parser = require('../assets/timetable-graduate-pdf.js');

const headerX = [109.03, 215.34, 321.65, 427.97, 534.28, 640.59, 746.90];
const columnX = [73.97, 180.28, 286.60, 392.91, 499.22, 605.53, 711.85];

function item(text, x, y, width = Math.max(20, String(text).length * 5), height = 10) {
  return { text, x, y, width, height };
}

function page(pageNumber, blocks, withTitle = false) {
  const items = [];
  if (withTitle) items.push(item('沈阳化工大学2026-2027学年第1学期课表', 277, 551, 288, 16));
  parser.WEEKDAY_NAMES.slice(1).forEach((name, index) => items.push(item(name, headerX[index], 510, 30)));
  blocks.forEach((block) => {
    block.lines.forEach((line, index) => items.push(item(line, columnX[block.weekday - 1], block.y - index * 11.4)));
  });
  return { pageNumber, width: 841.89, height: 595.27, items };
}

(function testCourseBlockWithWrappedNameAndRoom() {
  const course = parser.parseCourseBlock([
    '新时代中国特色社会',
    '主义理论与实践',
    '王智莉 机动专+信息',
    '学硕班',
    '节次:5,6节',
    '周次:2-17',
    '地点:瑞师楼（原3号',
    '教学楼）320',
    '开课院系:马克思主义学院',
    '电话:'
  ], 5, 0);
  assert.strictEqual(course.name, '新时代中国特色社会主义理论与实践');
  assert.strictEqual(course.teacher, '王智莉');
  assert.strictEqual(course.room, '瑞师楼（原3号教学楼）320');
  assert.strictEqual(course.weekday, 5);
  assert.strictEqual(course.startSection, 5);
  assert.strictEqual(course.endWeek, 17);
})();

(function testTeacherMayAppearAfterWeekRange() {
  const course = parser.parseCourseBlock([
    '工程伦理',
    '机动学院班(一班多',
    '师)',
    '节次:7,8节',
    '周次:2-9(董鑫)',
    '地点:瑞师楼（原3号',
    '教学楼）324',
    '开课院系:研究生院',
    '电话:'
  ], 1, 0);
  assert.strictEqual(course.teacher, '董鑫');
  assert.deepStrictEqual(course.ocrIssues, []);
})();

(function testOddEvenWeekLists() {
  assert.deepStrictEqual(parser.parseWeeks('周次：1、3、5、7周'), { startWeek: 1, endWeek: 7, weekType: 'odd' });
  assert.deepStrictEqual(parser.parseWeeks('周次：2、4、6、8周'), { startWeek: 2, endWeek: 8, weekType: 'even' });
})();

(function testTwoPageGraduateTimetable() {
  const pages = [
    page(1, [
      { weekday: 2, y: 483, lines: ['现代设计方法', '倪洪启 1班', '节次:1,2节', '周次:2-17', '地点:瑞师楼（原3号', '教学楼）222', '开课院系:机械与动力工程学院', '电话:'] },
      { weekday: 6, y: 367, lines: ['工程软件应用实践', '王树强 1班', '节次:3,4节', '周次:2-17', '地点:虚拟教室01', '开课院系:机械与动力工程学院', '电话:'] }
    ], true),
    page(2, [
      { weekday: 3, y: 483, lines: ['研究生美育', '白优优 2班', '节次:9,10节', '周次:10-17', '地点:瑞师楼（原3号', '教学楼）226', '开课院系:研究生院', '电话:'] }
    ])
  ];
  const result = parser.parseGraduatePdfPages(pages);
  assert.strictEqual(result.courses.length, 3);
  assert.strictEqual(result.meta.pageCount, 2);
  assert.strictEqual(result.meta.sourceLikelyComplete, true);
  assert.strictEqual(result.semester, '2026-2027 学年第1学期');
  assert.ok(result.courses.some((course) => course.name === '研究生美育' && course.weekday === 3 && course.startSection === 9));
})();

(function testIncompleteHeaderRejected() {
  const broken = page(1, [], true);
  broken.items = broken.items.filter((entry) => entry.text !== '星期日');
  assert.throws(() => parser.parseGraduatePdfPages([broken]), /完整表头/);
})();

console.log('All graduate timetable PDF tests passed.');
