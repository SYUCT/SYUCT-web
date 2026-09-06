(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SYUCTGraduateTimetablePDF = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WEEKDAY_NAMES = ['', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  const MAX_COURSES = 200;

  function normalizeText(value) {
    return String(value == null ? '' : value)
      .replace(/\r/g, '')
      .replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, ' ')
      .replace(/[：﹕]/g, ':')
      .replace(/[，、]/g, ',')
      .replace(/[－—–~～至到]/g, '-')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  function joinWrappedLines(lines) {
    return (lines || []).reduce((result, rawLine) => {
      const line = normalizeText(rawLine);
      if (!line) return result;
      if (!result) return line;
      const needsSpace = /[A-Za-z0-9]$/.test(result) && /^[A-Za-z0-9]/.test(line);
      return `${result}${needsSpace ? ' ' : ''}${line}`;
    }, '');
  }

  function numberValue(value, fallback) {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : fallback;
  }

  function parseSections(value) {
    const text = normalizeText(value).replace(/^节次\s*:/, '');
    const range = /(\d{1,2})\s*[,\-]\s*(\d{1,2})\s*节?/.exec(text);
    const single = /(\d{1,2})\s*节?/.exec(text);
    if (!range && !single) return null;
    const startSection = numberValue(range ? range[1] : single[1], 0);
    const endSection = numberValue(range ? range[2] : single[1], startSection);
    if (startSection < 1 || endSection < startSection || endSection > 20) return null;
    return { startSection, endSection };
  }

  function parseWeeks(value) {
    const text = normalizeText(value).replace(/^周次\s*:/, '');
    const numbers = (text.match(/\d{1,2}/g) || []).map(Number).filter((item) => item >= 1 && item <= 30);
    if (!numbers.length) return null;
    let startWeek = numbers[0];
    let endWeek = numbers.length > 1 ? numbers[1] : numbers[0];
    let weekType = /单(?:周)?/.test(text) ? 'odd' : (/双(?:周)?/.test(text) ? 'even' : 'all');

    if (!/\d{1,2}\s*-\s*\d{1,2}/.test(text) && numbers.length > 2) {
      startWeek = Math.min.apply(null, numbers);
      endWeek = Math.max.apply(null, numbers);
      if (numbers.every((item) => item % 2 === 1)) weekType = 'odd';
      else if (numbers.every((item) => item % 2 === 0)) weekType = 'even';
    }
    if (endWeek < startWeek) [startWeek, endWeek] = [endWeek, startWeek];
    return { startWeek, endWeek, weekType };
  }

  function looksLikeTeacherLine(value) {
    const text = normalizeText(value);
    if (!text) return false;
    if (/^[\u3400-\u9fff·]{2,8}\s+(?:.*(?:班|机动|专硕|学硕|学院|专业|全日制))/.test(text)) return true;
    return /(?:\d+\s*班|班级班|专班|机动班|学院班|学硕班|专硕班|硕士班|班\s*[（(])/.test(text);
  }

  function extractTeacher(lines) {
    const first = normalizeText(lines && lines[0]);
    const spaced = /^([\u3400-\u9fff·]{2,8})\s+(?=.*(?:班|机动|专硕|学硕|学院|专业|全日制))/.exec(first);
    if (spaced) return spaced[1];
    const attached = /^([\u3400-\u9fff·]{2,6})(?=\d+\s*班)/.exec(first);
    return attached ? attached[1] : '';
  }

  function parseCourseBlock(block, weekday, colorIndex) {
    const lines = (block || []).map((item) => normalizeText(item.text == null ? item : item.text)).filter(Boolean);
    const sectionIndex = lines.findIndex((line) => /^节次\s*:/.test(line));
    const weekIndex = lines.findIndex((line, index) => index > sectionIndex && /^周次\s*:/.test(line));
    if (sectionIndex < 1 || weekIndex < 0) return null;

    const sections = parseSections(lines[sectionIndex]);
    const weeks = parseWeeks(lines[weekIndex]);
    if (!sections || !weeks) return null;

    const leading = lines.slice(0, sectionIndex);
    let teacherIndex = leading.findIndex(looksLikeTeacherLine);
    if (teacherIndex < 0 && leading.length > 1) teacherIndex = leading.length - 1;
    const nameLines = teacherIndex >= 0 ? leading.slice(0, teacherIndex) : leading;
    const teacherLines = teacherIndex >= 0 ? leading.slice(teacherIndex) : [];
    const name = joinWrappedLines(nameLines);
    let teacher = extractTeacher(teacherLines);
    if (!teacher) {
      const weekTeacher = /[（(]([\u3400-\u9fff·]{2,8})[）)]/.exec(lines[weekIndex]);
      if (weekTeacher && !/^(?:单周|双周|单|双)$/.test(weekTeacher[1])) teacher = weekTeacher[1];
    }

    const locationIndex = lines.findIndex((line, index) => index > weekIndex && /^地点\s*:/.test(line));
    let room = '';
    if (locationIndex >= 0) {
      const roomLines = [lines[locationIndex].replace(/^地点\s*:\s*/, '')];
      for (let index = locationIndex + 1; index < lines.length; index += 1) {
        if (/^(?:开课院系|电话)\s*:/.test(lines[index])) break;
        roomLines.push(lines[index]);
      }
      room = joinWrappedLines(roomLines).replace(/\s*([（）()])\s*/g, '$1');
    }

    const issues = [];
    if (!name) issues.push('课程名称未识别');
    if (!teacher) issues.push('教师姓名未明确标注');
    if (!room) issues.push('上课地点未识别');
    if (!name) return null;

    return {
      name,
      teacher,
      room,
      weekday,
      startSection: sections.startSection,
      endSection: sections.endSection,
      startWeek: weeks.startWeek,
      endWeek: weeks.endWeek,
      weekType: weeks.weekType,
      colorIndex: colorIndex % 6,
      ocrIssues: issues,
      sourceLines: lines
    };
  }

  function itemValue(item, key, transformIndex, fallback) {
    if (item && Number.isFinite(Number(item[key]))) return Number(item[key]);
    if (item && Array.isArray(item.transform) && Number.isFinite(Number(item.transform[transformIndex]))) {
      return Number(item.transform[transformIndex]);
    }
    return fallback;
  }

  function normalizeItem(item) {
    const text = normalizeText(item && (item.text == null ? item.str : item.text));
    const x = itemValue(item, 'x', 4, 0);
    const y = itemValue(item, 'y', 5, 0);
    const width = Math.max(0, Number(item && item.width) || 0);
    const height = Math.max(1, Number(item && item.height) || 10);
    return { text, x, y, width, height, right: x + width };
  }

  function median(values) {
    const sorted = values.filter((item) => Number.isFinite(item)).sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function groupLines(items) {
    const sorted = items.slice().sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x);
    const rows = [];
    sorted.forEach((item) => {
      let row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= Math.max(2.2, item.height * 0.28));
      if (!row) {
        row = { y: item.y, height: item.height, items: [] };
        rows.push(row);
      }
      row.items.push(item);
      row.y = (row.y * (row.items.length - 1) + item.y) / row.items.length;
      row.height = Math.max(row.height, item.height);
    });
    return rows.sort((a, b) => b.y - a.y).map((row) => {
      const pieces = row.items.sort((a, b) => a.x - b.x);
      let text = '';
      let right = 0;
      pieces.forEach((piece, index) => {
        const gap = index ? piece.x - right : 0;
        text += `${index && gap > 2 ? ' ' : ''}${piece.text}`;
        right = Math.max(right, piece.right);
      });
      return { text: normalizeText(text), y: row.y, height: row.height };
    }).filter((row) => row.text);
  }

  function splitBlocks(lines) {
    if (!lines.length) return [];
    const gaps = [];
    for (let index = 1; index < lines.length; index += 1) {
      const gap = lines[index - 1].y - lines[index].y;
      if (gap > 2 && gap < 20) gaps.push(gap);
    }
    const normalGap = median(gaps) || 11;
    const gapThreshold = Math.max(17, normalGap * 1.65);
    const blocks = [];
    let current = [];

    lines.forEach((line, index) => {
      const previous = index ? lines[index - 1] : null;
      const separated = previous && (previous.y - line.y > gapThreshold || /^电话\s*:/.test(previous.text));
      if (separated && current.length) {
        blocks.push(current);
        current = [];
      }
      current.push(line);
    });
    if (current.length) blocks.push(current);
    return blocks.filter((block) => block.some((line) => /^节次\s*:/.test(line.text)));
  }

  function pageColumnData(page) {
    const items = (page.items || []).map(normalizeItem).filter((item) => item.text);
    const headers = WEEKDAY_NAMES.slice(1).map((name) => {
      const item = items.find((entry) => entry.text === name);
      return item ? { name, x: item.x + item.width / 2, y: item.y } : null;
    });
    if (headers.some((item) => !item)) {
      throw new Error(`第 ${page.pageNumber || 1} 页没有检测到星期一至星期日完整表头`);
    }
    const gaps = headers.slice(1).map((item, index) => item.x - headers[index].x);
    const typicalGap = median(gaps);
    if (!typicalGap || gaps.some((gap) => Math.abs(gap - typicalGap) > typicalGap * 0.22)) {
      throw new Error(`第 ${page.pageNumber || 1} 页星期列位置异常`);
    }
    const bounds = [headers[0].x - typicalGap / 2];
    for (let index = 0; index < headers.length - 1; index += 1) {
      bounds.push((headers[index].x + headers[index + 1].x) / 2);
    }
    bounds.push(headers[headers.length - 1].x + typicalGap / 2);
    const headerY = median(headers.map((item) => item.y));

    const columns = WEEKDAY_NAMES.slice(1).map((name, index) => {
      const columnItems = items.filter((item) => item.y < headerY - 3
        && item.x >= bounds[index] - 1 && item.x < bounds[index + 1] - 1
        && item.text !== name);
      return {
        weekday: index + 1,
        lines: groupLines(columnItems)
      };
    });
    return { columns, headerY, bounds };
  }

  function courseSignature(course) {
    return [course.name, course.teacher, course.room, course.weekday, course.startSection,
      course.endSection, course.startWeek, course.endWeek, course.weekType].join('|');
  }

  function parseSemester(pages) {
    const text = pages.flatMap((page) => page.items || [])
      .map((item) => normalizeText(item && (item.text == null ? item.str : item.text)))
      .join(' ');
    const match = /(20\d{2})\s*-\s*(20\d{2})\s*学年第\s*([12一二])\s*学期/.exec(text);
    if (!match) return '';
    const term = match[3] === '一' ? '1' : (match[3] === '二' ? '2' : match[3]);
    return `${match[1]}-${match[2]} 学年第${term}学期`;
  }

  function parseGraduatePdfPages(pages) {
    if (!Array.isArray(pages) || !pages.length) throw new Error('PDF 中没有可读取的页面');
    if (pages.length > 8) throw new Error('研究生课表 PDF 页数异常，请上传系统直接导出的个人课表');

    const courses = [];
    const rawCells = [];
    const seen = new Set();
    pages.forEach((page, pageIndex) => {
      const pageData = pageColumnData(Object.assign({ pageNumber: pageIndex + 1 }, page));
      pageData.columns.forEach((column) => {
        splitBlocks(column.lines).forEach((block) => {
          const course = parseCourseBlock(block, column.weekday, courses.length);
          if (!course) return;
          const signature = courseSignature(course);
          if (seen.has(signature)) return;
          seen.add(signature);
          courses.push(course);
          rawCells.push({
            pageNumber: page.pageNumber || pageIndex + 1,
            weekday: course.weekday,
            startSection: course.startSection,
            endSection: course.endSection,
            parsedCount: 1,
            lines: course.sourceLines
          });
          delete course.sourceLines;
          if (courses.length > MAX_COURSES) throw new Error('识别到的课程过多，请确认文件是个人课表');
        });
      });
    });

    if (!courses.length) throw new Error('没有读取到研究生课程，请上传“打印课表”生成的原始 PDF，不要上传扫描件');
    courses.forEach((course, index) => { course.colorIndex = index % 6; });
    const uniqueNames = new Set(courses.map((course) => course.name));
    const semester = parseSemester(pages);
    const uncertainCount = courses.filter((course) => course.ocrIssues && course.ocrIssues.length).length;

    return {
      courses,
      semester,
      meta: {
        sourceFormat: 'graduate-pdf-v1',
        sourceLikelyComplete: true,
        clipboardStructureValid: true,
        arrangementCount: courses.length,
        uniqueCourseCount: uniqueNames.size,
        oddCount: courses.filter((course) => course.weekType === 'odd').length,
        evenCount: courses.filter((course) => course.weekType === 'even').length,
        maxEndWeek: courses.reduce((max, course) => Math.max(max, course.endWeek), 0),
        pageCount: pages.length,
        uncertainCount,
        rawCells
      }
    };
  }

  return {
    WEEKDAY_NAMES,
    normalizeText,
    joinWrappedLines,
    parseSections,
    parseWeeks,
    parseCourseBlock,
    groupLines,
    splitBlocks,
    pageColumnData,
    parseGraduatePdfPages
  };
});
