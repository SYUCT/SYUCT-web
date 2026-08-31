(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SYUCTTimetableOCR = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const browserRoot = typeof globalThis !== 'undefined' ? globalThis : this;
  const TESSERACT_VERSION = '7.0.0';
  const TESSERACT_ASSET_BASE = `assets/tesseract/v${TESSERACT_VERSION}`;
  const START_SECTIONS = [1, 3, 5, 7, 9];
  const WEEKDAY_COUNT = 7;
  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const MAX_SOURCE_WIDTH = 1800;
  const MAX_SOURCE_HEIGHT = 5200;
  const MAX_COURSES = 200;

  let tesseractScriptPromise = null;
  let workerPromise = null;
  let activeWorkerProgress = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function cleanOcrLine(value) {
    return String(value == null ? '' : value)
      .replace(/[\r\n\t]+/g, '')
      .replace(/\s+/g, '')
      .replace(/[（]/g, '(')
      .replace(/[）]/g, ')')
      .replace(/[／]/g, '/')
      .replace(/[~～—–至到]/g, '-')
      .replace(/^[|丨：:;；,.，。·•]+|[|丨：:;；,.，。·•]+$/g, '')
      .trim();
  }

  function clusterScores(scores, threshold) {
    const result = [];
    let start = -1;
    for (let index = 0; index <= scores.length; index += 1) {
      const value = index < scores.length ? scores[index] : 0;
      if (value >= threshold && start < 0) {
        start = index;
      } else if (value < threshold && start >= 0) {
        const end = index - 1;
        let peakScore = scores[start];
        let peakPositions = [start];
        for (let cursor = start + 1; cursor <= end; cursor += 1) {
          if (scores[cursor] > peakScore) {
            peakScore = scores[cursor];
            peakPositions = [cursor];
          } else if (scores[cursor] === peakScore) {
            peakPositions.push(cursor);
          }
        }
        const position = Math.round(peakPositions.reduce((sum, cursor) => sum + cursor, 0) / peakPositions.length);
        result.push({ start, end, position, score: peakScore });
        start = -1;
      }
    }
    return result;
  }

  function imageDataToGray(imageData) {
    const rgba = imageData.data;
    const gray = new Uint8Array(imageData.width * imageData.height);
    for (let index = 0, pixel = 0; index < rgba.length; index += 4, pixel += 1) {
      gray[pixel] = Math.round((rgba[index] * 299 + rgba[index + 1] * 587 + rgba[index + 2] * 114) / 1000);
    }
    return gray;
  }

  function isDarkNear(gray, width, height, x, y, threshold, radius) {
    const left = Math.max(0, x - radius);
    const right = Math.min(width - 1, x + radius);
    for (let cursor = left; cursor <= right; cursor += 1) {
      if (gray[y * width + cursor] < threshold) return true;
    }
    return false;
  }

  function verticalLineCandidates(gray, width, height, threshold) {
    const scores = new Array(width).fill(0);
    const allowedGap = Math.max(1, Math.round(height / 900));
    for (let x = 0; x < width; x += 1) {
      let run = 0;
      let best = 0;
      let gap = 0;
      for (let y = 0; y < height; y += 1) {
        if (isDarkNear(gray, width, height, x, y, threshold, 1)) {
          run += gap + 1;
          gap = 0;
          if (run > best) best = run;
        } else if (run && gap < allowedGap) {
          gap += 1;
        } else {
          run = 0;
          gap = 0;
        }
      }
      scores[x] = best;
    }
    const minimumRun = Math.max(28, Math.round(height * 0.12));
    return clusterScores(scores, minimumRun);
  }

  function findClosestCandidate(candidates, expected, tolerance, used) {
    let best = null;
    candidates.forEach((candidate, index) => {
      if (used.has(index)) return;
      const distance = Math.abs(candidate.position - expected);
      if (distance > tolerance) return;
      if (!best || distance < best.distance || (distance === best.distance && candidate.score > best.candidate.score)) {
        best = { candidate, index, distance };
      }
    });
    return best;
  }

  function findWeekdayBoundaries(candidates, width) {
    let best = null;
    for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 7; rightIndex < candidates.length; rightIndex += 1) {
        const left = candidates[leftIndex].position;
        const right = candidates[rightIndex].position;
        const span = right - left;
        if (span < width * 0.52 || span > width * 0.99) continue;
        const step = span / WEEKDAY_COUNT;
        if (step < 24) continue;
        const tolerance = Math.max(3, step * 0.085);
        const used = new Set();
        const matched = [];
        let totalError = 0;
        let totalStrength = 0;
        let failed = false;
        for (let slot = 0; slot <= WEEKDAY_COUNT; slot += 1) {
          const found = findClosestCandidate(candidates, left + step * slot, tolerance, used);
          if (!found) {
            failed = true;
            break;
          }
          used.add(found.index);
          matched.push(found.candidate.position);
          totalError += found.distance / step;
          totalStrength += found.candidate.score;
        }
        if (failed) continue;
        const score = totalError - (span / width) * 0.12 - (totalStrength / (heightSafe(candidates) * 8)) * 0.02;
        if (!best || score < best.score) best = { score, positions: matched, step };
      }
    }
    if (!best) throw new Error('没有定位到周一至周日 7 列，请上传包含完整课表边框的正向截图');
    return best.positions;
  }

  function heightSafe(candidates) {
    return Math.max(1, candidates.reduce((max, item) => Math.max(max, item.score), 1));
  }

  function findLongestVerticalInterval(gray, width, height, boundaries, threshold) {
    const required = Math.max(6, boundaries.length - 2);
    const mask = new Array(height).fill(false);
    for (let y = 0; y < height; y += 1) {
      let count = 0;
      boundaries.forEach((x) => {
        if (isDarkNear(gray, width, height, Math.round(x), y, threshold, 2)) count += 1;
      });
      mask[y] = count >= required;
    }

    let best = null;
    let start = -1;
    let lastTrue = -1;
    const maxGap = Math.max(2, Math.round(height / 700));
    for (let y = 0; y <= height; y += 1) {
      if (y < height && mask[y]) {
        if (start < 0) start = y;
        lastTrue = y;
      } else if (start >= 0 && (y - lastTrue > maxGap || y === height)) {
        const end = lastTrue;
        if (!best || end - start > best.end - best.start) best = { start, end };
        start = -1;
        lastTrue = -1;
      }
    }
    if (!best || best.end - best.start < height * 0.12) {
      throw new Error('课表竖线不连续，截图可能被裁掉、倾斜或压缩过度');
    }
    return best;
  }

  function horizontalLineCandidates(gray, width, xStart, xEnd, yStart, yEnd, threshold, ratio) {
    const scores = new Array(yEnd - yStart + 1).fill(0);
    const left = clamp(Math.round(xStart), 0, width - 1);
    const right = clamp(Math.round(xEnd), left + 1, width - 1);
    for (let y = yStart; y <= yEnd; y += 1) {
      let count = 0;
      for (let x = left; x <= right; x += 1) {
        if (gray[y * width + x] < threshold) count += 1;
      }
      scores[y - yStart] = count;
    }
    const required = Math.max(4, Math.round((right - left + 1) * ratio));
    return clusterScores(scores, required).map((item) => ({
      start: item.start + yStart,
      end: item.end + yStart,
      position: item.position + yStart,
      score: item.score
    }));
  }

  function chooseBodyTop(fullLines, intervalHeight) {
    if (fullLines.length < 3) throw new Error('没有识别到课表表头，请保留“时间、星期一至星期日”表头');
    const maximumHeaderGap = Math.max(10, intervalHeight * 0.08);
    for (let index = 0; index + 2 < fullLines.length; index += 1) {
      const firstGap = fullLines[index + 1].position - fullLines[index].position;
      const secondGap = fullLines[index + 2].position - fullLines[index + 1].position;
      const ratio = firstGap / Math.max(1, secondGap);
      if (firstGap <= maximumHeaderGap && secondGap <= maximumHeaderGap && ratio >= 0.45 && ratio <= 2.2) {
        return fullLines[index + 2].position;
      }
    }
    throw new Error('课表表头结构与当前支持的正方教务系统样式不一致');
  }

  function selectSectionLines(candidates, bodyTop, tableBottom, expectedCount) {
    const tolerance = Math.max(3, (tableBottom - bodyTop) * 0.012);
    const inside = candidates
      .filter((item) => item.position >= bodyTop - tolerance && item.position <= tableBottom + tolerance)
      .map((item) => item.position)
      .sort((a, b) => a - b);

    const distinct = [];
    inside.forEach((position) => {
      if (!distinct.length || position - distinct[distinct.length - 1] > 2) distinct.push(position);
    });
    if (distinct.length < expectedCount) {
      throw new Error(`只定位到 ${Math.max(0, distinct.length - 1)} 个节次行，需要完整保留第1节至第10节`);
    }

    let best = null;
    for (let start = 0; start + expectedCount <= distinct.length; start += 1) {
      const slice = distinct.slice(start, start + expectedCount);
      const firstError = Math.abs(slice[0] - bodyTop);
      const lastError = Math.abs(slice[slice.length - 1] - tableBottom);
      const gaps = slice.slice(1).map((value, index) => value - slice[index]);
      if (gaps.some((gap) => gap < 6)) continue;
      const score = firstError + lastError;
      if (!best || score < best.score) best = { score, lines: slice };
    }
    if (!best || Math.abs(best.lines[0] - bodyTop) > tolerance * 2 || Math.abs(best.lines[expectedCount - 1] - tableBottom) > tolerance * 2) {
      throw new Error('第1节至第10节的横线结构不完整，请重新截取整张课表');
    }
    return best.lines;
  }

  function detectFixedGrid(imageData, options) {
    const width = imageData.width;
    const height = imageData.height;
    if (width < 420 || height < 320) throw new Error('图片分辨率过低，请上传清晰的完整课表截图');
    const gray = imageDataToGray(imageData);
    const threshold = Number(options && options.darkThreshold) || 205;
    const verticalCandidates = verticalLineCandidates(gray, width, height, threshold);
    const weekdayBoundaries = findWeekdayBoundaries(verticalCandidates, width);
    const verticalInterval = findLongestVerticalInterval(gray, width, height, weekdayBoundaries, threshold);
    const tableHeight = verticalInterval.end - verticalInterval.start;
    const fullLines = horizontalLineCandidates(
      gray,
      width,
      weekdayBoundaries[0],
      weekdayBoundaries[weekdayBoundaries.length - 1],
      verticalInterval.start,
      verticalInterval.end,
      threshold,
      0.9
    );
    const bodyTop = chooseBodyTop(fullLines, tableHeight);

    const leftCandidates = verticalCandidates
      .map((item) => item.position)
      .filter((position) => position < weekdayBoundaries[0] - 3)
      .sort((a, b) => b - a);
    if (!leftCandidates.length) throw new Error('没有定位到左侧节次列，请不要裁掉“第N节”区域');
    const sectionColumnLeft = leftCandidates[0];
    const sectionLinesRaw = horizontalLineCandidates(
      gray,
      width,
      sectionColumnLeft + 1,
      weekdayBoundaries[0] - 1,
      Math.max(verticalInterval.start, bodyTop - 3),
      verticalInterval.end,
      threshold,
      0.78
    );
    const sectionLines = selectSectionLines(sectionLinesRaw, bodyTop, verticalInterval.end, 11);
    const groupBoundaries = [0, 2, 4, 6, 8, 10].map((index) => sectionLines[index]);

    return {
      width,
      height,
      gray,
      darkThreshold: threshold,
      tableTop: verticalInterval.start,
      tableBottom: verticalInterval.end,
      bodyTop: sectionLines[0],
      weekdayBoundaries,
      sectionLines,
      groupBoundaries,
      sectionColumnLeft
    };
  }

  function cellInkDensity(grid, weekdayIndex, groupIndex) {
    const x0 = Math.round(grid.weekdayBoundaries[weekdayIndex]) + 3;
    const x1 = Math.round(grid.weekdayBoundaries[weekdayIndex + 1]) - 3;
    const y0 = Math.round(grid.groupBoundaries[groupIndex]) + 3;
    const y1 = Math.round(grid.groupBoundaries[groupIndex + 1]) - 3;
    let dark = 0;
    let sampled = 0;
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        sampled += 1;
        if (grid.gray[y * grid.width + x] < grid.darkThreshold) dark += 1;
      }
    }
    return sampled ? dark / sampled : 0;
  }

  function occupiedCells(grid) {
    const cells = [];
    for (let groupIndex = 0; groupIndex < START_SECTIONS.length; groupIndex += 1) {
      for (let weekdayIndex = 0; weekdayIndex < WEEKDAY_COUNT; weekdayIndex += 1) {
        const density = cellInkDensity(grid, weekdayIndex, groupIndex);
        // 空白格仍含一条“第N节/第N+1节”内部横线，实测约占 1%-2%；
        // 课程文字通常超过 5%，因此留出明显间隔，避免把 35 个格子全部送入 OCR。
        if (density < 0.035) continue;
        cells.push({
          weekday: weekdayIndex + 1,
          startSection: START_SECTIONS[groupIndex],
          weekdayIndex,
          groupIndex,
          density
        });
      }
    }
    return cells;
  }

  function createCellCanvas(sourceCanvas, grid, cell) {
    const x0 = Math.round(grid.weekdayBoundaries[cell.weekdayIndex]) + 2;
    const x1 = Math.round(grid.weekdayBoundaries[cell.weekdayIndex + 1]) - 2;
    const y0 = Math.round(grid.groupBoundaries[cell.groupIndex]) + 2;
    const y1 = Math.round(grid.groupBoundaries[cell.groupIndex + 1]) - 2;
    const sourceWidth = Math.max(1, x1 - x0);
    const sourceHeight = Math.max(1, y1 - y0);
    const scale = clamp(540 / sourceWidth, 3, 9);
    const padding = 18;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sourceWidth * scale) + padding * 2;
    canvas.height = Math.round(sourceHeight * scale) + padding * 2;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(sourceCanvas, x0, y0, sourceWidth, sourceHeight, padding, padding, canvas.width - padding * 2, canvas.height - padding * 2);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    for (let index = 0; index < pixels.length; index += 4) {
      const gray = (pixels[index] * 299 + pixels[index + 1] * 587 + pixels[index + 2] * 114) / 1000;
      const enhanced = clamp((gray - 128) * 1.18 + 128, 0, 255);
      // 教务系统整页截图里的汉字通常只有 7-10px 高。放大后再把浅灰色
      // 抗锯齿像素并入笔画，比保留 JPEG 灰雾更利于中文模型分辨字形。
      const binary = enhanced < 225 ? 0 : 255;
      pixels[index] = binary;
      pixels[index + 1] = binary;
      pixels[index + 2] = binary;
      pixels[index + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);
    return canvas;
  }

  function parseTsvLines(tsv, fallbackText) {
    const source = String(tsv || '').trim();
    if (!source) {
      return String(fallbackText || '').split(/\r?\n/).map((text) => ({ text: cleanOcrLine(text), confidence: 0 })).filter((line) => line.text);
    }
    const rows = source.split(/\r?\n/);
    const grouped = new Map();
    rows.slice(1).forEach((row) => {
      const fields = row.split('\t');
      if (fields.length < 12 || fields[0] !== '5') return;
      const text = cleanOcrLine(fields.slice(11).join(''));
      if (!text) return;
      const key = `${fields[2]}:${fields[3]}:${fields[4]}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({
        text,
        left: Number(fields[6]) || 0,
        top: Number(fields[7]) || 0,
        width: Number(fields[8]) || 0,
        height: Number(fields[9]) || 0,
        confidence: Number(fields[10]) || 0
      });
    });
    return Array.from(grouped.values()).map((words) => {
      words.sort((a, b) => a.left - b.left);
      const left = Math.min(...words.map((word) => word.left));
      const top = Math.min(...words.map((word) => word.top));
      const right = Math.max(...words.map((word) => word.left + word.width));
      const bottom = Math.max(...words.map((word) => word.top + word.height));
      return {
        text: cleanOcrLine(words.map((word) => word.text).join('')),
        confidence: words.reduce((sum, word) => sum + word.confidence, 0) / words.length,
        bbox: { left, top, right, bottom }
      };
    }).filter((line) => line.text).sort((a, b) => {
      const topDiff = (a.bbox ? a.bbox.top : 0) - (b.bbox ? b.bbox.top : 0);
      return Math.abs(topDiff) > 4 ? topDiff : (a.bbox ? a.bbox.left : 0) - (b.bbox ? b.bbox.left : 0);
    });
  }

  function isDirectionLine(text) {
    return /^无方[向问同句何启铅钠血咎频二卜点]?/.test(cleanOcrLine(text));
  }

  function isNatureLine(text) {
    const value = cleanOcrLine(text);
    if (/^(必修|选修|学选|专选|公选|任选|任意|限选|校选|通选|实践|实验)$/.test(value)) return true;
    return value.length <= 3 && /^[必选学专公任限校通实]/.test(value);
  }

  function isScheduleLine(text) {
    const value = cleanOcrLine(text);
    return /[0-9Zz二两][^节]{0,2}节/.test(value) && (/[\/周单双]/.test(value) || /[-(]\s*[0-9A-Za-z]/.test(value));
  }

  function normalizeDigitish(value) {
    return String(value || '')
      .replace(/[OoQ]/g, '0')
      .replace(/[Il|丨]/g, '1')
      .replace(/[Zz]/g, '2')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8');
  }

  function parseOcrSchedule(text, startSection, defaultEndWeek) {
    const source = cleanOcrLine(text);
    const normalized = normalizeDigitish(source);
    const issues = [];
    const sectionSpanMatch = /第?([0-9]{1,2})[,.，、~\-]([0-9]{1,2})节/.exec(normalized);
    const durationMatch = /([0-9]{1,2})[^节]{0,2}节/.exec(normalized);
    let duration = sectionSpanMatch
      ? Number(sectionSpanMatch[2]) - Number(sectionSpanMatch[1]) + 1
      : (durationMatch ? Number(durationMatch[1]) : 2);
    if (!Number.isInteger(duration) || duration < 1 || duration > 4) {
      duration = 2;
      issues.push('节数未可靠识别，已暂填2节');
    }

    let weekType = 'all';
    if (source.includes('单')) weekType = 'odd';
    if (source.includes('双')) weekType = 'even';

    const afterSection = normalized.includes('节') ? normalized.slice(normalized.indexOf('节') + 1) : normalized;
    const rangeMatch = /([0-9]{1,2})[^0-9]{0,5}-[^0-9]{0,5}([0-9]{1,2})/.exec(afterSection);
    let startWeek = rangeMatch ? Number(rangeMatch[1]) : 1;
    let endWeek = rangeMatch ? Number(rangeMatch[2]) : defaultEndWeek;
    if (!rangeMatch || !Number.isInteger(startWeek) || !Number.isInteger(endWeek) || startWeek < 1 || endWeek < startWeek || endWeek > 30) {
      startWeek = 1;
      endWeek = defaultEndWeek;
      issues.push(`周次范围未可靠识别，已暂填1-${defaultEndWeek}周`);
    }

    return {
      duration,
      startSection,
      endSection: Math.min(12, startSection + duration - 1),
      startWeek,
      endWeek,
      weekType,
      issues
    };
  }

  function splitCourseChunks(lines) {
    const chunks = [];
    let current = [];
    lines.forEach((line) => {
      current.push(line);
      if (isDirectionLine(line.text)) {
        chunks.push(current);
        current = [];
      }
    });
    if (current.length) chunks.push(current);
    return chunks;
  }

  function looksLikeRoomLine(text) {
    const value = cleanOcrLine(text);
    return /[楼栋室座馆]|(?:原|第)?\d+#|[#＃]|[)）]\d{2,4}|\d{3,4}$/.test(value);
  }

  function isScheduleContinuationLine(text, scheduleText) {
    const value = cleanOcrLine(text);
    const schedule = normalizeDigitish(cleanOcrLine(scheduleText));
    const hasWeekRange = /[0-9]{1,2}[^0-9]{0,5}-[^0-9]{0,5}[0-9]{1,2}/.test(schedule);
    const scheduleLooksOpen = hasWeekRange && !/[)）}\]】》]$/.test(schedule);
    if (!scheduleLooksOpen || !value || value.length > 6) return false;
    // 小字号 OCR 常把换行处的“周}”识别为“局}”“同)”甚至“雹}”。
    // 只在上一行已有未闭合周次范围时移除，避免误删真正的教师姓名。
    return /^[\u3400-\u9fffA-Za-z]{0,4}[)）}\]】》]+$/.test(value)
      || /^[周局同网间闵围]{1,2}$/.test(value);
  }

  function parseCoursesWithoutDirections(lines, context) {
    const scheduleIndices = [];
    lines.forEach((line, index) => {
      if (isScheduleLine(line.text)) scheduleIndices.push(index);
    });
    if (scheduleIndices.length < 2) return [];

    const records = scheduleIndices.map((scheduleIndex, index) => {
      const natureIndex = scheduleIndex > 0 && isNatureLine(lines[scheduleIndex - 1].text) ? scheduleIndex - 1 : scheduleIndex;
      const previousSchedule = index ? scheduleIndices[index - 1] : -1;
      let nameStart = Math.max(previousSchedule + 1, natureIndex - 1);
      while (nameStart > previousSchedule + 1 && natureIndex - nameStart < 3) {
        const previous = lines[nameStart - 1].text;
        if (isScheduleLine(previous) || isNatureLine(previous) || isDirectionLine(previous) || looksLikeRoomLine(previous)) break;
        nameStart -= 1;
      }
      return { scheduleIndex, natureIndex, nameStart };
    });

    const courses = [];
    records.forEach((record, index) => {
      const nextStart = index + 1 < records.length ? records[index + 1].nameStart : lines.length;
      const nameLines = lines.slice(record.nameStart, record.natureIndex);
      const details = lines.slice(record.scheduleIndex + 1, nextStart);
      while (details.length && details[0].text.length <= 4 && /^[周})）\]】]+$/.test(details[0].text)) details.shift();
      const synthetic = nameLines.slice();
      if (record.natureIndex < record.scheduleIndex) synthetic.push(lines[record.natureIndex]);
      synthetic.push(lines[record.scheduleIndex], ...details);
      const course = parseOcrChunk(synthetic, Object.assign({}, context, { colorIndex: context.colorIndex + courses.length }));
      if (course) courses.push(course);
    });
    return courses;
  }

  function parseOcrChunk(chunk, context) {
    const scheduleIndex = chunk.findIndex((line) => isScheduleLine(line.text));
    if (scheduleIndex < 0) return null;
    const before = chunk.slice(0, scheduleIndex);
    while (before.length && isNatureLine(before[before.length - 1].text)) before.pop();
    const name = cleanOcrLine(before.map((line) => line.text).join(''));
    if (!name || name.length > 120) return null;

    const after = chunk.slice(scheduleIndex + 1).filter((line) => !isDirectionLine(line.text));
    if (after.length && isScheduleContinuationLine(after[0].text, chunk[scheduleIndex].text)) after.shift();
    const teacher = after.length ? cleanOcrLine(after[0].text) : '';
    const room = after.length > 1 ? cleanOcrLine(after.slice(1).map((line) => line.text).join('')) : '';
    const schedule = parseOcrSchedule(chunk[scheduleIndex].text, context.startSection, context.defaultEndWeek);
    const confidenceLines = chunk.filter((line) => Number.isFinite(line.confidence));
    const confidence = confidenceLines.length
      ? confidenceLines.reduce((sum, line) => sum + line.confidence, 0) / confidenceLines.length
      : 0;
    const issues = schedule.issues.slice();
    if (confidence && confidence < 55) issues.push('文字清晰度较低，请重点核对课程名、教师和教室');
    return {
      name,
      teacher,
      room,
      weekday: context.weekday,
      startSection: schedule.startSection,
      endSection: schedule.endSection,
      startWeek: schedule.startWeek,
      endWeek: schedule.endWeek,
      weekType: schedule.weekType,
      colorIndex: context.colorIndex,
      ocrConfidence: Math.round(confidence),
      ocrIssues: issues,
      ocrRawText: chunk.map((line) => line.text).join('\n')
    };
  }

  function parseOcrCellLines(lines, context) {
    const normalized = (lines || []).map((line) => typeof line === 'string'
      ? { text: cleanOcrLine(line), confidence: 0 }
      : Object.assign({}, line, { text: cleanOcrLine(line.text) }))
      .filter((line) => line.text);
    const directionCount = normalized.filter((line) => isDirectionLine(line.text)).length;
    const scheduleCount = normalized.filter((line) => isScheduleLine(line.text)).length;
    if (!directionCount && scheduleCount > 1) return parseCoursesWithoutDirections(normalized, context);

    const chunks = splitCourseChunks(normalized);
    const courses = [];
    chunks.forEach((chunk) => {
      const scheduleCount = chunk.filter((line) => isScheduleLine(line.text)).length;
      if (scheduleCount <= 1) {
        const course = parseOcrChunk(chunk, Object.assign({}, context, { colorIndex: context.colorIndex + courses.length }));
        if (course) courses.push(course);
        return;
      }

      // “无方向”漏识别时，以每个课时行向前寻找课程名，并保留可人工修正的结果。
      let start = 0;
      chunk.forEach((line, index) => {
        if (!isScheduleLine(line.text)) return;
        let end = index + 1;
        while (end < chunk.length && !isScheduleLine(chunk[end].text)) end += 1;
        const partial = chunk.slice(start, end);
        const course = parseOcrChunk(partial, Object.assign({}, context, { colorIndex: context.colorIndex + courses.length }));
        if (course) courses.push(course);
        start = end;
      });
    });
    return courses;
  }

  function courseSignature(course) {
    return [course.name, course.teacher, course.room, course.weekday, course.startSection, course.endSection, course.startWeek, course.endWeek, course.weekType]
      .join('|').toLowerCase();
  }

  function dedupeCourses(courses) {
    const seen = new Set();
    const result = [];
    courses.forEach((course) => {
      const signature = courseSignature(course);
      if (seen.has(signature)) return;
      seen.add(signature);
      result.push(Object.assign({}, course, { colorIndex: result.length % 6 }));
    });
    return result;
  }

  function summarizeCourses(courses, extraMeta) {
    const uniqueCourseNames = Array.from(new Set(courses.map((course) => course.name)));
    return Object.assign({
      arrangementCount: courses.length,
      uniqueCourseCount: uniqueCourseNames.length,
      oddCount: courses.filter((course) => course.weekType === 'odd').length,
      evenCount: courses.filter((course) => course.weekType === 'even').length,
      practiceNames: [],
      maxEndWeek: courses.reduce((max, course) => Math.max(max, course.endWeek), 0),
      sourceFormat: 'image-ocr-fixed-grid',
      sourceLength: 0,
      sourceLikelyComplete: true,
      scheduleMarkerCount: courses.length,
      clipboardStructureValid: true,
      weekdaySlotCount: WEEKDAY_COUNT,
      validatedSectionRows: START_SECTIONS.length
    }, extraMeta || {});
  }

  function loadScript(source) {
    if (typeof document === 'undefined') return Promise.reject(new Error('当前环境不能加载浏览器 OCR 引擎'));
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-timetable-ocr-engine="${source}"]`);
      if (existing) {
        if (browserRoot.Tesseract) resolve();
        else existing.addEventListener('load', resolve, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = source;
      script.async = true;
      script.dataset.timetableOcrEngine = source;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error('OCR 引擎加载失败，请检查网络后重试')), { once: true });
      document.head.appendChild(script);
    });
  }

  async function getOcrWorker(onProgress) {
    activeWorkerProgress = onProgress || null;
    if (!tesseractScriptPromise) {
      tesseractScriptPromise = loadScript(`${TESSERACT_ASSET_BASE}/tesseract.min.js`);
    }
    await tesseractScriptPromise;
    if (!browserRoot.Tesseract) throw new Error('OCR 引擎没有正确初始化');
    if (!workerPromise) {
      workerPromise = browserRoot.Tesseract.createWorker('chi_sim', browserRoot.Tesseract.OEM.LSTM_ONLY, {
        workerPath: `${TESSERACT_ASSET_BASE}/worker.min.js`,
        corePath: `${TESSERACT_ASSET_BASE}/core`,
        langPath: `${TESSERACT_ASSET_BASE}/lang`,
        logger(message) {
          if (activeWorkerProgress) activeWorkerProgress(message);
        }
      }).then(async (worker) => {
        await worker.setParameters({
          tessedit_pageseg_mode: browserRoot.Tesseract.PSM.SINGLE_BLOCK,
          preserve_interword_spaces: '1',
          user_defined_dpi: '300'
        });
        return worker;
      }).catch((error) => {
        workerPromise = null;
        throw error;
      });
    }
    return workerPromise;
  }

  async function loadImage(file) {
    if (!file) throw new Error('请先选择课表截图');
    if (file.size > MAX_FILE_BYTES) throw new Error('图片不能超过 20 MB');
    if (file.type && !/^image\/(?:png|jpeg|webp)$/.test(file.type)) throw new Error('仅支持 PNG、JPG 或 WebP 图片');
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch (error) {
        // 继续使用兼容性更好的 Image 回退。
      }
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片无法读取，请换用 PNG 或 JPG 后重试'));
      };
      image.src = url;
    });
  }

  function sourceDimensions(image) {
    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height
    };
  }

  function createSourceCanvas(image) {
    const dimensions = sourceDimensions(image);
    if (!dimensions.width || !dimensions.height) throw new Error('图片尺寸无效');
    const scale = Math.min(1, MAX_SOURCE_WIDTH / dimensions.width, MAX_SOURCE_HEIGHT / dimensions.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(dimensions.width * scale));
    canvas.height = Math.max(1, Math.round(dimensions.height * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function drawGridPreview(sourceCanvas, grid, previewCanvas) {
    if (!previewCanvas) return;
    const maxWidth = 920;
    const scale = Math.min(1, maxWidth / sourceCanvas.width);
    previewCanvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
    previewCanvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
    const context = previewCanvas.getContext('2d');
    context.drawImage(sourceCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
    context.save();
    context.scale(scale, scale);
    context.fillStyle = 'rgba(7,92,168,.08)';
    context.fillRect(
      grid.weekdayBoundaries[0],
      grid.groupBoundaries[0],
      grid.weekdayBoundaries[grid.weekdayBoundaries.length - 1] - grid.weekdayBoundaries[0],
      grid.groupBoundaries[grid.groupBoundaries.length - 1] - grid.groupBoundaries[0]
    );
    context.lineWidth = Math.max(1.5, 2 / scale);
    context.strokeStyle = '#087ac1';
    grid.weekdayBoundaries.forEach((x) => {
      context.beginPath();
      context.moveTo(x, grid.groupBoundaries[0]);
      context.lineTo(x, grid.groupBoundaries[grid.groupBoundaries.length - 1]);
      context.stroke();
    });
    context.strokeStyle = '#e77624';
    grid.groupBoundaries.forEach((y) => {
      context.beginPath();
      context.moveTo(grid.weekdayBoundaries[0], y);
      context.lineTo(grid.weekdayBoundaries[grid.weekdayBoundaries.length - 1], y);
      context.stroke();
    });
    context.restore();
  }

  function progressLabel(status) {
    const labels = {
      'loading tesseract core': '正在加载 OCR 核心',
      'initializing tesseract': '正在初始化 OCR',
      'loading language traineddata': '首次加载中文识别模型',
      'initializing api': '正在准备中文识别',
      'recognizing text': '正在识别课程文字'
    };
    return labels[status] || '正在准备 OCR';
  }

  async function recognizeTimetableImage(file, options) {
    if (typeof document === 'undefined') throw new Error('截图 OCR 只能在浏览器中运行');
    const settings = options || {};
    const onProgress = typeof settings.onProgress === 'function' ? settings.onProgress : function () {};
    const defaultEndWeek = clamp(Number(settings.defaultEndWeek) || 20, 1, 30);
    onProgress({ progress: 0.02, label: '正在读取图片' });
    const image = await loadImage(file);
    const sourceCanvas = createSourceCanvas(image);
    if (typeof image.close === 'function') image.close();

    onProgress({ progress: 0.07, label: '正在定位课表网格' });
    const context = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const imageData = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const grid = detectFixedGrid(imageData);
    drawGridPreview(sourceCanvas, grid, settings.previewCanvas);
    const cells = occupiedCells(grid);
    if (!cells.length) throw new Error('网格定位成功，但没有检测到课程文字');
    onProgress({ progress: 0.12, label: `已定位网格，准备识别 ${cells.length} 个有文字的课程格` });

    const initializationProgress = (message) => {
      const progress = clamp(Number(message.progress) || 0, 0, 1);
      onProgress({ progress: 0.12 + progress * 0.16, label: progressLabel(message.status) });
    };
    const worker = await getOcrWorker(initializationProgress);
    const courses = [];
    const rawCells = [];

    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      const base = 0.28 + (index / cells.length) * 0.69;
      activeWorkerProgress = (message) => {
        const local = clamp(Number(message.progress) || 0, 0, 1);
        onProgress({
          progress: base + (local / cells.length) * 0.69,
          label: `正在识别星期${cell.weekday}第${cell.startSection}-${cell.startSection + 1}节（${index + 1}/${cells.length}）`
        });
      };
      const cellCanvas = createCellCanvas(sourceCanvas, grid, cell);
      const response = await worker.recognize(cellCanvas, {}, { text: true, tsv: true });
      const lines = parseTsvLines(response.data.tsv, response.data.text);
      const parsed = parseOcrCellLines(lines, {
        weekday: cell.weekday,
        startSection: cell.startSection,
        defaultEndWeek,
        colorIndex: courses.length
      });
      parsed.forEach((course) => courses.push(course));
      rawCells.push({
        weekday: cell.weekday,
        startSection: cell.startSection,
        density: cell.density,
        lines: lines.map((line) => line.text),
        parsedCount: parsed.length
      });
      if (courses.length > MAX_COURSES) throw new Error('OCR 识别结果超过 200 条，请检查图片是否为课表截图');
    }
    activeWorkerProgress = null;

    const deduped = dedupeCourses(courses);
    if (!deduped.length) {
      throw new Error('已定位课表网格，但没有可靠提取出课程；请上传更清晰的原始截图，避免聊天软件压缩');
    }
    const uncertainCount = deduped.filter((course) => course.ocrIssues && course.ocrIssues.length).length;
    onProgress({ progress: 1, label: '截图识别完成，请逐条核对' });
    return {
      courses: deduped,
      meta: summarizeCourses(deduped, {
        ocrEngine: `Tesseract.js ${TESSERACT_VERSION}`,
        ocrCellCount: cells.length,
        uncertainCount,
        rawCells
      }),
      grid: {
        weekdayBoundaries: grid.weekdayBoundaries.slice(),
        sectionLines: grid.sectionLines.slice(),
        groupBoundaries: grid.groupBoundaries.slice()
      }
    };
  }

  async function terminateWorker() {
    if (!workerPromise) return;
    try {
      const worker = await workerPromise;
      await worker.terminate();
    } finally {
      workerPromise = null;
      activeWorkerProgress = null;
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => { terminateWorker(); }, { once: true });
  }

  return {
    TESSERACT_VERSION,
    START_SECTIONS,
    cleanOcrLine,
    detectFixedGrid,
    occupiedCells,
    parseTsvLines,
    parseOcrSchedule,
    parseOcrCellLines,
    recognizeTimetableImage,
    terminateWorker
  };
});
