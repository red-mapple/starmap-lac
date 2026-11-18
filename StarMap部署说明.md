# StarMap 本地部署说明

> 部署完成时间：2026-11-16　|　版本：StarMap v0.3.2（commit 17eebdf）
> 发布版（静态构建产物）：<http://127.0.0.1:5173/>　|　编辑版（含本地编辑器）：<http://127.0.0.1:5174/> 

## 一、部署结果一览

| 项目 | 结果 | 说明 |
|---|---|---|
| 源码仓库 | `E:\王全的工作台\02-BIM项目文件\018-starmap\StarMap` | Git 仓库，分支 `main`，已跟踪官方 `origin/main` |
| 应用目录 | `…\StarMap\01_Web` | React + TypeScript + Vite 8 + Cesium |
| 私有数据层 | `E:\王全的工作台\02-BIM项目文件\018-starmap\06_private` | 位于仓库之外，个人配置、足迹数据、照片都放这里 |
| 依赖安装 | `npm ci` 完成，389 个包 | 使用国内镜像 `registry.npmmirror.com` |
| 运行形态 | **5173 发布版（静态构建）** + **5174 编辑版（开发模式）** | 5173 由 `vite preview` 提供 `dist` 产物，只读浏览；5174 保留本地编辑器用于增删足迹 |
| 地图图源 | 天地图（`VITE_MAP_SOURCE=tianditu`） | 2026-11-16 已切换验证通过，见第四节 |
| 代码质量 | `npm run lint` 通过 | 0 错误 |
| 静态构建 | `npm run build:personal` 通过 | 产物在 `01_Web\dist`，含个人数据与 Cesium 资源；公网访问时以它为准，见第十节 |
| 公网访问（固定） | **Netlify 托管：<https://starmap-lac.netlify.app>** | 固定域名、免备案、国内实测可直连；与本机开关机无关，见第十一节 |
| 公网访问（临时备选） | `启动公网访问.bat` → 5180 静态服务 + Cloudflare 隧道 | 地址形如 `https://<随机名>.trycloudflare.com`，每次启动都会变，写入 `公网地址.txt`；需本机在线，见第十节 |
| 运行环境 | Node.js v22.23.2 / npm 10.9.8 / Git 2.56.0 | Node 满足 Vite 8 要求（≥22.12） |

已验证：5173 发布版首页正常渲染地球（Cesium + 天地图卫星影像 + 中文省界注记）、个人数据「中国」国家卡正常显示、页面无任何编辑按钮（发布版为只读）；5174 编辑版同时具备「编辑国家足迹」「编辑城市列表」按钮。`npm run lint` 与 `npm run build:personal` 均通过。

## 二、目录结构

```text
E:\王全的工作台\02-BIM项目文件\018-starmap\
├─ 启动StarMap.bat          双击启动发布版（5173，自动构建/检查依赖）
├─ 启动编辑器.bat            双击启动编辑版（5174，含本地编辑器）
├─ 重新发布.bat              改完足迹后双击：重新构建并重启 5173
├─ 停止StarMap.bat          双击停止 5173 与 5174 两个服务
├─ StarMap部署说明.md        本文件
├─ StarMap\                  源码仓库（Git 管理，勿放个人数据）
│  ├─ 01_Web\                可运行应用
│  │  ├─ src\                前端代码
│  │  ├─ scripts\            编辑器插件、媒体导入、隐私审计脚本
│  │  ├─ node_modules\       依赖（约 389 个包）
│  │  └─ dist\               静态构建产物（public 版）
│  ├─ 02_Assets\             官方素材模板
│  └─ 03_Reference\          架构 / 隐私 / 媒体流程文档
└─ 06_private\               ★ 私有层：个人数据只放这里
   ├─ config\.env.local      地图源与密钥配置
   ├─ data\                  足迹数据、编辑器状态、媒体目录（自动生成）
   ├─ MediaInbox\            原始照片 / 无人机素材收件箱
   └─ media\user\            导入后生成的三档图片衍生文件
```

## 三、启动与停止

本项目现在有**两个端口、两种形态**，不要混淆：

| 地址 | 形态 | 用途 | 数据来源 |
|---|---|---|---|
| <http://127.0.0.1:5173/> | **发布版**：`dist` 静态产物 + `vite preview` | 日常浏览、当“正式网页应用”用；**只读，无编辑按钮** | 构建时打包进产物（快照） |
| <http://127.0.0.1:5174/> | **编辑版**：`vite --mode personal` 开发模式 | 增删国家/城市/照片；改动实时写入 `06_private` | 实时读取私有层 |

**方式一（推荐，双击脚本）**：

| 脚本 | 作用 |
|---|---|
| `启动StarMap.bat` | 启动发布版 5173（缺依赖会自动 `npm ci`，缺 `dist` 会自动构建） |
| `启动编辑器.bat` | 启动编辑版 5174 |
| `重新发布.bat` | 先停 5173 → `npm run build:personal` → 重新起 5173（**改完足迹必须执行**） |
| `停止StarMap.bat` | 同时停止 5173 与 5174 |
| `启动公网访问.bat` | 起 5180 静态服务 + Cloudflare 隧道，输出**公网地址**并写入 `公网地址.txt`（详见第十节） |
| `停止公网访问.bat` | 关闭公网入口（隧道进程 + 5180） |

**方式二（命令行）**：

```powershell
cd "E:\王全的工作台\02-BIM项目文件\018-starmap\StarMap\01_Web"

# 发布版（先构建，再用 preview 提供静态产物）
npm run build:personal
node node_modules\vite\bin\vite.js preview --host 127.0.0.1 --port 5173 --strictPort

# 编辑版（另开一个窗口）
node node_modules\vite\bin\vite.js --mode personal --host 127.0.0.1 --port 5174 --strictPort
```

**重要：发布版是构建快照。** 在 5174 里新增/修改足迹和照片后，5173 不会自动变化，必须执行一次 `重新发布.bat`（或手动 `npm run build:personal`）后刷新页面。反过来，5173 上的任何操作都不会写入数据。

**停止**：双击 `停止StarMap.bat`，或在服务窗口按 `Ctrl+C`。端口被占用时先确认进程归属，不要随意杀掉其他项目的服务。

**为什么发布版没有编辑器**：源码 `src/data/editorState.ts` 里 `localEditorAvailable` 的判定是 `import.meta.env.DEV && MODE === 'personal'`，即只有"开发模式 + personal"才出现编辑器；一旦构建成静态站点（`DEV` 为 false），编辑器统一关闭，这是官方设计，不是故障。需要编辑就走 5174。

## 四、地图图源配置（重点）

StarMap 的 3D 引擎固定是 Cesium，**图源可三选一**（底部「图层」按钮可切换，绿灯=已配置，红灯=未配置不可选）：

| 图源 | 现状 | 效果 | 需要什么 |
|---|---|---|---|
| **天地图（Tianditu）** | **当前启用并已验证** | 国内访问快、卫星影像 + 中文注记 | 已在 `.env.local` 填入自己的 key |
| Cesium ion | 未配置（菜单中灰显） | 全球在线高清影像 + 城市名地理编码 | 自己的 ion token |
| 本地内置 Natural Earth II | 可用 | 全球低清底图，零配置、断网可用 | 无 |

实测记录（2026-11-16）：底部图源按钮显示「当前为天地图」；浏览器网络面板统计 246 条 `t{0-7}.tianditu.gov.cn` WMTS 瓦片请求全部成功（`img_w` 影像层 + `cia_w` 中文注记层，级别 5–7 及城市近景 14+ 均正常出图），控制台无报错；地图图为法罗群岛卫星影像 + 中文地名。图源选择会被浏览器记住（`localStorage: starmap:map-source`），刷新后仍为天地图。

**安全提醒（重要）**：天地图 key 属于浏览器端可见凭据——任何打开页面的浏览器都会在瓦片 URL 中带上 `tk`，这是在线地图的固有机制，不是配置失误。请：
1. 在天地图控制台把该 key 的**授权域名/白名单**限制为本地 `127.0.0.1`（将来上线再加正式域名），避免他人盗用配额；
2. 不要把带 `tk=` 参数的完整瓦片地址贴到公开群、文档或截图里；
3. 若怀疑 key 已外泄，直接在控制台删除重建一个，替换 `.env.local` 中的 `VITE_TIANDITU_TOKEN` 后重启服务。

配置位置：`E:\王全的工作台\02-BIM项目文件\018-starmap\06_private\config\.env.local`（当前 `VITE_MAP_SOURCE=tianditu`、`VITE_TIANDITU_TOKEN` 已填、`VITE_CESIUM_ION_TOKEN` 留空）。**请自己在该文件里填写密钥，不要把密钥贴到聊天窗口里**，也不要提交到 Git。

```text
VITE_MAP_SOURCE=auto          # auto / cesium / tianditu / local
VITE_CESIUM_ION_TOKEN=        # 在 https://ion.cesium.com/tokens 申请，勾选 geocode 公开权限
VITE_TIANDITU_TOKEN=          # 在 https://lbs.tianditu.gov.cn/ 申请开发者 key
```

改完 `.env.local` 必须**重启服务**才生效。建议开发用和正式发布用两把不同的密钥。

## 五、添加国家、城市与照片

**编辑足迹（页面内）**：左侧「编辑国家足迹」按钮进入编辑；可新增/排序/隐藏国家与城市、设置封面、上传城市照片与无人机素材。所有改动写入 `06_private\data\`，不进入源码仓库；隐藏是"软隐藏"，不会删除原始记录。

**批量照片导入**：

```powershell
cd "…\StarMap\01_Web"
npm run media:check      # 只读预检，报告缺失的国家/城市/格式/EXIF
npm run media:import     # 预检通过后执行，生成 640px 缩略图 + 2400px 预览
```

规则：原片必须先放进 `06_private\MediaInbox\`（按国家/城市两级目录组织，参考 `StarMap\02_Assets\MediaInbox\_country-template`）；收件箱里的原始文件只读，绝不被移动或改名；无人机照片按 EXIF 优先，缺失项才需要手填。

### 5.1 先有城市，才有媒体

导入器**只认已有城市**：城市来自 `06_private\data\travel-map.local.json` 的 `records`（城市 ID 规则 `slugify(country_en)__slugify(city_en)`，例如 `china__hong-an`）。该文件不存在时，页面只显示 `editor-state.local.json` 里手工加的国家，城市数为 0，此时任何媒体都会被拒收。

**新增城市**：在 `travel-map.local.json` 的 `records` 里补一条记录，必备字段 `id / country / country_en / city / city_en / start_date / status / lat / lng`；`region` 建议写成含 `亚洲`、`欧洲` 等字样的文本（页面用关键词匹配"大洲"字段，写纯地名会显示" —"）。

**改了这两个文件后必须重启服务**（`启动编辑器.bat` / `重新发布.bat`），Vite 只在启动时读取私有层。

### 5.2 全景照片的两个硬约束（2026-11-16 实测）

1. **必须是 2:1 等距柱状全景**，导入器会校验比例（1.9–2.1 之间）。
2. **宽度不能超过显卡纹理上限**。360 查看器直接加载 `original`，本机 WebGL `MAX_TEXTURE_SIZE = 16384`，而 PTGui 原始全景是 22512×11256，超过上限 → 文字信息正常显示但画面**全黑**。解决办法：先生成 8192×4096 的网页版放进收件箱，原片留在自己的素材目录，不要放进 Inbox。

生成网页版的命令（在 `01_Web` 目录，用项目自带的 sharp）：

```js
// 临时脚本 resize-pano.cjs：把 253 MP 原片压成 8192×4096、约 3.4 MB 的网页版
const sharp = require("sharp")
await sharp(src, { limitInputPixels: 300_000_000 })
  .resize(8192, 4096, { fit: "fill", kernel: "lanczos3" })
  .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:2:0" })
  .toFile(dst)
```

3. **城市封面 = 普通照片**放在 `<城市>/photos/`，文件名以 `cover` 开头（`cover.jpg`、`cover-说明.png` 都行，正则 `^cover(?:[-_. ]|$)`），导入器会把它标为 `isCover` 并优先显示在 City Cards 与 City Info 的预览图位置；不命名 `cover` 则按文件名排序取第一张。

### 5.3 本次导入结果（2026-11-16）

| 项目 | 内容 |
|---|---|
| 新增城市 | 红安县 `china__hong-an`（31.0173N/114.5947E，2026-07-16）、浠水县 `china__xishui`（30.4505N/115.2819E，2026-07-17） |
| 360 全景 | 4 张（红安 2、浠水 2），网页版 8192×4096，原片 22502–22572 × 11251–11286 保留在 `…\018-starmap\全景图` |
| 城市封面 | 红安县 ← `封面图\红安\红安.png`；浠水县 ← `封面图\浠水\浠水.jpeg`（投递为 `cover-红安县.png` / `cover-浠水县.jpeg`） |
| 未导入 | `封面图\红安\…（学科教师）—英语43-44班（白话版）.docx`，非媒体格式，已跳过 |
| 产出 | `06_private\media\user\china\{hong-an,xishui}\…`（共 18 个文件：4 组全景三级资源 + 2 组封面三级资源）；`dist` 已同步重建 |
| 日期口径 | EXIF 无 `DateTimeOriginal`，按文件修改时间取值（红安 7-16、浠水 7-17）；如需更正，改 `media.json` 与 `travel-map.local.json` 后重启 |

**备份**：整个 `06_private` 目录就是你的全部个人数据，直接复制走即可迁移到另一台电脑（配合 `STARMAP_PRIVATE_ROOT` 环境变量指向新位置）。

## 六、更新与二次部署

- 更新（走国内镜像）：`cd StarMap` 后执行 `git pull origin main`，再 `cd 01_Web` 执行 `npm ci`。`origin` 已指向代理镜像 `ghfast.top`，`upstream` 保留官方地址。
  - 注意：本地对 `01_Web/src/data/mapSources.ts` 有未提交的天地图切片修复（第九节），`git pull` 前先提交或 `git stash`，否则可能被覆盖。
- 页面右下角「版本更新」按钮会在 12 小时内最多检查一次 GitHub Release，只做提示，不会自动覆盖你的项目。
- 私有构建（本机使用）：`npm run build:personal` → 产物 `01_Web\dist`，**含个人数据，不要公开部署**；公开演示才用 `npm run build:public`（不含个人数据）。
- 本机发布流程：编辑版（5174）改数据 → `重新发布.bat`（重新构建 + 重启 5173）→ 刷新页面。
- 若要上公网：必须改用 `build:public` 构建，并在天地图控制台为正式域名新增/调整授权域名（本地用 127.0.0.1 的 key 不要直接放到公网）。
- 发布前自检：`npm run privacy:check`、`npm run lint`、`npm run build:public`、`npm run release:check`（需要干净的 Git 工作区）。

## 七、常见问题

| 现象 | 原因与处理 |
|---|---|
| 360 全景打开后一片黑，只显示标题和设备信息 | 原图宽度超过显卡纹理上限（本机 16384），Cesium/Photo Sphere 无法上传贴图；换成 ≤16384 宽（建议 8192×4096）的网页版后正常，见 5.2 |
| 导入器报"在 … 中找不到城市" | 城市还没写进 `travel-map.local.json`，先在 records 里建城市记录，重启服务后再导入，见 5.1 |
| 城市卡没有图 / 预览图空白 | `photos/` 里没有以 `cover` 开头的普通照片，按 5.2 第 3 条命名后重新导入 |
| 打开页面全黑几秒 | 星图/地球入场淡入动画，属正常；等 3–5 秒 |
| 5173 上看不到「编辑国家足迹」按钮 | 正常：发布版是只读静态产物，编辑器只在 5174 编辑版出现（见第三节） |
| 5174 里加了足迹，5173 却没变化 | 发布版是构建快照，需运行 `重新发布.bat` 重新构建后刷新 |
| 5174 打不开 / 提示端口占用 | 可能未启动编辑版；双击 `启动编辑器.bat`，或先 `停止StarMap.bat` 再启动 |
| 地球只有模糊底图 | 当前为本地低清图源；按第四节配置 Cesium ion 或天地图后重启 |
| 天地图某区域空白/显示成海面（如中国区无瓦片） | 已修复：根源是切片层级错位（详见第九节），改动在 `01_Web/src/data/mapSources.ts`，刷新页面即生效；请勿用 `git checkout` 回退该文件 |
| 地球整块发黑 / 卡在某一帧 | 浏览器窗口被最小化或切到后台时，Chrome 会暂停动画帧，Cesium 随之停止渲染；把窗口切回前台即恢复 |
| 端口 5173 被占用 | `netstat -ano | findstr :5173` 查 PID；确认归属后再处理 |
| `npm` 下载极慢 | 已在安装时使用 npmmirror；手动安装可加 `--registry=https://registry.npmmirror.com/` |
| Git 拉取超时 | github.com 直连不稳定，已配置 `ghfast.top` 镜像；失效可 `git remote set-url origin https://github.com/Aisland-SJL/StarMap.git` 重试 |
| Node 版本不符 | Vite 8 要求 Node ≥ 22.12（或 20.19），本机 v22.23.2 已满足 |
| 公网链接打不开 | 电脑关机/睡眠、`停止公网访问.bat` 已执行、或地址变了（快速隧道每次启动换地址）；重新运行 `启动公网访问.bat`，看它输出的新地址 |
| 公网访问返回 `403 Blocked request. This host is not allowed` | 入口指向了 5173（`vite preview` 会拒绝外部域名）。公网必须走 `启动公网访问.bat` 的 5180 静态服务 |
| 想换固定域名 | 快速隧道做不到；需用 Cloudflare 命名隧道（自有域名）或 EdgeOne/Vercel/Netlify 等静态托管，都需账号授权 |

## 八、本次部署执行记录

1. 检查环境：Windows / PowerShell 5.1 / Node v22.23.2 / npm 10.9.8 / 无 Git。
2. 因 `github.com` 归档下载与 `codeload` 直连不稳定，改用 `codeload` 直连 tar.gz 获取源码（1.17 MB）。
3. `winget` 安装 Git 失败（安装包源被拦截），改为经代理下载官方 Git for Windows 2.56.0 安装包静默安装成功。
4. 在源码目录 `git init` 并以镜像远端 `fetch --depth=1`，`reset --hard` 对齐官方 `main`（当前 17eebdf），工作区干净。
5. `npm ci` 安装依赖（npmmirror），`npm run lint`、`npm run build:public` 均通过。
6. 创建仓库外私有层 `06_private`（config/data/MediaInbox/media），复制 `.env.example` 为 `config\.env.local`。
7. 启动 `vite --mode personal`（127.0.0.1:5173），浏览器实测页面渲染、示例数据、编辑器入口均正常。
8. 用户填写天地图 key 并置 `VITE_MAP_SOURCE=tianditu`；核验配置项存在性（未回显密钥）→ 重启服务（PID 30024）→ 浏览器实测瓦片全部命中、中文注记与卫星影像正常渲染。
9. 定位并修复「天地图中国区无瓦片」缺陷（详见第九节）：`01_Web/src/data/mapSources.ts` 增加 2×2 的零级切片方案并显式传给 WMTS provider；`npm run lint`、`npm run build:public` 复验通过，实测请求瓦片已对应屏幕所在的中国区域。
10. 发布成网页应用：`npm run build:personal` 生成含个人数据与 Cesium 资源的 `dist`；停掉 5173 上的开发进程，改由 `vite preview`（PID 14256）在 5173 提供静态产物；另起 `vite --mode personal`（PID 14952）在 **5174** 保留编辑能力。实测 5173：HTTP 200、页面正常、天地图瓦片 381 条命中、中国区影像与中文省界注记齐全、无编辑按钮（只读，符合设计）；控制台仅剩 2 条 `ImageryLayer is recreated` 提示（切换图层时正常）和 1 条 `ERR_CONNECTION_RESET`（版本更新检查等外部请求，不影响使用）。同步重写四个启动/停止脚本（`启动StarMap.bat`、`启动编辑器.bat`、`重新发布.bat`、`停止StarMap.bat`），并逐一实测：停止脚本能同时释放 5173/5174，启动脚本能直接拉起发布版与编辑版。
11. 导入湖北黄冈素材：新建 `travel-map.local.json`（红安县、浠水县两条记录，`region` 含"亚洲"以正确显示大洲）；4 张 PTGui 全景原片（253 MP）宽度 22512 超过 WebGL 纹理上限 16384，先压成 8192×4096 网页版（3.0–3.6 MB）再投递，`media:check` → `media:import` 通过；`封面图` 里的 `红安.png`、`浠水.jpeg` 按 `^cover` 规则命名为 `cover-红安县.png`、`cover-浠水县.jpeg` 投递到各自 `photos/`，导入器标为 `isCover`。最终 6 条媒体（4 全景 + 2 封面）全部入库，`privacy:check`、`lint`、`build:personal` 通过；5174 与 5173 均实测：城市卡显示真实封面、城市信息大洲为 Asia、Drone Media 缩略图正常、360 查看器画面正常渲染。
12. 开通公网访问：先尝试把隧道直指 5173，实测 `vite preview` 对隧道域名返回 `403 Blocked request. This host is not allowed`；改为自带 `公网服务\serve-dist.mjs`（端口 5180，无 Host 校验、SPA 回落、缓存头）承载 `dist`，再由 `tools\cloudflared.exe`（v2026.11.0，经 `gh-proxy.com` 镜像取回）开隧道。实测公网地址：首页 200、`media` 资源 200、中文注记与卫星影像正常、840 条天地图请求全部 200（说明 key 未做域名白名单）；随后固化为 `启动公网访问.bat` / `停止公网访问.bat` 并整体跑通一遍（启动脚本能自动清理旧进程、拉起 5180 与隧道、解析并写入 `公网地址.txt`）。

## 九、天地图中国区"无瓦片"缺陷分析与修复

**现象**：切到天地图后，中国区域看起来没有影像（大片暗色/海面），而欧洲反而"有图"。

**结论：不是天地图缺数据，也不是 key 权限问题，而是本项目源码里的瓦片层级映射错位一级。**

- 天地图 WMTS `w`（球面墨卡托）矩阵集：第 1 级就是 **2×2** 个瓦片，第 L 级为 2^L × 2^L（实测 capabilities：L1=2、L8=256、L18=262144）。
- Cesium 默认 `WebMercatorTilingScheme`：第 0 级只有 **1×1** 个瓦片，第 L 级为 2^L。
- 源码把 `tileMatrixLabels` 设为 `['1'…'18']`，于是 Cesium 第 L 级会去请求天地图第 L+1 级的**同一行列号**——落到的是"经度折半后偏西 90°、纬度抬升"的另一个地方：`真实经度 ≈ 当前经度/2 − 90°`。
  - 例：相机在天津（117.2°E），实际请求到约 31.5°W 的南大西洋空白瓦片 → 看起来"中国区没数据"；
  - 例：相机在法罗群岛（7°W, 62°N），实际请求到加拿大北极（84°W, 77°N）的冰雪影像 → 看起来"有图但地貌不对"。

**修复**（已改在本地，未提交 Git）：

```ts
const tiandituTilingScheme = new WebMercatorTilingScheme({
  numberOfLevelZeroTilesX: 2,   // 与天地图第 1 级 2×2 对齐
  numberOfLevelZeroTilesY: 2,
})
// 传给 WebMapTileServiceImageryProvider
tilingScheme: tiandituTilingScheme,
```

**验证**：修复后相机位于四川一带（105.9°E / 31.0°N）时，实际请求的瓦片换算回经纬度正落在 102–107°E、31–35°N 的中国西南区域；直接拉取该瓦片（L11 / row 835 / col 1624）返回 200、13 KB 的四川山区卫星影像，`cia` 中文注记瓦片同位置返回 200。`lint` 与 `build:public` 通过。

**注意**：这是本地对上游代码的修改，`git pull` 更新上游后若该文件被覆盖，需要重新应用；也建议向作者提 issue（复现步骤即第 1–5 条）。回退方法：`git checkout -- 01_Web/src/data/mapSources.ts`（回退后将重现"中国区无瓦片"）。

## 十、公网访问（外网链接）

本机 5173 的 `vite preview` **会拒绝非本地域名**（对任意外部 Host 返回 `403 Blocked request. This host is not allowed`），所以公网入口不能直接指向 5173，而是另外起一个不做 Host 校验的静态服务，再由 Cloudflare 隧道转发。

| 组件 | 位置 / 端口 | 说明 |
|---|---|---|
| 静态服务 | `公网服务\serve-dist.mjs`，端口 **5180** | Node 原生 http，直接读 `01_Web\dist`；单页回落 `index.html`；带缓存头与跨域头 |
| 隧道客户端 | `tools\cloudflared.exe`（v2026.11.0） | `tunnel --url http://127.0.0.1:5180`，隐藏窗口常驻 |
| 启动 | `启动公网访问.bat` | 清理旧进程 → 起 5180 → 起隧道 → 等到地址 → 写入 `公网地址.txt` 并打开浏览器 |
| 停止 | `停止公网访问.bat` | 结束 `cloudflared.exe` 与占用 5180 的进程 |

**特性（务必知道）**：

1. **地址是临时的**：`*.trycloudflare.com` 是 Cloudflare 的免费快速隧道，**每次启动都是一个新的随机地址**，`停止公网访问.bat` 或关机会立即失效；地址每次都会写进 `公网地址.txt`。
2. **依赖本机在线**：电脑关机 / 睡眠 / 断网，公网就打不开；这不是托管，是"把本机端口映射出去"。
3. **内容就是发布版 `dist`**（含个人照片与全景）。任何人拿到链接都能看到——若要公开分享，建议改用 `build:public`（示例数据、不含个人足迹）单独构建一份再发布。
4. **天地图 key 在本机以外也能用**：实测从 `*.trycloudflare.com` 加载 840 条瓦片全部 200，说明当前 key 未做域名白名单。key 会随页面下发到任何访问者，若担心额度被蹭，到天地图控制台把「授权域名」收紧到最终域名，或换新 key。
5. **要固定域名/长期在线**，需换真正的托管方案（都需你的账号授权）：Cloudflare 命名隧道（绑定自有域名）、EdgeOne / Vercel / Netlify 等静态托管。本机可用的 EdgeOne Makers 连接器目前只支持「单文件 HTML 部署」，托管不了 StarMap 这种带 Cesium 资源（`cesium/` 目录数百 MB）的多文件应用，所以默认走隧道。

## 十一、固定公网域名（Netlify）

### 11.1 结论

**正式地址：<https://starmap-lac.netlify.app>**（Netlify 免费套餐，固定二级域名、免 ICP 备案、7×24 在线，与本机关机无关）

2026-11-17 从本机（天津，中国大陆网络）实测通过：

| 检查项 | 结果 |
|---|---|
| 首页 `/` | 200 |
| 静态资源 `cesium/Cesium.js`、`cesium/Widgets/widgets.css`、`assets/index-*.js` | 200 |
| 媒体文件 18 个（全景 original/preview/thumb + 封面） | **全部 200**，`Content-Type` 正确（`image/png` / `image/webp`） |
| 天地图瓦片 | 出图正常，中文省界/注记完整（瓦片修复在公网同样生效） |
| 国家卡 / 城市卡 | 「中国 → 红安县、浠水县」，Continent = Asia，封面为真实照片 |
| 360 全景 | 弹窗正常渲染 `PANO_0002-web.jpg · 8192 × 4096` |

### 11.2 为什么最终选 Netlify（三个平台逐个被否的过程）

| 平台 | 部署是否成功 | 国内实测 | 结论 |
|---|---|---|---|
| EdgeOne Makers（腾讯云） | ✅ 生产部署 `dp2grru3363f`（16 s） | ❌ `starmap-mmvvhkuj.edgeone.cool` 返回 **401** | 加速区域「全球可用区（含中国大陆）」下，项目/部署默认域**只能给 3 小时预览链接**（`?eo_token=`），长期公开必须绑**已 ICP 备案的自有域名**；区域建后不可改 |
| Vercel | ✅ `starmap-lac.vercel.app` Ready 17 s | ❌ 全部超时 | `*.vercel.app` 的 DNS 在本机被污染（`starmap-lbhaj5me2-red-mapple.vercel.app` 解析到 `31.13.75.5`），连接无法建立 |
| Cloudflare Pages | 未部署 | ❌ 控制台 `dash.cloudflare.com` 返回 **403** | 连登录授权都过不去，无法操作 |
| **Netlify** | ✅ 部署完成 9.4 s，417 文件 | ✅ 全部 200 | 控制台 `app.netlify.com` 200、`*.netlify.app` 200，可用 |

附：`*.pages.dev`、`*.github.io`、`*.netlify.app` 在本机都是可达的；`*.vercel.app`、`dash.cloudflare.com` 不可达。**EdgeOne 项目保留**，日后若办下备案域名，直接在「域名管理」绑自定义域名即可长期公开。

### 11.3 首次部署做了什么（可复现）

```powershell
# 1) 装 CLI（本地安装，装进 公网服务\node_modules，不污染全局）
cd "E:\王全的工作台\02-BIM项目文件\018-starmap\公网服务"
npm install netlify-cli --no-save --registry=https://registry.npmmirror.com/

# 2) 登录（浏览器授权，凭据存在 %APPDATA%\netlify\Config\config.json）
.\node_modules\.bin\netlify.cmd login

# 3) 建站点 + 发布静态产物
.\node_modules\.bin\netlify.cmd sites:create --name starmap-lac
.\node_modules\.bin\netlify.cmd deploy --prod --dir "E:\王全的工作台\02-BIM项目文件\018-starmap\StarMap\01_Web\dist"
```

两个必踩的坑，记下来：

1. **新站点默认是 Private**，直接访问返回 **401 Login Redirect**（跳 `app.netlify.com/edge-access`）。必须到「Project configuration → General → Visitor access → Edit visibility」选 **Public**（Production 与 Deploy Preview 都要 Public）并保存，否则永远 401。
2. 判断 404 是"真的缺文件"还是"路径写错"：媒体目录按哈希分目录（`media/user/china/hong-an/photo/<hash>/original.png`），不是 `photos/cover-红安县.png`。用脚本遍历 `dist\media` 逐个请求最稳，本次 18/18 全 200。

### 11.4 改了内容怎么重新发布

执行 `发布到公网.bat`（或手动两步）：

```powershell
cd "E:\王全的工作台\02-BIM项目文件\018-starmap\StarMap\01_Web"
npm run build:personal
cd "E:\王全的工作台\02-BIM项目文件\018-starmap\公网服务"
.\node_modules\.bin\netlify.cmd deploy --prod --dir "E:\王全的工作台\02-BIM项目文件\018-starmap\StarMap\01_Web\dist"
```

`deploy` 会做增量上传（本次首传只上 24 个新文件、其余命中平台去重），通常 10 秒内完成；地址不变。

### 11.5 已知限制与风险

1. **天地图配额**：公网浏览时 console 出现过 `429 Too Many Requests`（连续缩放后瓦片请求过密）。key 未做域名白名单，谁拿到页面谁就能用这个 key。长期公开建议：到天地图控制台把「授权域名」收紧到 `starmap-lac.netlify.app`，或换一个专用 key。
2. **内容是个人版**（`build:personal`，含真实照片、全景与真实足迹）。公开链接任何人都能看；若要对外演示，另建 `build:public`（示例数据）单独部署一个 Netlify 站点。
3. **Netlify 免费额度**：带宽 100 GB/月、构建 300 分钟/月，个人使用足够；超额会暂停服务，可在团队设置里看用量。
4. 站点页脚带「Powered by Netlify」小徽标（免费版不可隐藏）。
5. Vercel 的部署仍保留（`starmap-lac.vercel.app`），境外网络可访问，境内不可用；不用可随时在 Vercel 控制台删项目。

## 十二、日常更新无人机影像并同步公网

### 12.1 先说结论

公网站点是**纯静态**托管（Netlify），页面里的「编辑器」只在本地开发模式下存在（`localEditorAvailable = DEV && MODE==='personal'`），所以**线上无法直接上传**。正确链路是：**本机入库 → 构建 → 上传**。这套链路已经做成三个一键入口：

| 入口 | 用途 | 耗时 | 适合场景 |
|---|---|---|---|
| `投递全景并转网页版.bat` | 把 PTGui 253MP 原片转成 8192×4096 网页版并投进收件箱 | 每张 10–30 s | **全景必走**，否则 360 弹窗全黑 |
| `更新影像并发布.bat` | 预检 → 入库（缩略图/索引）→ 构建 → 上传 Netlify | 30–90 s | 常规更新（连拍照片、封面、已转好的全景） |
| `监视影像目录并自动发布.bat` | 常驻监视收件箱，文件夹安静 90 s 后自动跑上一行 | 自动 | 一次投几十张、不想手动点 |

地址永远不变：**<https://starmap-lac.netlify.app>**，上传成功即生效（Netlify 原子发布，不会出现"发布到一半"的坏页面）。

### 12.2 三种素材分别怎么放

| 素材 | 放置位置 | 关键规则 |
|---|---|---|
| 普通无人机照片 | `06_private\MediaInbox\中国\<城市>\drone\` | 2:1 以外比例都会按"普通照片"入库；EXIF 有 GPS 就自动带坐标，没有可后补 |
| 360 全景（PTGui 原片） | 先用 `投递全景并转网页版.bat` 转到 `…\<城市>\drone\` | **宽度必须 ≤16384**（本机 WebGL 纹理上限），比例必须 1.9–2.1；原片留在 `全景图\` 不要直接放进收件箱 |
| 城市封面 | `…\<城市>\photos\`，文件名以 `cover` 开头（`cover-红安县.png`） | 正则 `^cover(?:[-_. ]|$)`；改了封面就重新发布，路径含内容哈希不会命中旧缓存 |

收件箱里的**原始文件只读**：导入器只读不搬，绝不改名，删掉收件箱里的文件也不影响已入库的记录（真删记录要改 `user-media.local.json`）。

### 12.3 全景转码脚本（`工具\pano-web.cjs`）

```powershell
cd "E:\王全的工作台\02-BIM项目文件\018-starmap\StarMap\01_Web"
# 只分析，不写文件：确认比例与是否需要压缩
node "..\..\工具\pano-web.cjs" --city 红安县 --src "E:\…\全景图\红安" --dry-run
# 真正转换并投递到收件箱
node "..\..\工具\pano-web.cjs" --city 红安县 --src "E:\…\全景图\红安"
```

参数：`--city` 目标城市（必须在收件箱里已有该城市目录）、`--src` 源目录（可多个）、`--force` 覆盖已存在目标、`--dry-run` 只报不写、`--width` 目标宽度（默认 8192，高度自动取一半）。实测红安两张原片：`22512×11256 → 8192×4096`、`22572×11286 → 8192×4096`，单张约 3.0–3.6 MB。

### 12.4 自动同步（可选常驻）

双击 `监视影像目录并自动发布.bat`，窗口里会打印每次检测到的文件变化与发布结果。逻辑：用 `FileSystemWatcher` 监听 `06_private\MediaInbox` 整棵子树，**等 90 秒没有新变化**才启动发布（避免拷 50 张图时触发 50 次构建），发布期间不重入。要停止直接关窗口。批处理里有 `STARMAP_AUTORUN` 开关：自动模式下不弹「按任意键继续」、不自动开浏览器。

### 12.5 「真·在线后台上传」的可行性评估（不建议现在做）

| 缺口 | 现状 | 要做在线自助上传必须改造 |
|---|---|---|
| 数据读取 | `VITE_TRAVEL_ATLAS_DATA_MODE=local`，数据在构建时内联进 JS | 改成运行时从远程 JSON/API 拉取，前端要处理加载失败与缓存 |
| 存储 | 图片是构建产物的一部分（`dist\media`） | 换成对象存储或 Netlify Blobs，前端改用远程 URL |
| 上传入口 | 编辑器只在 `DEV` 模式（页面上传写私有层） | 另写一个管理页 + 服务端函数（Netlify Functions），并加口令/鉴权，否则谁都能往你站点塞图 |
| 全景转码 | 本地 `sharp` 跑 253MP 原片 | Serverless 内存/超时不够，需前端先压缩再传，或接外部转码服务 |
| 编辑一致性 | `travel-map.local.json` 是本地文件 | 需要一套后端数据模型 + 并发写保护 |

工作量粗估：**2–3 个工作日**改代码 + 之后长期维护鉴权与存储费用。结论：除非你每周都要更新好几次、且希望"不碰电脑也能传图"，否则 12.1 的三个一键入口性价比更高——一次更新 30–90 秒，且全程可回滚（`_备份\` 里有发布前的数据副本）。

### 12.6 更新时最容易踩的四个坑

1. **全景直接扔原片** → 360 弹窗文字正常、画面全黑（纹理超 16384）。先跑 `投递全景并转网页版.bat`。
2. **新城市没有先建目录** → 导入器拒收（"城市不存在"）。先加 `travel-map.local.json` 记录 + 建 `MediaInbox\中国\<城市>\drone|photos`。
3. **预检报 error 还硬发布** → `更新影像并发布.bat` 会在第 1 步直接停住，按「需要处理」逐条改即可，别绕过。
4. **同一次发布里既改了封面又换了全景** → 一起做，一次上传；Netlify 增量上传通常只有几 MB（命中平台去重），不用等很久。

## 十三、图形小工具：StarMap 影像工具

### 13.1 结论一览

双击 `StarMap影像工具.bat` → 自动弹出 `http://127.0.0.1:5199` 的工具页面，四件事都能在这一个窗口里点完。

| 能力 | 在工具里的位置 | 背后做的事 |
|---|---|---|
| 新建城市目录 | 第 1 张卡「新建城市」 | 往 `travel-map.local.json` 追加一条城市记录（状态 visited），并建好 `MediaInbox\中国\<城市>\drone`、`photos` 和空 `media.json` |
| 图片选择 | 第 2 张卡，拖拽或点「选择图片」 | 浏览器多选/拖放，逐张显示大小，可单张移除 |
| 图片自动处理 | 第 2 张卡的类型选择 + 后台 | 全景自动压成 8192×4096；普通照片原样入库；封面自动命名 `cover-<城市>`；同时写好 `media.json` 的日期与分辨率 |
| 自动上传发布 | 第 3 张卡「一键投递并发布」 | 预检 `media:check` → 入库 `media:import` → 构建 `build:personal` → `netlify deploy --prod`，日志实时回显 |

### 13.2 为什么是「本地网页」而不是桌面 exe

先试桌面 GUI（Python tkinter），实测跑不起来：

- PATH 上的 `python 3.13.18` 是 Agent 运行环境自带的，`import tkinter` 能过，但 `tk.Tk()` 直接报 `Can't find a usable init.tcl`——它没有 Tcl/Tk 数据文件。
- 本机没有 `py` 启动器，`C:\Program Files`、`%LOCALAPPDATA%\Programs` 下也没有 Python 安装。

于是改成 **Node 起一个只监听 `127.0.0.1` 的小服务 + 网页界面**：Node v22.23.2 本来就有（netlify-cli 就跑在它上面），不需要再装 Python，也不需要任何 npm 依赖。

### 13.3 三步用法

1. **选城市 / 新建城市**：下拉框显示「城市（无人机 N / 封面 M）」。新建时填中文名、英文名、经纬度、日期、地区（地区里带「亚洲」才会显示大洲），点创建即可。**城市中文名填完（停顿 0.7 秒或失焦）会自动按天地图地名检索填入纬度/经度**，检索词可写「红安县」也可写「湖北省黄冈市红安县」；查不到时点「按名称重新查坐标」重试，或直接手改经纬度。
2. **选素材**：类型选「无人机素材」或「城市封面」；把图片拖进虚线框或点选；拍摄日期与标题前缀会跟着城市自动带出，可改。
3. **一键投递并发布**：只想入库不想上线时点「仅投递（不发布）」。发布阶段的输出（Netlify 上传进度、Deploy URL、退出码）会逐行刷在日志区。

### 13.4 它对每类文件做了什么

| 你丢进去的文件 | 判定 | 处理结果 |
|---|---|---|
| 2:1 全景，长边 > 8192（例如 22512×11256） | 全景 | 转成 8192×4096 JPEG（quality 82、mozjpeg），命名 `<原名>-web.jpg` |
| 2:1 全景，长边 ≤ 8192 | 全景 | 原样复制，`kind=panorama360` |
| 非 2:1 的无人机照片 | 普通照片 | 原样复制，`kind=aerialPhoto` |
| 视频（mp4/mov） | 视频 | 原样复制到 `drone`，`kind=video` |
| 类型选「城市封面」 | 封面 | 重新编码为 `photos\cover-<城市>.<扩展名>`，同名覆盖 |

全景/照片入库时会同时写 `media.json` 的 `date` 与 `resolution`——导入器要求无人机类素材必须有这两个字符串，否则只会进目录、不显示在 Drone Media。

### 13.5 文件清单与端口

| 文件 | 作用 |
|---|---|
| `StarMap影像工具.bat` | 启动器：检查 Node → 打开浏览器 → 起服务；关掉窗口即退出 |
| `工具\media-server.mjs` | 本地服务（端口 5199，仅 `127.0.0.1`）：城市列表、新建城市、单文件上传入库、发布流式输出、打开收件箱、按地名查坐标（`/api/geocode`，读 `06_private\config\.env.local` 的 `VITE_TIANDITU_TOKEN` 调天地图） |
| `工具\media-tool.cjs` | 底层逻辑：`list` / `add-city` / `import`，也可直接在命令行用 |
| `工具\影像工具.html` | 界面（内联 CSS/JS，无外部资源，离线可用） |

命令行等价用法（不想开网页时）：

```powershell
node "工具\media-tool.cjs" list
node "工具\media-tool.cjs" add-city --city 黄州区 --city-en Huangzhou --lat 30.434 --lng 114.879 --date 2026-07-18 --region "亚洲 / 湖北 · 黄冈"
node "工具\media-tool.cjs" import --city 红安县 --type drone --date 2026-07-20 --title "红安县航拍全景" --files "D:\a.JPG" "D:\b.JPG"
node "工具\media-tool.cjs" import --city 红安县 --type cover --files "D:\封面.png"
```

### 13.6 已验证

| 项目 | 结果 |
|---|---|
| `list` | 正确列出红安县（无人机 2 / 封面 1）、浠水县（2 / 1），城市 ID 为 `china__hong-an`、`china__xishui` |
| `add-city` | 在临时私有层建「黄州区」「团风县」成功，记录与目录一起生成 |
| `import` 复制路径 | 8192×4096 全景 → 原样入库，`media.json` 写入 `titleZh` 编号 01 |
| `import` 转码路径 | 22512×11256 → 8192×4096、22572×11286 → 8192×4096，单张 3.6 MB |
| 页面 `/api/import` | 60 MB 原片经浏览器上传 → 本机服务 → 转码入库，返回 `bytes: 59799476` |
| `media:check` 预检 | 对工具生成的素材 0 错误、无「缺少日期或分辨率」警告 |
| `/api/publish` 流式 | `__EXIT__0`；417 文件、Deploy live，`https://starmap-lac.netlify.app` 首页 200 |
| `/api/geocode` 自动坐标 | 红安县 → `31.290623, 114.613140`（行政区检索）；黄冈市、黄州区、浠水县、上海市、北京市朝阳区、湖北省黄冈市红安县均命中；浏览器页面实测：输入「红安县」后纬度/经度自动填好，提示条同步显示命中地名 |

### 13.7 已知限制

1. **单张独立坐标/高度还填不了**：工具只写 `date` 与 `resolution`。要多机位精确点位，在 `<城市>\media.json` 里给对应键补 `position`（结构照抄红安县那份）。
2. **封面一个城市只留最新一张**：同名覆盖，导入器按 `cover` 前缀取第一张。
3. **上传走的是本机回环**，不是公网上传：253MP 单张约 60 MB，本机传完再转码，耗时以转码为主。
4. **端口固定 5199**：重复双击时新窗口会提示「端口已被占用」，直接开已有页面即可。
5. **依赖本机环境**：Node + `StarMap\01_Web\node_modules\sharp`。重装依赖（`npm ci`）后仍可用，别把整个 `01_Web\node_modules` 删掉。
6. **页面关掉不会中断发布**：发布在服务进程里跑，重新打开页面日志会从当次开始，历史输出看启动它的那个黑色窗口。

## 十四、界面调整：公司名标题 + 无人机影像按拍摄日期分栏

### 14.1 改了什么

| 位置 | 改前 | 改后 | 文件 |
|---|---|---|---|
| 浏览器标签页标题 | `StarMap` | `中冶交通建设集团有限公司项目浏览器` | `StarMap\01_Web\index.html`（`<title>`，同时 `<html lang>` 改 `zh-CN`） |
| 页面顶部主标题 | `StarMap` | `中冶交通建设集团有限公司项目浏览器` | `StarMap\01_Web\src\components\AtlasHeader.tsx`（字号由 `text-4xl sm:text-5xl` 降为 `text-[22px] sm:text-[28px] leading-tight`，保证 16 个汉字在 760px 容器内单行） |
| 右侧栏「无人机影像」 | 缩略图平铺，不区分日期 | 按拍摄日期分栏：日期标题（`YYYY.MM.DD` + `N 张`）横跨整行，其下是该日期的缩略图，日期从新到旧；无日期者归入「未记录拍摄日期」末位；编辑模式下仍按原顺序以便拖拽 | `src\components\DroneMediaCard.tsx`（新增 `DroneDisplayEntry` 类型、`formatDroneDate`、`groupedDisplay` 分组）、`src\index.css`（`.drone-media-date-head` 及其配色） |

分栏实现要点：

1. 数据结构：`displayedItems` 先 `filter` 成 `DroneMediaItem[]`，再按 `item.date`（`^\d{4}-\d{2}-\d{2}$`）分组。
2. 渲染单元：`{kind:'date',key,label,count}` 与 `{kind:'item',item,number}` 混排；`number` 是**组内**重新编号的 `01/02…`。
3. `useMemo` 必须在组件早退 `if (!city || …) return null` **之前**调用，否则 `react-hooks/rules-of-hooks` 报错。
4. 日期标题用 `grid-column: 1 / -1` 通栏，缩略图仍是两列网格；轨道 `max-height` 由 `min(390px,31dvh)` 调为 `min(338px,25dvh)`，为日期标题腾出空间，避免右侧「城市信息」被压得过短。

### 14.2 发布方式与一个必须避开的坑

本次改动已上线：`https://starmap-lac.netlify.app`（标签页标题、顶部标题、右栏分栏均已生效，2026-07-20 / 2026-07-16 两组各 2 张）。

**坑**：在 `StarMap\01_Web` 目录直接跑 `netlify deploy` 是错的，原因有两个，本次都踩到了：

1. `01_Web\.netlify\state.json` 里绑定的是另一个站点 ID（已被 CLI 自动生成），直接部署会发到 `chimerical-flan-8cbc1f.netlify.app`，而不是 `starmap-lac`。
2. `01_Web\.netlify\netlify.toml` 带 `command = "npm run build:public"`，CLI 会**自动重跑一次公开数据构建**，把 `dist` 覆盖成示例数据（线上只剩法罗群岛 / 冰岛，中国与红安县全部消失）。

正确姿势（二选一）：

```powershell
# 方式一：走既有脚本（推荐，脚本已 cd 到「公网服务」，那里绑的就是 starmap-lac）
更新影像并发布.bat

# 方式二：手动部署，务必带 --site 和 --no-build，且 dist 必须是用 build:personal 产出的
cd "E:\王全的工作台\02-BIM项目文件\018-starmap\StarMap\01_Web"
npm run build:personal
& "E:\王全的工作台\02-BIM项目文件\018-starmap\公网服务\node_modules\.bin\netlify.cmd" deploy --prod --dir dist --site 0917f38b-b3f4-49ea-910e-1fb05e6eaf3d --no-build
```

本次已把 `01_Web\.netlify\state.json` 的 `siteId` 改回 `0917f38b-b3f4-49ea-910e-1fb05e6eaf3d`，但仍建议按上面方式二显式带 `--site`。

### 14.3 验证记录

| 项目 | 结果 |
|---|---|
| `npm run lint` | 0 error（中途 `useMemo` 位置错误、`displayedItems` 类型未收窄各报一次，均已修正） |
| `npm run build:personal` | 成功，约 2s；`dist\assets\index-*.js` 随改动更新 |
| 线上标签页标题 | `<title>中冶交通建设集团有限公司项目浏览器</title>` |
| 线上顶部标题 | 与公司全名一致，单行不换行 |
| 线上右栏分栏 | 红安县显示 `2026.07.20（2 张）`、`2026.07.16（2 张）` 两组，组内编号 01/02 |
| 数据完整性 | 中国 / 红安县 / 浠水县及全部全景仍在（曾因 `build:public` 覆盖丢失，已重新以 personal 产物发布修复） |

### 14.4 未改动（保留原样，待确认）

1. `src\components\InfoCard.tsx:219` overview 面板标题仍是硬编码 `'StarMap'`（页面顶部改公司名后，这里是唯一残留，只在「Overview」态可见）。
2. 顶部副标题仍是英文：`Map the places you have visited and turn every journey into a story you can revisit.`
3. 红安县 2026-07-20 的 `PANO_0003-全景-web.jpg`、`PANO_0004-全景-web.jpg` 为真实新增内容（2026-11-17 10:53 入库），非重复文件，未做删除或改名。
4. 源码改动（`AtlasHeader.tsx`、`DroneMediaCard.tsx`、`index.css`、`index.html`）与早前的 `mapSources.ts` 天地图 2×2 修复均**未提交 Git**。

### 14.5 右栏精简：城市态只保留「无人机影像」

按用户要求，城市选中态（右侧 `CITY INFO` 面板）去掉以下栏目，只留城市名称/日期抬头与无人机影像：

| 去掉的栏目 | 原位置 | 处理 |
|---|---|---|
| Country | 指标卡（城市态） | 随指标卡整体隐藏 |
| Continent | 指标卡（城市态与国家态） | 城市态隐藏；国家态的 `Continent` 瓦片直接删除（`continentRules` / `getContinentName` 一并删除） |
| City Photos | 深色相册面板（城市态） | 隐藏（国家态的 `CITY CARDS` 城市选择网格保留） |
| Preview image | 封面预览卡 | 隐藏 |
| Focus: <城市> | 面板页脚 | 城市态隐藏（国家/总览态保留） |

实现方式：`src\components\InfoCard.tsx` 内新增三个开关，改动可一行回滚：

```tsx
const showCityCoverPreview = false   // 封面预览卡
const showCityMetrics = false        // Country / Continent 指标
const showCityPhotoGallery = false   // City Photos 相册
```

配合 `src\index.css`：`.drone-media-track` 的 `max-height` 由 `min(338px,25dvh)` 放大到 `min(430px,46dvh)`——面板腾空后，红安县两个日期分组（各 2 张）可一次全部显示，无需滚动。实测城市面板高度 147px，无人机卡片 490px，轨迹区 393px。

保留未动的：左侧「国家足迹」列表、国家态的「Visited Cities / CITY CARDS」、总览态的 `StarMap` 标题与简介（如需一并处理请说明）。

### 14.6 交互新增：单击地图上的无人机点位 → 打开对应全景

需求：地图缩放到显示无人机点位（小点/徽标）时，**单击**该点位直接打开对应 360 全景。

改动：

| 文件 | 改动 |
|---|---|
| `src\components\CesiumAtlasGlobe.tsx` | 无人机 `Entity`：`onClick={() => onOpenDronePanorama(item)}`，同时保留 `onDoubleClick` 指向同一函数（双保险）；Props 新增 `onOpenDronePanorama: (item: DroneMediaItem) => void`，移除已无用的 `onSelectDroneMediaItem` |
| `src\App.tsx` | 新增 `openPanoramaKeepingView(item)`，只 `setPanoramaModalItem(item)`，不改任何相机/选中状态；`<CesiumAtlasGlobe onOpenDronePanorama={openPanoramaKeepingView} />`。右侧卡片的 `openPanorama` 保持原逻辑（会选中并飞相机） |

行为约定：

1. 单击无人机点位 → 直接弹全景，弹窗标题/文件名/分辨率与右侧卡片一致；
2. 单击点位同时在右栏选中该影像（右侧卡片高亮）；
3. 单击点位**不改变视角**：`openPanoramaKeepingView` 不触碰 `globeDistance`、`activeDroneMediaItemId` 等会触发 Cesium 相机命令的状态，因此点击前后的相机位置/高度完全一致；
4. 城市点、航线、空白处的单击行为不变；Cesium 默认「双击飞行到实体」保留（双击会飞行到该点，弹窗此时已打开，无影响）。

实测（本地 5173 + 公网 starmap-lac 均通过）：红安县放大到无人机层级，单击 `Drone 01` → 弹出「红安县航拍全景 01 / PANO_001-web.jpg · 8192 × 4096」；关闭弹窗后对点击前后两帧做逐像素比对（4 像素步采样，53482 点），平均色差 2.1/765、超阈值差异点 1.2%，即视角未发生移动。注意必须点在圆点/标签本体上，点在空白地面会触发原有取景逻辑。

**踩坑记录（重要）**：曾尝试用「双击开全景」，并在 viewer 就绪时调用
`viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK)`
去掉默认双击飞行。结果用户实测双击无效。根因：resium 给实体注册的 `onClick/onDoubleClick` 监听与 Cesium 默认动作**共用同一个 `screenSpaceEventHandler`**，`removeInputAction` 会把该事件类型的**全部**监听（含 resium 的实体监听）一起移除。因此：**不要对 viewer 的 `screenSpaceEventHandler` 调用 `removeInputAction`**，否则实体事件会整体失效；改用 `onClick` 是更稳的路径。

已知限制：同一位置多个点位会重叠（红安县 2026-07-20 的 03/04 与 2026-07-16 的 01/02 坐标几乎重合），单击命中的是最上层那一个；如需区分，需要在 `<城市>\media.json` 里给每个键补不同 `position`。

### 14.7 左栏改名 + 城市名/无人机标题可手改（本地编辑版）

| 位置 | 改前 | 改后 | 文件 |
|---|---|---|---|
| 左栏标题 | `COUNTRY FOOTPRINT` / `国家足迹` | `PROJECT NAVIGATION` / `项目导航` | `src\components\CountrySelector.tsx` |
| 左栏城市行 | 只能点选，不能改名 | 行右侧小铅笔 → 「中文名 / English」内联输入 + ✓/✕，回车或 ✓ 保存 | 同上（`startCityRename` / `saveCityRename`） |
| 右栏无人机标题 | 固定 `${城市中文名}无人机影像` | 标题右侧小铅笔，可改成任意标题；清空再保存 = 回到默认 | `src\components\DroneMediaCard.tsx` |

数据与生效：

- 城市改名写 `06_private\data\editor-state.local.json` 的 `cityNameOverrides`，无人机标题写 `droneTitleByCity`；`scripts\local-editor-plugin.mjs` 负责归一化（去空串、trim）与删城市时联动清理。
- 保存后 `window.location.reload()` 重新读取私有层，左栏、右栏抬头、City Cards、地图标签一起变。
- **铅笔只在编辑版出现**（`localEditorAvailable = import.meta.env.DEV && MODE === 'personal'`，即 `npm run dev:personal`）；静态发布版没有写接口，因此不显示，但已保存的名称会随构建烘进 `dist`。
- 改名不动城市 ID（如 `china__hong-an`），影像、记录、封面都不受影响。

### 14.8 地图点位标签引用左栏城市名

| 位置 | 改前 | 改后 |
|---|---|---|
| 城市点标签 | `city.nameEn`（Hong'an） | `city.nameZh`（红安县），回退到英文名 |
| 无人机点位标签 | 固定 `Drone 01` | `${左栏城市中文名} Drone 01`（如「红安县 Drone 01」） |

实现：`src\components\CesiumAtlasGlobe.tsx` 城市 `label.text` 改成 `city.nameZh ?? city.nameEn ?? city.id`；无人机 `Entity` 的 map 内先取 `const cityLabel = cityById[activeDroneMediaCityId]?.nameZh`，再拼 `` `${cityLabel ? `${cityLabel} ` : ''}Drone ${itemNumber}` ``。由于 `city.nameZh` 已应用 `cityNameOverrides`，左栏改名后地图标签同步变化。

### 14.9 影像工具：填城市名自动查经纬度

`工具\media-server.mjs` 新增 `GET /api/geocode?name=...`：从 `06_private\config\.env.local` 读 `VITE_TIANDITU_TOKEN`，先调天地图 `v2/search`（行政区取 `area.lonlat`，兴趣点取 `pois`），不中再退 `geocoder`；带 6 小时内存缓存与 429/403 退避重试，请求头伪装浏览器 UA + Referer（纯 Node 默认 UA 会被天地图拒 403）。`工具\影像工具.html` 在「城市中文名」输入停顿 0.7 秒或失焦时自动填纬度/经度，并给出命中提示与「按名称重新查坐标」按钮。

实测：红安县 31.290623/114.613140、黄冈市 30.456132/114.867307、黄州区 30.436330/114.873820、浠水县 30.454325/115.260185、上海市 31.273094/121.373237、北京市朝阳区 39.920520/116.437340、湖北省黄冈市红安县 31.290623/114.613140。

### 14.10 事故与恢复：红安县 4 张全景被清空

现象：某次本地编辑保存后，`MediaInbox\中国\红安县\media.json` 变成 `{}`、`drone\` 目录被清空（仅剩 `photos\cover-红安县.png`），构建出的公网版红安县「无人机影像」整块消失；`editor-state.local.json` 里同时出现 `droneOrderByCity: { china__hong-an: [] }` 和一处被写坏的 `droneTitleByCity: "????????"`、`addedCountries[0].nameZh: "??"`。

根因推断：用 PowerShell `Invoke-RestMethod -Body <string>` 发 PUT 时，中文按单字节编码送出，服务端收到成串 `?`；另一次保存把空顺序写入，配合删除隐藏项逻辑把文件删净。**结论：改私有层 JSON 一律用 UTF-8 字节**（`[Text.Encoding]::UTF8.GetBytes($json)`），不要直接传字符串。

恢复手段（已验证）：Netlify 保留历史 Deploy，`GET https://api.netlify.com/api/v1/deploys/<deployId>/files` 列出旧部署文件清单，按 `/media/user/china/hong-an/panorama360/<hash>/original.jpg` 下载 4 张 8192×4096 网页版；hash 与文件名的对应关系可从旧部署的 `assets/index-*.js` 里 `originalFileName` 字段反查。下载后放回 `MediaInbox\中国\红安县\drone\`，用 `media.bak` 还原 `media.json`，再 `npm run media:import` → `npm run build:personal` → `netlify deploy --prod`。恢复后公网：4 张全景、按 2026.07.20 / 2026.07.16 两组显示，标题「红安县无人机影像」，弹窗标题「红安县航拍全景 03」。原始 07-20 原片本机已不存在（`全景图\红安` 只有 07-16 两张），若要原片需另行找回。
### 14.11 影像工具：把 EXIF（GPS）写进处理后的图片

问题：旧版 `media-tool.cjs` 转码全景时只写 `titleZh/date/resolution`，`media.json` 里没有 `position`；而公网 `CesiumAtlasGlobe.tsx` 用 `hasDronePosition(item)` 过滤，没有经纬度的素材只进右栏、不上地图，于是「上传 6 张、地图只有 2 个点」。

改动（`工具\exif-gps.cjs` 新增、`工具\media-tool.cjs` 接入、`工具\影像工具.html` 加提示与可选覆盖坐标、`工具\media-server.mjs` 透传 `lat/lng/alt`）：

| 项 | 行为 |
|---|---|
| 读源图 | 用 `01_Web\node_modules\exifr` 读 `latitude/longitude/GPSAltitude/DateTimeOriginal` |
| 坐标优先级 | 手动覆盖（`--lat/--lng/--alt` 或页面「覆盖坐标」）> 源图 EXIF GPS > 城市记录坐标（`travel-map.local.json`） |
| 写图 | 转码/复制的 JPEG 一律在 SOI 后插入 APP1 EXIF（Make/Model/Orientation/DateTime/ImageDescription + GPS 经纬度 DMS/海拔/D 日期），旧的 EXIF APP1 被替换；`exif-gps.cjs` 纯 Buffer 实现，不引第三方库 |
| 写目录 | `media.json` 每条无人机素材写 `position: { lat, lng, altitudeMeters }`，公网即可画出点位 |
| 拍摄日期 | 页面未填日期时回退源图 `DateTimeOriginal` |

实测（隔离私有层 `STARMAP_PRIVATE_ROOT` 指向临时目录，不碰真实收件箱）：`PANO_0002 全景.jpg`（22512×11256，带 GPS 31.017236/114.594773、海拔 105.52）→ 输出 8192×4096，`exifr` 反读 GPS 一致、`sharp` 可解码、`media.json` 写入 position；把同图去 EXIF 后重导入 → 坐标回退城市记录并写进 EXIF；再加 `--lat 31.0175 --lng 114.5949 --alt 88.5` → 三者一致。

注意：此改动只对**新投递**的素材生效。已入库的 `PANO_0003/0004/0009/0010` 网页版 EXIF 已被历史转码抹掉、原片不在本机，无法自动补坐标，需重新投递原片或用页面「覆盖坐标」重传。
### 14.12 影像工具：素材增删 + 左栏城市名 / 右栏标题编辑

影像工具（`http://127.0.0.1:5199`）新增两块能力，所有改动都落在私有层，必须「重新构建并发布公网」后才上线。

| 能力 | 入口 | 接口 | 落盘 |
|---|---|---|---|
| 列出该城市已上传素材（含缩略图、类型、日期、分辨率、坐标有无） | 「4 已上传素材」 | `GET /api/media?city=`、`GET /api/media/thumb?city=&key=` | 读 `MediaInbox\中国\<城市>\media.json` |
| 删除素材（文件移入 `_trash\<时间戳>\`，`media.json` 先备份 `.bak`） | 每行「删除」 | `POST /api/media/delete?city=&key=` | 同上 |
| 改单条素材标题 / 拍摄日期 | 每行「保存标题」 | `POST /api/media/update` | 同上 |
| 改左栏城市显示名（中文 / 英文） | 「2 修改名称」 | `POST /api/labels/city-name` | `editor-state.local.json` 的 `cityNameOverrides.<cityId>` |
| 改右栏「无人机影像」标题 | 「2 修改名称」 | `POST /api/labels/drone-title` | 同上 `droneTitleByCity.<cityId>` |
| 读当前名称设置 | 选城市自动加载 | `GET /api/labels?city=` | 同上 |
| 构建并发布 | 「重新构建并发布公网」 | `POST /api/publish`（流式回写 bat 输出） | 构建 `dist` + Netlify deploy |

要点：素材增减只动 `media.json` 与文件，不碰 `user-media.local.json`（后者由 `npm run media:import` 重建）；删除是「移入 `_trash`」而非真删，可手动找回；城市改名只影响显示，不改收件箱目录名与 `travel-map.local.json` 记录；标题留空即恢复默认「城市名 + 无人机影像」。

实测：红安县列出 6 条全景（有坐标 2 / 无坐标 4），缩略图正常；改名保存与「恢复默认」往返后 `cityNameOverrides`、`droneTitleByCity` 均为 `{}`；单条标题保存后 `media.json` 值不变；删除在隔离私有层验证会移入 `_trash` 并从 `media.json` 去条目。浏览器控制台无报错。

### 14.13 上传失败排查与可诊断性改造（2026-11-17）

故障现象：用户在影像工具点上传，页面报「上传失败」，公网没有新影像。

已排查的事实链：

| 时间（CST / UTC） | 事实 | 说明 |
|---|---|---|
| 15:35:49 | 5199 服务被重启（PID 31732 → 35796） | 该时刻正在传输的上传会被浏览器判为 `xhr.onerror`，页面只显示「上传失败」，服务端没有任何记录 |
| 15:38–15:39（07:38–07:39Z） | `_trash` 出现 6 条删除记录 | 用户用「4 已上传素材」删除了旧 6 条 |
| 15:48（07:48Z） | `_trash` 再出现 6 条（含 PANO_0005/0006） | 说明 0005/0006 曾经成功转码入过库 |
| 15:49:03–15:49:54 | `drone\` 4 个 web 文件写入，各比旧版大 316 字节，`media.json` 4 条均带 `position` | 4 次上传实际是**成功**的，EXIF 注入生效 |
| 15:52:22 | `dist` 与 `index.html` 重建完成（vite 产物齐全） | 说明 `build:personal` 成功 |
| 07:41:27Z 之后 | Netlify 无任何新部署（最新仍是 `6afc052704a7207d810f3613`） | 一键发布在 deploy 环节失败并已退出：构建成功但没上传 |

根因：**上传/发布故障来自服务与发布链路本身的中断，不是图片或代码路径**。同一份 57MB / 253MP 原片在隔离服务（5299）上「仅投递」与「草稿部署」都能成功，说明转码、EXIF 注入、Netlify 上传能力都正常；真正丢的是「重启窗口内的一脚上传」和「构建后没走到 deploy」。

本轮改造（都是为下一次失败留证据、并自动兜底）：

| 改动 | 文件 | 行为 |
|---|---|---|
| 服务端持久日志 | `工具\media-server.mjs` | 每次上传追加 `06_private\.cache\media-server.log`：收到上传（城市/类型/文件名/日期/覆盖坐标）、接收字节数、入库结果与耗时、异常堆栈；发布全过程逐行记录并以 `发布结束 exit=…` 收尾 |
| 日志查看入口 | `工具\影像工具.html` | 「5 运行日志」标题旁新增「服务日志（持久记录）」链接，打开 `/api/logs?lines=500` 即见原始日志 |
| 上传自动重试 | `工具\影像工具.html` | 网络层中断（服务重启 / 进程被杀）自动重试 1 次；仍失败时给出明确指引，不再只报「上传失败」 |
| 上传超时 | 同上 | XHR 超时 15 分钟，避免大图上传被判死 |
| 发布显式指定站点 | `更新影像并发布.bat` | deploy 改为 `--prod --no-build --site 0917f38b-b3f4-49ea-910e-1fb05e6eaf3d`，不再依赖目录 link 状态；构建已在第 3 步完成，避免重复构建 |

验证：隔离实例上传 57MB 原片 → 日志三行（`收到上传` / `接收完成 bytes=59799476` / `入库成功 … 11.2s`）；上传非图片触发失败路径 → 日志 `[error] 入库失败 … 不是支持的图片/视频格式`，页面 JSON 同步返回该原因；`node --check` 通过；5199 重启后 `/api/logs` 可读。

运维约定：**不要在用户点上传的过程中重启 5199**；需要改服务端代码时先确认页面空闲（`%TEMP%\starmap-tool-upload` 无残留文件）。发布失败的原始输出现在可以从 `media-server.log` 里直接翻到，不再只存在于当时那个页面。

**根因确认（16:10 重跑完整发布）**：`npm run build:personal` 正常（`✓ built in 3.70s`），到第 4 步 `netlify deploy --prod` 时返回：

```
Warning: JSONHTTPError: 403
{"error":"Account credit usage exceeded - new deploys are blocked until credits are added"}
```

即 Netlify 账户额度已用尽，**新部署被平台侧拒绝**，与本机代码、图片、网络无关。此前 07:59Z 的草稿部署（`6afc097ad8049e80c65b22a3`）能成功但只是 draft（无 `published_at`），正式发布会再次撞上同一额度锁。处理方式：在 Netlify 后台加额度 / 升级套餐后重跑「一键投递并发布」，或改用其他托管。
---

### 14.14 托管迁移：Netlify → EdgeOne Pages 免费版（2026-11-18）

**背景**：Netlify 免费额度（300 credits/月）在 2026-11-17 用尽，正式部署被平台 403 锁死。经对比后决定用腾讯云 EdgeOne Pages 免费版承接静态站点。

**已完成**：

| 项 | 内容 |
|---|---|
| CLI | `npm i -g edgeone`，版本 1.7.2；登录态在 `%USERPROFILE%\.edgeone` |
| 账号 / 站点 | zone `makers-workspace`（`zone-3xbslksokssc`）· Free · Active |
| 项目 | `starmap-lac`，Project ID `makers-usa88fszfoer`，直接上传类型，加速区域 global（不含中国大陆） |
| 部署 | `dpv3pie0r94x`（16:31 首次）→ `dp2lftjozqsv` → `dpfw61t2cnb4`（2026-11-18 端到端验证） |
| 发布命令 | `edgeone makers deploy "%APP%\dist" -n starmap-lac -e production`（`edgeone pages deploy` 已废弃，CLI 会提示改用 `makers`） |

**关键限制：默认域名不能当正式地址**。控制台「域名管理」只有一条 `starmap-lac-mpxvyu7v.edgeone.cool`（状态“已生效”），但不带参数访问返回 401：

```
401: UNAUTHORIZED (Code: UNAUTHORIZED)
Access Restricted or Authentication Expired.
Site Owner: Click "Preview" in the console for a new link.
```

官方规则：免费版默认域名只提供 **3 小时限时预览**，必须带 `?eo_token=…&eo_time=…`，过期即失效；`starmap-lac.edgeone.cool`、`starmap-lac.edgeone.app` 均 404。要长期访问只有一条路：**在「域名管理」添加自定义域名**（global 区域免 ICP，绑自有域名后走 DNS CNAME）。这也解释了为什么每次部署 CLI 都会打印一条带 token 的 Deploy URL。

**代码改动**：

| 文件 | 改动 |
|---|---|
| `更新影像并发布.bat` | 第 4 步由 `netlify deploy` 改为 `edgeone makers deploy "%APP%\dist" -n starmap-lac -e production`；删除 netlify-cli 安装分支；CLI 存在性改用 `call edgeone --version` 探测（`where edgeone` 在 cmd 上下文误判并触发重装 51s）；结束提示改为“默认域名 3 小时有效，去控制台点「预览」取新链接”，并直接打开控制台项目页 |
| `影像工具.html` | 顶部链接由 Netlify 站点改为 EdgeOne 控制台；发布日志文案改 EdgeOne；新增 `lastDeployUrl`，从 CLI 输出里抓 `Deploy URL:` 并原样回显到页面日志，发布成功即显示本次可用链接（3 小时有效） |
| `media-server.mjs` | 未改。`REQUEST_HEADERS.Referer` 仍是 `https://starmap-lac.netlify.app/`（天地图解算接口用），与托管平台无关，暂不动以免影响地理编码 |

**验证记录（2026-11-18）**：

- 端到端跑 `STARMAP_AUTORUN=1` 执行 `更新影像并发布.bat`：预检 → 入库 → `build:personal`（2.06s）→ 上传 464 文件 / 91MB → `Deploy Success`，全流程 exit 0；
- 第二遍复跑确认 CLI 探测修复：不再重装，直接上传，20s 完成（`dpfw61t2cnb4`）；
- 浏览器打开带 token 的最新链接：标题「中冶交通建设集团有限公司项目浏览器」，Cesium 地球与点位渲染正常，控制台无报错；
- 带 token 打开 `media/user/china/hong-an/panorama360/12780c4efcaf78a7/original.jpg`：8192×4096 全景正常显示，说明 4 张全景素材随部署完整上线。

**运维约定**：

1. 日常发布仍是一键：影像工具「一键投递并发布」或双击 `更新影像并发布.bat`，会打印本次 3 小时有效的链接；
2. 链接过期后：控制台 → 项目 `starmap-lac` → 右上「预览」→ 生成新链接；
3. 免费版额度：流量/请求不限、500 次构建/月、单文件 25MB（本项目最大 5.6MB 的 `Cesium.js`，无风险）；
4. 想要永久链接：先准备一个可改 DNS 的域名，在「域名管理」→「添加自定义域名」按提示加 CNAME；global 区域无需备案，若要大陆加速则需 ICP 备案并选大陆区域（新建项目时选，建后不可改）。
---

### 14.15 脚本清理：根目录 .bat 收敛为 8 个（2026-11-18）

清理原则：**失效的归档、在用的保留**。归档目录 `_archive\bat-20261118\`，需要时可原样移回。

| 脚本 | 处置 | 原因 |
|---|---|---|
| `发布到公网.bat` | 已归档 | 走 Netlify `deploy --prod`，账户额度锁死后必然 403；发布已改由 `更新影像并发布.bat` → EdgeOne |
| `启动公网访问.bat` | 已归档 | Cloudflare 快速隧道方案，地址每次随机（`*.trycloudflare.com`），已被 EdgeOne 取代 |
| `停止公网访问.bat` | 已归档 | 仅用于关闭上一条的隧道与 5180 端口，一并归档 |

根目录保留的 8 个（均在用）：

| 脚本 | 用途 |
|---|---|
| `StarMap影像工具.bat` | 启动 5199 影像工具（关窗口即退出） |
| `更新影像并发布.bat` | 预检 → 入库 → 构建 → 上传 EdgeOne（一键发布主入口） |
| `投递全景并转网页版.bat` | PTGui 原片转 8192×4096 网页版并投进收件箱，末尾询问是否立即发布 |
| `监视影像目录并自动发布.bat` | 常驻监视收件箱，安静 90s 后自动跑 `更新影像并发布.bat` |
| `启动StarMap.bat` | 本地发布版 5173（缺依赖/缺 dist 会自动补齐） |
| `启动编辑器.bat` | 编辑版 5174（改动写入 `06_private`） |
| `重新发布.bat` | 停 5173 → `build:personal` → 重启 5173 |
| `停止StarMap.bat` | 释放 5173 与 5174 |

注意：本文档第十节、11.4 等处仍保留 `启动公网访问.bat` / `停止公网访问.bat` / `发布到公网.bat` 的历史描述，读到时以上表为准——那些方案已停用，公网统一走 EdgeOne（见 14.14）。
**追加：`公网服务\` 目录已删除（2026-11-18）**

| 删除对象 | 大小 | 说明 |
|---|---|---|
| `公网服务\node_modules` + `.netlify` | 约 240 MB | netlify-cli、cloudflared 相关依赖与站点 link 缓存，EdgeOne 方案不再使用 |
| `公网服务\starmap-dist.zip`、`starmap-web.zip` | 各约 25 MB | 早期手工上传用的打包副本 |
| `公网服务\*.log`（cloudflared / netlify / vercel / wrangler） | 十几 KB | 各平台试错日志 |
| `tools\cloudflared.exe` | 52.8 MB | 仅被 Cloudflare 隧道方案使用；目录随之清空删除 |
| `公网地址.txt` | 64 B | trycloudflare 随机地址，已归档 |
| `正式公网地址.txt` | — | **改写为新版**：EdgeOne 项目信息、3 小时链接规则、发布步骤、绑域名做法；旧 Netlify 版归档为 `正式公网地址-旧Netlify版.txt` |

合计释放约 **325 MB**。`公网服务\serve-dist.mjs` 备份到 `_archive\bat-20261118\` 备查；`更新影像并发布.bat` 里遗留的 `set "PUB=…\公网服务"` 一行已删除。
**14.16 影像工具故障修复（2026-11-18）**

症状：影像工具里改城市名、传新图后点「一键投递并发布」立即失败，日志 `发布进程启动失败 Error: spawn cmd ENOENT`、`发布结束 exit=-4058 用时 0.0s`。

| # | 根因 | 修法 | 落点 |
|---|---|---|---|
| 1 | 服务被以精简 PATH 启动，子进程找不到 `cmd.exe` | 显式定位 `%SystemRoot%\System32\cmd.exe`，并给发布子进程注入 `PATH`（含 System32、WindowsPowerShell） | `工具\media-server.mjs` |
| 2 | `POST /api/media/update` 请求体首字节带 BOM，`JSON.parse` 直接抛错 | `collectJson` 解析前剥离 `\uFEFF` | 同上 |
| 3 | 连点两次发布会有两套 npm/构建并发跑（11-18 10:15 实际发生） | 增加全局发布锁，运行中再请求返回 409 并提示已运行秒数 | 同上 |
| 4 | `更新影像并发布.bat` 是 UTF-8 批处理，跑完 npm/edgeone 后 cmd 会从中间切断中文行，尾部报 `'��时，必须带' is not recognized` | bat 尾部收尾信息改为纯 ASCII；中文总结（含本次预览链接）改由服务端输出并抓取 `Deploy URL:` | bat + media-server |
| 5 | 浠水县第 6 张 `全景_011-web.jpg` 被删入 `_trash`，`media.json` 同步删条目；文件已恢复但缺元数据，导入按普通航拍处理不显示 | 从 `_trash\2026-11-18T02-15-22-869Z\` 恢复文件，并补写 `media.json` 条目（panorama360 / 2026-07-17 / 8192×4096 / 30.451462,115.294817） | `06_private\MediaInbox\中国\浠水县\` |

验证：连续三次经 `POST /api/publish` 跑完整链路，exit=0，部署 ID `dpf3dene05nu` / `dpyeunpfb52` / `dp4tlcfi45u9`，公网页面已显示左栏「浠水县国道S201 项目」与 6 张全景。
**14.17 静态资源分仓 + 增量发布（2026-11-18）**

背景：EdgeOne CLI（`edgeone makers deploy`）没有增量参数，实测同一份 120MB 的 dist 连续部署两次都要 60–75s，每次都整包上传到新时间戳目录。因此把占体积最大的媒体文件搬出 dist，改由腾讯云 COS 按文件增量上传。

| 产物 | 内容 | 体积 / 文件数 | 去向 | 每次发布耗时 |
|---|---|---|---|---|
| `dist` | index.html、assets、cesium | 13.7 MB / 398 | EdgeOne Pages（仍整包） | 约 31s |
| `dist-static` | media（全景图 / 航拍图及缩略图） | 106.2 MB / 87 | 腾讯云 COS（只传变更） | 首次 69.5s，无变更 0s |

| # | 改动 | 落点 |
|---|---|---|
| 1 | 构建末尾把 `dist\media` 移到 `dist-static\media` | `StarMap\01_Web\scripts\split-static.mjs`（`build:personal` / `build:public` 自动调用） |
| 2 | 媒体 URL 统一加静态仓前缀：`/media/user/...` → `https://<COS>/media/user/...` | `src\data\staticBase.ts` + `src\data\mediaCatalog.ts`（`allImportedMediaItems` 统一改写，下游组件无需改） |
| 3 | 增量上传器：按 sha256 清单只 PUT 新增/变更文件 | `scripts\upload-static.mjs`，清单 `06_private\.cache\static-manifest.json` |
| 4 | 发布脚本增加第 4 步「媒体增量上传」 | `更新影像并发布.bat`（改为 5 步） |
| 5 | 配置分两处 | `06_private\.env.local`：COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION / COS_BASE_URL；`06_private\config\.env.local`：`VITE_STATIC_BASE`（留空则媒体仍随 dist 走） |

关键取舍：**Cesium 不搬到 COS**。Cesium 的 Worker 用同源脚本方式加载，跨域托管实测会报错并导致地球黑屏；它只有 12.4MB，留在 dist 里最稳。

COS 侧：桶 `starmap-static-1530766442`（广州、单 AZ、公有读私有写，CORS 允许 `*` + GET/HEAD/PUT）；对象 `Cache-Control: public, max-age=31536000, immutable`（文件名带哈希或日期目录，内容不再变）。

实测（2026-11-18）：首传 477 个对象 69.5s；第二次 0 上传；`edgeone makers deploy dist` 31s（原 60–75s）；公网 `https://starmap-lac-mpxvyu7v.edgeone.cool` 地球正常，点开浠水县后 6 张 `thumb.webp` 全部从 COS 返回 200。COS 上早期试传的 `cesium/` 390 个对象与 `_smoke/` 已删除。
**14.18 影像工具按钮语义收敛（2026-11-18）**

问题：第 3 张卡的「一键投递并发布」与第 4 张卡的「重新构建并发布公网」在“发布”这一段完全重叠——两者都打 `POST /api/publish`，跑同一条 `更新影像并发布.bat`；差别只在第 3 步多做「上传原图到 MediaInbox + 写 media.json」。按钮名称没有体现这一点，容易连点两次白跑一轮部署。

改法（前端文案与层级调整，逻辑不变）：

| 位置 | 改前 | 改后 |
|---|---|---|
| 第 3 卡标题 | 选择素材 | 上传素材并发布 |
| 第 3 卡主按钮 | 一键投递并发布 | **上传并发布**（primary） |
| 第 3 卡次按钮 | 仅投递（不发布） | 仅上传（不发布） |
| 第 4 卡按钮 | 重新构建并发布公网（primary） | **仅重建发布（不带上新素材）**（次要文字链接，hover 提示“不会带上第 3 步还没上传的图”） |
| 第 2 卡提示 | 保存后点「重新构建并发布公网」 | 保存后到第 4 步点「仅重建发布（不带上新素材）」 |
| 日志 | [投递] / 已投递（未发布） | [上传] / 已上传（未发布），发布日志区分「上传素材 → …」与「仅重建：…不带上新素材」 |

`publishSite(mode)` 新增入参：`upload`（第 3 步）/ `rebuild`（第 4 步），仅影响日志文案，管线仍是 预检 → 入库 → 构建 → COS 增量 → EdgeOne。

验证：`http://127.0.0.1:5199` 打开即生效（服务按请求读取 HTML，无需重启）；第 3 卡显示「上传并发布 / 仅上传（不发布）」，第 4 卡右上为次要文字链接「仅重建发布（不带上新素材）」。
**14.19 公网页按拍摄日期显隐素材（2026-11-18）**

需求：在发布页（公网）里，对一个城市下的无人机素材，能按“拍摄日期”整组显示 / 隐藏。

实现（纯前端，数据与发布链路不动）：

- `App.tsx`：新增 `hiddenDroneDatesByCity` 状态（按 cityId 存被隐藏的日期键，`''` 表示“未记录拍摄日期”），提供 `toggleDroneDateGroup` / `showAllDroneDates`，同时传给右侧 `DroneMediaCard` 与球体 `CesiumAtlasGlobe`——两处共用一份状态，缩略图与地图点位始终一致。
- `DroneMediaCard.tsx`：日期表头变成可点按钮（眼睛图标 + 张数），点一下隐藏该组缩略图，表头保留并显示“N 张 · 已隐藏”+ 删除线；有任意一组隐藏时，列表顶部出现“已隐藏 N 组日期 · 全部显示”胶囊按钮。编辑（排序）模式下不显示开关，避免与拖拽操作冲突。
- `CesiumAtlasGlobe.tsx`：新增 `hiddenDroneDateKeys` 入参，`visibleDroneMediaItems` 过滤隐藏日期后再画 Entity；**相机取景仍按全部点位计算**（`activeDroneMediaItems` 不变），所以隐藏某组时视角不跳；点位编号沿用城市内全量顺序，隐藏后不跳号。
- `index.css`：新增 `.drone-media-date-toggle`、`[data-hidden='true']` 样式与 `.drone-media-date-reset` 胶囊。

行为：默认全部显示（不改任何默认数据）；隐藏只影响当前页面会话，刷新 / 换城市后按城市分别记住，刷新浏览器则复位；隐藏状态不写任何文件，不参与发布。

验证：dev（5173）与生产构建（4173 预览）均通过——隐藏一组则该组缩略图与点位同时消失，全部隐藏则球上无无人机点，点“全部显示”恢复；控制台 0 报错，缩略图走 COS 返回 200。

发布：`仅重建发布（不带上新素材）`，构建 398 文件 / 13.75 MB，EdgeOne 部署 ID `dp8dpirc61uo`，耗时 77.2 s。
**14.20 无人机点位向下引导线（2026-11-18）**

需求：地图上的无人机点位要有向下的竖线，明确指向地面落点。

实现（`src/components/CesiumAtlasGlobe.tsx`）：

- 新增 `droneGroundPosition(item)`：同经纬度、高度 0 的落点；地形高于 0 时线下段被地形遮挡，视觉上正好落在坡面上。
- 每个点位 Entity 增加 `polyline`：`arcType: ArcType.NONE`（避免短距离测地弧弯曲），`positions: [机位, 落点]`，`width` 选中 2.4 / 默认 1.4，`material` 用 `ColorMaterialProperty`（选中 `#7dd3fc` 0.95、默认 `#e0f2fe` 0.7）。
- 每个点位另加一个地面锚点 Entity（key `<id>-ground`，`position` 为 (lng, lat, 0)，`point.heightReference = HeightReference.CLAMP_TO_GROUND`，`disableDepthTestDistance = Infinity`，小圆点 + 白描边），随 `showMapContent` 与日期隐藏一起显隐。
- `droneGroup` 取景由 20 km / 下限 12 km 收紧为 1.5 km / 下限 1.4 km：原来 4 个点位相距 ~150 m，20 km 视距下引导线只有 1–2 px，看不出效果；收紧后 40–150 m 的真实高度差在屏幕上约 10–50 px，竖线清晰。

验证：dev 与 4173 生产预览均通过——4 个点位各有一条从机位到地面锚点的竖线；选中变亮变粗；按日期隐藏某组时，对应点位与竖线一并消失、视角不跳；控制台 0 报错。

发布：`仅重建发布（不带上新素材）`，EdgeOne 部署 ID `dp13vkvkvikv`，耗时 74.7 s。
> 14.20 补充（2026-11-18）：地面落点统一为固定 `pixelSize: 7`，不再随选中态放大缩小，所有城市的落地点尺寸一致。

**14.21 GitHub 托管（2026-11-18）**

- 仓库：https://github.com/red-mapple/starmap-lac （public，默认分支 `main`）
- Pages：https://red-mapple.github.io/starmap-lac/ （源为 `gh-pages` 分支，已构建成功）
- 仓库内容：`StarMap/01_Web` 源码与构建脚本、`工具/` 影像工具、各 `.bat`、本说明文档；**不含** `06_private`（密钥/原片/媒体清单）、`全景图`、`封面图`、`node_modules`、`dist`。
- 本地打包目录：`018-starmap\github\starmap-lac`（git 已初始化，含 88 个文件）。
- 推送方式：本机 `github.com:443` 的 git 传输会被重置，改用 GitHub REST API 逐文件上传（脚本 `github\push-main.ps1`、`github\push-pages.ps1`），`api.github.com` 可达。
- Pages 构建要点：`npx vite build --mode personal --base=/starmap-lac/` + `split-static`；`vite-plugin-cesium` 在非 `/` base 下会把 Cesium 写进 `dist/starmap-lac/cesium`，发布前必须把该目录移到 `dist/cesium`，否则 Cesium.js 404、页面白屏。
- 公网主站仍以 EdgeOne + COS 为准；GitHub Pages 是源码与演示的第二落点，媒体同样从 COS 读取。