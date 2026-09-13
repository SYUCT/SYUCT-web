# Android 手动检测更新

App 设置页点击「检测更新」后，读取 `/downloads/app-version.json`。不在启动、恢复前台或进入设置时自动联网。

每次更新 APK 时，必须同时更新版本 JSON：

1. `versionCode` 与 Android 构建配置一致，严格递增；不能仅比较显示版本名称。
2. `versionName` 与安装包一致，`applicationId` 保持 `top.syuct.timetable`。
3. `apkUrl` 固定使用官网 `/downloads/SYUCT-Timetable.apk`。
4. `sha256` 使用本次签名 APK 的 SHA256，`notes` 使用简洁纯文本（不超过1000字符）。哈希用于仓库发布核验，App 委托浏览器下载，不自行下载安装或校验下载文件。
5. 同一提交发布 APK 和 JSON，运行 `npm test`。校验失败时不要发布，尤其不要新版本号搭配旧安装包。
6. 发布后核对线上 JSON、APK SHA256 与响应缓存策略。`edgeone.json` 已对 `/downloads/*` 设置 `no-cache`；App 检测附加时间参数并禁用本地缓存。

App 以「当前已是最新版本」「发现新版本」「检测失败」内联显示结果。新版需要再点击下载按钮才打开系统浏览器，不请求静默安装、悬浮窗或额外通知权限。

0.2.3 及更早版没有此入口，需先手动覆盖安装 0.2.4；之后才可通过设置检测。

回滚时保持 APK 与 JSON 一致。已安装更高版本的用户不会收到降级提示；需要修复包时，以更高 versionCode 重新发布，避免卸载导致课表丢失。
