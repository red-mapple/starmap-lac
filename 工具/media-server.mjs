import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const HERE = path.dirname(fileURLToPath(import.meta.url))
const tool = require(path.join(HERE, 'media-tool.cjs'))
const sharp = require(path.join(tool.APP, 'node_modules', 'sharp'))

const PORT = Number(process.env.STARMAP_TOOL_PORT || 5199)
const APP_DIR = tool.APP
const ROOT = tool.ROOT
const PUBLISH_BAT = path.join(ROOT, '更新影像并发布.bat')

// 兼容被裁剪的 PATH（例如从精简环境启动本服务）：显式定位系统命令与系统目录
const WINDIR = process.env.SystemRoot || process.env.windir || 'C:\\Windows'
const SYSTEM32 = path.join(WINDIR, 'System32')
const firstExisting = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate
  }
  return undefined
}
const CMD_EXE = firstExisting(process.env.ComSpec, path.join(SYSTEM32, 'cmd.exe'), 'cmd.exe') || 'cmd.exe'
const EXPLORER_EXE = firstExisting(path.join(SYSTEM32, 'explorer.exe'), 'explorer.exe') || 'explorer.exe'
const CHILD_PATH = [SYSTEM32, path.join(WINDIR, 'System32', 'WindowsPowerShell', 'v1.0'), process.env.PATH || '']
  .filter(Boolean)
  .join(path.delimiter)

// 同一时刻只允许一个发布任务，避免连点导致 npm/构建并发
let publishJob = null
const PAGE = path.join(HERE, '影像工具.html')
const ENV_FILE = path.join(ROOT, '06_private', 'config', '.env.local')

const readEnvValue = (key) => {
  try {
    const text = fs.readFileSync(ENV_FILE, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
      if (match && match[1] === key) return match[2].trim().replace(/^['"]|['"]$/g, '')
    }
  } catch {
    // 忽略：读不到环境文件时退回进程环境变量
  }
  return process.env[key] || ''
}

const CHINA_BOUND = '73.0,3.0,136.0,54.0'
const THUMB_DIR = path.join(tool.PRIVATE, '.cache', 'tool-thumbs')

// 持久日志：页面日志随刷新丢失，这里把上传 / 入库 / 发布全过程追加到文件
const LOG_DIR = path.join(tool.PRIVATE, '.cache')
const LOG_FILE = path.join(LOG_DIR, 'media-server.log')
const logLine = (level, message) => {
  const stamp = new Date().toISOString()
  const body = String(message ?? '')
    .replace(/\r/g, '')
    .replace(/\n+$/, '')
    .split('\n')
    .map((line) => `${stamp} [${level}] ${line}`)
    .join('\n')
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true })
    fs.appendFileSync(LOG_FILE, `${body}\n`)
  } catch {
    // 日志写不进去不能影响主流程
  }
  process.stdout.write(`${body}\n`)
}

// 素材文件安全解析：只允许 drone / photos 目录下的文件
const resolveMediaFile = (city, key) => {
  if (!city || !key) return undefined
  const cityDir = path.resolve(path.join(tool.INBOX_ROOT, '中国', city))
  const target = path.resolve(cityDir, key)
  if (!target.startsWith(`${cityDir}${path.sep}`)) return undefined
  const typeDir = path.basename(path.dirname(target))
  if (typeDir !== 'drone' && typeDir !== 'photos') return undefined
  return fs.existsSync(target) ? target : undefined
}
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StarMapMediaTool/1.0',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://starmap-lac.netlify.app/',
}

const splitLonLat = (value) => {
  if (!value || typeof value !== 'string') return undefined
  const parts = value.split(',').map((item) => Number(item.trim()))
  if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return undefined
  return { lng: parts[0], lat: parts[1] }
}

const pickPoi = (pois, keyword) => {
  if (!Array.isArray(pois) || pois.length === 0) return undefined
  const exact = pois.find((poi) => String(poi.name || '').replace(/\s/g, '') === keyword.replace(/\s/g, ''))
  return exact ?? pois[0]
}

const geocodeCache = new Map()

const fetchTiandituJson = async (url) => {
  let lastError
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { headers: REQUEST_HEADERS })
    if (response.ok) return response.json()
    if (response.status === 429 || response.status === 403) {
      lastError = new Error(`天地图接口限流或拒绝（HTTP ${response.status}），稍后再试`)
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)))
      continue
    }
    throw new Error(`天地图接口返回 HTTP ${response.status}`)
  }
  throw lastError || new Error('天地图接口暂时不可用')
}

const geocodeByName = async (keyword) => {
  const cached = geocodeCache.get(keyword)
  if (cached && Date.now() - cached.at < 6 * 60 * 60 * 1000) return cached.value

  const tk = readEnvValue('VITE_TIANDITU_TOKEN')
  if (!tk) throw new Error('缺少天地图密钥：06_private\\config\\.env.local 里没有 VITE_TIANDITU_TOKEN')

  // 1) 天地图地名检索：行政区命中在 area.lonlat，兴趣点在 pois
  const postStr = JSON.stringify({
    keyWord: keyword,
    level: 12,
    mapBound: CHINA_BOUND,
    queryType: 1,
    start: 0,
    count: 10,
    showType: 1,
  })
  const searchUrl = `https://api.tianditu.gov.cn/v2/search?postStr=${encodeURIComponent(postStr)}&type=query&tk=${tk}`
  const data = await fetchTiandituJson(searchUrl)

  const areaPoint = splitLonLat(data?.area?.lonlat)
  if (areaPoint) {
    return {
      ok: true,
      query: keyword,
      name: data.area.name || keyword,
      lat: areaPoint.lat.toFixed(6),
      lng: areaPoint.lng.toFixed(6),
      address: data.area.name || '',
      source: '天地图行政区检索',
      bound: data.area.bound || '',
    }
  }

  const poi = pickPoi(data?.pois, keyword)
  const poiPoint = poi ? splitLonLat(`${poi.lon},${poi.lat}`) : undefined
  if (poiPoint) {
    return {
      ok: true,
      query: keyword,
      name: poi.name || keyword,
      lat: poiPoint.lat.toFixed(6),
      lng: poiPoint.lng.toFixed(6),
      address: poi.address || '',
      source: '天地图地名检索',
    }
  }

  // 2) 退回天地图地理编码接口
  const geoUrl = `https://api.tianditu.gov.cn/geocoder?ds=${encodeURIComponent(JSON.stringify({ keyWord: keyword }))}&tk=${tk}`
  const geoData = await fetchTiandituJson(geoUrl)
  const location = geoData?.location || geoData?.result?.location
  if (location?.lon && location?.lat) {
    return {
      ok: true,
      query: keyword,
      name: location.keyWord || keyword,
      lat: Number(location.lat).toFixed(6),
      lng: Number(location.lon).toFixed(6),
      address: geoData?.result?.formatted_address || '',
      source: '天地图地理编码',
    }
  }
  throw new Error(`天地图没有找到「${keyword}」，请手动填写经纬度`)
}

function json(res, code, data) {
  const body = JSON.stringify(data)
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(body)
}

function collectJson(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1_000_000) {
        reject(new Error('请求体过大'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw.replace(/^\uFEFF/, '')) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function readBodyToFile(req, target) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(target)
    let bytes = 0
    req.on('data', (chunk) => {
      bytes += chunk.length
    })
    req.pipe(ws)
    ws.on('finish', () => resolve(bytes))
    ws.on('error', reject)
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)

  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const html = fs.readFileSync(PAGE)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      return res.end(html)
    }

    if (req.method === 'GET' && url.pathname === '/api/cities') {
      return json(res, 200, tool.listCities())
    }

    // 服务端持久日志（默认最近 300 行，?lines= 可调，最多 2000）
    if (req.method === 'GET' && url.pathname === '/api/logs') {
      const want = Number(url.searchParams.get('lines') || 300)
      let text = ''
      try {
        text = fs.readFileSync(LOG_FILE, 'utf8')
      } catch {
        text = '（还没有日志文件，说明这段时间没有任何上传 / 发布动作）'
      }
      const tail = text.trimEnd().split('\n').slice(-Math.min(2000, Math.max(1, want))).join('\n')
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
      return res.end(tail || '（日志为空）')
    }

    if (req.method === 'GET' && url.pathname === '/api/geocode') {
      const name = (url.searchParams.get('name') || '').trim()
      if (name.length < 2) return json(res, 400, { ok: false, error: '城市名称至少 2 个字' })
      try {
        const result = await geocodeByName(name)
        if (result.ok) geocodeCache.set(name, { at: Date.now(), value: result })
        return json(res, 200, result)
      } catch (error) {
        return json(res, 200, { ok: false, error: error instanceof Error ? error.message : '查询坐标失败' })
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/cities') {
      const body = await collectJson(req)
      const result = tool.addCity(body)
      return json(res, result.ok ? 200 : 400, result)
    }

    // 单个文件上传后立刻入库：body 是文件的原始字节
    if (req.method === 'POST' && url.pathname === '/api/import') {
      const city = url.searchParams.get('city') || ''
      const type = url.searchParams.get('type') || 'drone'
      const date = url.searchParams.get('date') || ''
      const title = url.searchParams.get('title') || ''
      const lat = url.searchParams.get('lat') || ''
      const lng = url.searchParams.get('lng') || ''
      const alt = url.searchParams.get('alt') || ''
      const name = url.searchParams.get('name') || 'upload.jpg'
      if (!city) return json(res, 400, { ok: false, error: '缺少城市名' })

      const tempDir = path.join(os.tmpdir(), 'starmap-tool-upload')
      fs.mkdirSync(tempDir, { recursive: true })
      const safeName = path.basename(name).replace(/[\\/:*?"<>|]/g, '_')
      const tempPath = path.join(tempDir, `${crypto.randomUUID().slice(0, 8)}-${safeName}`)
      const startedAt = Date.now()
      logLine('info', `收到上传 city=${city} type=${type} name=${safeName} date=${date || '自动'} lat=${lat || '-'} lng=${lng || '-'}`)
      let bytes = 0
      try {
        bytes = await readBodyToFile(req, tempPath)
      } catch (error) {
        logLine('error', `接收文件失败 name=${safeName} ${error && error.stack ? error.stack : error}`)
        throw error
      }
      logLine('info', `接收完成 name=${safeName} bytes=${bytes}`)
      try {
        const result = await tool.importFiles({ city, type, date, title, lat, lng, alt, files: [tempPath], _originalName: safeName })
        const secs = ((Date.now() - startedAt) / 1000).toFixed(1)
        if (result.ok) {
          const notes = (result.items || []).map((item) => `${item.out} ${item.note || ''}`.trim()).join(' | ')
          logLine('info', `入库成功 name=${safeName} bytes=${bytes} ${secs}s ${notes}`)
        } else {
          logLine('error', `入库失败 name=${safeName} bytes=${bytes} ${secs}s ${result.error || (result.errors || []).join('; ')}`)
        }
        return json(res, result.ok ? 200 : 400, { ...result, bytes })
      } catch (error) {
        logLine('error', `入库异常 name=${safeName} ${error && error.stack ? error.stack : error}`)
        return json(res, 500, { ok: false, error: `服务处理失败：${error && error.message ? error.message : error}` })
      } finally {
        fs.promises.unlink(tempPath).catch(() => {})
      }
    }

    if (req.method === 'GET' && url.pathname === '/api/media') {
      const city = (url.searchParams.get('city') || '').trim()
      const result = tool.listCityMedia(city)
      return json(res, result.ok ? 200 : 400, result)
    }

    // 素材缩略图：按需裁 360×180，缓存到 06_private\.cache\tool-thumbs
    if (req.method === 'GET' && url.pathname === '/api/media/thumb') {
      const city = (url.searchParams.get('city') || '').trim()
      const key = (url.searchParams.get('key') || '').trim()
      const source = resolveMediaFile(city, key)
      if (!source) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        return res.end('not found')
      }
      const stat = fs.statSync(source)
      const stamp = crypto.createHash('sha1').update(`${source}|${stat.mtimeMs}|${stat.size}`).digest('hex').slice(0, 16)
      const cachePath = path.join(THUMB_DIR, `${stamp}.jpg`)
      fs.mkdirSync(THUMB_DIR, { recursive: true })
      if (!fs.existsSync(cachePath)) {
        try {
          await sharp(source, { limitInputPixels: 300_000_000 }).resize(360, 180, { fit: 'cover' }).jpeg({ quality: 72 }).toFile(cachePath)
        } catch (error) {
          res.writeHead(415, { 'Content-Type': 'text/plain; charset=utf-8' })
          return res.end(`thumb failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      const data = fs.readFileSync(cachePath)
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=300' })
      return res.end(data)
    }

    // 删除一条已入库素材（先移到城市目录 _trash，再改 media.json；公网要重新发布才生效）
    if (req.method === 'POST' && url.pathname === '/api/media/delete') {
      const city = (url.searchParams.get('city') || '').trim()
      const key = (url.searchParams.get('key') || '').trim()
      const result = tool.deleteCityMedia(city, key)
      return json(res, result.ok ? 200 : 400, result)
    }

    // 修改一条素材的标题 / 拍摄日期
    if (req.method === 'POST' && url.pathname === '/api/media/update') {
      const body = await collectJson(req)
      const result = tool.updateCityMedia(String(body.city || '').trim(), String(body.key || '').trim(), {
        titleZh: body.titleZh,
        titleEn: body.titleEn,
        date: body.date,
      })
      return json(res, result.ok ? 200 : 400, result)
    }

    // 城市显示名 / 右栏无人机影像标题（写 editor-state.local.json）
    if (req.method === 'GET' && url.pathname === '/api/labels') {
      const city = (url.searchParams.get('city') || '').trim()
      const result = tool.getCityLabels(city)
      return json(res, result.ok ? 200 : 400, result)
    }

    if (req.method === 'POST' && url.pathname === '/api/labels/city-name') {
      const body = await collectJson(req)
      const result = tool.setCityName(String(body.city || '').trim(), body.nameZh, body.nameEn)
      return json(res, result.ok ? 200 : 400, result)
    }

    if (req.method === 'POST' && url.pathname === '/api/labels/drone-title') {
      const body = await collectJson(req)
      const result = tool.setDroneTitle(String(body.city || '').trim(), body.title)
      return json(res, result.ok ? 200 : 400, result)
    }

    if (req.method === 'POST' && url.pathname === '/api/open-inbox') {
      const city = url.searchParams.get('city') || ''
      const dir = city ? path.join(tool.INBOX_ROOT, '中国', city) : tool.INBOX_ROOT
      if (!fs.existsSync(dir)) return json(res, 404, { ok: false, error: '目录不存在，请先新建城市' })
      spawn(EXPLORER_EXE, [dir], { detached: true, windowsHide: false }).unref()
      return json(res, 200, { ok: true, dir })
    }

    // 发布：流式把 bat 的标准输出逐行回写给页面
    if (req.method === 'POST' && url.pathname === '/api/publish') {
      if (publishJob && publishJob.child && publishJob.child.exitCode === null) {
        const running = ((Date.now() - publishJob.startedAt) / 1000).toFixed(0)
        res.writeHead(409, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' })
        res.end(`已有发布任务正在运行（已运行 ${running}s），请等它结束后再点。\n__EXIT__409\n`)
        logLine('info', `拒绝重复发布：已有任务运行 ${running}s`)
        return
      }
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      })
      const env = { ...process.env, STARMAP_AUTORUN: '1', PATH: CHILD_PATH }
      const startedAt = Date.now()
      logLine('info', `开始一键投递并发布 cmd=${CMD_EXE}`)
      let transcript = ''
      const child = spawn(CMD_EXE, ['/c', PUBLISH_BAT], {
        cwd: APP_DIR,
        env,
        windowsHide: true,
      })
      child.stdout.setEncoding('utf8')
      publishJob = { child, startedAt }
      child.stderr.setEncoding('utf8')
      child.stdout.on('data', (chunk) => {
        res.write(chunk)
        logLine('publish', chunk)
        if (transcript.length < 60000) transcript += chunk
      })
      child.stderr.on('data', (chunk) => {
        res.write(chunk)
        logLine('publish', chunk)
        if (transcript.length < 60000) transcript += chunk
      })
      child.on('error', (error) => {
        logLine('error', `发布进程启动失败 ${error && error.stack ? error.stack : error}`)
      })
      child.on('close', (code) => {
        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
        publishJob = null
        logLine(code === 0 ? 'info' : 'error', `发布结束 exit=${code} 用时 ${seconds}s`)
        // 中文收尾统一由服务端输出：cmd 在 UTF-8 批处理下会切断中文行，交给 Node 拼更稳
        const deployUrl = (transcript.match(/Deploy URL:\s*(https?:\/\/[^\s]+)/) || [])[1] || ''
        if (code === 0) {
          const lines = [
            '',
            '==================================================',
            '  已上传到 EdgeOne Pages（项目 starmap-lac）',
            '  控制台：https://console.cloud.tencent.com/edgeone/makers/project/makers-usa88fszfoer',
            deployUrl ? `  本次预览链接（约 3 小时有效，须整条复制）：` : '  预览链接请在控制台点「预览」获取（约 3 小时有效）：',
            deployUrl ? `  ${deployUrl}` : '',
            `  用时 ${seconds}s`,
            '==================================================',
            '',
          ].filter((line) => line !== '')
          res.write(`${lines.join('\n')}\n`)
          logLine('info', deployUrl ? `本次预览链接 ${deployUrl}` : '未从 CLI 输出中解析到 Deploy URL')
        } else {
          res.write(`\n发布失败（exit=${code}），请查看上方日志。\n`)
        }
        res.write(`\n__EXIT__${code}\n`)
        res.end()
      })
      req.on('close', () => {
        if (!child.killed) child.kill()
      })
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  } catch (error) {
    logLine('error', `接口异常 ${req.method} ${url.pathname} ${error && error.stack ? error.stack : error}`)
    json(res, 500, { ok: false, error: String(error && error.message ? error.message : error) })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  logLine('info', `===== 服务启动 port=${PORT} 私有层=${tool.PRIVATE} =====`)
  console.log(`StarMap 影像工具已启动：http://127.0.0.1:${PORT}`)
  console.log(`私有层：${tool.PRIVATE}`)
  console.log(`日志文件：${LOG_FILE}`)
  console.log('关闭窗口即退出。')
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`端口 ${PORT} 已被占用：工具可能已经开着了。直接打开 http://127.0.0.1:${PORT} 即可，或关掉旧窗口再来。`)
  } else {
    console.log(`服务启动失败：${error.message}`)
  }
  process.exit(1)
})
