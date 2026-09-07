/*
 * SYUCT mobile clipboard parser -- additive module, not a replacement for the
 * existing campus parser. No network, storage, DOM, eval, or external dependencies.
 *
 * Browser: window.SYUCTMobileTextParser
 * Node:    require("./timetable-mobile-text-parser.js")
 *
 * IMPORTANT: output is a neutral intermediate schema, NOT a SYUCT-TT2 payload.
 * An integration adapter must map this result to the repository's verified schema.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SYUCTMobileTextParser = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "1.0.1";
  const DAY = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };
  const MAX_INPUT = 1000000;
  const MAX_MARKERS = 2000;
  const TYPES = "实践必修|实践选修|学科选修|必修课|选修课|公共选修|专业选修|实践课|必修|选修|实践|课外|公选|限选|任选|学选|专选|任意|校选|通选";
  const SCHEDULE_START = /(?:周|星期)[ \t]*[一二三四五六日天八九十0-9０-９]+[ \t]*第/g;
  const TYPE_END = new RegExp("(?:^|[\\n\\t])[ \\t]*(" + TYPES + ")[ \\t]*$");
  const GRID_HEADER = /(?:时间[ \t]*)?(?:星期[一二三四五六日天][ \t]*){2,}/g;
  const GRID_SLOT = /(?:早晨|上午|中午|下午|晚上|夜间)?[ \t]*第[ \t]*[0-9０-９]{1,2}[ \t]*节/g;
  // These prefixes only disambiguate a fused location/name boundary. Standalone
  // locations do not have to be in this list. Extend through options when needed.
  const DEFAULT_ROOMS = ["通明楼", "应星楼", "敬仲楼", "鸣龙楼", "瑞师楼", "思远楼", "致本楼", "景唐楼"];
  const DEFAULT_VENUES = ["羽网中心"];
  const SECTION_NAMES = {
    "调、停(补)课信息": "adjustments",
    "调、停课信息": "adjustments",
    "调停(补)课信息": "adjustments",
    "实践课(或无上课时间)信息": "practice",
    "实习课信息": "internships",
    "未安排上课时间的课程": "unscheduled"
  };
  const SECTION_HEADERS = {
    adjustments: "编号课程名称原上课时间地点教师现上课时间地点教师申请时间",
    practice: "课程名称教师学分起止周上课时间上课地点",
    internships: "学年学期课程名称实习时间模块代号先修模块实习编号",
    unscheduled: "学年学期课程名称教师姓名学分"
  };

  function diagnostic(severity, code, message, record) {
    const item = { severity, code, message };
    if (Number.isInteger(record)) item.record = record;
    return item;
  }

  function emptyResult() {
    return {
      format: "syuct-mobile-explicit-time-v1",
      recognized: false,
      courses: [],
      sections: [],
      diagnostics: [],
      stats: {
        scheduleMarkers: 0, parsedRecords: 0, duplicateRecords: 0,
        unresolvedRecords: 0, uniqueArrangements: 0, uniqueCourseNames: 0
      },
      completeness: { hasFooter: false, verified: false },
      requiresReview: true,
      requiresTermConfirmation: true,
      hasBlockingErrors: false
    };
  }

  function normalizeInput(text) {
    // Preserve newlines and tabs; they are useful boundaries, not cosmetic noise.
    return text.replace(/\r\n?/g, "\n")
      .replace(/[\u00a0\u202f\u3000]/g, " ")
      .replace(/[\u200b\u200c\u200d\ufeff]/g, "");
  }

  function compact(text) { return text.replace(/\s+/g, ""); }
  function field(text) { return text.replace(/\s+/g, " ").trim(); }
  function escapeRegExp(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function normalizeOptions(options) {
    const opts = options || {};
    const maxPeriod = opts.maxPeriod === undefined ? 24 : opts.maxPeriod;
    const maxWeek = opts.maxWeek === undefined ? 53 : opts.maxWeek;
    for (const [key, value] of [["maxPeriod", maxPeriod], ["maxWeek", maxWeek]]) {
      if (!Number.isInteger(value) || value < 1 || value > 366)
        throw new TypeError(key + " 必须为 1—366 的整数。");
    }
    function names(key, fallback) {
      const list = opts[key] === undefined ? fallback : opts[key];
      if (!Array.isArray(list) || list.length > 100 ||
          list.some(x => typeof x !== "string" || !x.trim() || x.length > 60))
        throw new TypeError(key + " 必须为不超过 100 项的非空字符串数组。");
      return list.slice().sort((a, b) => b.length - a.length);
    }
    const rooms = names("roomPrefixes", DEFAULT_ROOMS);
    const venues = names("venueNames", DEFAULT_VENUES);
    const roomSource = rooms.length
      ? "(?:" + rooms.map(escapeRegExp).join("|") +
        ")(?:[A-Za-z](?:座|区)?)?(?:[东南西北]区)?[ ]*" +
        "(?:[（(][^()（）\\n]{1,100}[)）][ ]*)?" +
        "[A-Za-z]?[0-9０-９]{1,5}(?:[-－][0-9０-９]{1,5})?"
      : "(?!)";
    const venueSource = venues.length ? "(?:" + venues.map(escapeRegExp).join("|") + ")" : "(?!)";
    return { maxPeriod, maxWeek,
      locationPrefix: new RegExp("^(?:" + roomSource + "|" + venueSource + ")"),
      locationEntire: new RegExp("^(?:" + roomSource + "|" + venueSource + ")$")
    };
  }

  function numericSet(expression, max, label) {
    const expr = expression.normalize("NFKC").replace(/[、，]/g, ",").trim();
    if (!expr || expr.length > 160) throw new Error(label + "列表为空或过长。");
    const values = new Set();
    for (const part of expr.split(",")) {
      const m = /^\s*(?:第\s*)?(\d{1,3})(?:\s*[-~～–—]\s*(\d{1,3}))?\s*$/.exec(part);
      if (!m) throw new Error(label + "含有无法识别的表达式。");
      const start = Number(m[1]), end = m[2] ? Number(m[2]) : start;
      if (start < 1 || end > max || start > end)
        throw new Error(label + "越界或起止顺序错误。");
      for (let n = start; n <= end; n += 1) values.add(n);
    }
    return Array.from(values).sort((a, b) => a - b);
  }

  function readSchedule(body, start, limit, opts) {
    const chunk = body.slice(start, Math.min(limit, start + 512));
    const closing = chunk.search(/[}｝]/);
    if (closing < 0) return { start, end: start, error: "时间说明缺少完整的右花括号。" };
    const raw = chunk.slice(0, closing + 1);
    const token = raw.normalize("NFKC");
    const m = /^(?:周|星期)\s*([一二三四五六日天])\s*第\s*([0-9,\s、~～–—-]+)\s*节\s*\{\s*(.+?)\s*\}$/s.exec(token);
    if (!m) return { start, end: start + raw.length, error: "无法识别星期、节次或花括号内的周次。" };
    try {
      const periods = numericSet(m[2], opts.maxPeriod, "节次");
      const wm = /^(.*?)\s*周(?:\s*(?:\|\s*|\(\s*)(单周|双周|全周|每周)\s*\)?)?$/.exec(m[3].trim());
      if (!wm) throw new Error("无法识别周次或单双周标记。");
      const mode = wm[2] === "单周" ? "odd" : wm[2] === "双周" ? "even" : "all";
      let weeks = numericSet(wm[1], opts.maxWeek, "周次");
      weeks = weeks.filter(n => mode === "all" || n % 2 === (mode === "odd" ? 1 : 0));
      if (!weeks.length) throw new Error("周次范围与单双周条件没有交集。");
      return { start, end: start + raw.length, weekday: DAY[m[1]], periods, weeks,
        weekMode: mode, weekExpression: field(m[3]) };
    } catch (err) {
      return { start, end: start + raw.length, error: err.message };
    }
  }

  function splitSections(text) {
    const marks = [];
    let offset = 0;
    for (const line of text.split("\n")) {
      const label = compact(line).replace(/[（]/g, "(").replace(/[）]/g, ")").replace(/[：:]$/, "");
      if (SECTION_NAMES[label]) marks.push({ start: offset, end: offset + line.length, kind: SECTION_NAMES[label] });
      offset += line.length + 1;
    }
    const sections = [], seen = new Set();
    let misplacedScheduleMarkers = 0;
    for (let i = 0; i < marks.length; i += 1) {
      const mark = marks[i];
      let data = text.slice(mark.end, i + 1 < marks.length ? marks[i + 1].start : text.length).trim();
      // Strip only the known column-heading prefix; never infer course/teacher
      // boundaries in a flattened unscheduled row.
      const heading = SECTION_HEADERS[mark.kind];
      let consumed = 0, cursor = 0;
      while (consumed < heading.length && cursor < data.length) {
        if (/\s/.test(data[cursor])) { cursor += 1; continue; }
        if (data[cursor] !== heading[consumed]) break;
        consumed += 1; cursor += 1;
      }
      if (consumed === heading.length) data = data.slice(cursor).trim();
      if (!data || /^(暂无数据|无|无数据)$/.test(compact(data))) continue;
      // A second whole table after a footer must not disappear into review-only
      // notes. Adjustment times are intentionally notes, unless a new grid starts.
      if (mark.kind !== 'adjustments' || /星期一[\s\S]*星期二/.test(data)) {
        misplacedScheduleMarkers += (data.match(SCHEDULE_START) || []).length;
      }
      // Exclude identifiable student-header lines, should they be repeated here.
      data = data.split("\n").filter(line => !/(?:学号|姓名|行政班|身份证号|学院|专业)\s*[：:]/.test(line)).join("\n").trim();
      const key = mark.kind + ":" + compact(data);
      if (data && !seen.has(key)) {
        seen.add(key);
        sections.push({ kind: mark.kind, text: data.slice(0, 12000), truncated: data.length > 12000 });
      }
    }
    return { body: text.slice(0, marks.length ? marks[0].start : text.length),
      sections, hasFooter: marks.length > 0, misplacedScheduleMarkers };
  }

  function cleanTail(text) {
    return text.replace(GRID_HEADER, "\n").replace(GRID_SLOT, "\n")
      .replace(/(^|[\n\t])[ ]*(早晨|上午|中午|下午|晚上|夜间)[ ]*(?=$|[\n\t])/g, "$1")
      .split(/[\n\t]+/).map(s => s.trim()).filter(Boolean);
  }

  function stripLeadingLayout(text) {
    let value = text;
    // A whole seven-day heading can be fused to the first course.
    const header = /^(?:时间[ \t]*)?(?:星期[一二三四五六日天][ \t]*){2,}/.exec(value);
    if (header) value = value.slice(header[0].length);
    let prior;
    do {
      prior = value;
      value = value.replace(/^[ \t]*(?:(?:早晨|上午|中午|下午|晚上|夜间)[ \t]*)?(?:第[ \t]*[0-9０-９]{1,2}[ \t]*节)[ \t]*/, "");
      // "早晨 上午第1节" is a common empty-row prefix.
      if (/^[ \t]*早晨[ \t]*(?:上午|第)/.test(value)) value = value.replace(/^[ \t]*早晨[ \t]*/, "");
    } while (value !== prior);
    return { text: value.trim(), removed: text.length - value.length + value.length - value.trimStart().length };
  }

  function findHeader(body, schedule, previous, opts) {
    const begin = previous ? previous.end : 0;
    const before = body.slice(begin, schedule.start).trimEnd();
    const typeMatch = TYPE_END.exec(before);
    if (!typeMatch) return { boundary: schedule.start, error: "缺少可确认的课程性质独立行，不能可靠确定课程名称边界。", code: "COURSE_HEADER_UNCLEAR" };
    const prefix = before.slice(0, typeMatch.index).trimEnd();
    const lineStart = Math.max(prefix.lastIndexOf("\n"), prefix.lastIndexOf("\t")) + 1;
    const rawCandidate = prefix.slice(lineStart);
    const leading = rawCandidate.length - rawCandidate.trimStart().length;
    let start = begin + lineStart + leading;
    let candidate = rawCandidate.trim();
    const cleaned = stripLeadingLayout(candidate);
    start += cleaned.removed;
    candidate = cleaned.text;
    if (!candidate) return { boundary: start, error: "时间说明前没有可确认的课程名称。", code: "MISSING_COURSE_NAME" };
    if (/(?:学号|姓名|行政班|学院|专业)\s*[：:]/.test(candidate))
      return { boundary: start, error: "个人信息与课程标题边界不明确，请只复制课表区域。", code: "HEADER_CONTAINS_PERSONAL_DATA" };

    if (!previous) {
      const unexpected = cleanTail(body.slice(0, start)).filter(line =>
        !/(?:学号|姓名|行政班|学院|专业)\s*[：:]/.test(line) &&
        !/(?:学年|学期|课程表|^课表$)/.test(line) &&
        !/^[0-9０-９\s-]+$/.test(line));
      if (unexpected.length) return {
        boundary: start, code: "FIRST_NAME_BOUNDARY_UNCLEAR",
        error: "首门课程之前有无法归属的文字，可能是课程名真实换行；请保留完整课程名为一行，或只复制课表区域。"
      };
    }
    if (previous) {
      const priorLines = cleanTail(body.slice(previous.end, start));
      const fused = opts.locationPrefix.exec(candidate);
      if (priorLines.length === 1 && fused) {
        const remaining = candidate.slice(fused[0].length).trimStart();
        if (!remaining) return { boundary: start, error: "疑似只保留了上一门课的地点，当前课程名称缺失。", code: "MISSING_COURSE_NAME" };
        start += candidate.length - remaining.length;
        candidate = remaining;
      } else if (priorLines.length <= 1 &&
          (/^.{0,60}(?:楼|座|室|馆|中心|场)[^\n]{0,100}[0-9０-９]{2,5}[^\d０-９\s].+/.test(candidate) ||
           (fused && candidate.length > fused[0].length) ||
           /^.{1,30}(?:教学楼|实验楼|运动场|体育馆|中心).+/.test(candidate))) {
        return { boundary: start, error: "地点与下一门课名称粘连，但边界不能可靠确认；请在两者之间补一个换行。", code: "AMBIGUOUS_NAME_LOCATION" };
      }
    }
    // A previous room number may be followed by empty-row labels before the
    // next course. Strip these *after* splitting the fused room prefix as well.
    const afterSplit = stripLeadingLayout(candidate);
    start += afterSplit.removed;
    candidate = afterSplit.text;
    const name = field(candidate);
    if (!name || name.length > 200) return { boundary: start, error: "课程名称为空或异常过长。", code: "INVALID_COURSE_NAME" };
    return { boundary: start, name, courseType: typeMatch[1] };
  }

  function readTail(raw, opts) {
    const lines = cleanTail(raw);
    if (!lines.length) return { teacher: "", location: "" };
    if (opts.locationEntire.test(lines[0])) {
      if (lines.length > 1) return { teacher: "", location: lines[0], error: "地点后仍有无法归属的文字，请核对课程分界。" };
      return { teacher: "", location: lines[0] };
    }
    const teacher = field(lines[0]);
    const location = lines.slice(1).join("").trim();
    if (teacher.length > 200 || location.length > 240 ||
        /(?:学号|姓名|行政班)\s*[：:]/.test(teacher + location))
      return { teacher: "", location: "", error: "教师或地点字段异常，已停止该条记录的自动导入。" };
    if (lines.length > 2 && !opts.locationEntire.test(location))
      return { teacher, location: "", error: "教师后存在多段无法可靠拼接的文字，可能发生课程名换行或边界丢失。" };
    return { teacher, location };
  }

  function arrangementKey(course) {
    return JSON.stringify([course.name, course.weekday, course.periods, course.weeks,
      course.teacher, course.location, course.courseType]);
  }

  function finish(result) {
    result.stats.uniqueArrangements = result.courses.length;
    result.stats.uniqueCourseNames = new Set(result.courses.map(c => c.name)).size;
    result.hasBlockingErrors = result.diagnostics.some(d => d.severity === "error");
    return result;
  }

  function parse(input, options) {
    if (typeof input !== "string") throw new TypeError("课表输入必须是字符串。");
    const opts = normalizeOptions(options);
    const result = emptyResult();
    if (input.length > MAX_INPUT) {
      result.recognized = true;
      result.diagnostics.push(diagnostic("error", "INPUT_TOO_LARGE", "输入超过 100 万字符，请仅复制当前学期的个人课表。"));
      return finish(result);
    }
    const normalized = normalizeInput(input);
    const divided = splitSections(normalized);
    const body = divided.body;
    const starts = [];
    const broad = new RegExp(SCHEDULE_START.source, 'g');
    let match;
    while ((match = broad.exec(body))) {
      starts.push(match.index);
      if (starts.length > MAX_MARKERS) {
        result.recognized = true;
        result.diagnostics.push(diagnostic("error", "TOO_MANY_RECORDS", "时间标记过多，请仅复制一张课表。"));
        return finish(result);
      }
    }
    if (!starts.length && !divided.misplacedScheduleMarkers) return result;
    result.recognized = true;
    result.sections = divided.sections;
    result.completeness.hasFooter = divided.hasFooter;
    result.stats.scheduleMarkers = starts.length + divided.misplacedScheduleMarkers;
    result.stats.unresolvedRecords = divided.misplacedScheduleMarkers;
    if (divided.misplacedScheduleMarkers) result.diagnostics.push(diagnostic('error', 'SCHEDULE_AFTER_FOOTER',
      '尾部待核对栏目中仍有课程时间，可能混入另一张课表；请只保留一份课表正文并重新识别，不能将这些课程忽略。'));
    if (/\d{1,2}\s*节\s*[\/／]\s*(?:单周|双周|周)\s*[（(]/.test(body)) {
      result.diagnostics.push(diagnostic('error', 'MIXED_TIME_FORMATS',
        '同时出现新旧两种时间格式，请分开粘贴识别，避免遗漏没有明确星期的课程。'));
    }
    const schedules = starts.map((start, i) => readSchedule(body, start, starts[i + 1] || body.length, opts));
    const headers = schedules.map((s, i) => findHeader(body, s, i ? schedules[i - 1] : null, opts));
    const unique = new Map();

    for (let i = 0; i < schedules.length; i += 1) {
      const schedule = schedules[i], header = headers[i], record = i + 1;
      if (schedule.error || header.error) {
        result.stats.unresolvedRecords += 1;
        if (schedule.error) result.diagnostics.push(diagnostic("error", "INVALID_SCHEDULE", schedule.error, record));
        if (header.error) result.diagnostics.push(diagnostic("error", header.code, header.error, record));
        continue;
      }
      const end = i + 1 < headers.length ? headers[i + 1].boundary : body.length;
      const tail = readTail(body.slice(schedule.end, end), opts);
      if (tail.error) {
        result.stats.unresolvedRecords += 1;
        result.diagnostics.push(diagnostic("error", "AMBIGUOUS_RECORD_TAIL", tail.error, record));
        continue;
      }
      const course = {
        name: header.name, courseType: header.courseType,
        weekday: schedule.weekday, periods: schedule.periods, weeks: schedule.weeks,
        weekMode: schedule.weekMode, weekExpression: schedule.weekExpression,
        teacher: tail.teacher, location: tail.location, sourceRecords: [record]
      };
      result.stats.parsedRecords += 1;
      const key = arrangementKey(course);
      if (unique.has(key)) {
        unique.get(key).sourceRecords.push(record);
        result.stats.duplicateRecords += 1;
        continue;
      }
      unique.set(key, course);
      result.courses.push(course);
      if (!course.location) result.diagnostics.push(diagnostic("warning", "MISSING_LOCATION", "上课地点未提供，请核对；不会自动编造地点。", record));
      if (!course.teacher) result.diagnostics.push(diagnostic("warning", "MISSING_TEACHER", "教师字段未提供，请核对。", record));
    }
    if (result.stats.duplicateRecords)
      result.diagnostics.push(diagnostic("info", "DUPLICATE_RECORDS_REMOVED", "已移除 " + result.stats.duplicateRecords + " 条字段完全相同的重复安排。"));
    for (const section of result.sections) {
      result.diagnostics.push(diagnostic("warning", "REVIEW_" + section.kind.toUpperCase(),
        section.kind === "unscheduled"
          ? "另有未排课信息，请单独核对；未加入课表。"
          : "另有调停补课、实践或实习信息需要人工核对；未自动修改已排课程。"));
    }
    if (!result.completeness.hasFooter)
      result.diagnostics.push(diagnostic("warning", "COPY_COMPLETENESS_UNVERIFIED", "未看到课表尾部标记，无法据此确认复制完整，请对照教务系统核对。"));
    if (!result.courses.length)
      result.diagnostics.push(diagnostic("error", "NO_VALID_ARRANGEMENTS", "没有可安全导入的上课安排，请按提示补全或调整文本边界。"));
    return finish(result);
  }

  class MobileTimetableParseError extends Error {
    constructor(result) {
      const first = result.diagnostics.find(d => d.severity === "error");
      super(first ? first.message : "手机课表文本需要修正。");
      this.name = "MobileTimetableParseError";
      this.result = result;
    }
  }

  // A safe integration seam: existing schemas are supplied by the caller, never
  // guessed here. Recognized malformed mobile text MUST NOT fall back to the
  // old seven-column parser, which would hide the real error.
  function createDispatcher(config) {
    if (!config || typeof config.legacyParse !== "function" || typeof config.adaptMobileResult !== "function")
      throw new TypeError("必须显式提供 legacyParse 和 adaptMobileResult。");
    return function (text, options) {
      const result = parse(text, config.parserOptions);
      if (!result.recognized) return config.legacyParse.apply(this, arguments);
      if (result.hasBlockingErrors) throw new MobileTimetableParseError(result);
      return config.adaptMobileResult.call(this, result, options);
    };
  }

  return Object.freeze({ VERSION, parse, createDispatcher, MobileTimetableParseError });
});
