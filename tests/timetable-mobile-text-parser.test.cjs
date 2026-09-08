"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
// Load the UMD source without depending on the host repository's package.json
// "type". This .cjs test works in either a CommonJS or ESM project.
const sourcePath = path.join(__dirname, "../assets/timetable-mobile-text-parser.js");
const subjectModule = {exports:{}};
vm.runInThisContext("(function(module, exports) {\n" +
  fs.readFileSync(sourcePath, "utf8") + "\n})", {filename:sourcePath})(subjectModule, subjectModule.exports);
const api = subjectModule.exports;
const fixtureDir = path.join(__dirname, "fixtures", "mobile-paste");
const fixture = name => fs.readFileSync(path.join(fixtureDir, name), "utf8");
const expected = JSON.parse(fixture("expected-arrangements.json"));
const select = c => Object.fromEntries(Object.keys(expected[0]).map(k => [k, c[k]]));
const all = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
function sample(changes = {}) {
  const c = { name: "测试课程AI", kind: "必修", day: "周一", periods: "1,2",
    weeks: "第1-13周|单周", teacher: "教师甲", location: "通明楼(原5#教学楼)138", ...changes };
  return `${c.name}\n${c.kind}\n${c.day}第${c.periods}节{${c.weeks}}\n${c.teacher}\n${c.location}\n`;
}
function ok(text, options) {
  const r = api.parse(text, options);
  assert.equal(r.recognized, true);
  assert.equal(r.hasBlockingErrors, false, JSON.stringify(r.diagnostics));
  assert.equal(r.stats.scheduleMarkers, r.stats.parsedRecords + r.stats.unresolvedRecords);
  return r;
}
function blocked(text, code, options) {
  const r = api.parse(text, options);
  assert.equal(r.recognized, true);
  assert.equal(r.hasBlockingErrors, true);
  if (code) assert.ok(r.diagnostics.some(d => d.code === code), JSON.stringify(r.diagnostics));
  return r;
}

for (const name of ["single-table.anonymized.txt", "qq-duplicated.anonymized.txt", "tabbed.synthetic.txt"]) {
  test("golden fixture: " + name, () => {
    const r = ok(fixture(name));
    assert.deepEqual(r.courses.map(select), expected);
    assert.equal(r.stats.uniqueArrangements, 20);
    assert.equal(r.stats.uniqueCourseNames, 13);
    assert.equal(r.stats.unresolvedRecords, 0);
    assert.equal(r.completeness.hasFooter, true);
    assert.equal(r.completeness.verified, false);
  });
}
test("duplicate fixture has 40 markers, 20 duplicates and traceable source indices", () => {
  const r = ok(fixture("qq-duplicated.anonymized.txt"));
  assert.equal(r.stats.scheduleMarkers, 40);
  assert.equal(r.stats.parsedRecords, 40);
  assert.equal(r.stats.duplicateRecords, 20);
  r.courses.forEach((c, i) => assert.deepEqual(c.sourceRecords, [i + 1, i + 21]));
});
test("weekday counts are 5,4,3,5,3,0,0", () => {
  const r = ok(fixture("single-table.anonymized.txt"));
  assert.deepEqual(all(1,7).map(d => r.courses.filter(c => c.weekday === d).length), [5,4,3,5,3,0,0]);
});
test("Wednesday foreign-language odd/even locations remain separate", () => {
  const courses = ok(fixture("single-table.anonymized.txt")).courses.filter(c => c.name === "大学外语III" && c.weekday === 3);
  assert.equal(courses.length, 2);
  assert.notEqual(courses[0].location, courses[1].location);
  assert.equal(courses[0].weeks.some(w => courses[1].weeks.includes(w)), false);
});
test("same-location Thursday foreign-language parity records are not prematurely merged", () => {
  const courses = ok(fixture("single-table.anonymized.txt")).courses.filter(c => c.name === "大学外语III" && c.weekday === 4);
  assert.equal(courses.length, 2);
  assert.equal(courses[0].location, courses[1].location);
});
test("Friday two courses retain disjoint week ranges", () => {
  const courses = ok(fixture("single-table.anonymized.txt")).courses.filter(c => c.weekday === 5 && c.periods[0] === 7);
  assert.equal(courses.length, 2);
  assert.deepEqual(courses[0].weeks, all(1,8));
  assert.deepEqual(courses[1].weeks, all(9,16));
});
test("missing career-course location stays empty, warning is not doubled", () => {
  const r = ok(fixture("qq-duplicated.anonymized.txt"));
  assert.equal(r.courses.find(c => c.name === "职业规划与就业指导").location, "");
  assert.equal(r.diagnostics.filter(d => d.code === "MISSING_LOCATION").length, 1);
});
test("unscheduled information is retained as a review section, never scheduled", () => {
  const r = ok(fixture("qq-duplicated.anonymized.txt"));
  assert.equal(r.sections.length, 1);
  assert.equal(r.sections[0].kind, "unscheduled");
  assert.match(r.sections[0].text, /创造性思维与创新方法/);
  assert.ok(!r.courses.some(c => c.name === "创造性思维与创新方法"));
  assert.ok(r.diagnostics.some(d => d.code === "REVIEW_UNSCHEDULED"));
});
test("student metadata and ambiguous semester options are not output", () => {
  const r = ok(fixture("single-table.anonymized.txt"));
  const out = JSON.stringify(r);
  assert.ok(!out.includes("学号"));
  assert.ok(!out.includes("行政班"));
  assert.ok(!out.includes("已移除"));
  assert.equal(Object.hasOwn(r, "student"), false);
  assert.equal(Object.hasOwn(r, "term"), false);
  assert.equal(r.requiresTermConfirmation, true);
});
test("AI, III, I, digits and full-width location parentheses are preserved", () => {
  const names = ok(fixture("single-table.anonymized.txt")).courses.map(c => c.name);
  for (const name of ["有机化学AI", "大学外语III", "羽毛球3", "工程中力学的创造性思维与方法I"])
    assert.ok(names.includes(name));
  assert.ok(ok(fixture("single-table.anonymized.txt")).courses.some(c => c.location === "致本楼C座（原6#实验楼）214"));
});
test("parity, rather than source-range endpoint, determines explicit weeks", () => {
  assert.deepEqual(ok(sample({weeks:"第1-16周|单周"})).courses[0].weeks, [1,3,5,7,9,11,13,15]);
  assert.deepEqual(ok(sample({weeks:"第1-13周|双周"})).courses[0].weeks, [2,4,6,8,10,12]);
});
test("single week and disjoint week intervals", () => {
  assert.deepEqual(ok(sample({weeks:"第6周"})).courses[0].weeks, [6]);
  assert.deepEqual(ok(sample({weeks:"第1-3,5,7-8周"})).courses[0].weeks, [1,2,3,5,7,8]);
});
test("week ranges with full/every-week labels", () => {
  for (const label of ["全周","每周"]) assert.deepEqual(ok(sample({weeks:"第2-4周|"+label})).courses[0].weeks, [2,3,4]);
});
test("parenthesized odd/even labels", () => {
  assert.deepEqual(ok(sample({weeks:"第1-5周(单周)"})).courses[0].weeks, [1,3,5]);
});
test("period ranges and noncontiguous periods remain lossless", () => {
  assert.deepEqual(ok(sample({periods:"1-4"})).courses[0].periods, [1,2,3,4]);
  assert.deepEqual(ok(sample({periods:"1,3"})).courses[0].periods, [1,3]);
});
test("commas, enumeration commas and full-width numeric schedules", () => {
  assert.deepEqual(ok(sample({periods:"１，２",weeks:"第１－１３周｜单周"})).courses[0].periods, [1,2]);
  assert.deepEqual(ok(sample({periods:"1、2"})).courses[0].periods, [1,2]);
});
test("full-width braces are accepted without normalizing course title", () => {
  const r = ok(sample({name:"实验Ⅰ"}).replace("{","｛").replace("}","｝"));
  assert.equal(r.courses[0].name, "实验Ⅰ");
});
for (const [day, number] of [["周一",1],["周二",2],["周三",3],["周四",4],["周五",5],["周六",6],["周日",7],["周天",7],["星期一",1]]) {
  test("weekday token " + day, () => assert.equal(ok(sample({day})).courses[0].weekday, number));
}
test("CRLF, NBSP, narrow NBSP and BOM normalization", () => {
  const base = fixture("single-table.anonymized.txt");
  const mutated = "\ufeff" + base.replace(/\n/g,"\r\n").replace(/ /g,"\u00a0").replace(/\t/g,"\u202f");
  assert.deepEqual(ok(mutated).courses.map(select), expected);
});
test("tabs can delimit name, type, time, teacher and location", () => {
  assert.equal(ok(sample().replace(/\n/g,"\t")).courses[0].name, "测试课程AI");
});
test("three trailing empty tab slots never imply missing weekdays", () => {
  assert.equal(ok(sample() + "\t\t\t").courses.length, 1);
});
test("duplicate whitespace is normalized conservatively", () => {
  assert.equal(ok(sample() + "\n" + sample().replace(/\n/g,"\r\n")).stats.duplicateRecords, 1);
});
for (const changes of [
  {day:"周二"},{periods:"3,4"},{weeks:"第1-13周|双周"},
  {teacher:"另一位教师"},{location:"通明楼(原5#教学楼)203"},{kind:"选修"}
]) {
  test("same name is not a duplicate when " + Object.keys(changes)[0] + " differs", () => {
    const r = ok(sample() + "\n" + sample(changes));
    assert.equal(r.courses.length, 2);
    assert.equal(r.stats.duplicateRecords, 0);
  });
}
test("unknown standalone location is accepted because its boundary is explicit", () => {
  assert.equal(ok(sample({location:"新建教学区甲座A101"})).courses[0].location, "新建教学区甲座A101");
});
test("known room fused to next course is split", () => {
  const text = sample().trimEnd() + sample({name:"课程乙",day:"周二"});
  const r = ok(text);
  assert.equal(r.courses[0].location,"通明楼(原5#教学楼)138");
  assert.equal(r.courses[1].name,"课程乙");
});
test("digit-free venue fused to next course is split", () => {
  const r = ok(sample({location:"羽网中心"}).trimEnd() + sample({name:"马克思主义基本原理"}));
  assert.equal(r.courses[0].location,"羽网中心");
  assert.equal(r.courses[1].name,"马克思主义基本原理");
});
test("unknown fused room fails closed and can be supported by explicit configuration", () => {
  const text = sample({location:"新楼101"}).trimEnd() + sample({name:"课程乙"});
  blocked(text,"AMBIGUOUS_NAME_LOCATION");
  const r = ok(text,{roomPrefixes:["新楼","通明楼"],venueNames:["羽网中心"]});
  assert.equal(r.courses[0].location,"新楼101");
  assert.equal(r.courses[1].name,"课程乙");
});
test("wrapped recognized room is joined; arbitrary extra tail is blocked", () => {
  assert.equal(ok(sample({location:"通明楼(原5#教\n学楼)138"})).courses[0].location,"通明楼(原5#教学楼)138");
  blocked(sample({location:"未知地点\n无法归属的另一行"}),"AMBIGUOUS_RECORD_TAIL");
});
test("first course title broken into actual newlines is not silently truncated", () => {
  blocked(sample({name:"Agent时代：智能体设计\n与实践"}),"FIRST_NAME_BOUNDARY_UNCLEAR");
});
test("later course title broken into newlines blocks generation instead of hiding text", () => {
  blocked(sample() + sample({name:"Agent时代：智能体设计\n与实践"}),"AMBIGUOUS_RECORD_TAIL");
});
test("missing teacher with recognizable room produces warning instead of shifting room", () => {
  const r = ok(sample({teacher:""}));
  assert.equal(r.courses[0].teacher,"");
  assert.equal(r.courses[0].location,"通明楼(原5#教学楼)138");
  assert.ok(r.diagnostics.some(d => d.code === "MISSING_TEACHER"));
});
test("missing location is not invented", () => {
  assert.equal(ok(sample({location:""})).courses[0].location,"");
});
test("no footer never proves full-copy completeness", () => {
  const r = ok(sample());
  assert.equal(r.completeness.verified,false);
  assert.ok(r.diagnostics.some(d => d.code === "COPY_COMPLETENESS_UNVERIFIED"));
});
for (const changes of [
  {periods:"0,1"},{periods:"25,26"},{periods:"4-2"},
  {periods:"1,x"},{weeks:"第0-4周"},{weeks:"第1-54周"},
  {weeks:"第8-2周"},{weeks:"第2周|单周"},{weeks:"第1-5周|单双周"},
  {weeks:"第1;3周"},{weeks:"第1-5周|未知"}
]) {
  test("invalid time blocks: " + JSON.stringify(changes), () => blocked(sample(changes),"INVALID_SCHEDULE"));
}
test("configured week and period limits are enforced", () => {
  blocked(sample({periods:"13,14"}),"INVALID_SCHEDULE",{maxPeriod:12});
  blocked(sample({weeks:"第1-21周"}),"INVALID_SCHEDULE",{maxWeek:20});
  assert.deepEqual(ok(sample({periods:"25,26"}),{maxPeriod:30}).courses[0].periods,[25,26]);
});
test("truncated final schedule stays recognized and unresolved", () => {
  const r = blocked("课程甲\n必修\n周一第1,2节{第1-13周","INVALID_SCHEDULE");
  assert.equal(r.stats.scheduleMarkers,1);
  assert.equal(r.stats.unresolvedRecords,1);
});
test("one malformed record cannot vanish behind successful records", () => {
  const r = blocked(sample() + sample({name:"课程乙",weeks:"第8-2周"}),"INVALID_SCHEDULE");
  assert.equal(r.stats.scheduleMarkers,2);
  assert.equal(r.stats.parsedRecords + r.stats.unresolvedRecords,2);
});
test("unknown course-type line and completely flattened text fail explicitly", () => {
  blocked(sample({kind:"未知课程类别"}),"COURSE_HEADER_UNCLEAR");
  blocked(sample().replace(/\n/g,""),"COURSE_HEADER_UNCLEAR");
});
test("adjustment records are review-only, not silently added as normal courses", () => {
  const r = ok(sample() + "\n调、停（补）课信息：\n" + sample({name:"调课条目",day:"周五"}));
  assert.equal(r.courses.length,1);
  assert.equal(r.sections[0].kind,"adjustments");
  assert.ok(r.diagnostics.some(d=>d.code==="REVIEW_ADJUSTMENTS"));
});
test("empty footer headings do not invent pending courses", () => {
  const r = ok(sample() + "\n未安排上课时间的课程：\n学年学期课程名称教师姓名学分\n暂无数据");
  assert.equal(r.sections.length,0);
});
test("legacy TSV and previous weekday-grouped Markdown are not claimed by this module", () => {
  for (const text of ["", "星期一\t星期二\t星期三\n第1节\t课程\n2节/单周(1-13)",
    "| 星期一 | |\n1-2节 (1-13|单周)有机化学AI通明楼(原5#教学楼)138",
    "研究生课程\n节次:1,2节\n周次:2-17"]) {
    assert.equal(api.parse(text).recognized,false);
  }
});
test("large input and too many anchors fail within defined bounds", () => {
  blocked("x".repeat(1000001),"INPUT_TOO_LARGE");
  blocked("周一第\n".repeat(2001),"TOO_MANY_RECORDS");
});
test("programming errors are explicit", () => {
  assert.throws(()=>api.parse(null),TypeError);
  assert.throws(()=>api.parse(sample(),{maxWeek:0}),TypeError);
  assert.throws(()=>api.parse(sample(),{maxPeriod:Infinity}),TypeError);
  assert.throws(()=>api.parse(sample(),{roomPrefixes:[""]}),TypeError);
  assert.throws(()=>api.createDispatcher({}),TypeError);
});
test("adapter keeps legacy arguments and this binding exactly", () => {
  const context = {sentinel:true}, options = {html:"original"}, extra = {x:1};
  let captured;
  const f = api.createDispatcher({
    legacyParse:function(){ captured={self:this,args:[...arguments]}; return "legacy"; },
    adaptMobileResult:()=>assert.fail("mobile adapter must not run")
  });
  assert.equal(f.call(context,"old-format",options,extra),"legacy");
  assert.equal(captured.self,context);
  assert.deepEqual(captured.args,["old-format",options,extra]);
});
test("adapter uses mobile branch before any old structural validation", () => {
  let received;
  const f = api.createDispatcher({
    legacyParse:()=>assert.fail("must bypass legacy seven-column validation"),
    adaptMobileResult:(r, options)=>{ received={r,options}; return {mapped:true}; }
  });
  assert.deepEqual(f(sample(),{marker:1}),{mapped:true});
  assert.equal(received.r.courses.length,1);
  assert.equal(received.options.marker,1);
});
test("recognized invalid input never falls back or reaches adapter", () => {
  const f = api.createDispatcher({
    legacyParse:()=>assert.fail("not a fallback case"),
    adaptMobileResult:()=>assert.fail("blocked results must not generate payloads")
  });
  assert.throws(()=>f(sample({weeks:"第8-2周"})), err => {
    assert.ok(err instanceof api.MobileTimetableParseError);
    assert.equal(err.result.hasBlockingErrors,true);
    return true;
  });
});
test("module runs without DOM, fetch, timers or storage in a browser-style VM", () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname,"../assets/timetable-mobile-text-parser.js"),"utf8"),context);
  assert.equal(typeof context.SYUCTMobileTextParser.parse,"function");
  assert.equal(context.SYUCTMobileTextParser.parse(sample()).courses.length,1);
});
test("HTML-looking text remains inert data, never executed", () => {
  const title = '<img src=x onerror="globalThis.PWNED=true">';
  const r = ok(sample({name:title}));
  assert.equal(r.courses[0].name,title);
  assert.equal(globalThis.PWNED,undefined);
});
test("100 deterministic parity/range combinations preserve exact week sets", () => {
  for (let i=0;i<100;i++) {
    const start=1+(i%8), end=start+1+(i%9), odd=(i%2===1);
    const r=ok(sample({weeks:`第${start}-${end}周|${odd?"单周":"双周"}`}));
    assert.deepEqual(r.courses[0].weeks,all(start,end).filter(n=>n%2===(odd?1:0)));
  }
});
test("parser does not mutate options or leak raw input in errors", () => {
  const options={roomPrefixes:["通明楼"],venueNames:["羽网中心"]};
  const before=JSON.stringify(options);
  const input="学号：REDACTED-STUDENT-ID\n"+sample({weeks:"第8-2周"});
  const r=blocked(input,"INVALID_SCHEDULE",options);
  assert.equal(JSON.stringify(options),before);
  assert.ok(!JSON.stringify(r).includes("REDACTED-STUDENT-ID"));
});
