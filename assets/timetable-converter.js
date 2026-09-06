(function () {
  'use strict';

  const parser = window.SYUCTTimetableParser;
  const codec = window.SYUCTTimetableCodec;
  const ocr = window.SYUCTTimetableOCR;
  const graduatePdfParser = window.SYUCTGraduateTimetablePDF;
  if (!parser || !codec) return;

  const weekdayNames = ['', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  const weekTypeNames = { all: '', odd: ' · 单周', even: ' · 双周' };
  const rawInput = document.getElementById('rawTimetable');
  const recognizeBtn = document.getElementById('recognizeBtn');
  const textSourceTab = document.getElementById('textSourceTab');
  const imageSourceTab = document.getElementById('imageSourceTab');
  const pdfSourceTab = document.getElementById('pdfSourceTab');
  const textSourcePanel = document.getElementById('textSourcePanel');
  const imageSourcePanel = document.getElementById('imageSourcePanel');
  const pdfSourcePanel = document.getElementById('pdfSourcePanel');
  const ocrImageInput = document.getElementById('ocrImageInput');
  const ocrFileMeta = document.getElementById('ocrFileMeta');
  const ocrCanvas = document.getElementById('ocrCanvas');
  const ocrRecognizeBtn = document.getElementById('ocrRecognizeBtn');
  const ocrProgressBox = document.getElementById('ocrProgressBox');
  const ocrProgress = document.getElementById('ocrProgress');
  const ocrProgressLabel = document.getElementById('ocrProgressLabel');
  const ocrProgressValue = document.getElementById('ocrProgressValue');
  const graduatePdfInput = document.getElementById('graduatePdfInput');
  const graduatePdfMeta = document.getElementById('graduatePdfMeta');
  const graduatePdfRecognizeBtn = document.getElementById('graduatePdfRecognizeBtn');
  const graduatePdfProgressBox = document.getElementById('graduatePdfProgressBox');
  const graduatePdfProgress = document.getElementById('graduatePdfProgress');
  const graduatePdfProgressLabel = document.getElementById('graduatePdfProgressLabel');
  const graduatePdfProgressValue = document.getElementById('graduatePdfProgressValue');
  const statusBox = document.getElementById('recognizeStatus');
  const statusTitle = document.getElementById('recognizeStatusTitle');
  const statusMessage = document.getElementById('recognizeStatusMessage');
  const resultPanel = document.getElementById('recognizeResult');
  const arrangementCount = document.getElementById('arrangementCount');
  const uniqueCourseCount = document.getElementById('uniqueCourseCount');
  const oddCount = document.getElementById('oddCount');
  const evenCount = document.getElementById('evenCount');
  const practiceNotice = document.getElementById('practiceNotice');
  const resultGuideTitle = document.getElementById('resultGuideTitle');
  const resultGuideMessage = document.getElementById('resultGuideMessage');
  const coursePreviewTitle = document.getElementById('coursePreviewTitle');
  const ocrReviewPanel = document.getElementById('ocrReviewPanel');
  const ocrReviewConfirm = document.getElementById('ocrReviewConfirm');
  const ocrReviewHint = document.getElementById('ocrReviewHint');
  const ocrRawDetails = document.getElementById('ocrRawDetails');
  const ocrRawOutput = document.getElementById('ocrRawOutput');
  const rawDetailsSummary = document.getElementById('rawDetailsSummary');
  const reviewConfirmLabel = document.getElementById('reviewConfirmLabel');
  const previewList = document.getElementById('coursePreview');
  const workflowSteps = Array.from(document.querySelectorAll('[data-workflow-step]'));
  const semesterInput = document.getElementById('semester');
  const firstWeekDateInput = document.getElementById('firstWeekDate');
  const totalWeeksInput = document.getElementById('totalWeeks');
  const generateBtn = document.getElementById('generateBtn');
  const shareCodeOutput = document.getElementById('shareCode');
  const copyBtn = document.getElementById('copyCodeBtn');
  const codeMeta = document.getElementById('codeMeta');

  let parsedResult = null;
  let clipboardHtml = '';
  let selectedImageFile = null;
  let selectedGraduatePdfFile = null;
  let sourceMode = 'image';
  let ocrBusy = false;
  let pdfBusy = false;
  let pdfJsPromise = null;

  const defaultReviewHint = '勾选后即可进入第4步，设置学期并生成课表码。';

  function setWorkflowStep(step) {
    workflowSteps.forEach((item) => {
      const itemStep = Number(item.dataset.workflowStep);
      const done = step > 4 || itemStep < step;
      const active = step <= 4 && itemStep === step;
      item.classList.toggle('is-done', done);
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
  }

  function setStatus(kind, title, message) {
    statusBox.hidden = false;
    statusBox.dataset.kind = kind;
    statusTitle.textContent = title;
    statusMessage.textContent = message || '';
  }

  function clearStatus() {
    statusBox.hidden = true;
    statusBox.dataset.kind = '';
    statusTitle.textContent = '';
    statusMessage.textContent = '';
  }

  function resetGeneratedCode() {
    shareCodeOutput.value = '';
    shareCodeOutput.hidden = true;
    copyBtn.disabled = true;
    codeMeta.textContent = '';
  }

  function resetRecognition() {
    parsedResult = null;
    resultPanel.hidden = true;
    previewList.replaceChildren();
    practiceNotice.hidden = true;
    practiceNotice.textContent = '';
    ocrReviewPanel.hidden = true;
    ocrReviewConfirm.checked = false;
    ocrReviewHint.textContent = defaultReviewHint;
    ocrRawDetails.hidden = true;
    ocrRawDetails.open = false;
    ocrRawOutput.textContent = '';
    ocrProgressBox.hidden = true;
    ocrProgress.value = 0;
    ocrProgressValue.textContent = '0%';
    graduatePdfProgressBox.hidden = true;
    graduatePdfProgress.value = 0;
    graduatePdfProgressValue.textContent = '0%';
    generateBtn.disabled = true;
    resetGeneratedCode();
    clearStatus();
    setWorkflowStep(1);
  }

  function isOcrResult() {
    return Boolean(parsedResult && /^image-ocr/.test(parsedResult.meta.sourceFormat || ''));
  }

  function isGraduatePdfResult() {
    return Boolean(parsedResult && /^graduate-pdf/.test(parsedResult.meta.sourceFormat || ''));
  }

  function requiresReview() {
    return isOcrResult() || isGraduatePdfResult();
  }

  function updateSummary() {
    if (!parsedResult) return;
    const courses = parsedResult.courses;
    const uniqueNames = new Set(courses.map((course) => course.name).filter(Boolean));
    parsedResult.meta.arrangementCount = courses.length;
    parsedResult.meta.uniqueCourseCount = uniqueNames.size;
    parsedResult.meta.oddCount = courses.filter((course) => course.weekType === 'odd').length;
    parsedResult.meta.evenCount = courses.filter((course) => course.weekType === 'even').length;
    parsedResult.meta.maxEndWeek = courses.reduce((max, course) => Math.max(max, Number(course.endWeek) || 0), 0);
    arrangementCount.textContent = String(parsedResult.meta.arrangementCount);
    uniqueCourseCount.textContent = String(parsedResult.meta.uniqueCourseCount);
    oddCount.textContent = String(parsedResult.meta.oddCount);
    evenCount.textContent = String(parsedResult.meta.evenCount);
  }

  function updateGenerateAvailability() {
    const structureReady = Boolean(parsedResult && parsedResult.courses.length
      && parsedResult.meta.sourceLikelyComplete && parsedResult.meta.clipboardStructureValid);
    const reviewReady = !requiresReview() || ocrReviewConfirm.checked;
    generateBtn.disabled = !(structureReady && reviewReady);
  }

  function renderStaticCourse(item, course) {
    const name = document.createElement('h3');
    name.textContent = course.name;
    item.appendChild(name);

    const when = document.createElement('p');
    when.className = 'tt-course-when';
    when.textContent = `${weekdayNames[course.weekday]} · ${course.startSection}-${course.endSection}节 · ${course.startWeek}-${course.endWeek}周${weekTypeNames[course.weekType] || ''}`;
    item.appendChild(when);

    const detailParts = [course.teacher, course.room].filter(Boolean);
    if (detailParts.length) {
      const detail = document.createElement('p');
      detail.className = 'tt-course-detail';
      detail.textContent = detailParts.join(' · ');
      item.appendChild(detail);
    }
  }

  function addEditorField(editor, config) {
    const field = document.createElement('div');
    field.className = `tt-edit-field ${config.className || ''}`.trim();
    const label = document.createElement('label');
    label.textContent = config.label;
    field.appendChild(label);

    let control;
    if (config.options) {
      control = document.createElement('select');
      config.options.forEach((option) => {
        const element = document.createElement('option');
        element.value = String(option.value);
        element.textContent = option.label;
        control.appendChild(element);
      });
    } else {
      control = document.createElement('input');
      control.type = config.type || 'text';
      if (config.min != null) control.min = String(config.min);
      if (config.max != null) control.max = String(config.max);
      if (config.maxLength != null) control.maxLength = config.maxLength;
    }
    control.value = String(config.value == null ? '' : config.value);
    control.setAttribute('aria-label', config.label);
    control.addEventListener('input', () => config.onChange(control.value));
    field.appendChild(control);
    editor.appendChild(field);
  }

  function invalidateReview(message) {
    ocrReviewConfirm.checked = false;
    ocrReviewHint.textContent = message || '内容已修改，请继续核对；全部无误后再勾选确认。';
    setWorkflowStep(3);
    updateGenerateAvailability();
    resetGeneratedCode();
    if (requiresReview()) setStatus('warning', '识别结果尚未确认', '课程信息有改动，请继续核对，并在全部无误后重新确认。');
  }

  function handleOcrEdit(course, field, value) {
    const numericFields = new Set(['weekday', 'startSection', 'endSection', 'startWeek', 'endWeek']);
    course[field] = numericFields.has(field) ? Number(value) : value;
    course.ocrEdited = true;
    updateSummary();
    invalidateReview();
  }

  function renderEditableCourse(item, course, index) {
    const issues = Array.isArray(course.ocrIssues) ? course.ocrIssues : [];
    item.dataset.ocrWarning = issues.length ? 'true' : 'false';

    const summary = document.createElement('summary');
    summary.className = 'tt-course-card-summary';
    const summaryCopy = document.createElement('span');
    summaryCopy.className = 'tt-course-card-summary-copy';
    const summaryName = document.createElement('strong');
    const summaryMeta = document.createElement('small');
    summaryCopy.append(summaryName, summaryMeta);
    const summaryBadge = document.createElement('span');
    summaryBadge.className = 'tt-course-summary-badge';
    summary.append(summaryCopy, summaryBadge);
    item.appendChild(summary);

    function refreshSummary() {
      summaryName.textContent = course.name || '未填写课程名称';
      summaryMeta.textContent = `${weekdayNames[course.weekday] || '星期待定'} · ${course.startSection || '?'}-${course.endSection || '?'}节 · ${course.startWeek || '?'}-${course.endWeek || '?'}周${weekTypeNames[course.weekType] || ''}`;
      summaryBadge.textContent = issues.length ? '需核对' : (course.ocrEdited ? '已修改' : '查看修改');
    }
    refreshSummary();

    const editor = document.createElement('div');
    editor.className = 'tt-course-editor';
    const change = (field) => (value) => {
      handleOcrEdit(course, field, value);
      refreshSummary();
    };

    addEditorField(editor, { label: '课程名称', value: course.name, maxLength: 120, className: 'tt-edit-wide', onChange: change('name') });
    addEditorField(editor, { label: '教师', value: course.teacher, maxLength: 80, className: 'tt-edit-half', onChange: change('teacher') });
    addEditorField(editor, { label: '教室', value: course.room, maxLength: 120, className: 'tt-edit-half', onChange: change('room') });
    addEditorField(editor, {
      label: '星期', value: course.weekday, className: 'tt-edit-third', onChange: change('weekday'),
      options: weekdayNames.slice(1).map((label, optionIndex) => ({ value: optionIndex + 1, label }))
    });
    addEditorField(editor, { label: '开始节次', value: course.startSection, type: 'number', min: 1, max: 12, className: 'tt-edit-third', onChange: change('startSection') });
    addEditorField(editor, { label: '结束节次', value: course.endSection, type: 'number', min: 1, max: 12, className: 'tt-edit-third', onChange: change('endSection') });
    addEditorField(editor, { label: '开始周', value: course.startWeek, type: 'number', min: 1, max: 30, className: 'tt-edit-third', onChange: change('startWeek') });
    addEditorField(editor, { label: '结束周', value: course.endWeek, type: 'number', min: 1, max: 30, className: 'tt-edit-third', onChange: change('endWeek') });
    addEditorField(editor, {
      label: '周次规则', value: course.weekType, className: 'tt-edit-third', onChange: change('weekType'),
      options: [{ value: 'all', label: '每周' }, { value: 'odd', label: '单周' }, { value: 'even', label: '双周' }]
    });

    if (issues.length) {
      const warning = document.createElement('p');
      warning.className = 'tt-ocr-issues';
      warning.textContent = `需要核对：${issues.join('；')}`;
      editor.appendChild(warning);
    }

    const actions = document.createElement('div');
    actions.className = 'tt-course-editor-actions';
    const confidence = document.createElement('small');
    confidence.textContent = isGraduatePdfResult()
      ? 'PDF 文字层解析'
      : (course.ocrConfidence ? `OCR 置信度约 ${course.ocrConfidence}%` : 'OCR 置信度未知');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'tt-course-remove';
    remove.textContent = '删除这条';
    remove.addEventListener('click', () => {
      parsedResult.courses.splice(index, 1);
      parsedResult.courses.forEach((entry, colorIndex) => { entry.colorIndex = colorIndex % 6; });
      updateSummary();
      renderPreview(parsedResult.courses, true);
      invalidateReview('已删除一条课程，请重新确认剩余课程数量和内容。');
    });
    actions.append(confidence, remove);
    editor.appendChild(actions);
    item.appendChild(editor);
  }

  function renderPreview(courses, editable) {
    previewList.replaceChildren();
    courses.forEach((course, index) => {
      const item = document.createElement(editable ? 'details' : 'article');
      item.className = 'tt-course-card';
      if (editable) renderEditableCourse(item, course, index);
      else renderStaticCourse(item, course);
      previewList.appendChild(item);
    });
  }

  function renderRawSource(meta) {
    const cells = Array.isArray(meta.rawCells) ? meta.rawCells : [];
    ocrRawOutput.textContent = cells.map((cell) => {
      const page = cell.pageNumber ? `第${cell.pageNumber}页 · ` : '';
      const endSection = cell.endSection || cell.startSection + 1;
      const heading = `${page}${weekdayNames[cell.weekday]} · 第${cell.startSection}-${endSection}节 · 提取${cell.parsedCount}条`;
      return `${heading}\n${cell.lines.join('\n') || '（未识别到文字）'}`;
    }).join('\n\n');
    ocrRawDetails.hidden = !cells.length;
  }

  function applyParsedResult(result, editable) {
    parsedResult = result;
    updateSummary();
    renderPreview(result.courses, editable);
    resultPanel.hidden = false;
    ocrReviewPanel.hidden = !editable;
    ocrReviewConfirm.checked = false;
    ocrReviewHint.textContent = defaultReviewHint;
    if (editable) {
      const pdfResult = isGraduatePdfResult();
      resultGuideTitle.textContent = '核对并修改识别结果';
      resultGuideMessage.textContent = pdfResult
        ? '点击课程卡片展开编辑，核对课程名、教师、教室、星期、节次和周次。'
        : '点击课程卡片展开编辑，对照原图检查课程名、教师、教室、星期、节次和周次。';
      coursePreviewTitle.textContent = '课程列表（点击展开修改）';
      reviewConfirmLabel.textContent = pdfResult
        ? '我已对照研究生课表，逐条核对并修正全部课程'
        : '我已对照原图，逐条核对并修正全部课程';
      rawDetailsSummary.textContent = pdfResult ? '查看 PDF 分格原文' : '查看 OCR 分格原文';
      renderRawSource(result.meta);
    }
    else {
      resultGuideTitle.textContent = '核对课程预览';
      resultGuideMessage.textContent = '检查课程数量、星期和节次；确认无误后直接进入第4步设置并生成。';
      coursePreviewTitle.textContent = '课程预览';
      ocrRawDetails.hidden = true;
      ocrRawOutput.textContent = '';
    }

    if (result.semester && !semesterInput.value.trim()) semesterInput.value = result.semester;

    if (result.meta.practiceNames && result.meta.practiceNames.length) {
      practiceNotice.hidden = false;
      practiceNotice.textContent = `检测到无固定星期、节次的实践课：${result.meta.practiceNames.join('、')}。本版只提示，不加入正常周课表。`;
    } else {
      practiceNotice.hidden = true;
      practiceNotice.textContent = '';
    }
    updateGenerateAvailability();
    setWorkflowStep(2);
  }

  function recognizeText() {
    resetGeneratedCode();
    try {
      const result = parser.parseCampusTimetable(rawInput.value, { html: clipboardHtml });
      applyParsedResult(result, false);

      if (!result.meta.sourceLikelyComplete) {
        setStatus('warning', '识别结果可能不完整', '没有确认复制到晚间课表末尾。请回到校园网页，选择完整课表后重新复制；为避免漏课，当前不允许生成课表码。');
        return;
      }

      if (!result.meta.clipboardStructureValid) {
        setStatus('warning', '星期列未通过校验', '未检测到校园网页原始纯文本的 7 个星期槽结构。请直接从教务处网页复制完整课表后粘贴，不要经过聊天软件或文档转换；当前不允许生成课表码。');
        return;
      }

      const structureMessage = result.meta.sourceFormat === 'clipboard-html-structure'
        ? `浏览器剪贴板中的课表表格结构校验通过：已确认周一到周日 ${result.meta.weekdaySlotCount} 列。`
        : `纯文本课表结构校验通过：${result.meta.validatedSectionRows} 个节次行均还原为周一到周日 ${result.meta.weekdaySlotCount} 个星期槽。`;
      setStatus('success', '星期列校验通过', `${structureMessage} 共识别 ${result.meta.arrangementCount} 个上课安排、${result.meta.uniqueCourseCount} 门不同课程，请核对下方预览后再生成。`);
      setWorkflowStep(4);
    } catch (error) {
      parsedResult = null;
      resultPanel.hidden = true;
      generateBtn.disabled = true;
      setStatus('error', '没有完成识别', error && error.message ? error.message : '课表格式无法识别，请重新复制完整课表。');
    }
  }

  function setOcrProgress(value, label) {
    const progress = Math.min(1, Math.max(0, Number(value) || 0));
    ocrProgressBox.hidden = false;
    ocrProgress.value = progress;
    ocrProgress.textContent = `${Math.round(progress * 100)}%`;
    ocrProgressLabel.textContent = label || '正在识别课表截图';
    ocrProgressValue.textContent = `${Math.round(progress * 100)}%`;
  }

  function updateBusyControls() {
    const busy = ocrBusy || pdfBusy;
    textSourceTab.disabled = busy;
    imageSourceTab.disabled = busy || !ocr;
    pdfSourceTab.disabled = busy || !graduatePdfParser;
    ocrImageInput.disabled = busy;
    graduatePdfInput.disabled = busy;
    ocrRecognizeBtn.disabled = busy || !selectedImageFile;
    graduatePdfRecognizeBtn.disabled = busy || !selectedGraduatePdfFile;
    ocrRecognizeBtn.textContent = ocrBusy ? '正在识别…' : '开始识别截图';
    graduatePdfRecognizeBtn.textContent = pdfBusy ? '正在读取…' : '读取研究生课表';
  }

  function setOcrBusy(busy) {
    ocrBusy = busy;
    updateBusyControls();
  }

  function setPdfBusy(busy) {
    pdfBusy = busy;
    updateBusyControls();
  }

  async function previewImage(file) {
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = reject;
        element.src = url;
      });
      const maxWidth = 920;
      const scale = Math.min(1, maxWidth / image.naturalWidth);
      ocrCanvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      ocrCanvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      ocrCanvas.getContext('2d').drawImage(image, 0, 0, ocrCanvas.width, ocrCanvas.height);
      ocrCanvas.hidden = false;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function handleImageSelection() {
    const file = ocrImageInput.files && ocrImageInput.files[0];
    selectedImageFile = null;
    resetRecognition();
    ocrProgressBox.hidden = true;
    if (!file) {
      ocrCanvas.hidden = true;
      ocrRecognizeBtn.disabled = true;
      ocrFileMeta.textContent = '支持 PNG、JPG、WebP，最大 20 MB。';
      return;
    }
    if (file.size > 20 * 1024 * 1024 || (file.type && !/^image\/(?:png|jpeg|webp)$/.test(file.type))) {
      ocrCanvas.hidden = true;
      ocrRecognizeBtn.disabled = true;
      setStatus('error', '图片无法使用', '仅支持 20 MB 以内的 PNG、JPG 或 WebP 图片。');
      return;
    }
    try {
      await previewImage(file);
      selectedImageFile = file;
      ocrFileMeta.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
      ocrRecognizeBtn.disabled = false;
    } catch (error) {
      ocrCanvas.hidden = true;
      setStatus('error', '图片无法读取', '请换用 PNG 或 JPG 原图后重试。');
    }
  }

  async function recognizeImage() {
    if (!selectedImageFile || ocrBusy || pdfBusy) return;
    if (!ocr) {
      setStatus('error', '截图识别模块未加载', '请刷新页面后重试；文本粘贴功能仍可正常使用。');
      return;
    }
    resetRecognition();
    setOcrBusy(true);
    setOcrProgress(0, '正在读取图片');
    setStatus('warning', '正在本地识别截图', '首次使用会下载并缓存 OCR 核心与中文模型，图片不会上传。');
    try {
      const result = await ocr.recognizeTimetableImage(selectedImageFile, {
        previewCanvas: ocrCanvas,
        defaultEndWeek: Number(totalWeeksInput.value) || 20,
        onProgress(message) {
          setOcrProgress(message.progress, message.label);
        }
      });
      applyParsedResult(result, true);
      const uncertain = result.meta.uncertainCount || 0;
      setStatus('warning', '截图 OCR 已完成，尚未确认', `已定位周一至周日 7 列和第1至第10节，提取 ${result.meta.arrangementCount} 个上课安排。其中 ${uncertain} 条含不确定字段，请逐条修改并勾选“我已核对”后再生成课表码。`);
    } catch (error) {
      parsedResult = null;
      resultPanel.hidden = true;
      generateBtn.disabled = true;
      setStatus('error', '截图识别未完成', error && error.message ? error.message : '请上传包含完整表头、左右边框和第1至第10节的清晰原图。');
    } finally {
      setOcrBusy(false);
    }
  }

  function setGraduatePdfProgress(value, label) {
    const progress = Math.min(1, Math.max(0, Number(value) || 0));
    graduatePdfProgressBox.hidden = false;
    graduatePdfProgress.value = progress;
    graduatePdfProgress.textContent = `${Math.round(progress * 100)}%`;
    graduatePdfProgressLabel.textContent = label || '正在读取研究生课表';
    graduatePdfProgressValue.textContent = `${Math.round(progress * 100)}%`;
  }

  async function loadLocalPdfJs() {
    if (!pdfJsPromise) {
      const moduleUrl = new URL('assets/pdfjs/pdf.min.js?rev=6.2.108-import1', document.baseURI).href;
      pdfJsPromise = import(moduleUrl).then((pdfjsLib) => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'assets/pdfjs/pdf.worker.min.js?rev=6.2.108-import1',
          document.baseURI
        ).href;
        return pdfjsLib;
      }).catch((error) => {
        pdfJsPromise = null;
        throw error;
      });
    }
    return pdfJsPromise;
  }

  async function handleGraduatePdfSelection() {
    const file = graduatePdfInput.files && graduatePdfInput.files[0];
    selectedGraduatePdfFile = null;
    resetRecognition();
    if (!file) {
      graduatePdfMeta.textContent = '支持 PDF，最大 20 MB、8 页以内。';
      updateBusyControls();
      return;
    }
    const pdfType = !file.type || file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
    if (!pdfType || file.size > 20 * 1024 * 1024) {
      setStatus('error', '文件无法使用', '请选择 20 MB 以内、由研究生系统“打印课表”生成的 PDF。');
      updateBusyControls();
      return;
    }
    selectedGraduatePdfFile = file;
    graduatePdfMeta.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    updateBusyControls();
  }

  async function extractGraduatePdfPages(file) {
    setGraduatePdfProgress(0.06, '正在读取文件');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const signature = String.fromCharCode.apply(null, Array.from(bytes.slice(0, 5)));
    if (signature !== '%PDF-') throw new Error('文件不是有效的 PDF');

    setGraduatePdfProgress(0.12, '正在加载本地 PDF 组件');
    const pdfjsLib = await loadLocalPdfJs();
    const loadingTask = pdfjsLib.getDocument({
      data: bytes,
      cMapUrl: new URL('assets/pdfjs/cmaps/', document.baseURI).href,
      cMapPacked: true,
      iccUrl: new URL('assets/pdfjs/iccs/', document.baseURI).href,
      standardFontDataUrl: new URL('assets/pdfjs/standard_fonts/', document.baseURI).href,
      wasmUrl: new URL('assets/pdfjs/wasm/', document.baseURI).href,
      enableXfa: true,
      isEvalSupported: false
    });
    loadingTask.onProgress = ({ loaded, total }) => {
      const fraction = total ? loaded / total : 0.5;
      setGraduatePdfProgress(0.14 + Math.min(1, fraction) * 0.24, '正在解析 PDF');
    };

    let documentObject;
    try {
      documentObject = await loadingTask.promise;
      if (documentObject.numPages < 1 || documentObject.numPages > 8) {
        throw new Error('PDF 页数异常，请上传 8 页以内的个人课表');
      }
      const pages = [];
      for (let pageNumber = 1; pageNumber <= documentObject.numPages; pageNumber += 1) {
        setGraduatePdfProgress(
          0.4 + ((pageNumber - 1) / documentObject.numPages) * 0.48,
          `正在读取第 ${pageNumber} / ${documentObject.numPages} 页`
        );
        const page = await documentObject.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        pages.push({
          pageNumber,
          width: viewport.width,
          height: viewport.height,
          items: content.items.map((item) => ({
            text: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height
          }))
        });
      }
      return pages;
    } finally {
      if (documentObject) {
        try { await documentObject.destroy(); } catch (error) {}
      } else {
        try { await loadingTask.destroy(); } catch (error) {}
      }
    }
  }

  async function recognizeGraduatePdf() {
    if (!selectedGraduatePdfFile || pdfBusy || ocrBusy) return;
    if (!graduatePdfParser) {
      setStatus('error', '研究生课表模块未加载', '请刷新页面后重试。');
      return;
    }
    resetRecognition();
    setPdfBusy(true);
    setGraduatePdfProgress(0.02, '正在准备 PDF');
    setStatus('warning', '正在本地读取研究生课表', '文件仅在当前浏览器解析，不会上传。');
    try {
      const pages = await extractGraduatePdfPages(selectedGraduatePdfFile);
      setGraduatePdfProgress(0.92, '正在整理课程');
      const result = graduatePdfParser.parseGraduatePdfPages(pages);
      setGraduatePdfProgress(1, '研究生课表读取完成');
      applyParsedResult(result, true);
      const uncertain = result.meta.uncertainCount || 0;
      setStatus('warning', '研究生课表已读取，尚未确认', `已从 ${result.meta.pageCount} 页中读取 ${result.meta.arrangementCount} 个上课安排、${result.meta.uniqueCourseCount} 门课程${uncertain ? `，其中 ${uncertain} 条需要重点核对` : ''}。请核对后确认。`);
    } catch (error) {
      parsedResult = null;
      resultPanel.hidden = true;
      generateBtn.disabled = true;
      const message = error && error.message ? error.message : '请上传研究生系统“打印课表”生成的原始 PDF。';
      setStatus('error', '研究生课表读取失败', /PasswordException/i.test(message) ? '暂不支持带密码的 PDF。' : message);
    } finally {
      setPdfBusy(false);
    }
  }

  function setSourceMode(mode) {
    if (ocrBusy || pdfBusy || mode === sourceMode) return;
    if (!['image', 'pdf', 'text'].includes(mode)) return;
    sourceMode = mode;
    const tabs = { image: imageSourceTab, pdf: pdfSourceTab, text: textSourceTab };
    const panels = { image: imageSourcePanel, pdf: pdfSourcePanel, text: textSourcePanel };
    Object.keys(tabs).forEach((key) => {
      const active = key === mode;
      tabs[key].setAttribute('aria-selected', String(active));
      panels[key].hidden = !active;
    });
    resetRecognition();
  }

  function parseDateOnly(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date;
  }

  function validateSettings() {
    const totalWeeks = Number(totalWeeksInput.value);
    if (!Number.isInteger(totalWeeks) || totalWeeks < 1 || totalWeeks > 30) throw new Error('学期总周数必须填写 1-30 的整数');
    const firstWeekDate = String(firstWeekDateInput.value || '').trim();
    if (firstWeekDate) {
      const date = parseDateOnly(firstWeekDate);
      if (!date) throw new Error('第一周周一日期无效');
      if (date.getUTCDay() !== 1) throw new Error('“第一周的周一”请选择星期一；不确定时可以留空');
    }
    return {
      semester: String(semesterInput.value || '').trim(),
      firstWeekDate,
      totalWeeks
    };
  }

  function generateCode() {
    if (!parsedResult || !parsedResult.meta.sourceLikelyComplete || !parsedResult.meta.clipboardStructureValid) {
      setStatus('error', '暂不能生成课表码', '请先完成课表导入，并通过完整结构校验。');
      return;
    }
    if (requiresReview() && !ocrReviewConfirm.checked) {
      setStatus('warning', '请先核对识别结果', '逐条检查课程信息后，勾选确认项再生成课表码。');
      return;
    }
    try {
      const settings = validateSettings();
      const code = codec.encodeShareCode({ settings, courses: parsedResult.courses });
      shareCodeOutput.value = code;
      shareCodeOutput.hidden = false;
      copyBtn.disabled = false;
      codeMeta.textContent = `已生成 SYUCT-TT2 · ${parsedResult.courses.length} 个上课安排 · ${code.length} 个字符`;
      setStatus('success', '课表码已生成', '核对无误后复制完整课表码，通过微信发送，并在 SYUCT-mini 的课表导入功能中粘贴导入。');
      setWorkflowStep(5);
      shareCodeOutput.focus({ preventScroll: true });
      shareCodeOutput.select();
    } catch (error) {
      resetGeneratedCode();
      setStatus('error', '生成失败', error && error.message ? error.message : '请检查学期设置和识别结果。');
    }
  }

  async function copyCode() {
    const code = shareCodeOutput.value;
    if (!code) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        shareCodeOutput.hidden = false;
        shareCodeOutput.focus();
        shareCodeOutput.select();
        const ok = document.execCommand('copy');
        if (!ok) throw new Error('浏览器未允许复制');
      }
      copyBtn.textContent = '已复制';
      setTimeout(() => { copyBtn.textContent = '复制课表码'; }, 1600);
    } catch (error) {
      shareCodeOutput.focus();
      shareCodeOutput.select();
      setStatus('warning', '自动复制失败', '课表码已全选，请使用浏览器复制命令复制。');
    }
  }

  function initMiniProgramQrDialog() {
    const footer = document.querySelector('.tt-footer');
    if (!footer) return;

    const oldLink = Array.from(footer.querySelectorAll('a')).find((item) => {
      const href = item.getAttribute('href') || '';
      const text = item.textContent || '';
      return /github\.com\/SYUCT\/SYUCT-mini/i.test(href) || /SYUCT-mini/i.test(text);
    });
    if (!oldLink) return;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'tt-mini-qr-trigger';
    trigger.textContent = '查看小程序二维码';
    oldLink.replaceWith(trigger);

    const style = document.createElement('style');
    style.textContent = `
      .tt-mini-qr-trigger{appearance:none;padding:0;border:0;background:none;color:var(--primary);font:inherit;font-weight:700;cursor:pointer}
      .tt-mini-qr-trigger:hover{text-decoration:underline}
      .tt-mini-qr-modal{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:24px;background:rgba(5,21,37,.58);backdrop-filter:blur(5px)}
      .tt-mini-qr-dialog{position:relative;width:min(960px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;border:1px solid color-mix(in srgb,var(--primary) 18%,var(--border));border-radius:20px;background:var(--surface);box-shadow:0 24px 70px rgba(0,0,0,.28)}
      .tt-mini-qr-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px;border-bottom:1px solid var(--border)}
      .tt-mini-qr-head strong{font-size:17px}
      .tt-mini-qr-close{display:grid;place-items:center;width:36px;height:36px;flex:0 0 36px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2);color:var(--text);font:inherit;font-size:20px;line-height:1;cursor:pointer}
      .tt-mini-qr-body{padding:16px}
      .tt-mini-qr-image{display:block;width:100%;height:auto;border-radius:14px;background:#eef6ff}
      .tt-mini-qr-note{margin:12px 2px 0;color:var(--muted);font-size:13px;text-align:center}
      @media(max-width:650px){.tt-mini-qr-modal{padding:12px}.tt-mini-qr-dialog{width:100%;max-height:calc(100vh - 24px);border-radius:16px}.tt-mini-qr-head{padding:13px 14px}.tt-mini-qr-body{padding:10px}.tt-mini-qr-image{border-radius:10px}}
    `;
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.className = 'tt-mini-qr-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'ttMiniQrTitle');
    modal.innerHTML = `
      <div class="tt-mini-qr-dialog">
        <div class="tt-mini-qr-head">
          <strong id="ttMiniQrTitle">SYUCT-mini 小程序二维码</strong>
          <button class="tt-mini-qr-close" type="button" aria-label="关闭二维码弹窗">×</button>
        </div>
        <div class="tt-mini-qr-body">
          <img class="tt-mini-qr-image" alt="沈阳化工大学校园指南 SYUCT-mini 小程序二维码宣传图">
          <p class="tt-mini-qr-note">请使用微信扫码进入小程序。</p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.tt-mini-qr-close');
    const image = modal.querySelector('.tt-mini-qr-image');
    let previousFocus = null;

    function openModal() {
      previousFocus = document.activeElement;
      if (!image.getAttribute('src')) image.src = 'assets/optimized/syuct-mini-qr-poster.webp?rev=20260820-opt';
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = '';
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    }

    trigger.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) closeModal();
    });
  }

  initMiniProgramQrDialog();

  rawInput.addEventListener('paste', (event) => {
    const data = event.clipboardData;
    if (!data) return;
    const plainText = data.getData('text/plain');
    if (!plainText) return;

    // textarea 仍然只展示 text/plain；同时保留同一次网页复制附带的 text/html，
    // 仅用于恢复 table 的 rowspan/colspan 和星期列位置，不上传、不展示。
    clipboardHtml = data.getData('text/html') || '';
    event.preventDefault();
    const start = rawInput.selectionStart == null ? rawInput.value.length : rawInput.selectionStart;
    const end = rawInput.selectionEnd == null ? start : rawInput.selectionEnd;
    rawInput.setRangeText(plainText, start, end, 'end');
    resetRecognition();
  });

  recognizeBtn.addEventListener('click', recognizeText);
  textSourceTab.addEventListener('click', () => setSourceMode('text'));
  imageSourceTab.addEventListener('click', () => setSourceMode('image'));
  pdfSourceTab.addEventListener('click', () => setSourceMode('pdf'));
  ocrImageInput.addEventListener('change', handleImageSelection);
  ocrRecognizeBtn.addEventListener('click', recognizeImage);
  graduatePdfInput.addEventListener('change', handleGraduatePdfSelection);
  graduatePdfRecognizeBtn.addEventListener('click', recognizeGraduatePdf);
  ocrReviewConfirm.addEventListener('change', () => {
    updateGenerateAvailability();
    resetGeneratedCode();
    if (ocrReviewConfirm.checked) {
      ocrReviewHint.textContent = '已确认。下一步：填写下方学期信息并生成课表码。';
      setWorkflowStep(4);
      setStatus('success', '识别结果已确认', '现在可以设置学期信息并生成 SYUCT-TT2 课表码。');
    } else if (requiresReview()) {
      ocrReviewHint.textContent = '尚未确认，请逐条核对课程后再次勾选。';
      setWorkflowStep(3);
      setStatus('warning', '识别结果尚未确认', '请逐条核对课程信息后再次确认。');
    }
  });
  generateBtn.addEventListener('click', generateCode);
  copyBtn.addEventListener('click', copyCode);
  rawInput.addEventListener('input', () => {
    clipboardHtml = '';
    resetRecognition();
  });
  [semesterInput, firstWeekDateInput, totalWeeksInput].forEach((input) => input.addEventListener('input', () => {
    resetGeneratedCode();
    if (!generateBtn.disabled) setWorkflowStep(4);
  }));

  if (!ocr) {
    imageSourceTab.disabled = true;
    imageSourceTab.title = '截图 OCR 模块未加载';
    setSourceMode('text');
  }
  if (!graduatePdfParser) {
    pdfSourceTab.disabled = true;
    pdfSourceTab.title = '研究生课表模块未加载';
  }

  updateBusyControls();
  setWorkflowStep(1);
})();
