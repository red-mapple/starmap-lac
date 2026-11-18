/**
 * 全景转网页版：把 PTGui 导出的超大 2:1 等距柱状全景压成 8192×4096 的网页版，
 * 并直接投递到 06_private\MediaInbox\中国\<城市>\drone\ 目录，等 media:import 入库。
 *
 * 为什么要这一步：360 查看器直接加载 original，本机 WebGL MAX_TEXTURE_SIZE = 16384，
 * 原片宽度 22512 超过上限 → 文字信息正常但画面全黑。
 *
 * 用法：
 *   node 工具\pano-web.cjs --city 红安县 --src "E:\…\全景图\红安"
 *   node 工具\pano-web.cjs --city 浠水县 --src "E:\…\全景图\浠水" --force
 *   node 工具\pano-web.cjs --city 红安县 --src "E:\…\全景图\红安" --dry-run   # 只分析不写文件
 *
 * 可选参数：
 *   --city <中文城市名>   目标城市目录名，必须在 06_private\MediaInbox\中国\ 下已存在
 *   --src  <目录>         源目录，可重复传入多个
 *   --force               目标文件已存在时也重新生成
 *   --dry-run             只打印分析结果，不写任何文件
 *   --width <像素>        目标宽度，默认 8192（必须是 2:1，高度自动 = width/2）
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const APP = path.join(ROOT, "StarMap", "01_Web")
const PRIVATE = process.env.STARMAP_PRIVATE_ROOT || path.join(ROOT, "06_private")
const sharp = require(path.join(APP, "node_modules", "sharp"))

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".tif", ".tiff"])
const RATIO_MIN = 1.9
const RATIO_MAX = 2.1

function parseArgs(argv) {
  const out = { city: "", srcs: [], force: false, dryRun: false, width: 8192 }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === "--city") out.city = argv[++i] || ""
    else if (a === "--src" || a === "--srcs") out.srcs.push(argv[++i] || "")
    else if (a === "--force") out.force = true
    else if (a === "--dry-run") out.dryRun = true
    else if (a === "--width") out.width = Number(argv[++i]) || 8192
    else if (!a.startsWith("--") && !out.city) out.city = a
    else if (!a.startsWith("--")) out.srcs.push(a)
  }
  return out
}

function human(bytes) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (!opts.city) {
    console.error("缺少 --city（例如 --city 红安县）")
    process.exitCode = 1
    return
  }
  if (opts.srcs.length === 0) {
    console.error("缺少 --src（源目录）")
    process.exitCode = 1
    return
  }
  const width = Math.round(opts.width / 2) * 2
  const height = width / 2

  const outDir = path.join(PRIVATE, "MediaInbox", "中国", opts.city, "drone")
  if (!opts.dryRun && !fs.existsSync(outDir)) {
    console.error(`目标城市目录不存在：${outDir}`)
    console.error("请先在 06_private\\data\\travel-map.local.json 里加这个城市，并建好 MediaInbox 目录。")
    process.exitCode = 1
    return
  }

  const report = []
  for (const src of opts.srcs) {
    const abs = path.resolve(src)
    if (!fs.existsSync(abs)) {
      report.push({ file: src, action: "跳过", note: "源目录不存在" })
      continue
    }
    const entries = fs.readdirSync(abs).filter((n) => IMAGE_EXT.has(path.extname(n).toLowerCase()))
    for (const name of entries) {
      const file = path.join(abs, name)
      const stat = fs.statSync(file)
      const meta = await sharp(file, { limitInputPixels: 300_000_000 }).metadata()
      const ratio = meta.width && meta.height ? meta.width / meta.height : 0
      const base = path.basename(name, path.extname(name))

      if (ratio < RATIO_MIN || ratio > RATIO_MAX) {
        report.push({
          file: name,
          action: "跳过",
          note: `比例 ${ratio.toFixed(3)} 不是 2:1 全景，按普通照片处理请放 photos\\`,
          size: human(stat.size),
        })
        continue
      }

      const outName = `${base}-web.jpg`
      const outFile = path.join(outDir, outName)
      const exists = fs.existsSync(outFile)
      if (exists && !opts.force) {
        report.push({ file: name, action: "已存在", note: outName, size: human(stat.size) })
        continue
      }
      if (meta.width <= width) {
        report.push({
          file: name,
          action: "无需压缩",
          note: `原图宽 ${meta.width} ≤ ${width}，可直接以原文件投递`,
          size: human(stat.size),
        })
        continue
      }
      if (opts.dryRun) {
        report.push({
          file: name,
          action: "将转换",
          note: `${meta.width}×${meta.height} → ${width}×${height}（${outName}）`,
          size: human(stat.size),
        })
        continue
      }

      const out = await sharp(file, { limitInputPixels: 300_000_000 })
        .resize(width, height, { fit: "fill", kernel: "lanczos3" })
        .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:2:0" })
        .toFile(outFile)
      report.push({
        file: name,
        action: "已转换",
        note: `${meta.width}×${meta.height} → ${out.width}×${out.height}，${human(out.size)}`,
        size: human(stat.size),
      })
    }
  }

  console.log(`\n目标目录：${outDir}${opts.dryRun ? "（dry-run，未写文件）" : ""}`)
  console.log("─".repeat(88))
  for (const r of report) {
    const left = `${r.action.padEnd(6, "　")} ${r.file}`.padEnd(42, " ")
    console.log(`${left} ${r.size ? r.size.padEnd(9, " ") : "".padEnd(9, " ")} ${r.note}`)
  }
  console.log("─".repeat(88))
  const converted = report.filter((r) => r.action === "已转换" || r.action === "将转换").length
  console.log(`共 ${report.length} 个文件，${converted} 个需要转网页版。`)
  if (converted > 0 && !opts.dryRun) {
    console.log("\n下一步：双击 更新影像并发布.bat（会自动 预检 → 入库 → 构建 → 上传公网）")
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
