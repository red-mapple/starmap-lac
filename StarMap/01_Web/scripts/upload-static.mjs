// 静态资源增量上传：把 dist-static 下新增/变更的文件 PUT 到腾讯云 COS。
// 清单记录在 06_private/.cache/static-manifest.json，未变更的文件直接跳过。
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const COS = require('cos-nodejs-sdk-v5')

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const projectRoot = path.resolve(webRoot, '..', '..')
const privateRoot = process.env.STARMAP_PRIVATE_ROOT?.trim() || path.join(projectRoot, '06_private')
const envFile = path.join(privateRoot, '.env.local')
const manifestFile = path.join(privateRoot, '.cache', 'static-manifest.json')
const staticRoot = path.join(webRoot, 'dist-static')
const CONCURRENCY = 8

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.ktx2': 'image/ktx2',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

const readEnv = async () => {
  const text = await fs.readFile(envFile, 'utf8')
  const parsed = {}
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith('#')) continue
    const index = line.indexOf('=')
    if (index < 0) continue
    parsed[line.slice(0, index).trim()] = line.slice(index + 1).trim()
  }
  return parsed
}

const hashFile = (target) =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(target)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })

const walk = async (dir, base = dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(full, base))
    else files.push(full)
  }
  return files
}

const uploadOne = (cos, bucket, region, key, filePath, contentType) =>
  new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: bucket,
        Region: region,
        Key: key,
        Body: createReadStream(filePath),
        ContentType: contentType,
        // 文件名带内容哈希/日期目录，不会再改，可长期缓存。
        CacheControl: 'public, max-age=31536000, immutable',
        onProgress: () => {},
      },
      (err, data) => (err ? reject(err) : resolve(data)),
    )
  })

const main = async () => {
  const env = await readEnv()
  const bucket = env.COS_BUCKET
  const region = env.COS_REGION
  const baseUrl = (env.COS_BASE_URL ?? '').replace(/\/+$/, '')
  if (!env.COS_SECRET_ID || !env.COS_SECRET_KEY || !bucket) {
    throw new Error('缺少 COS 凭证，请检查 06_private/.env.local')
  }
  const staticExists = await fs.access(staticRoot).then(() => true, () => false)
  if (!staticExists) throw new Error('找不到 dist-static，请先构建')

  const cos = new COS({ SecretId: env.COS_SECRET_ID, SecretKey: env.COS_SECRET_KEY })
  const files = await walk(staticRoot)
  const previous = await fs
    .readFile(manifestFile, 'utf8')
    .then((raw) => JSON.parse(raw))
    .catch(() => ({ files: {} }))
  const next = { updatedAt: new Date().toISOString(), files: {} }

  const pending = []
  let skipped = 0
  for (const file of files) {
    const key = path.relative(staticRoot, file).split(path.sep).join('/')
    const size = (await fs.stat(file)).size
    const sha = await hashFile(file)
    next.files[key] = { size, sha }
    if (previous.files?.[key]?.sha === sha && previous.files[key].size === size) {
      skipped += 1
      continue
    }
    pending.push({ file, key, size, sha })
  }

  console.log(`待上传 ${pending.length} 个文件，跳过 ${skipped} 个未变更文件（共 ${files.length} 个）`)
  if (!pending.length) {
    await fs.mkdir(path.dirname(manifestFile), { recursive: true })
    await fs.writeFile(manifestFile, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
    console.log('静态资源无变更，跳过上传')
    return
  }

  let done = 0
  let bytesDone = 0
  const totalBytes = pending.reduce((sum, item) => sum + item.size, 0)
  const startedAt = Date.now()
  const failures = []

  const worker = async () => {
    while (pending.length) {
      const job = pending.shift()
      const ext = path.extname(job.key).toLowerCase()
      const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream'
      let attempt = 0
      for (;;) {
        try {
          await uploadOne(cos, bucket, region, job.key, job.file, contentType)
          done += 1
          bytesDone += job.size
          if (done % 10 === 0 || done === files.length) {
            const mb = (bytesDone / 1024 / 1024).toFixed(1)
            const totalMb = (totalBytes / 1024 / 1024).toFixed(1)
            process.stdout.write(`\r已上传 ${done}/${pending.length + done} ，${mb}/${totalMb} MB`)
          }
          break
        } catch (error) {
          attempt += 1
          if (attempt >= 3) {
            failures.push(`${job.key}: ${error.message}`)
            break
          }
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker))
  process.stdout.write('\n')

  await fs.mkdir(path.dirname(manifestFile), { recursive: true })
  await fs.writeFile(manifestFile, `${JSON.stringify(next, null, 2)}\n`, 'utf8')

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`上传完成：成功 ${done} 个，失败 ${failures.length} 个，耗时 ${seconds}s`)
  if (baseUrl) console.log(`资源根：${baseUrl}`)
  if (failures.length) {
    for (const line of failures.slice(0, 10)) console.error(`失败 ${line}`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`静态资源上传失败：${error.message}`)
  process.exitCode = 1
})
