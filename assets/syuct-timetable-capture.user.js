// ==UserScript==
// @name         化大本科课表结构采集
// @namespace    https://www.syuct.top/
// @version      0.1.0
// @description  在沈阳化工大学本科教务处本地采集课表结构并生成脱敏 JSON，不上传账号、密码或 Cookie。
// @author       SYUCT
// @match        https://jws.syuct.edu.cn/*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://www.syuct.top/assets/syuct-timetable-capture.user.js
// @updateURL    https://www.syuct.top/assets/syuct-timetable-capture.user.js
// ==/UserScript==

(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && root.document) api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FORMAT = 'syuct-timetable-page-sample';
  const MAX_TEXT_LENGTH = 180000;
  const MAX_HTML_LENGTH = 240000;

  function compact(value) {
    return String(value == null ? '' : value)
      .replace(/\r/g, '')
      .replace(/[\t\f\v]+/g, ' ')
      .replace(/[ \u00a0]+\n/g, '\n')
      .replace(/\n[ \u00a0]+/g, '\n')
      .replace(/[ \u00a0]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function sanitizeText(value) {
    return compact(value)
      .replace(/([（(][a-z0-9]{16,}[）)])/gi, '（会话已脱敏）')
      .replace(/((?:学号|工号|账号|用户名|登录名)\s*[:：]?\s*)[a-z0-9_-]{5,}/gi, '$1[已脱敏]')
      .replace(/((?:姓名|学生姓名|教师姓名)\s*[:：]\s*)[^\s|，,；;]{2,16}/g, '$1[已脱敏]')
      .replace(/(?:欢迎(?:您)?|您好|你好)\s*[:：,，]?\s*[^\s，,；;]{2,16}(?:同学|老师)?/g, '欢迎您：[已脱敏]')
      .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[邮箱已脱敏]')
      .replace(/\b1\d{10}\b/g, '[手机号已脱敏]')
      .replace(/\b\d{8,18}\b/g, '[长数字已脱敏]');
  }

  function safePath(locationLike) {
    try {
      return String(locationLike.pathname || '/')
        .replace(/\([^/()]{8,}\)/g, '(session)')
        .replace(/\d{8,18}/g, '[id]');
    } catch (error) {
      return '/';
    }
  }

  function sanitizeClone(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll('script,style,link,img,svg,canvas,video,audio,input,textarea,select,button').forEach((node) => node.remove());
    clone.querySelectorAll('*').forEach((node) => {
      Array.from(node.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const keep = name === 'class' || name === 'id' || name === 'rowspan'
          || name === 'colspan' || name === 'scope' || name === 'role';
        if (!keep) node.removeAttribute(attribute.name);
        else node.setAttribute(attribute.name, sanitizeText(attribute.value).slice(0, 240));
      });
    });
    const walker = clone.ownerDocument.createTreeWalker(clone, 4);
    let node = walker.nextNode();
    while (node) {
      node.nodeValue = sanitizeText(node.nodeValue);
      node = walker.nextNode();
    }
    return sanitizeText(clone.outerHTML).slice(0, MAX_HTML_LENGTH);
  }

  function serializeTable(table, index) {
    const rect = table.getBoundingClientRect();
    return {
      index,
      id: sanitizeText(table.id || '').slice(0, 160),
      className: sanitizeText(table.className || '').slice(0, 240),
      size: {
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      rows: Array.from(table.rows || []).map((row) => ({
        cells: Array.from(row.cells || []).map((cell) => ({
          tag: cell.tagName.toLowerCase(),
          text: sanitizeText(cell.innerText || cell.textContent || '').slice(0, 12000),
          rowSpan: Number(cell.rowSpan) || 1,
          colSpan: Number(cell.colSpan) || 1,
          className: sanitizeText(cell.className || '').slice(0, 200)
        }))
      })),
      html: sanitizeClone(table)
    };
  }

  function candidateElements(documentObject) {
    const selector = [
      '[id*="course" i]', '[class*="course" i]',
      '[id*="schedule" i]', '[class*="schedule" i]',
      '[id*="timetable" i]', '[class*="timetable" i]',
      '[id*="kebiao" i]', '[class*="kebiao" i]',
      '[id*="kb" i]', '[class*="kb" i]'
    ].join(',');
    const found = Array.from(documentObject.querySelectorAll(selector)).filter((element) => {
      const text = compact(element.innerText || element.textContent || '');
      return text.length >= 20 && /课程表|星期[一二三四五六日]|节次|周次/.test(text);
    });
    return found
      .sort((a, b) => (b.innerText || '').length - (a.innerText || '').length)
      .slice(0, 12)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        id: sanitizeText(element.id || '').slice(0, 160),
        className: sanitizeText(element.className || '').slice(0, 240),
        text: sanitizeText(element.innerText || element.textContent || '').slice(0, 60000),
        html: sanitizeClone(element)
      }));
  }

  function collectDocuments(windowObject) {
    const documents = [];
    const seen = new Set();

    function visit(currentWindow, framePath) {
      let documentObject;
      try {
        documentObject = currentWindow.document;
        if (!documentObject || seen.has(documentObject)) return;
        void documentObject.body;
      } catch (error) {
        return;
      }
      seen.add(documentObject);

      const tables = Array.from(documentObject.querySelectorAll('table'));
      documents.push({
        framePath,
        origin: currentWindow.location.origin,
        path: safePath(currentWindow.location),
        title: sanitizeText(documentObject.title || ''),
        text: sanitizeText(documentObject.body ? documentObject.body.innerText : '').slice(0, MAX_TEXT_LENGTH),
        tables: tables.slice(0, 40).map(serializeTable),
        candidates: candidateElements(documentObject)
      });

      Array.from(documentObject.querySelectorAll('iframe,frame')).forEach((frame, index) => {
        try {
          if (frame.contentWindow) visit(frame.contentWindow, `${framePath}.${index + 1}`);
        } catch (error) {
          // 跨域框架按浏览器安全规则跳过。
        }
      });
    }

    visit(windowObject, 'top');
    return documents;
  }

  function isLikelyTimetable(documents) {
    const text = documents.map((item) => item.text).join('\n');
    const weekdayCount = new Set(text.match(/星期[一二三四五六日]/g) || []).size;
    const scheduleCount = (text.match(/(?:节次|第\s*\d+\s*节|\d+\s*[-,，、]\s*\d+\s*节)/g) || []).length;
    return weekdayCount >= 3 && scheduleCount >= 2;
  }

  function buildSample(windowObject) {
    const documents = collectDocuments(windowObject);
    return {
      format: FORMAT,
      version: 1,
      system: 'undergraduate',
      collectedAt: new Date().toISOString(),
      sourceOrigin: windowObject.location.origin,
      privacy: '账号、姓名、学号、手机号、邮箱、会话路径及表单内容已脱敏；文件未自动上传。',
      likelyTimetable: isLikelyTimetable(documents),
      documents
    };
  }

  function downloadSample(windowObject, sample) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = windowObject.document.createElement('a');
    link.href = url;
    link.download = `syuct-undergraduate-timetable-sample-${stamp}.json`;
    link.style.display = 'none';
    windowObject.document.body.appendChild(link);
    link.click();
    link.remove();
    windowObject.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function install(windowObject) {
    if (windowObject.top !== windowObject.self || windowObject.__SYUCT_TIMETABLE_CAPTURE_INSTALLED__) return;
    windowObject.__SYUCT_TIMETABLE_CAPTURE_INSTALLED__ = true;

    const button = windowObject.document.createElement('button');
    button.type = 'button';
    button.textContent = '采集课表结构';
    button.title = '仅生成本地脱敏文件，不上传账号或课表';
    button.setAttribute('aria-label', '采集本科课表结构并下载脱敏文件');
    Object.assign(button.style, {
      position: 'fixed', right: '16px', bottom: '18px', zIndex: '2147483647',
      minHeight: '44px', padding: '0 17px', border: '1px solid rgba(255,255,255,.45)',
      borderRadius: '13px', background: 'linear-gradient(100deg,#075ca8,#18a8e0)',
      color: '#fff', boxShadow: '0 10px 28px rgba(7,92,168,.28)',
      font: '700 14px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif', cursor: 'pointer'
    });

    button.addEventListener('click', () => {
      const previous = button.textContent;
      button.disabled = true;
      button.textContent = '正在采集…';
      try {
        const sample = buildSample(windowObject);
        if (!sample.likelyTimetable) {
          windowObject.alert('没有检测到完整课表。请先进入“学生个人课表”页面，等待课表加载完成后再采集。');
          return;
        }
        downloadSample(windowObject, sample);
        button.textContent = '文件已生成';
        windowObject.alert('脱敏课表结构文件已下载。请把 JSON 文件发给开发者用于适配；脚本没有上传任何内容。');
      } catch (error) {
        windowObject.alert(`采集失败：${error && error.message ? error.message : '当前页面结构无法读取'}`);
      } finally {
        windowObject.setTimeout(() => {
          button.disabled = false;
          button.textContent = previous;
        }, 1800);
      }
    });

    windowObject.document.body.appendChild(button);
  }

  return {
    FORMAT,
    sanitizeText,
    safePath,
    isLikelyTimetable,
    buildSample,
    install
  };
});
