# Changelog

All notable changes to this project are documented in this file.

## [0.2.2] - 2026-10-24

### Added

- 整窗材质层：把壁纸从「只在侧栏透出来」推进到整窗一块材质。宿主原本给会话列（`_root`）、会话内容框（`_frame`）、右侧面板页（`_pane`）各铺一层 `--dsw-alias-bg-base`（暗色下 `rgba(21,21,23,.25)`），侧栏却是透明 —— 于是侧栏与内容区之间出现一道 28 灰阶的竖直色差线，内容框再叠一层还让输入框上沿多出一条横台阶。现在统一归零，靠 `background-attachment:fixed` 让壁纸纹理跨元素对齐。浮层/菜单走 `--dsw-alias-bg-layer-2` 一类分层 token，不受影响。
- 玻璃化消息面板：用户气泡（`_userRow _bubble`）与助手消息块（`.v5IAXa_root`，AssistantMarkdown 的根）套同一套玻璃容器（模糊 + 淡蒙版 + 20px 圆角），助手块用负外边距把内边距伸到列宽之外，正文左右对齐位置不变；压在壁纸上文字仍清晰。
- 「消息面板不透明度」设置项（0%–60%，默认 12%，存 `localStorage`，改动即时生效）：浓度越低模糊与描边一起等比衰减，0% 时面板彻底不存在。
- 「输入框玻璃浓度」设置项（0%–100%，默认 50%，存 `localStorage`，改动即时生效）：控制卡片内那张壁纸副本上再压多少蒙版——0% 与页面同深、只剩模糊，越高越实。
- 「聊天框效果」两档真正区分开：液态玻璃 = `blur 20px + saturate 130%`，高斯模糊 = `blur 14px + saturate 100%`；作用于消息面板、提问卡片与输入框玻璃。
- 提问选择卡片（`QuestionComposer.module.css` 的 `_card`）套上玻璃容器：这张卡片原生靠 `--dsw-specific-input-major` 铺底，token 归零后就裸在壁纸上、与背景混作一团，现在给它同款材质（+12px 模糊、0.5px 亮环、柔和投影）。
- 深色主题下 `<select>` / `<option>` 的下拉列表配色修复（白底白字）。

### Changed

- 设置卡片从「设置 → 内置插件」搬到「设置 → 通用」（`settings.general.item`，order 12），与其它界面主题放在一起；插件详情页的自动配置表单保留。
- 输入框不再固定 80% 不透明：`--dsw-specific-input-major` 归零后，输入框卡片自己铺一层「同一张固定壁纸的副本 + `filter:blur()` + 可调蒙版」，纹理与整窗严格对齐，与会话区同材质，不再是一块「第三块」。
- 侧栏、标题栏、底部状态区与其外壳统一透明，边界不再靠色差区分。
- README 的浅色 / 深色预览图更新为 1600×900 整窗截图；`scripts/screenshot.mjs` 在截图前会自动关闭首次启动的 API Key 弹窗。

### Fixed

- 侧栏与会话列之间的竖直色差线（实测 x=280 处 28 灰阶）：来自 `--dsw-alias-bg-base` 只在会话列一侧铺底。
- 输入框上下的横向过渡线与分块：`conversation.input.dock` 与 composer 座位区的顶边描边、各层 composer 容器的底色/阴影统一清理。
- 会话列表底部 24px 渐变遮罩（`._9lTDKa_fade`，`transparent → --dsw-specific-sidebar-fill`）被染成一条暗带 + 硬下沿：该 token 在整窗材质下必须给 `transparent`，给半透明就会露馅。
- 输入框那圈圆角描边丢失：它其实是 composer 卡片自身 `rgba(255,255,255,.12) 0 0 0 .5px` 的 box-shadow 环（radius 28px），此前被通配的 `box-shadow:none` 一并清掉，现已按原生观感补回。
- 悬停发送/停止按钮时整块会话区闪动：卡片上那层 `blur 20px` 的 `backdrop-filter` 会在卡片局部重绘时反复重新合成（Windows/Electron 上表现为闪）。先以 0.92 实底收场，后又换回玻璃：不再挂 `backdrop-filter`，而是把壁纸副本画进卡片的 `::before` 再 `filter:blur()`，模糊只在卡片重绘时算一次，既有玻璃质感又不闪。提问选择卡片保留 `backdrop-filter`，实测不受影响。
- 审批卡片（`.j_8BDW_card`）整张透明：它同样以 `--dsw-specific-input-major` 铺底，token 归平后标题、命令与「允许 / 拒绝」按钮直接压在壁纸上。现按提问卡片同款玻璃补齐（0.34 蒙版 + 12px 模糊 + 0.5px 亮环 + 投影），浓度写死、不跟面板滑条走。
- 旁问浮层（`@michengai/dsh-btw` 的 `.btw-selection-dialog` 提问框 / `.btw-selection-menu` 选中浮条 / `.btw-bubble` 回答卡）透到壁纸上：它们的底色是 `--dsw-alias-bg-layer-2`，暗色下落到半透明值时字就压在花纹上（薇斯纳下是实的是因为它不做整窗材质）。现在不依赖那个 token，直接给 0.94 实底 + 0.5px 亮环 + 投影。

### Notes

- 整窗材质需要把 `--dsw-specific-sidebar-fill`、`--dsw-specific-input-major`、`--dsw-alias-bg-base` 归零，「输入框颜色」「侧边栏颜色」两项配置在开启后不再有可见效果（值仍保存）。
- 侧栏上不能加 `isolation` / `backdrop-filter` / `transform`：任何建立层叠上下文的写法都会把就地渲染的全屏弹层锁到内容区下面（表现为面板跑到下层、点不动）。

## [0.2.1] - 2026-10-18

### Fixed

- 桌面端壁纸不显示：主题不再只通过 `webServer.tapIndex` 注入 HTTP 返回的 index.html，而是改用 `webserver/index-inject` 结构化注入行。WebServer 会把同一张注入表渲染进 Web 端 index，Electron 也会在启动时收取该表并应用到自己的本地 index，因此背景图、蒙版与标题特效在桌面端恢复；颜色本来就经客户端 token 生效，现在图层也齐了。
- Windows 标题栏布局（`data-windows-titlebar`）会把整个窗口 frame 涂成不透明的侧边栏底色，即使图层已注入也会被遮住；主题现在把该 frame 及其标题栏条改回半透明的 base 表面，壁纸在桌面端可见。
- 深色模式下运行期修改背景/蒙版颜色不立即生效：客户端把 `--columbina-bg-image`、`--columbina-mask-alpha`、`--columbina-mask-rgb` 写到 `<body>` 内联样式（而不是 `<html>`），避免被注入样式表中 `body[data-ds-dark-theme]` 的同名声明遮蔽。
- 清除自定义蒙版颜色后深色模式仍保留旧值：客户端现在始终写入当前配色的具体蒙版 RGB，而不是删除属性后回落到可能过期的静态样式。

### Changed

- `buildStaticStyle()` 保留为旧宿主 `tapIndex` 的回退；新增 `buildStaticInjections()` 生成 `{ kind: 'style' }` 与 `{ kind: 'script', placement: 'body' }` 行（与 DSH 自身主题的注入方式一致）。冒烟测试改为按 CSS 标记定位注入的样式。

## [0.2.0] - 2026-10-18

### Changed

- 适配 DeepSeek Harness `0.2.1-rc.2`（`cordis ^4.0.5`、`dsh-* ^0.2.0-rc.1`）。
- 设置改用 DSH 0.2 的插件 Config / settings forms 模型：`src/index.js` 导出的 `Config` 字段全部标记为 `volatile`，经 `ctx.settings.describe/update` 按插件条目 id 读写；删除了对已移除的 `ctx.settings.register` 与 `@deepseek-ai/dsh-client-ui-slots` 包的依赖（保留旧宿主上的 `register` 回退）。
- 设置卡片注册到 0.2 的两个插槽：`settings.plugins.tab`（设置 → 内置插件 → 哥伦比娅主题）与 `plugins.bundle.config`（插件页 `dsh-columbina-theme` 详情页）；旧版 `settings.plugin.item` 仍保留为回退。
- 设置改存于 `$DSH_HOME/profiles/<profile>/cordis.patch.yml` 的插件条目；首次启动时自动把旧 `settings.yaml` 中 `dsh-columbina-theme` 段落迁移过来（仅当该条目尚无用户配置）。
- 明暗切换的监听改为同时使用 `theme/change` 快照与 `data-ds-dark-theme` MutationObserver，修复订阅顺序导致深色模式下背景不切换的问题；卸载时释放 `overrideTokens` 图层。
- `cordis.patch.yml` 不再写入默认 config，默认值交给 Config schema，避免默认值挡住旧设置迁移。

### Fixed

- 0.2 下 `ctx.settings.register` 不存在导致插件加载失败的问题。
- 深色 / 浅色切换时 `--columbina-bg-image` 不跟着切换的问题。
- 设置卡片在插件详情页中的可读性（使用 `--dsw-alias-settings-card-fill` 作为卡片底色）。

## [0.1.0] - 2026-08-18

### Added

- 哥伦比娅主题插件首个版本。
- 背景预设与自定义背景：`assets/backgrounds/` 目录自动扫描（放入图片即成为预设），支持上传 PNG / JPEG / WebP / GIF 自定义背景（≤ 15MB）。
- 大图自动生成预览缩略图（> 512KB 的位图预设，640px JPEG，缓存于 `$DSH_HOME/storages/dsh-columbina-theme/thumbs/`）。
- 可调蒙版：0% = 原图效果（主界面面板通透度同步归零），100% = 完全覆盖为当前明暗主题底色。
- 浅色 / 深色双默认：背景（columbina-1 / columbina-2）与配色（字体、输入框、侧边栏、蒙版颜色）随明暗主题切换。
- 自定义颜色：蒙版、输入框、侧边栏、字体颜色均可单独设置（留空 = 跟随明暗主题默认色）。
- 选中会话标题特效：当前会话标题的蓝紫渐变文字 + 光晕（可开关）。
- 输入框固定 80% 不透明；侧边栏、设置面板、菜单、对话框保持不透明。
- 主题样式通过 `webServer.tapIndex` 注入每次页面响应，首帧即生效、无闪烁。
- 设置卡片（设置 → 插件 → 哥伦比娅主题）：预设网格、上传、蒙版滑块、四个颜色选择器、标题特效开关。

### Changed

- 移除早期内置的 6 张 SVG 预设背景。

### Fixed

- 蒙版为 0 时主界面面板残留半透明白膜导致"不完全透明"的问题（面板通透度改为跟随蒙版值）。
- 自定义颜色被直接拼入 `rgba(#hex, …)` 的无效 CSS（统一转换为 `r, g, b`）。
- 资源路由只识别 `.svg` 导致 jpg/png 预设 404 的问题。
