'use strict';

const assert = require('assert');
const capture = require('../assets/syuct-timetable-capture.user.js');

(function testSensitiveTextRedaction() {
  const source = '学号：2512020126 姓名：测试同学 欢迎您：测试同学 手机 13800138000 2026-2027学年';
  const result = capture.sanitizeText(source);
  assert.ok(!result.includes('2512020126'));
  assert.ok(!result.includes('13800138000'));
  assert.ok(!result.includes('姓名：测试同学'));
  assert.ok(result.includes('2026-2027'));
})();

(function testCookielessSessionPathRedaction() {
  const result = capture.safePath({ pathname: '/(gwxoqmi5rnlc2ranbfv4ac45)/xs_main.aspx/2512020126' });
  assert.strictEqual(result, '/(session)/xs_main.aspx/[id]');
})();

(function testTimetableSignalDetection() {
  const documents = [{ text: '课程表 星期一 星期二 星期三 节次:1,2节 周次:1-16 第3节' }];
  assert.strictEqual(capture.isLikelyTimetable(documents), true);
  assert.strictEqual(capture.isLikelyTimetable([{ text: '欢迎登录教务系统' }]), false);
})();

console.log('All timetable capture tests passed.');
