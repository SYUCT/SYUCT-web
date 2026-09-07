(function (root, factory) {
  'use strict';
  const mobileParser = typeof module !== 'undefined' && module.exports
    ? require('./timetable-mobile-text-parser.js') : root.SYUCTMobileTextParser;
  const api = factory(mobileParser);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SYUCTTimetableParser = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (mobileParser) {
  'use strict';

  const MAX_COURSES = 200;

  // TT2 supports ranges, not arbitrary sets. Split at every gap; never expand
  // 1,3 sections into 1-3 or fill missing teaching weeks.
  function splitRanges(values, step) {
    const ranges = [];
    values.forEach((value) => {
      const previous = ranges[ranges.length - 1];
      if (previous && value === previous[1] + step) previous[1] = value;
      else ranges.push([value, value]);
    });
    return ranges;
  }

  function adaptMobileResult(result) {
    const courses = [];
    const diagnostics = result.diagnostics.slice();
    let mappedCount = 0;
    result.courses.forEach((course) => {
      const periods = splitRanges(course.periods, 1);
      const weeks = splitRanges(course.weeks, course.weekMode === 'all' ? 1 : 2);
      const issues = diagnostics.filter((d) => course.sourceRecords.includes(d.record)).map((d) => d.message);
      if ([course.name, course.teacher, course.location].some((value) => value.length > 40)) {
        const message = '小程序课程名、教师、教室各限 40 字，请在预览中缩短后生成。';
        issues.push(message);
        diagnostics.push({ severity: 'warning', code: 'CONSUMER_TEXT_LIMIT', message, record: course.sourceRecords[0] });
      }
      periods.forEach(([startSection, endSection]) => weeks.forEach(([startWeek, endWeek]) => {
        mappedCount += 1;
        if (courses.length >= MAX_COURSES) return;
        courses.push({
          name: course.name, teacher: course.teacher, room: course.location,
          weekday: course.weekday, startSection, endSection, startWeek, endWeek,
          weekType: course.weekMode, colorIndex: courses.length % 6,
          courseType: course.courseType, sourceRecords: course.sourceRecords.slice(),
          reviewIssues: issues.slice()
        });
      }));
    });
    if (mappedCount > MAX_COURSES) diagnostics.push({ severity: 'error', code: 'TT2_COURSE_LIMIT',
      message: `拆分后有 ${mappedCount} 条安排，超过课表码 200 条上限；当前仅显示前 200 条，请精简输入后重新识别。` });
    else if (mappedCount > result.courses.length) diagnostics.push({ severity: 'info', code: 'EXACT_RANGES_SPLIT',
      message: `为保留离散节次和周次，${result.courses.length} 条原始安排已拆为 ${mappedCount} 条，未补入空缺时间。` });
    return {
      courses, diagnostics, sections: result.sections, stats: result.stats, completeness: result.completeness,
      meta: {
        sourceFormat: result.format, requiresReview: true, requiresTermConfirmation: true,
        hasBlockingErrors: diagnostics.some((d) => d.severity === 'error'),
        timeStructureValid: !result.hasBlockingErrors,
        sourceLikelyComplete: false, clipboardStructureValid: false,
        arrangementCount: courses.length, uniqueCourseCount: new Set(courses.map((c) => c.name)).size,
        oddCount: courses.filter((c) => c.weekType === 'odd').length,
        evenCount: courses.filter((c) => c.weekType === 'even').length,
        maxEndWeek: courses.reduce((max, c) => Math.max(max, c.endWeek), 0), practiceNames: []
      }
    };
  }

  function cleanText(value) {
    return String(value == null ? '' : value)
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/\u00a0/g, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\r/g, '')
      .replace(/[ \f\v]+/g, ' ')
      .trim();
  }

  function cleanInline(value) {
    return cleanText(value).replace(/\s*\n\s*/g, ' ').trim();
  }

  function parseScheduleLine(value) {
    const text = cleanInline(value);
    const match = /^(\d{1,2})\s*节\s*[\/／]\s*(单周|双周|周)\s*[（(]\s*(\d{1,2})\s*[-~～—–至到]\s*(\d{1,2})\s*[）)]/.exec(text);
    if (!match) return null;
    const duration = Number(match[1]);
    const startWeek = Number(match[3]);
    const endWeek = Number(match[4]);
    if (!Number.isInteger(duration) || duration < 1 || duration > 12) return null;
    if (!Number.isInteger(startWeek) || !Number.isInteger(endWeek) || startWeek < 1 || endWeek < startWeek || endWeek > 30) return null;
    return {
      duration,
      startWeek,
      endWeek,
      weekType: match[2] === '单周' ? 'odd' : (match[2] === '双周' ? 'even' : 'all')
    };
  }

  function isCourseNature(value) {
    const text = cleanInline(value);
    return /^(必修|选修|学选|专选|公选|任选|任意|限选|校选|通选|专业选修|学科选修|公共选修|实践|实践必修|实践选修)$/.test(text);
  }

  function isDirectionLabel(value) {
    return /^无方向$/.test(cleanInline(value));
  }

  function parseCourseCell(cellText, weekday, startSection, colorSeed) {
    const text = cleanText(cellText);
    if (!text) return [];
    const lines = text.split(/\n+/).map((line) => cleanInline(line)).filter(Boolean);
    const courses = [];

    for (let index = 0; index < lines.length; index += 1) {
      const schedule = parseScheduleLine(lines[index]);
      if (!schedule) continue;

      let nameIndex = index - 1;
      if (nameIndex >= 0 && isCourseNature(lines[nameIndex])) nameIndex -= 1;
      while (nameIndex >= 0 && (isCourseNature(lines[nameIndex]) || isDirectionLabel(lines[nameIndex]))) nameIndex -= 1;
      if (nameIndex < 0) continue;

      const name = cleanInline(lines[nameIndex]);
      if (!name || parseScheduleLine(name)) continue;

      const teacher = cleanInline(lines[index + 1] || '');
      const room = cleanInline(lines[index + 2] || '');
      const endSection = startSection + schedule.duration - 1;
      if (weekday < 1 || weekday > 7 || startSection < 1 || startSection > 12 || endSection < startSection || endSection > 12) continue;

      courses.push({
        name,
        teacher: isDirectionLabel(teacher) ? '' : teacher,
        room: isDirectionLabel(room) ? '' : room,
        weekday,
        startSection,
        endSection,
        startWeek: schedule.startWeek,
        endWeek: schedule.endWeek,
        weekType: schedule.weekType,
        colorIndex: (colorSeed + courses.length) % 6
      });
    }

    return courses;
  }

  function splitMarkdownRow(line) {
    let text = String(line || '').trim();
    if (!text.startsWith('|')) return [];
    if (text.endsWith('|')) text = text.slice(0, -1);
    return text.slice(1).split('|').map((cell) => cell.trim());
  }

  function isMarkdownSeparatorRow(cells) {
    return cells.length && cells.every((cell) => !cell || /^:?-{2,}:?$/.test(cell.replace(/\s+/g, '')));
  }

  function parseMarkdownCourses(source) {
    const rows = String(source || '').replace(/\r/g, '').split('\n');
    const courses = [];
    rows.forEach((line) => {
      const cells = splitMarkdownRow(line);
      if (!cells.length || isMarkdownSeparatorRow(cells)) return;
      const sectionIndex = cells.findIndex((cell) => /^第\s*\d{1,2}\s*节$/.test(cleanInline(cell)));
      if (sectionIndex < 0) return;
      const sectionMatch = /第\s*(\d{1,2})\s*节/.exec(cleanInline(cells[sectionIndex]));
      if (!sectionMatch) return;
      const startSection = Number(sectionMatch[1]);
      for (let weekday = 1; weekday <= 7; weekday += 1) {
        const cell = cells[sectionIndex + weekday] || '';
        const parsed = parseCourseCell(cell, weekday, startSection, courses.length);
        parsed.forEach((course) => courses.push(course));
        if (courses.length > MAX_COURSES) throw new Error('识别到的课程过多，请检查复制内容');
      }
    });
    return courses;
  }


  function htmlCellText(cell) {
    if (!cell) return '';
    const clone = cell.cloneNode(true);
    clone.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
    clone.querySelectorAll('p,div,li').forEach((node) => {
      if (node.nextSibling) node.append('\n');
    });
    return String(clone.textContent || '').replace(/\r/g, '').trim();
  }

  function buildHtmlTableGrid(table) {
    const rows = Array.from(table.rows || []);
    const grid = [];
    rows.forEach((row, rowIndex) => {
      if (!grid[rowIndex]) grid[rowIndex] = [];
      let columnIndex = 0;
      Array.from(row.cells || []).forEach((cell) => {
        while (grid[rowIndex][columnIndex]) columnIndex += 1;
        const rowSpan = Math.max(1, Number(cell.getAttribute('rowspan')) || 1);
        const colSpan = Math.max(1, Number(cell.getAttribute('colspan')) || 1);
        const entry = {
          cell,
          text: htmlCellText(cell),
          originRow: rowIndex,
          originColumn: columnIndex,
          rowSpan,
          colSpan
        };
        for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
          if (!grid[r]) grid[r] = [];
          for (let c = columnIndex; c < columnIndex + colSpan; c += 1) {
            grid[r][c] = entry;
          }
        }
        columnIndex += colSpan;
      });
    });
    return grid;
  }

  function parseHtmlClipboardCourses(html) {
    if (!html || typeof DOMParser === 'undefined') {
      return { ok: false, courses: [], reason: '剪贴板未提供可解析的网页表格结构' };
    }

    let doc;
    try {
      doc = new DOMParser().parseFromString(String(html), 'text/html');
    } catch (error) {
      return { ok: false, courses: [], reason: '剪贴板网页表格结构解析失败' };
    }

    const weekdayNames = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
    const tables = Array.from(doc.querySelectorAll('table'));

    for (let tableIndex = 0; tableIndex < tables.length; tableIndex += 1) {
      const grid = buildHtmlTableGrid(tables[tableIndex]);
      if (!grid.length) continue;

      let weekdayColumns = null;
      for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
        const found = [];
        for (let columnIndex = 0; columnIndex < grid[rowIndex].length; columnIndex += 1) {
          const entry = grid[rowIndex][columnIndex];
          if (!entry || entry.originRow !== rowIndex || entry.originColumn !== columnIndex) continue;
          const text = cleanInline(entry.text);
          const weekdayIndex = weekdayNames.indexOf(text);
          if (weekdayIndex >= 0) found[weekdayIndex] = columnIndex;
        }
        if (weekdayNames.every((name, index) => Number.isInteger(found[index]))) {
          weekdayColumns = found;
          break;
        }
      }
      if (!weekdayColumns) continue;

      const courses = [];
      const sectionRows = [];
      for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
        let startSection = null;
        const visited = new Set();
        for (let columnIndex = 0; columnIndex < grid[rowIndex].length; columnIndex += 1) {
          const entry = grid[rowIndex][columnIndex];
          if (!entry || visited.has(entry)) continue;
          visited.add(entry);
          if (entry.originRow !== rowIndex) continue;
          const match = /^第\s*(\d{1,2})\s*节$/.exec(cleanInline(entry.text));
          if (match) {
            startSection = Number(match[1]);
            break;
          }
        }
        if (!Number.isInteger(startSection)) continue;
        sectionRows.push(startSection);

        weekdayColumns.forEach((columnIndex, weekdayIndex) => {
          const entry = grid[rowIndex][columnIndex];
          if (!entry) return;
          // rowspan 延续到下一节的课程不要重复解析；colspan 延续也只在起始列解析一次。
          if (entry.originRow !== rowIndex || entry.originColumn !== columnIndex) return;
          const parsed = parseCourseCell(entry.text, weekdayIndex + 1, startSection, courses.length);
          parsed.forEach((course) => courses.push(course));
          if (courses.length > MAX_COURSES) throw new Error('识别到的课程过多，请检查复制内容');
        });
      }

      if (courses.length) {
        return {
          ok: true,
          courses,
          weekdaySlots: 7,
          sectionRows: sectionRows.length,
          sectionNumbers: sectionRows
        };
      }
    }

    return { ok: false, courses: [], reason: '剪贴板中没有找到包含星期一到星期日的课表表格' };
  }

  function getTimetableArea(source) {
    const text = String(source || '').replace(/\r/g, '');
    const markers = [
      /实践课\s*[（(]或无上课时间[）)]信息/,
      /调、停[（(]补[）)]课信息/,
      /调停[（(]补[）)]课信息/
    ];
    let endIndex = text.length;
    markers.forEach((pattern) => {
      const match = pattern.exec(text);
      if (match && match.index < endIndex) endIndex = match.index;
    });
    return text.slice(0, endIndex);
  }

  function findTsvSectionChunks(source) {
    const text = getTimetableArea(source);
    const pattern = /(?:^|\n)(?:(?:早晨|上午|下午|晚上)\t)?第\s*(\d{1,2})\s*节\t/g;
    const matches = [];
    let match;
    while ((match = pattern.exec(text))) {
      matches.push({
        start: match.index + (match[0].charAt(0) === '\n' ? 1 : 0),
        contentStart: pattern.lastIndex,
        startSection: Number(match[1])
      });
    }
    return matches.map((item, index) => ({
      startSection: item.startSection,
      content: text.slice(item.contentStart, index + 1 < matches.length ? matches[index + 1].start : text.length)
        .replace(/\n+$/, '')
    }));
  }

  function inspectTsvWeekdayStructure(source) {
    const text = String(source || '').replace(/^\uFEFF/, '').replace(/\r/g, '');
    if (!text.includes('\t')) {
      return {
        isTsv: false,
        ok: false,
        weekdaySlots: 0,
        sectionRows: 0,
        sectionNumbers: [],
        issues: ['未检测到 Tab 分隔的校园网页原始纯文本']
      };
    }

    const weekdayNames = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
    const headerLine = text.split('\n').find((line) => weekdayNames.every((name) => line.includes(name))) || '';
    const headerCells = headerLine.split('\t').map((cell) => cleanInline(cell));
    const headerWeekdays = headerCells.filter((cell) => weekdayNames.includes(cell));
    const issues = [];
    if (headerWeekdays.length !== 7 || !weekdayNames.every((name, index) => headerWeekdays[index] === name)) {
      issues.push('表头没有按星期一到星期日保留 7 个星期列');
    }

    const chunks = findTsvSectionChunks(text);
    if (!chunks.length) issues.push('没有找到“第N节 + Tab”节次行');

    const rowDetails = chunks.map((chunk) => {
      const cells = chunk.content.split('\t');
      if (cells.length !== 7) {
        issues.push(`第${chunk.startSection}节星期列结构异常：收到 ${cells.length} 个槽位，应为 7 个`);
      }
      return {
        startSection: chunk.startSection,
        cellCount: cells.length,
        cells
      };
    });

    const sectionNumbers = rowDetails.map((row) => row.startSection);
    [1, 3, 5, 7, 9].forEach((section) => {
      if (!sectionNumbers.includes(section)) issues.push(`缺少第${section}节起始行`);
    });

    return {
      isTsv: true,
      ok: issues.length === 0,
      weekdaySlots: 7,
      sectionRows: rowDetails.length,
      sectionNumbers,
      rowDetails,
      issues
    };
  }

  function parseTsvCourses(source, structureInfo) {
    const structure = structureInfo || inspectTsvWeekdayStructure(source);
    if (!structure.ok) {
      throw new Error(`纯文本星期列校验失败：${structure.issues[0] || '无法确认周一到周日 7 个星期槽'}`);
    }

    const courses = [];
    structure.rowDetails.forEach((row) => {
      for (let weekday = 1; weekday <= 7; weekday += 1) {
        const cell = row.cells[weekday - 1] || '';
        const parsed = parseCourseCell(cell, weekday, row.startSection, courses.length);
        parsed.forEach((course) => courses.push(course));
        if (courses.length > MAX_COURSES) throw new Error('识别到的课程过多，请检查复制内容');
      }
    });
    return courses;
  }

  function courseSignature(course) {
    return [
      course.name,
      course.teacher,
      course.room,
      course.weekday,
      course.startSection,
      course.endSection,
      course.startWeek,
      course.endWeek,
      course.weekType
    ].join('|').toLowerCase();
  }

  function dedupeCourses(courses) {
    const seen = new Set();
    const result = [];
    (courses || []).forEach((course) => {
      const signature = courseSignature(course);
      if (seen.has(signature)) return;
      seen.add(signature);
      result.push(Object.assign({}, course, { colorIndex: result.length % 6 }));
    });
    return result;
  }

  function extractPracticeNames(source) {
    const text = String(source || '').replace(/\r/g, '');
    const markerMatch = /实践课\s*[（(]或无上课时间[）)]信息/.exec(text);
    if (!markerMatch) return [];
    const markerIndex = markerMatch.index;
    const endCandidates = ['调、停（补）课信息', '调、停(补)课信息', '调停（补）课信息'];
    let endIndex = text.length;
    endCandidates.forEach((marker) => {
      const found = text.indexOf(marker, markerIndex + 1);
      if (found >= 0 && found < endIndex) endIndex = found;
    });
    const section = text.slice(markerIndex, endIndex);
    const names = [];

    section.split('\n').forEach((line) => {
      const cells = line.trim().startsWith('|') ? splitMarkdownRow(line) : line.split('\t').map((cell) => cell.trim());
      if (!cells.length) return;
      const first = cleanInline(cells[0]);
      if (!first || first === '课程名称' || /实践课\s*[（(]或无上课时间[）)]信息/.test(first) || /^:?-+/.test(first)) return;
      const hasWeekRange = cells.some((cell) => /^0?\d{1,2}\s*[-~～—–至到]\s*0?\d{1,2}$/.test(cleanInline(cell)));
      if (hasWeekRange && !names.includes(first)) names.push(first);
    });
    return names;
  }

  function inspectCampusTimetableSource(text) {
    const source = String(text == null ? '' : text).replace(/^\uFEFF/, '').trim();
    const hasSection9 = /第\s*9\s*节/.test(source);
    const hasSection10 = /第\s*10\s*节/.test(source);
    const hasTailMarker = /实践课\s*[（(]或无上课时间[）)]信息|调、停[（(]补[）)]课信息/.test(source);
    const scheduleMarkerCount = (source.match(/\d{1,2}\s*节\s*[\/／]\s*(?:单周|双周|周)\s*[（(]\s*\d{1,2}\s*[-~～—–至到]\s*\d{1,2}\s*[）)]/g) || []).length;
    return {
      sourceLength: source.length,
      hasSection9,
      hasSection10,
      hasTailMarker,
      scheduleMarkerCount,
      // 校园网页可能把 9-10 节合并为“第9节”一行；出现尾部实践/调停课标记也可证明复制到了表尾。
      likelyComplete: hasSection9 && (hasSection10 || hasTailMarker)
    };
  }

  function parseCampusTimetable(text, options) {
    const rawSource = String(text == null ? '' : text).replace(/^\uFEFF/, '');
    // Dispatch before *any* legacy header/HTML/seven-column validation.
    if (!mobileParser) throw new Error('手机粘贴解析模块未加载，请刷新页面后重试。');
    const mobile = mobileParser.parse(rawSource, { maxPeriod: 12, maxWeek: 30 });
    if (mobile.recognized) {
      const adapted = adaptMobileResult(mobile);
      if (adapted.meta.hasBlockingErrors) {
        const error = new mobileParser.MobileTimetableParseError(Object.assign({}, mobile, {
          diagnostics: adapted.diagnostics, hasBlockingErrors: adapted.meta.hasBlockingErrors
        }));
        error.adaptedResult = adapted;
        throw error;
      }
      return adapted;
    }
    const source = rawSource.trim();
    const sourceInfo = inspectCampusTimetableSource(rawSource);
    if (!source) throw new Error('没有可识别的课表内容');
    if (!/星期一/.test(source) || !/星期[五六日]/.test(source) || !/第\s*\d{1,2}\s*节/.test(source)) {
      throw new Error('未识别到校园网页完整课表，请在电脑校园网页中选择整个课表后重新复制');
    }

    const clipboardHtml = options && typeof options.html === 'string' ? options.html : '';
    const htmlResult = clipboardHtml ? parseHtmlClipboardCourses(clipboardHtml) : { ok: false, courses: [] };
    const isClipboardText = rawSource.includes('\t');
    const tsvStructure = isClipboardText ? inspectTsvWeekdayStructure(rawSource) : null;
    const markdownCourses = !isClipboardText && source.includes('|') ? parseMarkdownCourses(source) : [];

    let courses = [];
    let sourceFormat = 'unknown';
    let structureValid = false;
    let weekdaySlotCount = 0;
    let validatedSectionRows = 0;

    if (htmlResult.ok) {
      courses = htmlResult.courses;
      sourceFormat = 'clipboard-html-structure';
      structureValid = true;
      weekdaySlotCount = htmlResult.weekdaySlots || 7;
      validatedSectionRows = htmlResult.sectionRows || 0;
    } else if (isClipboardText && tsvStructure && tsvStructure.ok) {
      courses = parseTsvCourses(rawSource, tsvStructure);
      sourceFormat = 'clipboard-text-7col';
      structureValid = true;
      weekdaySlotCount = tsvStructure.weekdaySlots;
      validatedSectionRows = tsvStructure.sectionRows;
    } else if (markdownCourses.length) {
      courses = markdownCourses;
      sourceFormat = 'markdown-table';
      structureValid = true;
      weekdaySlotCount = 7;
    } else if (isClipboardText) {
      const issue = tsvStructure && tsvStructure.issues && tsvStructure.issues[0];
      throw new Error(`纯文本本身没有保留完整星期列${issue ? `（${issue}）` : ''}。请直接从教务处网页复制后粘贴；新版会自动读取同一次剪贴板中的表格结构，不需要你做额外操作。`);
    }

    courses = dedupeCourses(courses);
    if (!courses.length) throw new Error('没有识别到上课安排，请重新选择课表表格后复制');
    if (courses.length > MAX_COURSES) throw new Error('识别到的课程过多，请检查复制内容');

    const uniqueCourseNames = Array.from(new Set(courses.map((course) => course.name)));
    const practiceNames = extractPracticeNames(rawSource);
    return {
      courses,
      meta: {
        arrangementCount: courses.length,
        uniqueCourseCount: uniqueCourseNames.length,
        oddCount: courses.filter((course) => course.weekType === 'odd').length,
        evenCount: courses.filter((course) => course.weekType === 'even').length,
        practiceNames,
        maxEndWeek: courses.reduce((max, course) => Math.max(max, course.endWeek), 0),
        sourceFormat,
        sourceLength: sourceInfo.sourceLength,
        sourceLikelyComplete: sourceInfo.likelyComplete,
        scheduleMarkerCount: sourceInfo.scheduleMarkerCount,
        clipboardStructureValid: structureValid,
        weekdaySlotCount,
        validatedSectionRows
      }
    };
  }

  return {
    parseCampusTimetable,
    inspectCampusTimetableSource,
    inspectTsvWeekdayStructure
  };
});
