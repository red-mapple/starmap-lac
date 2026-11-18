/**
 * StarMap 影像工具（底层 CLI）
 * GUI（工具\starmap_media_tool.py）通过它完成：城市列表 / 新建城市 / 投递素材。
 *
 * 用法：
 *   node 工具\media-tool.cjs list
 *   node 工具\media-tool.cjs add-city --city 黄州区 --city-en Huangzhou --lat 30.43 --lng 114.88 --date 2026-07-18 --region "亚洲 / 湖北 · 黄冈"
 *   node 工具\media-tool.cjs import --city 红安县 --type drone --date 2026-07-20 --title "红安县航拍全景" --files "D:\a.JPG" "D:\b.JPG"
 *   node 工具\media-tool.cjs import --city 红安县 --type cover --files "D:\cover.png"
 *
 * 所有命令结束时打印一行 JSON 结果，GUI 负责解析。
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const APP = path.join(ROOT, "StarMap", "01_Web")
const PRIVATE = process.env.STARMAP_PRIVATE_ROOT || path.join(ROOT, "06_private")
const DATA_DIR = path.join(PRIVATE, "data")
const TRAVEL_PATH = path.join(DATA_DIR, "travel-map.local.json")
const INBOX_ROOT = path.join(PRIVATE, "MediaInbox")
const sharp = require(path.join(APP, "node_modules", "sharp"))
const { injectGps } = require("./exif-gps.cjs")

let exifr = null
try {
  exifr = require(path.join(APP, "node_modules", "exifr"))
} catch {
  exifr = null
}

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"])
const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm"])
const PANO_RATIO_MIN = 1.9
const PANO_RATIO_MAX = 2.1
const PANO_WIDTH = 8192
const DEFAULT_COUNTRY = { country: "中国", countryEn: "China" }

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKC")
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "")
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch (err) {
    if (fallback !== undefined) return fallback
    throw err
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8")
}

// 读源图 EXIF：优先用无人机自带的 GPS / 拍摄时间
async function readSourceExif(src) {
  if (!exifr) return {}
  try {
    const data = await exifr.parse(src, {
      gps: true,
      tiff: true,
      ifd0: true,
      exif: true,
    })
    if (!data) return {}
    const picked = {}
    for (const key of ["latitude", "longitude", "GPSAltitude", "DateTimeOriginal", "CreateDate"]) {
      if (data[key] !== undefined) picked[key] = data[key]
    }
    return picked
  } catch {
    return {}
  }
}

// 城市记录里的经纬度，作为没有 EXIF GPS 时的兜底坐标
function findCityCoordinate(cityZh) {
  const travel = readJson(TRAVEL_PATH, { records: [] })
  const records = Array.isArray(travel.records) ? travel.records : []
  const record = records.find((r) => cityRecordMatches(r, cityZh) && Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng)))
  if (!record) return undefined
  return { lat: Number(record.lat), lng: Number(record.lng) }
}

// 把 GPS 写进输出 JPEG；非 JPEG 直接返回原缓冲
function writeGpsToJpeg(filePath, gps, extra) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext !== ".jpg" && ext !== ".jpeg") return false
  const buffer = fs.readFileSync(filePath)
  const injected = injectGps(buffer, {
    lat: gps.lat,
    lng: gps.lng,
    altitude: gps.altitude ?? 0,
    dateTime: extra?.date,
    description: extra?.description,
  })
  if (injected.length !== buffer.length) {
    fs.writeFileSync(filePath, injected)
    return true
  }
  return false
}

function exifDateOnly(value) {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function parseFlags(argv) {
  const flags = { _: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith("--")) {
      flags._.push(token)
      continue
    }
    const key = token.slice(2)
    if (key === "files") {
      const rest = []
      i += 1
      while (i < argv.length && !argv[i].startsWith("--")) rest.push(argv[i++])
      i -= 1
      flags.files = rest
    } else {
      flags[key] = argv[i + 1]
      i += 1
    }
  }
  return flags
}

function cityRecordMatches(record, cityZh) {
  return record.city === cityZh || record.city_en === cityZh
}

function listCities() {
  const travel = readJson(TRAVEL_PATH, { records: [] })
  const records = Array.isArray(travel.records) ? travel.records : []
  const byCity = new Map()
  for (const r of records) {
    if (r.status === "planned") continue
    const countryEn = r.country_en || "China"
    const cityId = `${slugify(countryEn)}__${slugify(r.city_en || r.city)}`
    if (!byCity.has(cityId)) {
      byCity.set(cityId, {
        city: r.city,
        cityEn: r.city_en || r.city,
        cityId,
        date: r.start_date || "",
        lat: r.lat,
        lng: r.lng,
        region: r.region || "",
      })
    }
  }

  const cities = []
  for (const info of byCity.values()) {
    const cityDir = path.join(INBOX_ROOT, "中国", info.city)
    const droneDir = path.join(cityDir, "drone")
    const photosDir = path.join(cityDir, "photos")
    const countFiles = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => IMAGE_EXT.has(path.extname(n).toLowerCase()) || VIDEO_EXT.has(path.extname(n).toLowerCase())).length : 0)
    cities.push({
      ...info,
      inboxExists: fs.existsSync(cityDir),
      droneCount: countFiles(droneDir),
      photoCount: countFiles(photosDir),
    })
  }

  const inboxOnly = []
  const chinaInbox = path.join(INBOX_ROOT, "中国")
  if (fs.existsSync(chinaInbox)) {
    for (const name of fs.readdirSync(chinaInbox, { withFileTypes: true })) {
      if (!name.isDirectory()) continue
      if (!cities.some((c) => c.city === name.name)) {
        inboxOnly.push({ city: name.name, cityId: "", inboxExists: true, noRecord: true })
      }
    }
  }

  return { ok: true, cities, inboxOnly }
}

function addCity(flags) {
  const city = (flags.city || "").trim()
  const cityEn = (flags["city-en"] || "").trim()
  if (!city || !cityEn) {
    return { ok: false, error: "必须提供 --city 与 --city-en" }
  }
  const lat = Number(flags.lat)
  const lng = Number(flags.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: "必须提供有效的 --lat 与 --lng（十进制度数）" }
  }
  const date = (flags.date || "").trim() || new Date().toISOString().slice(0, 10)
  const region = (flags.region || "").trim() || "亚洲"
  const country = (flags.country || DEFAULT_COUNTRY.country).trim()
  const countryEn = (flags["country-en"] || DEFAULT_COUNTRY.countryEn).trim()
  const countryCode = (flags["country-code"] || (countryEn === "China" ? "cn" : "")).trim()

  const travel = readJson(TRAVEL_PATH, { schema_version: 1, records: [] })
  if (!Array.isArray(travel.records)) travel.records = []
  if (travel.records.some((r) => cityRecordMatches(r, city))) {
    return { ok: false, error: `城市「${city}」已存在于 travel-map.local.json，不用重复新建` }
  }

  const record = {
    id: `${slugify(countryEn)}-${slugify(cityEn)}-${date}`,
    country,
    country_en: countryEn,
    ...(countryCode ? { country_code: countryCode } : {}),
    city,
    city_en: cityEn,
    region,
    start_date: date,
    end_date: date,
    year: Number(date.slice(0, 4)) || undefined,
    type: "destination",
    status: "visited",
    lat,
    lng,
    travelCategory: "destination",
    source: "manual-local",
    notes: (flags.notes || "").trim(),
  }
  Object.keys(record).forEach((k) => record[k] === undefined && delete record[k])
  travel.records.push(record)
  travel.generated_at = new Date().toISOString().slice(0, 10)
  writeJson(TRAVEL_PATH, travel)

  const cityDir = path.join(INBOX_ROOT, country, city)
  const droneDir = path.join(cityDir, "drone")
  const photosDir = path.join(cityDir, "photos")
  fs.mkdirSync(droneDir, { recursive: true })
  fs.mkdirSync(photosDir, { recursive: true })
  const mediaJson = path.join(cityDir, "media.json")
  if (!fs.existsSync(mediaJson)) writeJson(mediaJson, {})

  const locationIndex = path.join(DATA_DIR, "media-source-index.local.json")
  const overview = travel.display && travel.display.overviewTarget
  void locationIndex
  void overview

  return {
    ok: true,
    city,
    cityId: `${slugify(countryEn)}__${slugify(cityEn)}`,
    createdDir: cityDir,
    hint: "已写入 travel-map.local.json 并建好 drone/photos 目录；下一步可以直接投递素材并发布。",
  }
}

function uniqueName(dir, base, ext) {
  let name = `${base}${ext}`
  let index = 2
  while (fs.existsSync(path.join(dir, name))) {
    name = `${base}-${index}${ext}`
    index += 1
  }
  return name
}

async function importFiles(flags) {
  const city = (flags.city || "").trim()
  const type = (flags.type || "drone").trim()
  const files = Array.isArray(flags.files) ? flags.files.filter(Boolean) : []
  if (!city) return { ok: false, error: "必须提供 --city" }
  if (files.length === 0) return { ok: false, error: "没有选中任何文件" }

  const cityDir = path.join(INBOX_ROOT, "中国", city)
  if (!fs.existsSync(cityDir)) {
    return { ok: false, error: `收件箱里没有城市「${city}」目录，请先新建城市` }
  }
  const droneDir = path.join(cityDir, "drone")
  const photosDir = path.join(cityDir, "photos")
  fs.mkdirSync(droneDir, { recursive: true })
  fs.mkdirSync(photosDir, { recursive: true })
  const mediaJsonPath = path.join(cityDir, "media.json")
  const mediaMeta = readJson(mediaJsonPath, {})

  const dateProvided = Boolean((flags.date || "").trim())
  const date = (flags.date || "").trim() || new Date().toISOString().slice(0, 10)
  const titlePrefix = (flags.title || "").trim() || `${city}航拍`
  const manualLat = Number(flags.lat)
  const manualLng = Number(flags.lng)
  const manualAlt = Number(flags.alt)
  const manualPoint =
    (flags.lat || "").trim() && (flags.lng || "").trim() && Number.isFinite(manualLat) && Number.isFinite(manualLng)
      ? { lat: manualLat, lng: manualLng, altitude: Number.isFinite(manualAlt) ? manualAlt : 0, from: "手动坐标" }
      : undefined
  const items = []
  const errors = []

  for (const source of files) {
    const src = path.resolve(source)
    if (!fs.existsSync(src)) {
      errors.push(`${source} 不存在`)
      continue
    }
    const ext = path.extname(src).toLowerCase()
    const displayName = flags._originalName && files.length === 1 ? flags._originalName : path.basename(src)
    const extOfName = path.extname(displayName).toLowerCase() || ext
    const base = path.basename(displayName, path.extname(displayName)).replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "-")

    if (VIDEO_EXT.has(ext)) {
      const name = uniqueName(droneDir, base, ext)
      fs.copyFileSync(src, path.join(droneDir, name))
      mediaMeta[`drone/${name}`] = {
        kind: "video",
        date,
        resolution: (flags.resolution || "1920 × 1080").toString(),
        captureType: "Drone Video",
        titleZh: `${titlePrefix}视频`,
      }
      items.push({ file: displayName, action: "已复制", out: `drone/${name}`, note: "视频" })
      continue
    }

    if (!IMAGE_EXT.has(ext)) {
      errors.push(`${displayName} 不是支持的图片/视频格式`)
      continue
    }

    const meta = await sharp(src, { limitInputPixels: 300_000_000 }).metadata()
    if (!meta.width || !meta.height) {
      errors.push(`${displayName} 读不出宽高`)
      continue
    }
    const sourceExif = await readSourceExif(src)
    const hasExifGps = Number.isFinite(sourceExif.latitude) && Number.isFinite(sourceExif.longitude)
    const cityPoint = hasExifGps ? undefined : findCityCoordinate(city)
    const gpsPoint = manualPoint
      ? manualPoint
      : hasExifGps
        ? {
            lat: Number(sourceExif.latitude),
            lng: Number(sourceExif.longitude),
            altitude: Number.isFinite(sourceExif.GPSAltitude) ? Number(sourceExif.GPSAltitude) : 0,
            from: "EXIF",
          }
        : cityPoint
          ? { lat: cityPoint.lat, lng: cityPoint.lng, altitude: 0, from: "城市坐标" }
          : undefined
    const exifDate = exifDateOnly(sourceExif.DateTimeOriginal || sourceExif.CreateDate)
    const itemDate = !dateProvided && exifDate ? exifDate : date
    const gpsNote = gpsPoint
      ? ` · GPS ${gpsPoint.lat.toFixed(6)}, ${gpsPoint.lng.toFixed(6)}（${gpsPoint.from}）`
      : " · 无坐标（地图不显示）"

    const ratio = meta.width / meta.height
    const isPano = ratio >= PANO_RATIO_MIN && ratio <= PANO_RATIO_MAX

    if (type === "cover") {
      const outName = `cover-${city}${ext}`
      await sharp(src, { limitInputPixels: 300_000_000 }).rotate().toFile(path.join(photosDir, outName))
      items.push({ file: displayName, action: "已设为封面", out: `photos/${outName}`, note: `${meta.width}×${meta.height}` })
      continue
    }

    // 无人机素材
    if (isPano) {
      const needsShrink = Math.max(meta.width, meta.height) > PANO_WIDTH
      const outName = needsShrink ? `${base}-web.jpg` : uniqueName(droneDir, base, ext === ".png" ? ".png" : ".jpg")
      const outPath = path.join(droneDir, outName)
      let finalW = meta.width
      let finalH = meta.height
      if (needsShrink) {
        const out = await sharp(src, { limitInputPixels: 300_000_000 })
          .resize(PANO_WIDTH, PANO_WIDTH / 2, { fit: "fill", kernel: "lanczos3" })
          .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:2:0" })
          .toBuffer({ resolveWithObject: true })
        const data = gpsPoint
          ? injectGps(out.data, {
              lat: gpsPoint.lat,
              lng: gpsPoint.lng,
              altitude: gpsPoint.altitude,
              dateTime: itemDate,
              description: `${city} ${titlePrefix}`,
            })
          : out.data
        fs.writeFileSync(outPath, data)
        finalW = out.info.width
        finalH = out.info.height
      } else {
        fs.copyFileSync(src, outPath)
        if (gpsPoint) writeGpsToJpeg(outPath, gpsPoint, { date: itemDate, description: `${city} ${titlePrefix}` })
      }
      const previous = mediaMeta[`drone/${outName}`]
      const existing = Object.values(mediaMeta).filter((m) => m && m.titleZh && String(m.titleZh).startsWith(titlePrefix)).length
      const titleZh = (previous && previous.titleZh) || `${titlePrefix} ${String(existing + 1).padStart(2, "0")}`
      const titleEn = (previous && previous.titleEn) || titleZh
      mediaMeta[`drone/${outName}`] = {
        kind: "panorama360",
        titleZh,
        titleEn,
        date: itemDate,
        resolution: `${finalW} × ${finalH}`,
        captureType: "Drone 360 Panorama",
        description: `${city}航拍 360 全景；网页版由 ${meta.width} × ${meta.height} 原片等比缩制（原片保留在素材目录）。`,
        ...(gpsPoint
          ? {
              position: {
                lat: Number(gpsPoint.lat.toFixed(7)),
                lng: Number(gpsPoint.lng.toFixed(7)),
                altitudeMeters: Number(gpsPoint.altitude.toFixed(2)),
              },
            }
          : {}),
      }
      items.push({
        file: displayName,
        action: needsShrink ? "已转码全景" : "已复制全景",
        out: `drone/${outName}`,
        note: `${meta.width}×${meta.height} → ${finalW}×${finalH}${gpsNote}`,
      })
      continue
    }

    // 普通无人机照片
    const outName = uniqueName(droneDir, base, ext)
    fs.copyFileSync(src, path.join(droneDir, outName))
    const photoOutPath = path.join(droneDir, outName)
    if (gpsPoint) writeGpsToJpeg(photoOutPath, gpsPoint, { date: itemDate, description: `${city} ${titlePrefix}` })
    mediaMeta[`drone/${outName}`] = {
      kind: "aerialPhoto",
      date: itemDate,
      resolution: `${meta.width} × ${meta.height}`,
      captureType: "Drone Aerial Photo",
      titleZh: `${city}航拍照片`,
      ...(gpsPoint
        ? {
            position: {
              lat: Number(gpsPoint.lat.toFixed(7)),
              lng: Number(gpsPoint.lng.toFixed(7)),
              altitudeMeters: Number(gpsPoint.altitude.toFixed(2)),
            },
          }
        : {}),
    }
    items.push({ file: displayName, action: "已复制照片", out: `drone/${outName}`, note: `${meta.width}×${meta.height}${gpsNote}` })
  }

  writeJson(mediaJsonPath, mediaMeta)
  return { ok: errors.length === 0, items, errors, city, type, date }
}

function cityInboxDir(city) {
  return path.join(INBOX_ROOT, "中国", city)
}

// ---- 编辑状态（与公网编辑版共用 06_private\data\editor-state.local.json） ----
const EDITOR_STATE_PATH = path.join(DATA_DIR, "editor-state.local.json")

function findCityRecord(cityZh) {
  const travel = readJson(TRAVEL_PATH, { records: [] })
  const records = Array.isArray(travel.records) ? travel.records : []
  return records.find((r) => cityRecordMatches(r, cityZh))
}

function cityIdFor(cityZh) {
  const record = findCityRecord(cityZh)
  if (!record) return ""
  const countryEn = record.country_en || "China"
  return `${slugify(countryEn)}__${slugify(record.city_en || record.city)}`
}

function readEditorState() {
  const raw = readJson(EDITOR_STATE_PATH, {}) || {}
  for (const key of ["cityNameOverrides", "droneTitleByCity", "cityOrderByCountry", "mediaOrderByCity", "droneOrderByCity", "coverMediaByCity"]) {
    if (!raw[key] || typeof raw[key] !== "object" || Array.isArray(raw[key])) raw[key] = {}
  }
  for (const key of ["addedCountries", "countryOrder", "hiddenCountryIds", "hiddenCityIds", "hiddenMediaIds", "hiddenDroneMediaIds"]) {
    if (!Array.isArray(raw[key])) raw[key] = []
  }
  if (raw.schemaVersion === undefined) raw.schemaVersion = 1
  return raw
}

function writeEditorState(state) {
  state.updatedAt = new Date().toISOString()
  writeJson(EDITOR_STATE_PATH, state)
}

// 读取某城市当前的改名 / 右栏标题设置
function getCityLabels(city) {
  if (!city) return { ok: false, error: "缺少城市名" }
  const cityId = cityIdFor(city)
  if (!cityId) return { ok: false, error: `travel-map.local.json 里没有城市「${city}」` }
  const state = readEditorState()
  const override = state.cityNameOverrides[cityId] || {}
  const droneTitle = state.droneTitleByCity[cityId] || ""
  const record = findCityRecord(city)
  return {
    ok: true,
    city,
    cityId,
    cityName: { nameZh: override.nameZh || "", nameEn: override.nameEn || "" },
    droneTitle,
    defaults: {
      nameZh: city,
      nameEn: (record && (record.city_en || "")) || "",
      droneTitle: `${city}无人机影像`,
    },
  }
}

// 写左栏城市显示名（只影响显示，不动目录与 travel-map 记录）
function setCityName(city, nameZh, nameEn) {
  if (!city) return { ok: false, error: "缺少城市名" }
  const cityId = cityIdFor(city)
  if (!cityId) return { ok: false, error: `travel-map.local.json 里没有城市「${city}」` }
  const zh = String(nameZh || "").trim()
  const en = String(nameEn || "").trim()
  const state = readEditorState()
  if (!zh && !en) {
    delete state.cityNameOverrides[cityId]
    writeEditorState(state)
    return { ok: true, cityId, cleared: true, hint: "已恢复默认城市名；发布后生效。" }
  }
  state.cityNameOverrides[cityId] = {
    ...(zh ? { nameZh: zh } : {}),
    ...(en ? { nameEn: en } : {}),
  }
  writeEditorState(state)
  return { ok: true, cityId, nameZh: zh, nameEn: en, hint: "已保存城市显示名；发布后生效。" }
}

// 写右栏无人机影像标题（空字符串 = 恢复默认）
function setDroneTitle(city, title) {
  if (!city) return { ok: false, error: "缺少城市名" }
  const cityId = cityIdFor(city)
  if (!cityId) return { ok: false, error: `travel-map.local.json 里没有城市「${city}」` }
  const text = String(title || "").trim()
  const state = readEditorState()
  if (!text) {
    delete state.droneTitleByCity[cityId]
    writeEditorState(state)
    return { ok: true, cityId, cleared: true, hint: "已恢复默认「城市名 + 无人机影像」；发布后生效。" }
  }
  state.droneTitleByCity[cityId] = text
  writeEditorState(state)
  return { ok: true, cityId, title: text, hint: "已保存右栏标题；发布后生效。" }
}

// 列出某城市已入库素材（media.json），供影像工具展示与删除
function listCityMedia(city) {
  if (!city) return { ok: false, error: "缺少城市名" }
  const cityDir = cityInboxDir(city)
  if (!fs.existsSync(cityDir)) return { ok: false, error: `收件箱里没有城市「${city}」目录` }
  const mediaJsonPath = path.join(cityDir, "media.json")
  const media = readJson(mediaJsonPath, {})
  const items = Object.keys(media)
    .map((key) => {
      const meta = media[key] || {}
      const filePath = path.join(cityDir, key)
      const exists = fs.existsSync(filePath)
      const stat = exists ? fs.statSync(filePath) : undefined
      return {
        key,
        kind: meta.kind || "",
        titleZh: meta.titleZh || path.basename(key),
        titleEn: meta.titleEn || "",
        date: meta.date || "",
        resolution: meta.resolution || "",
        captureType: meta.captureType || "",
        position: meta.position && Number.isFinite(Number(meta.position.lat)) && Number.isFinite(Number(meta.position.lng))
          ? { lat: Number(meta.position.lat), lng: Number(meta.position.lng), altitudeMeters: Number(meta.position.altitudeMeters || 0) }
          : undefined,
        bytes: stat ? stat.size : 0,
        exists,
      }
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.key.localeCompare(b.key))

  const summary = {
    total: items.length,
    panoramas: items.filter((item) => item.kind === "panorama360").length,
    photos: items.filter((item) => item.kind === "aerialPhoto").length,
    videos: items.filter((item) => item.kind === "video").length,
    withPosition: items.filter((item) => item.position).length,
    missingFiles: items.filter((item) => !item.exists).length,
  }
  return { ok: true, city, items, summary }
}

// 删除某条素材：文件移到城市目录下 _trash\<时间戳>\，media.json 备份为 media.bak 后去条目
function deleteCityMedia(city, key) {
  if (!city) return { ok: false, error: "缺少城市名" }
  if (!key) return { ok: false, error: "缺少素材 key" }
  const cityDir = cityInboxDir(city)
  if (!fs.existsSync(cityDir)) return { ok: false, error: `收件箱里没有城市「${city}」目录` }
  const mediaJsonPath = path.join(cityDir, "media.json")
  const media = readJson(mediaJsonPath, {})
  const meta = media[key]
  if (!meta) return { ok: false, error: `media.json 里没有「${key}」` }

  const target = path.resolve(cityDir, key)
  const baseDir = path.resolve(cityDir)
  if (!target.startsWith(`${baseDir}${path.sep}`)) {
    return { ok: false, error: "非法的素材路径" }
  }
  const typeDir = path.dirname(target)
  if (path.basename(typeDir) !== "drone" && path.basename(typeDir) !== "photos") {
    return { ok: false, error: "只允许删除 drone / photos 目录下的素材" }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const trashDir = path.join(cityDir, "_trash", stamp)
  let trashedTo = ""
  if (fs.existsSync(target)) {
    fs.mkdirSync(trashDir, { recursive: true })
    trashedTo = path.join(trashDir, path.basename(target))
    fs.renameSync(target, trashedTo)
  }

  fs.copyFileSync(mediaJsonPath, `${mediaJsonPath}.bak`)
  delete media[key]
  writeJson(mediaJsonPath, media)

  return {
    ok: true,
    city,
    key,
    titleZh: meta.titleZh || key,
    trashedTo,
    hint: "已从收件箱移除并放进 _trash；需要重新构建并发布后公网才会变化。",
  }
}

// 修改一条素材的标题 / 日期（写 media.json，发布后公网生效）
function updateCityMedia(city, key, patch = {}) {
  if (!city) return { ok: false, error: "缺少城市名" }
  if (!key) return { ok: false, error: "缺少素材 key" }
  const cityDir = cityInboxDir(city)
  if (!fs.existsSync(cityDir)) return { ok: false, error: `收件箱里没有城市「${city}」目录` }
  const mediaJsonPath = path.join(cityDir, "media.json")
  const media = readJson(mediaJsonPath, {})
  const meta = media[key]
  if (!meta) return { ok: false, error: `media.json 里没有「${key}」` }

  const next = { ...meta }
  if (typeof patch.titleZh === "string" && patch.titleZh.trim()) next.titleZh = patch.titleZh.trim()
  if (typeof patch.titleEn === "string") {
    if (patch.titleEn.trim()) next.titleEn = patch.titleEn.trim()
    else delete next.titleEn
  }
  if (typeof patch.date === "string" && patch.date.trim()) next.date = patch.date.trim()

  fs.copyFileSync(mediaJsonPath, `${mediaJsonPath}.bak`)
  media[key] = next
  writeJson(mediaJsonPath, media)
  return {
    ok: true,
    city,
    key,
    meta: next,
    hint: "已写入 media.json；需要重新构建并发布后公网才会变化。",
  }
}

async function main() {
  const command = process.argv[2] || "list"
  const flags = parseFlags(process.argv.slice(3))
  let result
  if (command === "list") result = listCities()
  else if (command === "add-city") result = addCity(flags)
  else if (command === "import") result = await importFiles(flags)
  else if (command === "media") result = listCityMedia((flags.city || "").trim())
  else if (command === "delete-media") result = deleteCityMedia((flags.city || "").trim(), (flags.key || "").trim())
  else if (command === "update-media") result = updateCityMedia((flags.city || "").trim(), (flags.key || "").trim(), { titleZh: flags.title, titleEn: flags["title-en"], date: flags.date })
  else if (command === "labels") result = getCityLabels((flags.city || "").trim())
  else if (command === "set-city-name") result = setCityName((flags.city || "").trim(), flags["name-zh"], flags["name-en"])
  else if (command === "set-drone-title") result = setDroneTitle((flags.city || "").trim(), flags.title)
  else result = { ok: false, error: `未知命令：${command}` }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  if (!result.ok) process.exitCode = 1
}

module.exports = {
  listCities,
  addCity,
  importFiles,
  listCityMedia,
  deleteCityMedia,
  updateCityMedia,
  getCityLabels,
  setCityName,
  setDroneTitle,
  parseFlags,
  ROOT,
  APP,
  PRIVATE,
  INBOX_ROOT,
  EDITOR_STATE_PATH,
}

if (require.main === module) {
  main().catch((err) => {
    process.stdout.write(`${JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) })}\n`)
    process.exitCode = 1
  })
}
