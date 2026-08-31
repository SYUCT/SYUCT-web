'use strict';

const assert = require('assert');
const ocr = require('../assets/timetable-ocr.js');

function syntheticGrid(includeSunday = true) {
  const width = 800;
  const height = 1000;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 255;
    data[index + 1] = 255;
    data[index + 2] = 255;
    data[index + 3] = 255;
  }

  function black(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = (y * width + x) * 4;
    data[index] = 0;
    data[index + 1] = 0;
    data[index + 2] = 0;
  }

  function vertical(x, y0, y1) {
    for (let y = y0; y <= y1; y += 1) black(x, y);
  }

  function horizontal(y, x0, x1) {
    for (let x = x0; x <= x1; x += 1) black(x, y);
  }

  const weekdayLines = [100, 190, 280, 370, 460, 550, 640, 730];
  weekdayLines.slice(0, includeSunday ? 8 : 7).forEach((x) => vertical(x, 100, 800));
  vertical(75, 100, 800);
  vertical(50, 100, 800);

  [100, 125, 150, 260, 370, 440, 510, 800].forEach((y) => horizontal(y, 100, includeSunday ? 730 : 640));
  const sectionLines = [150, 205, 260, 315, 370, 405, 440, 475, 510, 655, 800];
  sectionLines.forEach((y) => horizontal(y, 75, 100));

  // 两个课程格中的简化文字笔画，用于占用检测。
  for (let y = 165; y < 250; y += 6) horizontal(y, 115, 175);
  for (let y = 525; y < 625; y += 6) horizontal(y, 570, 630);

  return { width, height, data };
}

(function testFixedGridDetection() {
  const result = ocr.detectFixedGrid(syntheticGrid());
  assert.deepStrictEqual(result.weekdayBoundaries.map(Math.round), [100, 190, 280, 370, 460, 550, 640, 730]);
  assert.deepStrictEqual(result.sectionLines.map(Math.round), [150, 205, 260, 315, 370, 405, 440, 475, 510, 655, 800]);
  assert.deepStrictEqual(result.groupBoundaries.map(Math.round), [150, 260, 370, 440, 510, 800]);
  const occupied = ocr.occupiedCells(result);
  assert.ok(occupied.some((cell) => cell.weekday === 1 && cell.startSection === 1));
  assert.ok(occupied.some((cell) => cell.weekday === 6 && cell.startSection === 9));
})();

(function testIncompleteWeekdayGridRejected() {
  assert.throws(() => ocr.detectFixedGrid(syntheticGrid(false)), /周一至周日 7 列/);
})();

(function testTsvCoordinatesRestoreLineOrder() {
  const tsv = [
    'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
    '5\t1\t1\t1\t1\t1\t40\t10\t20\t12\t90\t政策',
    '5\t1\t1\t1\t1\t2\t10\t10\t20\t12\t92\t形势与',
    '5\t1\t1\t1\t2\t1\t10\t30\t30\t12\t88\t必修'
  ].join('\n');
  const lines = ocr.parseTsvLines(tsv, '');
  assert.deepStrictEqual(lines.map((line) => line.text), ['形势与政策', '必修']);
  assert.deepStrictEqual(lines[0].bbox, { left: 10, top: 10, right: 60, bottom: 22 });
})();

(function testOcrCellParsing() {
  const courses = ocr.parseOcrCellLines([
    '形势与政策',
    '必修',
    '2节/双周(5-16)',
    '王老师',
    '应星楼203',
    '无方向'
  ], { weekday: 4, startSection: 3, defaultEndWeek: 20, colorIndex: 0 });
  assert.strictEqual(courses.length, 1);
  assert.deepStrictEqual({
    name: courses[0].name,
    teacher: courses[0].teacher,
    room: courses[0].room,
    weekday: courses[0].weekday,
    startSection: courses[0].startSection,
    endSection: courses[0].endSection,
    startWeek: courses[0].startWeek,
    endWeek: courses[0].endWeek,
    weekType: courses[0].weekType
  }, {
    name: '形势与政策', teacher: '王老师', room: '应星楼203', weekday: 4,
    startSection: 3, endSection: 4, startWeek: 5, endWeek: 16, weekType: 'even'
  });
})();

(function testUncertainWeekRangeUsesReviewableDefault() {
  const courses = ocr.parseOcrCellLines([
    '无机化学B',
    '必修',
    '2节/周熙-引',
    '刘娜',
    '致本楼102',
    '无方向'
  ], { weekday: 1, startSection: 5, defaultEndWeek: 20, colorIndex: 0 });
  assert.strictEqual(courses[0].startWeek, 1);
  assert.strictEqual(courses[0].endWeek, 20);
  assert.ok(courses[0].ocrIssues.some((issue) => issue.includes('周次范围未可靠识别')));
})();

(function testModernCellWithTwoCoursesAndNoDirectionFooter() {
  const courses = ocr.parseOcrCellLines([
    '学习心理学—学习力提升术',
    '选修',
    '周五第7,8节{第1-8周}',
    '牛东博',
    '通明楼(原5#教学楼)336',
    '工程中力学的创造性思维与方法',
    '选修',
    '周五第7,8节{第9-16周}',
    '兰莹',
    '通明楼(原5#教学楼)203'
  ], { weekday: 5, startSection: 7, defaultEndWeek: 20, colorIndex: 0 });
  assert.strictEqual(courses.length, 2);
  assert.strictEqual(courses[0].name, '学习心理学-学习力提升术');
  assert.strictEqual(courses[0].teacher, '牛东博');
  assert.strictEqual(courses[0].room, '通明楼(原5#教学楼)336');
  assert.strictEqual(courses[0].startWeek, 1);
  assert.strictEqual(courses[0].endWeek, 8);
  assert.strictEqual(courses[1].name, '工程中力学的创造性思维与方法');
  assert.strictEqual(courses[1].teacher, '兰莹');
  assert.strictEqual(courses[1].startWeek, 9);
  assert.strictEqual(courses[1].endWeek, 16);
})();

(function testWrappedWeekSuffixDoesNotBecomeTeacher() {
  const courses = ocr.parseOcrCellLines([
    '计算机组成原理',
    '必修',
    '周二第1,2节{第1~12',
    '局}',
    '曹明忠',
    '应星楼(原6#教学楼)201'
  ], { weekday: 2, startSection: 1, defaultEndWeek: 20, colorIndex: 0 });
  assert.strictEqual(courses.length, 1);
  assert.strictEqual(courses[0].teacher, '曹明忠');
  assert.strictEqual(courses[0].room, '应星楼(原6#教学楼)201');
  assert.strictEqual(courses[0].startWeek, 1);
  assert.strictEqual(courses[0].endWeek, 12);
})();

console.log('All timetable OCR tests passed.');
