
const GROUPS = {
  freshman: {
    kicker: "2026 沈阳化工大学新生交流群",
    title: "新生日常交流",
    description: "面向 2026 级新生，交流入学准备、校园日常、经验分享与资料互助。",
    number: "1170264357",
    joinUrl: "https://qm.qq.com/cgi-bin/qm/qr?k=k4MejLno2VYcMGeubi51BjypNsCPlwtX&jump_from=webapi&authKey=xA4RGKIdI7/LxEyfHJTTvqwBwdk+tAfAB21bgbqKN7a97aBQuup0jueG+YyuQs2Y"
  },
  tieba: {
    kicker: "沈阳化工大学百度贴吧官方群",
    title: "贴吧官方交流",
    description: "沈阳化工大学百度贴吧官方群，用于校园日常、经验分享、贴吧话题与校友同学之间的交流。",
    number: "596823406",
    joinUrl: "https://qm.qq.com/cgi-bin/qm/qr?k=1-yS_xMykI6rSUI_3VQFiTeKDvxjNDwO&jump_from=webapi&authKey=8ZCTMMtl00oLMl4UkrtGi4OtHfETNtXZYwTprxqjZUCdMrblDBG2jjxlKZLQj3x/"
  }
};
const SITE = {"desktopName": "沈阳化工大学校园指南（学生共创版）", "mobileName": "沈化大校园指南", "shortName": "SYUCT GUIDE", "repoUrl": "https://github.com/SYUCT/SYUCT-web", "officialUrl": "https://www.syuct.edu.cn/", "nav": [["index.html", "assets/icons/home.svg", "首页"], ["freshman.html", "assets/icons/freshman.svg", "新生入学"], ["map.html", "assets/icons/map.svg", "校园地图"], ["digital.html", "assets/icons/digital.svg", "数字校园"], ["academics.html", "assets/icons/academics.svg", "学业资料"], ["services.html", "assets/icons/services.svg", "办事大厅"], ["campus.html", "assets/icons/campus.svg", "校园生活"], ["community.html", "assets/icons/community.svg", "校园社区"], ["resources.html", "assets/icons/resources.svg", "资料下载"], ["about.html", "assets/icons/about.svg", "关于共建"]], "search": [{"title": "2026 新生报到与军训", "url": "freshman.html#timeline", "text": "9月3日 新生报到 9月5日至18日 军训 9月21日 开始上课"}, {"title": "新生入学指南", "url": "freshman.html#guide", "text": "报到材料 学费住宿 银行卡 数字迎新 新生群"}, {"title": "统一身份认证", "url": "digital.html#identity", "text": "账号激活 企业微信 验证码 单点登录 sso"}, {"title": "WebVPN", "url": "digital.html#webvpn", "text": "校外访问校内资源 webvpn 浏览器 无需客户端"}, {"title": "CARSI 电子资源", "url": "digital.html#carsi", "text": "知网 SCIE ACS RSC Springer 校外访问"}, {"title": "校园地图", "url": "map.html#campus-map", "text": "教学楼 图书馆 食堂 宿舍 体育馆 网羽中心"}, {"title": "体育课专用地图", "url": "map.html#sports-map", "text": "主田径场 东田径场 羽毛球馆 体育馆 网球场"}, {"title": "计算机科学与技术培养方案", "url": "academics.html#plans", "text": "计算机 专业培养方案 课程 学分 物联网 人工智能 大数据"}, {"title": "化学工程与工艺培养方案", "url": "academics.html#plans", "text": "化工 卓越 培养方案 化工原理 化工设计"}, {"title": "高等数学 2 期末真题", "url": "academics.html#exams", "text": "高数 期末 真题 2025 2026"}, {"title": "大学物理 1 期末真题", "url": "academics.html#exams", "text": "物理 期末 真题 2025 2026"}, {"title": "微专业报名", "url": "academics.html#micro-major", "text": "微专业 数据科学 网络安全 智能制造 智能化工"}, {"title": "重修缴费", "url": "services.html#teaching", "text": "中国银行 手机银行 学号 课程号 重修缴费"}, {"title": "查卷申请", "url": "services.html#teaching", "text": "成绩 查卷 申请表 教务"}, {"title": "奖学金申请", "url": "services.html#scholarship", "text": "奖学金 系统 中国银行卡 A考 不及格"}, {"title": "毕业资格自查", "url": "services.html#graduation", "text": "毕业 学位 资格 审查 明细表"}, {"title": "毕业论文模板与查重", "url": "services.html#graduation", "text": "论文 模板 格式 查重 30% 20%"}, {"title": "校园跑与免跑", "url": "campus.html#sports", "text": "校园跑 男生48公里 女生36公里 免测申请"}, {"title": "体质测试评分表", "url": "campus.html#sports", "text": "体测 BMI 肺活量 50米 立定跳远 800米 1000米"}, {"title": "学习通图书借阅", "url": "campus.html#library", "text": "超星学习通 借阅 续借 超期提醒"}, {"title": "全部资料下载", "url": "resources.html", "text": "PDF DOC DOCX XLS XLSX 下载中心 资料目录"}, {"title": "工程管理专业 2025 培养方案", "url": "academics.html#plans", "text": "工程管理 培养方案 工程项目管理 投资 造价 学分"}, {"title": "2026 通识选修建议", "url": "academics.html#electives", "text": "选修课 通识选修 体育课 学生经验"}, {"title": "创新创业竞赛管理与奖励", "url": "academics.html#innovation", "text": "竞赛 A+ A B C D 奖励 资助 认定目录"}, {"title": "开放实验室申请", "url": "academics.html#innovation", "text": "开放实验室 实验项目 申请表"}, {"title": "学籍信息修改", "url": "services.html#teaching", "text": "学信网 姓名 身份证 民族 学籍修改 申请表"}, {"title": "缓考申请", "url": "services.html#teaching", "text": "考试 缓考 任课教师 辅导员 教务处"}, {"title": "教室监控录像回放申请", "url": "services.html#campus-affairs", "text": "录像回放 监控 保卫处 教务处 7至10天"}, {"title": "体育保健课申请", "url": "campus.html#sports", "text": "体育保健课 校医院 申请表"}, {"title": "2026 暑期本科生留校", "url": "campus.html#vacation", "text": "暑假 留校 宿舍 安全 申请"}, {"title": "SYUCT 校园社区", "url": "community.html", "text": "GitHub Discussions 校园社区 社区动态 置顶讨论 最新讨论 问答 投稿 共建"}, {"title": "加入交流群", "url": "about.html#community", "text": "新生交流群 1170264357 贴吧官方群 596823406 QQ 校园交流 投稿 纠错 共建"}]};

const STATIC_RESOURCE_SEARCH = [{"title":"2026 新生入学指南（抢先版）","url":"pdf-viewer.html?file=docs/2026-new-student-guide.pdf&title=2026%20%E6%96%B0%E7%94%9F%E5%85%A5%E5%AD%A6%E6%8C%87%E5%8D%97%EF%BC%88%E6%8A%A2%E5%85%88%E7%89%88%EF%BC%89","text":"新生入学 PDF · 12.1 MB 2026 新生入学指南（抢先版） 新生入学 pdf pdf-viewer.html"},{"title":"统一身份认证使用指南","url":"pdf-viewer.html?file=docs/unified-identity-guide.pdf&title=%E7%BB%9F%E4%B8%80%E8%BA%AB%E4%BB%BD%E8%AE%A4%E8%AF%81%E4%BD%BF%E7%94%A8%E6%8C%87%E5%8D%97","text":"数字校园 PDF · 624.7 KB 统一身份认证使用指南 数字校园 pdf pdf-viewer.html"},{"title":"老乡群汇总表","url":"docs/hometown-groups.xlsx","text":"校园生活 XLSX · 12.3 KB 老乡群汇总表 校园生活 xlsx hometown-groups.xlsx"},{"title":"2026—2027 第一学期选修课一览表","url":"docs/electives-2026-2027.xlsx","text":"学业资料 XLSX · 100.9 KB 2026—2027 第一学期选修课一览表 学业资料 xlsx electives-2026-2027.xlsx"},{"title":"计算机科学与技术专业 2025 培养方案","url":"pdf-viewer.html?file=docs/computer-science-plan-2025.pdf&title=%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%A7%91%E5%AD%A6%E4%B8%8E%E6%8A%80%E6%9C%AF%E4%B8%93%E4%B8%9A%202025%20%E5%9F%B9%E5%85%BB%E6%96%B9%E6%A1%88","text":"培养方案 PDF · 921.1 KB 计算机科学与技术专业 2025 培养方案 培养方案 pdf pdf-viewer.html"},{"title":"化学工程与工艺（卓越）2025 培养方案","url":"pdf-viewer.html?file=docs/chemical-engineering-plan-2025.pdf&title=%E5%8C%96%E5%AD%A6%E5%B7%A5%E7%A8%8B%E4%B8%8E%E5%B7%A5%E8%89%BA%EF%BC%88%E5%8D%93%E8%B6%8A%EF%BC%892025%20%E5%9F%B9%E5%85%BB%E6%96%B9%E6%A1%88","text":"培养方案 PDF · 745.0 KB 化学工程与工艺（卓越）2025 培养方案 培养方案 pdf pdf-viewer.html"},{"title":"信息工程学院 2025 版选修学分要求","url":"docs/info-engineering-electives-2025.docx","text":"学业资料 DOCX · 17.9 KB 信息工程学院 2025 版选修学分要求 学业资料 docx info-engineering-electives-2025.docx"},{"title":"证书代领委托书","url":"docs/certificate-proxy.doc","text":"毕业办事 DOC · 15.0 KB 证书代领委托书 毕业办事 doc certificate-proxy.doc"},{"title":"查卷申请表","url":"docs/exam-review-form.doc","text":"教务办事 DOC · 29.5 KB 查卷申请表 教务办事 doc exam-review-form.doc"},{"title":"普通高等学校毕业生登记表模板","url":"pdf-viewer.html?file=docs/graduate-registration-form.pdf&title=%E6%99%AE%E9%80%9A%E9%AB%98%E7%AD%89%E5%AD%A6%E6%A0%A1%E6%AF%95%E4%B8%9A%E7%94%9F%E7%99%BB%E8%AE%B0%E8%A1%A8%E6%A8%A1%E6%9D%BF","text":"毕业办事 PDF · 93.8 KB 普通高等学校毕业生登记表模板 毕业办事 pdf pdf-viewer.html"},{"title":"入党积极分子报名表","url":"docs/party-activist-form.xls","text":"校园生活 XLS · 15.0 KB 入党积极分子报名表 校园生活 xls party-activist-form.xls"},{"title":"各种代码表","url":"docs/code-tables.xls","text":"办事工具 XLS · 1.5 MB 各种代码表 办事工具 xls code-tables.xls"},{"title":"校园跑免跑申请表","url":"docs/campus-run-exemption.doc","text":"体育健康 DOC · 19.0 KB 校园跑免跑申请表 体育健康 doc campus-run-exemption.doc"},{"title":"非常规选课申请表","url":"docs/special-course-selection-form.doc","text":"教务办事 DOC · 21.5 KB 非常规选课申请表 教务办事 doc special-course-selection-form.doc"},{"title":"本科毕业设计（论文）模板及格式要求","url":"docs/thesis-template-2023.doc","text":"毕业办事 DOC · 431.8 KB 本科毕业设计（论文）模板及格式要求 毕业办事 doc thesis-template-2023.doc"},{"title":"2025—2026（2）高等数学 2 期末真题","url":"pdf-viewer.html?file=docs/calculus-2-final-2025-2026.pdf&title=2025%E2%80%942026%EF%BC%882%EF%BC%89%E9%AB%98%E7%AD%89%E6%95%B0%E5%AD%A6%202%20%E6%9C%9F%E6%9C%AB%E7%9C%9F%E9%A2%98","text":"课程真题 PDF · 1.5 MB 2025—2026（2）高等数学 2 期末真题 课程真题 pdf pdf-viewer.html"},{"title":"2025—2026（2）大学物理 1 期末真题","url":"pdf-viewer.html?file=docs/physics-1-final-2025-2026.pdf&title=2025%E2%80%942026%EF%BC%882%EF%BC%89%E5%A4%A7%E5%AD%A6%E7%89%A9%E7%90%86%201%20%E6%9C%9F%E6%9C%AB%E7%9C%9F%E9%A2%98","text":"课程真题 PDF · 3.8 MB 2025—2026（2）大学物理 1 期末真题 课程真题 pdf pdf-viewer.html"},{"title":"沈阳化工大学学生管理规定","url":"pdf-viewer.html?file=docs/student-regulations.pdf&title=%E6%B2%88%E9%98%B3%E5%8C%96%E5%B7%A5%E5%A4%A7%E5%AD%A6%E5%AD%A6%E7%94%9F%E7%AE%A1%E7%90%86%E8%A7%84%E5%AE%9A","text":"规章制度 PDF · 228.0 KB 沈阳化工大学学生管理规定 规章制度 pdf pdf-viewer.html"},{"title":"2026—2027 学年度第一学期校历","url":"pdf-viewer.html?file=docs/calendar-2026-2027.pdf&title=2026%E2%80%942027%20%E5%AD%A6%E5%B9%B4%E5%BA%A6%E7%AC%AC%E4%B8%80%E5%AD%A6%E6%9C%9F%E6%A0%A1%E5%8E%86","text":"校园生活 PDF · 47.4 KB 2026—2027 学年度第一学期校历 校园生活 pdf pdf-viewer.html 校历 日历 学期日期 开学 放假 军训"},{"title":"校园无线网络新旧系统切换通知","url":"docs/wifi7-transition-notice.docx","text":"数字校园 DOCX · 10.9 KB 校园无线网络新旧系统切换通知 数字校园 docx wifi7-transition-notice.docx"},{"title":"重修缴费流程","url":"pdf-viewer.html?file=docs/repeat-course-payment.pdf&title=%E9%87%8D%E4%BF%AE%E7%BC%B4%E8%B4%B9%E6%B5%81%E7%A8%8B","text":"教务办事 PDF · 3.1 MB 重修缴费流程 教务办事 pdf pdf-viewer.html"},{"title":"毕业与学位资格学生自查操作说明","url":"docs/graduation-self-check.docx","text":"毕业办事 DOCX · 1.3 MB 毕业与学位资格学生自查操作说明 毕业办事 docx graduation-self-check.docx"},{"title":"假期如何在校外访问电子资源","url":"docs/off-campus-e-resources.docx","text":"数字校园 DOCX · 780.5 KB 假期如何在校外访问电子资源 数字校园 docx off-campus-e-resources.docx"},{"title":"超星学习通查看借阅及超期信息说明","url":"docs/chaoxing-library-guide.docx","text":"图书馆 DOCX · 903.6 KB 超星学习通查看借阅及超期信息说明 图书馆 docx chaoxing-library-guide.docx"},{"title":"2026 届毕业论文查重检测通知","url":"docs/thesis-plagiarism-check-2026.docx","text":"毕业办事 DOCX · 18.0 KB 2026 届毕业论文查重检测通知 毕业办事 docx thesis-plagiarism-check-2026.docx"},{"title":"2026 年微专业报名通知","url":"pdf-viewer.html?file=docs/micro-majors-2026.pdf&title=2026%20%E5%B9%B4%E5%BE%AE%E4%B8%93%E4%B8%9A%E6%8A%A5%E5%90%8D%E9%80%9A%E7%9F%A5","text":"学业资料 PDF · 10.5 MB 2026 年微专业报名通知 学业资料 pdf pdf-viewer.html"},{"title":"大学生体质测试单项指标评分表","url":"pdf-viewer.html?file=docs/physical-fitness-score-tables.pdf&title=%E5%A4%A7%E5%AD%A6%E7%94%9F%E4%BD%93%E8%B4%A8%E6%B5%8B%E8%AF%95%E5%8D%95%E9%A1%B9%E6%8C%87%E6%A0%87%E8%AF%84%E5%88%86%E8%A1%A8","text":"体育健康 PDF · 175.7 KB 大学生体质测试单项指标评分表 体育健康 pdf pdf-viewer.html"},{"title":"体育、选修推荐 v1.2（学生经验）","url":"pdf-viewer.html?file=docs/pe-electives-experience.pdf&title=%E4%BD%93%E8%82%B2%E3%80%81%E9%80%89%E4%BF%AE%E6%8E%A8%E8%8D%90%20v1.2%EF%BC%88%E5%AD%A6%E7%94%9F%E7%BB%8F%E9%AA%8C%EF%BC%89","text":"学生经验 PDF · 468.7 KB 体育、选修推荐 v1.2（学生经验） 学生经验 pdf pdf-viewer.html"},{"title":"WebVPN 系统使用指南","url":"pdf-viewer.html?file=docs/webvpn-guide.pdf&title=WebVPN%20%E7%B3%BB%E7%BB%9F%E4%BD%BF%E7%94%A8%E6%8C%87%E5%8D%97","text":"数字校园 PDF · 769.4 KB webvpn 系统使用指南 数字校园 pdf pdf-viewer.html"},{"title":"CARSI 服务使用方法","url":"pdf-viewer.html?file=docs/carsi-guide.pdf&title=CARSI%20%E6%9C%8D%E5%8A%A1%E4%BD%BF%E7%94%A8%E6%96%B9%E6%B3%95","text":"数字校园 PDF · 498.1 KB carsi 服务使用方法 数字校园 pdf pdf-viewer.html"},{"title":"奖学金申请系统使用说明","url":"docs/scholarship-application-guide.docx","text":"奖助办事 DOCX · 322.4 KB 奖学金申请系统使用说明 奖助办事 docx scholarship-application-guide.docx"},{"title":"工程管理专业 2025 培养方案","url":"docs/engineering-management-plan-2025.docx","text":"培养方案 DOCX · 508.2 KB 工程管理专业 2025 培养方案 培养方案 docx 课程 学分 工程项目管理 造价 engineering-management-plan-2025.docx"},{"title":"2026 通识选修建议（学生经验）","url":"pdf-viewer.html?file=docs/elective-recommendations-2026.pdf&title=2026%20%E9%80%9A%E8%AF%86%E9%80%89%E4%BF%AE%E5%BB%BA%E8%AE%AE%EF%BC%88%E5%AD%A6%E7%94%9F%E7%BB%8F%E9%AA%8C%EF%BC%89","text":"学生经验 PDF · 1.2 MB 2026 通识选修建议（学生经验） 学生经验 pdf 选课 体育 通识 pdf-viewer.html"},{"title":"创新创业竞赛管理与奖励办法补充修订（2025）","url":"pdf-viewer.html?file=docs/competition-management-supplement-2025.pdf&title=%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E7%AB%9E%E8%B5%9B%E7%AE%A1%E7%90%86%E4%B8%8E%E5%A5%96%E5%8A%B1%E5%8A%9E%E6%B3%95%E8%A1%A5%E5%85%85%E4%BF%AE%E8%AE%A2%EF%BC%882025%EF%BC%89","text":"创新竞赛 PDF · 217.7 KB 创新创业竞赛管理与奖励办法补充修订（2025） 创新竞赛 pdf 竞赛目录 资助 奖励 pdf-viewer.html"},{"title":"创新创业竞赛管理与奖励办法（2024）","url":"pdf-viewer.html?file=docs/competition-management-reward-2024.pdf&title=%E5%88%9B%E6%96%B0%E5%88%9B%E4%B8%9A%E7%AB%9E%E8%B5%9B%E7%AE%A1%E7%90%86%E4%B8%8E%E5%A5%96%E5%8A%B1%E5%8A%9E%E6%B3%95%EF%BC%882024%EF%BC%89","text":"创新竞赛 PDF · 194.3 KB 创新创业竞赛管理与奖励办法（2024） 创新竞赛 pdf 竞赛目录 奖励标准 pdf-viewer.html"},{"title":"学生进入开放实验室申请表","url":"docs/open-lab-application.doc","text":"创新竞赛 DOC · 33.0 KB 学生进入开放实验室申请表 创新竞赛 doc 实验 项目 open-lab-application.doc"},{"title":"学信网学籍信息修改申请表（2020 版）","url":"docs/student-record-change-application-2020.docx","text":"教务办事 DOCX · 14.8 KB 学信网学籍信息修改申请表（2020 版） 教务办事 docx 姓名 身份证 民族 student-record-change-application-2020.docx"},{"title":"缓考审批表","url":"docs/deferred-exam-application.doc","text":"教务办事 DOC · 34.0 KB 缓考审批表 教务办事 doc 考试 缓考 deferred-exam-application.doc"},{"title":"回放教室监控录像申请表","url":"docs/classroom-video-review-application.docx","text":"校园办事 DOCX · 15.6 KB 回放教室监控录像申请表 校园办事 docx 保卫处 教务处 监控 classroom-video-review-application.docx"},{"title":"体育保健课修读申请表","url":"docs/pe-health-course-application.docx","text":"体育健康 DOCX · 13.0 KB 体育保健课修读申请表 体育健康 docx 体育课 校医院 pe-health-course-application.docx"},{"title":"2026 年暑期本科生留校工作方案","url":"pdf-viewer.html?file=docs/summer-campus-stay-2026.pdf&title=2026%20%E5%B9%B4%E6%9A%91%E6%9C%9F%E6%9C%AC%E7%A7%91%E7%94%9F%E7%95%99%E6%A0%A1%E5%B7%A5%E4%BD%9C%E6%96%B9%E6%A1%88","text":"校园生活 PDF · 108.3 KB 2026 年暑期本科生留校工作方案 校园生活 pdf 暑假 宿舍 安全 pdf-viewer.html"}];
let SEARCH_INDEX = mergeSearchItems([...SITE.search, ...STATIC_RESOURCE_SEARCH]);
let resourceSearchLoaded = false;
const MOBILE_TITLE_MEDIA = window.matchMedia ? window.matchMedia("(max-width: 650px)") : null;

function updateResponsiveTitle(){
  const mobile=MOBILE_TITLE_MEDIA ? MOBILE_TITLE_MEDIA.matches : window.innerWidth<=650;
  const siteName=mobile?SITE.mobileName:SITE.desktopName;
  const current=document.title.split(" · ")[0]||"首页";
  document.title=`${current} · ${siteName}`;
}
function pageName(){
  const path = location.pathname.split("/").pop();
  return path || "index.html";
}
function renderChrome(){
  const current = pageName();
  const topbar = document.getElementById("topbar");
  const sidebar = document.getElementById("sidebar");
  if(!topbar || !sidebar) return;
  // 页面已经包含可直接显示的顶部导航。仅在标记缺失时回退到 JS 渲染，
  // 避免 DOMContentLoaded 后重复销毁并重建整条导航造成额外布局与绘制。
  if(!topbar.querySelector("#menuBtn") || !topbar.querySelector(".brand")){
    topbar.innerHTML = `
      <button class="icon-btn menu-btn" id="menuBtn" aria-label="打开菜单">☰</button>
      <a class="brand" href="index.html" aria-label="返回首页">
        <span class="brand-mark brand-mark-logo"><img src="assets/optimized/syuct-community-icon.webp" alt="沈化校园指南学生共创图标" width="96" height="96" decoding="async"></span>
        <span class="brand-name brand-name-desktop">${SITE.desktopName}</span>
        <span class="brand-name brand-name-mobile">${SITE.mobileName}</span>
      </a>
      <span class="topbar-spacer"></span>
      <div class="topbar-actions">
        <button class="icon-btn" id="themeBtn" aria-label="切换深浅色">◐</button>
        <button class="topbar-search" id="searchBtn" aria-label="打开站内搜索"><span>⌕</span><span class="topbar-search-label">搜索校园资料</span><kbd>Ctrl K</kbd></button>
        <div class="quick-links" id="quickLinks">
          <button class="icon-btn quick-links-button" id="quickLinksButton" type="button" aria-label="打开快捷链接" aria-haspopup="menu" aria-expanded="false"><span aria-hidden="true">↗</span></button>
          <div class="quick-links-menu" id="quickLinksMenu" role="menu" aria-label="快捷链接">
            <a href="${SITE.officialUrl}" target="_blank" rel="noreferrer" role="menuitem"><span><strong>学校官网</strong><small>沈阳化工大学官方网站</small></span><b aria-hidden="true">↗</b></a>
            <a href="${SITE.repoUrl}" target="_blank" rel="noreferrer" role="menuitem"><span><strong>GitHub 仓库</strong><small>查看源码与更新记录</small></span><b aria-hidden="true">↗</b></a>
          </div>
        </div>
      </div>`;
  }
  sidebar.innerHTML = `
    <div class="sidebar-label">SYUCT CAMPUS GUIDE</div>
    <ul class="nav-list">${SITE.nav.map(([url,icon,label])=>`<li><a href="${url}" class="${current===url?'active':''}"><span class="nav-icon"><img src="${icon}" alt="" aria-hidden="true"></span>${label}</a></li>`).join("")}</ul>
    <div class="sidebar-card"><strong>非官方学生共建站</strong>资料整理至 2026 年 8 月。政策、收费、考试与毕业要求请以学校当年正式通知为准。</div>`;
  document.getElementById("menuBtn")?.addEventListener("click",()=>{
    sidebar.classList.toggle("open");
    document.getElementById("backdrop")?.classList.toggle("open");
  });
  document.getElementById("backdrop")?.addEventListener("click",closeSidebar);
  sidebar.querySelectorAll("a").forEach(a=>a.addEventListener("click",closeSidebar));
  document.getElementById("themeBtn")?.addEventListener("click",toggleTheme);
  document.getElementById("searchBtn")?.addEventListener("click",openSearch);
  document.getElementById("quickLinksButton")?.addEventListener("click",event=>{
    event.stopPropagation();
    const menu=document.getElementById("quickLinks");
    const willOpen=!menu?.classList.contains("open");
    closeQuickLinks();
    menu?.classList.toggle("open",willOpen);
    document.getElementById("quickLinksButton")?.setAttribute("aria-expanded",String(willOpen));
  });
  document.getElementById("quickLinksMenu")?.addEventListener("click",event=>event.stopPropagation());
  document.addEventListener("click",closeQuickLinks);
}
function closeSidebar(){
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("backdrop")?.classList.remove("open");
}
function closeQuickLinks(){
  document.getElementById("quickLinks")?.classList.remove("open");
  document.getElementById("quickLinksButton")?.setAttribute("aria-expanded","false");
}
function readSavedTheme(){
  try{return localStorage.getItem("syuct-guide-theme");}catch(error){return null;}
}
function saveTheme(theme){
  try{localStorage.setItem("syuct-guide-theme",theme);}catch(error){}
}
function initTheme(){
  const saved=readSavedTheme();
  const preferred=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
  setTheme(saved||preferred);
}
function setTheme(theme){
  document.documentElement.dataset.theme=theme;
  saveTheme(theme);
}
function toggleTheme(){
  setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark");
}
function normalizeSearchText(value){
  return String(value||"")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s·•—–_\-，。、“”‘’（）()【】\[\]：:；;,.!?！？/\\]+/g,"");
}
function mergeSearchItems(items){
  const map=new Map();
  items.forEach(item=>{
    if(!item||!item.title||!item.url)return;
    const key=`${item.title}|${item.url}`;
    if(!map.has(key))map.set(key,item);
  });
  return [...map.values()];
}
function escapeSearchHtml(value){
  return String(value||"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
}
async function loadResourceSearchIndex(){
  if(resourceSearchLoaded)return;
  resourceSearchLoaded=true;
  try{
    const response=await fetch("resources.html",{cache:"default"});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const html=await response.text();
    const doc=new DOMParser().parseFromString(html,"text/html");
    const parsed=[...doc.querySelectorAll("[data-resource-item]")].map(item=>{
      const title=item.querySelector("h3")?.textContent?.trim();
      const category=item.dataset.category||"资料下载";
      const searchable=item.dataset.search||"";
      const meta=item.querySelector(".download-copy p")?.textContent?.trim()||"";
      const link=item.querySelector("a.preview-button")||item.querySelector("a[href]");
      const url=link?.getAttribute("href")||"resources.html";
      return title?{title,url,text:`${category} ${meta} ${searchable}`} : null;
    }).filter(Boolean);
    SEARCH_INDEX=mergeSearchItems([...SEARCH_INDEX,...parsed]);
    const input=document.getElementById("searchInput");
    if(input)updateSearch(input.value);
  }catch(error){
    resourceSearchLoaded=false;
    console.warn("[SYUCT] 资料搜索索引加载失败，继续使用内置索引",error);
  }
}
function renderSearch(){
  const overlay=document.getElementById("searchOverlay");
  if(!overlay || document.getElementById("searchInput"))return;
  overlay.innerHTML=`<div class="search-box" role="dialog" aria-modal="true">
    <div class="search-input-wrap"><span>⌕</span><input id="searchInput" class="search-input" placeholder="搜索文件名、校历、地图、课程、办事流程……" autocomplete="off"><button class="icon-btn" id="searchClose" aria-label="关闭">✕</button></div>
    <div id="searchResults" class="search-results"></div></div>`;
  overlay.addEventListener("click",e=>{if(e.target===overlay)closeSearch()});
  document.getElementById("searchClose")?.addEventListener("click",closeSearch);
  document.getElementById("searchInput")?.addEventListener("input",e=>updateSearch(e.target.value));
  updateSearch("");
}
function updateSearch(raw){
  const source=String(raw||"").trim();
  const compact=normalizeSearchText(source);
  const tokens=source.split(/\s+/).map(normalizeSearchText).filter(Boolean);
  const ranked=SEARCH_INDEX.map(item=>{
    const title=normalizeSearchText(item.title);
    const body=normalizeSearchText(`${item.title} ${item.text||""} ${item.url||""}`);
    const matched=!compact||tokens.every(token=>body.includes(token));
    let score=9;
    if(compact&&title===compact)score=0;
    else if(compact&&title.startsWith(compact))score=1;
    else if(compact&&title.includes(compact))score=2;
    else if(compact&&body.includes(compact))score=3;
    return matched?{item,score}:null;
  }).filter(Boolean).sort((a,b)=>a.score-b.score||a.item.title.localeCompare(b.item.title,"zh-CN"));
  const items=ranked.slice(0,80).map(entry=>entry.item);
  const box=document.getElementById("searchResults");
  if(!box)return;
  box.innerHTML=items.length?items.map(x=>`<a class="search-result" href="${escapeSearchHtml(x.url)}"><strong>${escapeSearchHtml(x.title)}</strong><span>${escapeSearchHtml(x.text||"")}</span></a>`).join(""):`<div class="search-empty">没有找到相关内容，可前往“资料下载”继续检索</div>`;
}
function openSearch(){
  // 搜索框与完整资料索引只在用户真正打开搜索时初始化。
  renderSearch();
  document.getElementById("searchOverlay")?.classList.add("open");
  loadResourceSearchIndex();
  setTimeout(()=>document.getElementById("searchInput")?.focus(),30);
}
function closeSearch(){document.getElementById("searchOverlay")?.classList.remove("open")}

let groupModalLastTrigger=null;
function ensureGroupModal(){
  let modal=document.getElementById("groupModal");
  if(modal)return modal;
  modal=document.createElement("div");
  modal.id="groupModal";
  modal.className="group-modal";
  modal.setAttribute("aria-hidden","true");
  modal.innerHTML=`<div class="group-modal-card" role="dialog" aria-modal="true" aria-labelledby="groupModalTitle">
    <button class="group-modal-close" id="groupModalClose" type="button" aria-label="关闭">✕</button>
    <div class="group-modal-badge" id="groupModalKicker">QQ群</div>
    <h2 id="groupModalTitle">加入交流群</h2>
    <p class="group-modal-description" id="groupModalDescription"></p>
    <div class="group-number-panel">
      <span class="group-number-label">QQ群号</span>
      <strong class="group-number-value" id="groupModalNumber"></strong>
    </div>
    <div class="group-modal-actions">
      <button class="btn btn-outline" id="groupModalCopy" type="button">复制群号</button>
      <a class="btn btn-blue" id="groupModalJoin" target="_blank" rel="noopener noreferrer">一键加入QQ群</a>
    </div>
    <p class="group-modal-note">一键加入将打开 QQ 官方加群页面。</p>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click",event=>{if(event.target===modal)closeGroupModal();});
  modal.querySelector("#groupModalClose")?.addEventListener("click",closeGroupModal);
  modal.querySelector("#groupModalCopy")?.addEventListener("click",async()=>{
    const number=modal.dataset.groupNumber||"";
    if(!number)return;
    const button=modal.querySelector("#groupModalCopy");
    let copied=false;
    try{
      if(navigator.clipboard&&window.isSecureContext){
        await navigator.clipboard.writeText(number);
        copied=true;
      }
    }catch(error){copied=false;}
    if(!copied){
      const textarea=document.createElement("textarea");
      textarea.value=number;
      textarea.setAttribute("readonly","");
      textarea.style.position="fixed";
      textarea.style.opacity="0";
      document.body.appendChild(textarea);
      textarea.select();
      try{copied=document.execCommand("copy");}catch(error){copied=false;}
      textarea.remove();
    }
    if(button){
      const original="复制群号";
      button.textContent=copied?"已复制":"复制失败，请手动复制";
      setTimeout(()=>{if(button)button.textContent=original;},1600);
    }
  });
  return modal;
}
function openGroupModal(groupKey,trigger){
  const group=GROUPS[groupKey];
  if(!group)return;
  const modal=ensureGroupModal();
  groupModalLastTrigger=trigger||null;
  modal.dataset.groupNumber=group.number;
  const kicker=modal.querySelector("#groupModalKicker");
  const title=modal.querySelector("#groupModalTitle");
  const description=modal.querySelector("#groupModalDescription");
  const number=modal.querySelector("#groupModalNumber");
  const join=modal.querySelector("#groupModalJoin");
  const copy=modal.querySelector("#groupModalCopy");
  if(kicker)kicker.textContent=group.kicker;
  if(title)title.textContent=group.title;
  if(description)description.textContent=group.description;
  if(number)number.textContent=group.number;
  if(join)join.href=group.joinUrl;
  if(copy)copy.textContent="复制群号";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");
  document.body.classList.add("modal-open");
  setTimeout(()=>modal.querySelector("#groupModalClose")?.focus(),20);
}
function closeGroupModal(){
  const modal=document.getElementById("groupModal");
  if(!modal?.classList.contains("open"))return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden","true");
  if(!document.querySelector(".search-overlay.open,.lightbox.open"))document.body.classList.remove("modal-open");
  const trigger=groupModalLastTrigger;
  groupModalLastTrigger=null;
  trigger?.focus?.();
}
function initGroupModal(){
  document.addEventListener("click",event=>{
    const trigger=event.target.closest?.("[data-open-group-modal]");
    if(!trigger)return;
    event.preventDefault();
    openGroupModal(trigger.dataset.openGroupModal,trigger);
  });
}

function initLightbox(){
  const lightbox=document.getElementById("lightbox");
  if(!lightbox)return;
  document.querySelectorAll("[data-lightbox]").forEach(el=>el.addEventListener("click",()=>{
    lightbox.innerHTML=`<img src="${el.dataset.lightbox}" alt="查看大图">`;
    lightbox.classList.add("open");document.body.classList.add("modal-open");
  }));
  lightbox.addEventListener("click",()=>{lightbox.classList.remove("open");lightbox.innerHTML="";document.body.classList.remove("modal-open");});
}
function initResourceFilter(){
  const input=document.getElementById("resourceSearch");
  if(!input)return;
  let category="all";
  const items=[...document.querySelectorAll("[data-resource-item]")];
  const empty=document.getElementById("resourceEmpty");
  function apply(){
    const q=input.value.trim().toLowerCase();
    let shown=0;
    items.forEach(item=>{
      const okCat=category==="all"||item.dataset.category===category;
      const okSearch=!q||item.dataset.search.includes(q);
      item.classList.toggle("hidden",!(okCat&&okSearch));
      if(okCat&&okSearch)shown++;
    });
    empty?.classList.toggle("hidden",shown!==0);
  }
  input.addEventListener("input",apply);
  document.querySelectorAll("[data-resource-filter]").forEach(btn=>btn.addEventListener("click",()=>{
    category=btn.dataset.resourceFilter;
    document.querySelectorAll("[data-resource-filter]").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");apply();
  }));
}
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openSearch();}
  if(e.key==="Escape"){closeQuickLinks();closeSearch();closeGroupModal();document.getElementById("lightbox")?.classList.remove("open");if(!document.querySelector(".group-modal.open,.search-overlay.open"))document.body.classList.remove("modal-open");}
});
function runSafely(name,fn){
  try{fn();}catch(error){console.error("[SYUCT] "+name+" 初始化失败",error);}
}
document.addEventListener("DOMContentLoaded",()=>{
  runSafely("响应式标题",updateResponsiveTitle);
  runSafely("导航栏",renderChrome);
  runSafely("主题",initTheme);
  runSafely("QQ群弹窗",initGroupModal);
  runSafely("图片预览",initLightbox);
  runSafely("资料筛选",initResourceFilter);
  const notFoundSearch=document.getElementById("notFoundSearch");
  if(notFoundSearch)notFoundSearch.addEventListener("click",openSearch);
});

if(MOBILE_TITLE_MEDIA){
  if(MOBILE_TITLE_MEDIA.addEventListener)MOBILE_TITLE_MEDIA.addEventListener("change",updateResponsiveTitle);
  else if(MOBILE_TITLE_MEDIA.addListener)MOBILE_TITLE_MEDIA.addListener(updateResponsiveTitle);
}else{
  window.addEventListener("resize",updateResponsiveTitle);
}

/* v1.17 — local Office preview links generated from a manifest */
const OFFICE_PREVIEW_MANIFEST_URL = "assets/office-preview-manifest.json?rev=20260807";

function normalizeSiteRelativePath(rawHref){
  if(!rawHref || rawHref.startsWith("#")) return "";
  try{
    const siteBase=new URL("./",location.href);
    const url=new URL(rawHref,siteBase);
    if(url.origin!==location.origin || !url.pathname.startsWith(siteBase.pathname)) return "";
    return decodeURIComponent(url.pathname.slice(siteBase.pathname.length)).replace(/^\/+/,"");
  }catch(error){return "";}
}
function officeDocumentTitle(anchor){
  const scope=anchor.closest(".download-item,.resource-card,.feature-card,.step-card,article,section");
  const heading=scope?.querySelector("h1,h2,h3,h4");
  return (heading?.textContent||anchor.textContent||"Office 文档").trim().replace(/\s+/g," ");
}
function officePreviewUrl(sourcePath,previewPath,title){
  const query=new URLSearchParams({file:previewPath,source:sourcePath,title});
  return `pdf-viewer.html?${query.toString()}`;
}
function buildOfficePreviewButton(sourcePath,entry,title,buttonStyle){
  const preview=document.createElement("a");
  preview.href=officePreviewUrl(sourcePath,entry.preview,title);
  preview.target="_blank";
  preview.rel="noreferrer";
  preview.dataset.officePreviewFor=sourcePath;
  preview.textContent=buttonStyle?"预览":"在线预览 →";
  preview.className=buttonStyle?"download-button preview-button office-preview-button":"text-link office-preview-link";
  preview.setAttribute("aria-label",`在线预览：${title}`);
  return preview;
}
function enhanceOfficeLink(anchor,sourcePath,entry){
  if(anchor.dataset.officeEnhanced==="true") return;
  anchor.dataset.officeEnhanced="true";
  anchor.setAttribute("download","");
  const title=officeDocumentTitle(anchor);
  const isButton=anchor.classList.contains("download-button");
  const preview=buildOfficePreviewButton(sourcePath,entry,title,isButton);

  if(isButton){
    let actions=anchor.closest(".download-actions");
    if(!actions){
      actions=document.createElement("div");
      actions.className="download-actions office-download-actions";
      anchor.replaceWith(actions);
      actions.append(preview,anchor);
    }else{
      actions.insertBefore(preview,anchor);
    }
    anchor.classList.add("download-secondary");
    anchor.textContent="下载";
    return;
  }

  let actions=anchor.closest(".resource-actions");
  if(!actions){
    actions=document.createElement("div");
    actions.className="resource-actions office-resource-actions";
    anchor.replaceWith(actions);
    actions.append(preview,anchor);
  }else{
    actions.insertBefore(preview,anchor);
  }
  anchor.classList.remove("text-link");
  anchor.classList.add("secondary-link","office-source-link");
  anchor.textContent="下载原文件";
}
async function initOfficePreviews(){
  // 绝大多数页面没有 Office 下载链接；先在本页筛选候选项，
  // 只有确实需要增强 Word / Excel 链接时才请求预览清单。
  const candidates=[...document.querySelectorAll('a[href]')].map(anchor=>({
    anchor,
    sourcePath:normalizeSiteRelativePath(anchor.getAttribute("href")),
  })).filter(({sourcePath})=>/\.(?:doc|docx|xls|xlsx)$/i.test(sourcePath));
  if(!candidates.length)return;

  const response=await fetch(OFFICE_PREVIEW_MANIFEST_URL,{cache:"default"});
  if(!response.ok) throw new Error(`Office 预览清单加载失败：${response.status}`);
  const manifest=await response.json();
  const entries=manifest?.entries||{};
  candidates.forEach(({anchor,sourcePath})=>{
    const entry=entries[sourcePath];
    if(!entry?.preview) return;
    enhanceOfficeLink(anchor,sourcePath,entry);
  });
}

document.addEventListener("DOMContentLoaded",()=>{
  initOfficePreviews().catch(error=>console.warn("[SYUCT] Office 本地预览未启用",error));
});
