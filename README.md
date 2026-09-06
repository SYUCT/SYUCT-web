<div align="center">

<img src="assets/optimized/syuct-community-icon.webp" alt="沈化大校园指南学生共创图标" width="112" />

# 沈阳化工大学校园指南（学生共创版）

**SYUCT Campus Guide**

把分散的新生通知、校园地图、学业资料、办事表格和校园经验，整理成一条更容易查找的路径。

**当前版本：v260901** · **45 份站内文档** · **22 份 Office 本地预览** · **4 张实用导航地图** · **1 个官方校园全景** · **12 张校园实景照片**

[访问主站](https://www.syuct.top/) · [GitHub Pages 备用入口](https://syuct.github.io/SYUCT-web/) · [校园社区](https://www.syuct.top/community.html) · [资料下载](https://www.syuct.top/resources.html) · [参与共建](https://www.syuct.top/about.html)

</div>

---

## 项目简介

学校通知、学院表格、培养方案、群文件和同学经验往往散落在不同入口。本项目将常用校园信息重新分类，帮助沈阳化工大学本科新生、硕士新生和在校生更快找到资料，并知道下一步应该去哪里办理、查看或下载。

本站为**非官方学生共建项目**，不隶属于沈阳化工大学。涉及政策、收费、考试、学籍、培养方案和毕业要求的内容，请始终以学校及学院当年正式通知为准。

## 当前入口

| 入口 | 地址 | 用途 |
| --- | --- | --- |
| 主站 | <https://www.syuct.top/> | EdgeOne Pages 自定义域名，日常分享优先使用 |
| 备用站 | <https://syuct.github.io/SYUCT-web/> | GitHub Pages 备用入口 |
| 源码仓库 | <https://github.com/SYUCT/SYUCT-web> | 查看源码、提交 Issue 或 Pull Request |

## v260901 更新

- **新增本地课表截图 OCR。** 支持上传正方教务系统完整课表截图，浏览器本地完成 Canvas 预处理、Tesseract.js 中文识别和固定网格解析，再复用现有课程结构生成 `SYUCT-TT2`。
- **适配新版教务处导入入口。** 新增本科课表结构采集脚本，在已登录的本科教务处页面生成脱敏 JSON 样本，用于后续适配新版课表；脚本不上传账号、Cookie 或课表内容。
- **新增研究生课表 PDF 导入。** 可单独上传研究生系统“打印课表”生成的原始 PDF，浏览器本地按文字坐标还原星期、节次、周次、教师与完整楼名，核对后生成 `SYUCT-TT2`。
- **手机端课表转换重新开放并优化流程。** 默认进入截图识别，上传与识别按钮前置；识别结果使用可折叠课程卡，按“上传识别 → 核对修改 → 确认无误 → 设置生成”逐步引导。
- **保留并优化网页粘贴。** 手机打开教务处后直接截取完整课表，OCR 通常更精准；电脑端教务处的表格排版更适合将整张课表复制到剪贴板并粘贴导入。
- **课表教程与 PDF.js 维护调整。** 图文 PDF 教程移入“网页粘贴”入口；本地 PDF.js 工作流改为确定性生成和只读校验，不再尝试直接写入受保护的 `main` 分支。
- **GitHub 统计显示修正。** 首页只保留一套 Star / Fork 更新逻辑，避免实时 API 与旧静态数据互相覆盖；当前静态兜底同步为 11 Star。
- **文档数量重新核对。** `docs/` 现有 45 份原始文档，其中资料下载中心集中列出 42 份，另有 3 份页面专用文档；Office 本地预览仍为 22 份。

## v260822 更新

- **校园社区阅读镜像。** 新增 `community.html`，每小时同步 GitHub Discussions 的置顶讨论、`精选` 标签讨论与最近讨论，正文直接采用 GitHub 渲染结果，代码块支持一键复制，分类 emoji 转为 Unicode 显示。
- **化大课表转换教程重构。** 页面小字教程精简为一句话概述加四步流程，完整图文步骤改由 6 页 PDF 承载，可在站内 `pdf-viewer.html` 预览或直接下载。
- **站点图标按用途拆分尺寸。** `favicon-32.png`（3 KB）用于标签页图标，`apple-touch-icon.png` 用于 iOS 添加到主屏，顶栏品牌图改为 96px WebP；原先各页面直接引用 86 KB 原图。
- **首页主视觉改用 WebP。** 主视觉是 CSS 背景图且盖有深色渐变，改用 `image-set()` 加载 1280px WebP，单张省约 228 KB，不支持的浏览器回退原 JPG。
- **课表转换页顶栏内联。** 该页原本是全站唯一依赖 `app.js` 运行时渲染顶栏的页面，首屏需等脚本执行；现与其他页面统一内联。

以上改动使课表页总传输从 288 KB 降到约 150 KB。站点在 EdgeOne 开启 HTTP/2 后，TLS 握手从 12 次降到 1 次，整页完成时间从约 6.0 秒降到约 2.6 秒。

完整版本记录见 [`project-docs/updates/README.md`](project-docs/updates/README.md)；性能相关的实测数据与维护规则见 [`project-docs/maintenance/static-performance.md`](project-docs/maintenance/static-performance.md)。

## 主要栏目

| 栏目 | 内容 |
| --- | --- |
| 新生入学 | 关键时间、报到准备、缴费安全、第一周安排与校园导航 |
| 校园地图 | 高清校园总图、快递取件导航、体育课专用地图与官方校园全景 |
| 数字校园 | 统一身份认证、校园网络、WebVPN、CARSI 和电子资源 |
| 学业资料 | 培养方案、选修要求、微专业、创新竞赛、开放实验室和课程资料 |
| 办事大厅 | 学籍修改、缓考、监控调阅、奖学金、毕业和论文相关流程，以及化大课表转换 |
| 校园生活 | 校历、体育保健、假期留校、图书馆、学生管理规定和校园相册 |
| 校园社区 | GitHub Discussions 的静态阅读镜像：置顶讨论、精选讨论与最近讨论 |
| 资料下载 | PDF、Word、Excel 等资料的分类下载与在线预览 |
| 关于共建 | 投稿、纠错、版权说明、QQ 交流群和项目维护信息 |

## 网站特性

- 纯静态 HTML、CSS 和 JavaScript，无数据库和后端服务
- 同时支持 EdgeOne Pages 与 GitHub Pages 部署
- 桌面端和移动端自适应，含移动侧栏、站内搜索和深浅色模式
- 全站使用固定的 `app.js`、`styles.css` 与语义化资源文件名，通过查询参数刷新缓存
- 搜索、Office 预览和部分弹窗按需初始化，降低普通页面进入时的额外工作
- 新生入学、校园地图、数字校园、学业资料、办事大厅和校园生活使用统一校园地标页首
- 校园地图页集中提供校园总图、两张快递取件图、体育课专用地图与学校官网所提供的 720 云校园全景
- 官方全景仅在用户主动点击后连接第三方服务；手机端使用本站全屏承载层
- 快递取件详情以 `map.html#delivery` 为唯一维护入口，首页和新生页只做快捷跳转
- QQ 群入口使用统一站内弹窗：可复制群号，也可通过 QQ 官方网页加群链接一键加入；不再使用二维码
- PDF.js 完全本地托管，不依赖 jsDelivr、unpkg 等外部 CDN
- PDF 支持在线阅读、缩放、翻页和原文件下载
- Word、Excel 支持本站本地转换预览，原文件仍可直接下载
- 首页校园实景预览可一键跳转到完整校园相册
- 首页可显示 GitHub 项目 Star / Fork；由独立脚本读取 GitHub API 并缓存一小时，API 不可用时回退到 `assets/github-stats.json`
- 校园社区为 GitHub Discussions 的只读镜像，发帖与回复仍在 GitHub 完成
- 化大课表转换支持本科教务处结构采集、研究生课表 PDF、原始文本粘贴和截图 OCR；解析与生成均在浏览器本地完成
- 图片按显示尺寸提供 WebP 版本，原图保留用于高清查看；站点图标按用途拆分尺寸

## 项目结构

```text
SYUCT-web/
├── .github/
│   └── workflows/
│       ├── vendor-pdfjs.yml           # 校验本地 PDF.js 运行文件
│       ├── build-office-previews.yml  # 自动转换 Word / Excel 预览
│       ├── update-community.yml       # 每小时同步 GitHub Discussions 镜像
│       ├── update-github-stats.yml    # 手动说明浏览器端 Star / Fork 获取方式
│       └── static-performance-audit.yml # 静态资源与课表转换回归检查
├── assets/
│   ├── icons/                         # 全站导航与入口 SVG 图标
│   ├── optimized/                     # 网页显示用 WebP（原图仍保留）
│   ├── pdfjs/                         # GitHub Actions 写入的 PDF.js 运行文件
│   ├── tesseract/                     # 截图 OCR 的本地 Tesseract.js、WASM 核心与中文模型
│   ├── community-media/               # 社区讨论正文图片的本地缓存
│   ├── office-preview-manifest.json   # Office 原文件与预览 PDF 映射
│   ├── github-stats.json              # GitHub Star / Fork 静态兜底
│   ├── github-live-stats.js           # 首页 GitHub API 实时统计与一小时缓存
│   ├── community.json                 # 社区镜像数据（由工作流生成）
│   ├── app.js                         # 全站交互、搜索与 Office 预览按钮
│   ├── styles.css                     # 全站样式
│   ├── group-community.css            # 交流群双卡片与加群弹窗补充样式
│   ├── community.js / community.css   # 校园社区阅读镜像
│   ├── community-markdown.js          # 社区正文兜底渲染与 emoji 转换
│   ├── timetable-*.js / .css          # 化大课表转换解析、编解码与页面逻辑
│   ├── timetable-graduate-pdf.js       # 研究生课表 PDF 文字坐标解析
│   ├── syuct-timetable-capture.user.js # 本科新版课表脱敏结构采集脚本
│   ├── pdf-viewer.js                  # PDF 阅读器入口
│   ├── pdf-viewer.css                 # PDF 阅读器样式
│   ├── syuct-community-icon.png       # 学生共创图标原图（各尺寸图标的生成源）
│   ├── favicon-32.png                 # 标签页图标
│   ├── apple-touch-icon.png           # iOS 添加到主屏图标
│   ├── campus-panorama-cover.jpg      # 官方全景点击加载前的本地航拍封面
│   ├── landmark-*.png                 # 校训石、龙门、图书馆等校园地标插画
│   ├── campus-map.jpg                 # 高清校园地图
│   ├── sports-map.png                 # 体育课专用地图
│   ├── delivery-pickup-overview.png   # 快递取件位置总览图
│   ├── delivery-haochijie-layout.png  # 化大好吃街内部快递点位图
│   ├── hero-campus.jpg                # 首页主视觉原图
│   └── gallery-*.jpg                  # 校园相册图片
├── docs/                              # PDF、Word、Excel 等原始资料
│   ├── previews/                      # Word、Excel 转换后的本地 PDF 预览
│   └── timetable-converter-guide.pdf  # 化大课表转换图文教程
├── project-docs/
│   ├── updates/                       # 各版本更新记录
│   │   └── README.md                  # 版本索引
│   └── maintenance/                   # PDF.js、社区镜像与性能维护说明
├── scripts/
│   ├── vendor-pdfjs.mjs               # PDF.js 本地化脚本
│   ├── build-office-previews.py       # Word、Excel 转本地 PDF
│   ├── build-web-images.py            # 生成 WebP 显示版本与各尺寸图标
│   ├── audit-static-assets.py         # 静态资源性能检查
│   └── update-community.mjs           # 拉取 GitHub Discussions 生成社区镜像
├── tests/                             # 课表转换回归测试
├── index.html                         # 首页
├── freshman.html                      # 新生入学
├── map.html                           # 校园地图、快递取件、体育课与官方全景
├── digital.html                       # 数字校园
├── academics.html                     # 学业资料
├── services.html                      # 办事大厅
├── campus.html                        # 校园生活与完整相册
├── community.html                     # 校园社区阅读镜像
├── resources.html                     # 资料下载
├── about.html                         # 关于共建
├── timetable-converter.html           # 化大课表转换
├── pdf-viewer.html                    # PDF 在线阅读页
├── 404.html
├── edgeone.json                       # EdgeOne Pages 缓存头配置
└── package.json                       # 固定 PDF.js 版本与维护命令
```

## 静态资源与缓存

全站 JavaScript、CSS 和图片资源保持固定文件名，更新内容时覆盖原文件；需要刷新浏览器/CDN 缓存时修改查询参数，例如：

```html
<link href="assets/styles.css?rev=20260822" rel="stylesheet">
<script defer src="assets/app.js?rev=20260906"></script>
```

`rev` 只用于缓存失效，不代表必须创建新文件。不要重新增加 `app-v129.js`、`styles-v129.css` 这类历史副本。

修改 `styles.css` 或 `app.js` 后，需要把**所有**页面引用的 `rev` 一起更新；否则拿到旧缓存的浏览器可能引用到已经改名或删除的资源。

## 课表导入

`timetable-converter.html` 提供四种入口：

- 本科新版教务处：下载 `syuct-timetable-capture.user.js` 并从用户脚本管理器导入，在个人课表页生成脱敏 JSON 样本，供页面结构适配使用；普通浏览器直接打开脚本文件只会显示源码；
- 研究生教务处：上传“打印课表”生成的原始 PDF，PDF.js 在本地读取文字与坐标，再由 `timetable-graduate-pdf.js` 还原课程；
- 网页粘贴：保留原有完整课表复制、粘贴流程；
- 截图 OCR：保留为旧版完整课表截图的备用入口。

截图 OCR 的处理流程：

1. Canvas 在本地缩放图片、灰度化与二值化，并检测 8 条等距星期竖线；
2. 从左侧节次列检测第 1-10 节的 11 条横线，按两节一组建立固定课表网格；
3. 只把含文字的课程格交给本地 Tesseract.js 中文模型；
4. 根据 OCR 文字坐标和网格位置生成现有课程对象，再复用 `timetable-codec.js` 生成 `SYUCT-TT2`；
5. OCR 结果以可编辑课程卡展示，必须由用户确认后才能生成课表码。

由于新版本科教务处无法在一张截图中显示完整课表，截图 OCR 只作为旧页面备用方式。首次识别会从本站按需下载约 6 MB 的 OCR 核心与中文模型，浏览器随后会缓存模型。研究生 PDF 必须是系统生成、带文字层的原始文件，扫描件不会进入 OCR。

## 校园社区镜像

`community.html` 是 GitHub Discussions 的静态阅读入口，数据由 `update-community.yml` 每小时同步一次，写入 `assets/community.json`：

- 展示全部置顶讨论、打了 `精选` 标签的讨论，以及最近活跃的非置顶讨论；
- 正文直接采用 GitHub 渲染好的 HTML，前端再按标签与属性白名单二次过滤；
- 讨论中的 GitHub 图片会尽量缓存到 `assets/community-media/`，避免国内网络下加载失败；
- 分类 emoji 的 `:shortcode:` 会转成 Unicode 字符显示；代码块提供一键复制。

维护细节见 [`project-docs/maintenance/community-mirror.md`](project-docs/maintenance/community-mirror.md)。

## 图片与性能

- 需要重新生成 WebP 显示版本或各尺寸站点图标时运行 `npm run images:build`（需要 ImageMagick 7）。
- 提交前可运行 `npm run audit:static` 检查图片引用、尺寸属性与资源体积预算，`npm test` 跑课表转换回归测试。
- 站点已开启 Brotli 与 HTTP/2，因此不要为了减少请求数而合并资源；实测数据与判断依据见 [`project-docs/maintenance/static-performance.md`](project-docs/maintenance/static-performance.md)。

## 校园地图维护

### 快递取件

快递品牌和驿站位置属于易变信息，统一以 `map.html#delivery` 为详情来源：

1. 地址、时间、品牌或提示变化时，只修改 `map.html#delivery`。
2. 位置变化较大时覆盖 `assets/delivery-pickup-overview.png` 或 `assets/delivery-haochijie-layout.png`。
3. 首页和新生页只保留跳转入口，不复制详细品牌和位置说明。
4. 长期保留“优先以物流通知、取件短信和现场标识为准”的提示。

### 官方校园全景

- 封面图使用 `assets/campus-panorama-cover.jpg`，由本站直接加载。
- 用户未点击“开始浏览”前，不创建 720 云 iframe。
- 桌面端在页面卡片中加载；手机端在本站全屏查看层中加载。
- 新窗口入口仍可直接前往原 720 云作品页面。
- 全景内容来自学校官网公开提供的入口，实际内容与可用性以原页面为准。

## 本地 PDF.js 与 Office 预览

项目固定使用 `pdfjs-dist`，运行文件保存在 `assets/pdfjs/`。GitHub Actions 只读校验仓库中的运行文件是否与固定版本一致，不会直接写入受保护的 `main` 分支；实际升级时需在更新 PR 中一并提交重新生成的 `assets/pdfjs/`。PDF 阅读器与 PDF 原文件均从本站加载。

Word、Excel 原文件上传到 `docs/` 后，`Build local Office previews` 工作流会生成 `docs/previews/*.pdf` 并更新 `assets/office-preview-manifest.json`；全站脚本只在页面确实包含对应文档链接时读取预览清单。

## 参与共建

欢迎通过以下方式参与：

- 指出失效链接、错误日期或过期内容
- 补充培养方案、通知、表格、真题和校园地图
- 分享选课、考试、竞赛、考研、保研和就业经验
- 投稿校园照片并补充拍摄地点说明
- 通过 Issue 或 Pull Request 改进网站
- 通过首页或“关于共建”页打开加群弹窗，复制群号或一键加入新生群 / 贴吧官方群

## 部署说明

### EdgeOne Pages（主站）

```text
框架预设：Other
根目录：/
输出目录：/
构建命令：留空
安装命令：留空
生产分支：main
```

### GitHub Pages（备用站）

```text
分支：main
目录：/ (root)
```

网站不需要执行 `npm run build`。`package.json` 主要用于固定和维护本地 PDF.js 与运行回归测试；Office 预览由独立 GitHub Actions 工作流生成。部署时需保留 `assets/pdfjs/`、`assets/tesseract/v7.0.0/`、`assets/timetable-graduate-pdf.js` 和 `assets/syuct-timetable-capture.user.js`。

## 资料来源与版权

本站资料主要来自学校和学院公开发布内容，以及同学授权投稿。原文件仅用于学习交流与信息整理；如有侵权、失效内容或不适合公开的资料，请通过仓库 Issue 提出处理请求。

校园全景通过学校官网公开入口链接至第三方 720 云服务。本站默认仅显示本地封面，用户主动点击后才加载第三方全景；内容版权及服务可用性以原发布页面为准。

## 免责声明

本站为非官方学生共建项目，不代表沈阳化工大学官方立场。本站内容仅供参考，不构成任何官方承诺或办事依据。学校政策、课程安排、收费标准、考试要求、学籍管理和毕业要求均以学校及学院最新正式通知为准。

---

<div align="center">

**由学生整理，为学生服务。**

主站：<https://www.syuct.top/>

</div>
