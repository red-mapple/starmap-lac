# 中冶交通建设集团有限公司项目浏览器（StarMap）

基于 Cesium 的三维地球项目浏览站点，用「项目导航 → 城市 → 无人机全景」三层结构展示工程项目的航拍成果：地图点位带向下引导线指向地面，右侧按拍摄日期分组浏览 360° 全景，支持按日期显隐素材。

线上站点（EdgeOne）：https://starmap-lac-mpxvyu7v.edgeone.cool
GitHub Pages 预览：https://red-mapple.github.io/starmap-lac/

## 目录结构

```
.
├─ StarMap/01_Web/          前端应用（React 19 + Cesium + Vite 8）
│  ├─ src/                  组件、数据装配、地图源、样式
│  ├─ scripts/              构建插件：本地编辑器、静态资源分仓、隐私审计
│  ├─ public/               图标等静态文件
│  ├─ index.html
│  └─ package.json
├─ 工具/                    影像工具（本地服务 + 网页端）
│  ├─ 影像工具.html         上传 / 改名 / 删除 / 一键发布
│  ├─ media-server.mjs      本地 HTTP 服务与发布接口
│  ├─ media-tool.cjs        影像入库（全景压缩、EXIF GPS 写入）
│  ├─ exif-gps.cjs          EXIF 读取
│  └─ pano-web.cjs          全景转网页版
├─ *.bat                    本地启动、投递、发布脚本
└─ StarMap部署说明.md        部署与运维手册（含版本迭代记录）
```

## 运行与构建

```bash
cd StarMap/01_Web
npm ci
npm run dev:personal     # 本地开发 5173，读取私有层数据
npm run build:personal   # 生产构建，产出 dist + dist-static
npm run preview          # 预览构建结果 4173
```

> 注意：数据层（城市目录、媒体清单、COS 配置、原始全景）位于本地私有目录 `06_private/`，**不在本仓库内**。仅克隆本仓库时，站点可以构建但内容为空；完整运行需要私有层。

## 部署链路

1. `media:import` 把新图入库（全景压到 8192×4096，EXIF GPS 写入网页版图片）
2. `build:personal` 生成 `dist`（应用 + Cesium，随站点部署）
3. `static:upload` 把媒体增量上传到腾讯云 COS（`Cache-Control: immutable`）
4. `edgeone makers deploy dist -n starmap-lac -e production` 发布到 EdgeOne Pages

日常操作全部收敛在 `工具/影像工具.html` 的「上传并发布」与「仅重建发布」两个入口，详见 `StarMap部署说明.md`。

## 技术要点

- Cesium Worker 受同源限制，Cesium 静态资源必须与应用同域部署；媒体走 COS 独立域名。
- 无人机点位按真实高度绘制向下引导线（落点随地形），地面锚点固定 7px。
- 右侧日期分组显隐为纯前端状态，不改变任何数据文件。

## 许可

前端沿用的是 Aisland-SJL/StarMap 的 MIT 许可，见 `StarMap/LICENSE`。本仓库中的项目定制部分（影像工具、发布链路、界面改造）由项目维护者保留权利。
