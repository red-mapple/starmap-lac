// 构建后处理：把媒体文件从 dist 移到 dist-static（上传 COS），Cesium 仍留在 dist。
// Cesium 的 Worker 跨域会被浏览器拒绝，所以不随媒体外移。
import { cp, mkdir, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distRoot = path.join(webRoot, 'dist')
const staticRoot = path.join(webRoot, 'dist-static')

const walkSize = async (target) => {
  const info = await stat(target)
  if (info.isFile()) return { files: 1, bytes: info.size }
  const { readdir } = await import('node:fs/promises')
  const entries = await readdir(target, { withFileTypes: true })
  let files = 0
  let bytes = 0
  for (const entry of entries) {
    const sub = await walkSize(path.join(target, entry.name))
    files += sub.files
    bytes += sub.bytes
  }
  return { files, bytes }
}

const moveDir = async (from, to) => {
  if (!existsSync(from)) return null
  await mkdir(path.dirname(to), { recursive: true })
  await rm(to, { recursive: true, force: true })
  await cp(from, to, { recursive: true })
  await rm(from, { recursive: true, force: true })
  const size = await walkSize(to)
  return `${path.relative(webRoot, to)}：${size.files} 个文件，${(size.bytes / 1024 / 1024).toFixed(1)} MB`
}

const moved = []
const report = async (label, from, to) => {
  const result = await moveDir(from, to)
  if (result) moved.push(`${label} ${result}`)
}

await report('媒体', path.join(distRoot, 'media'), path.join(staticRoot, 'media'))

const distSize = await walkSize(distRoot)
console.log(`dist：${distSize.files} 个文件，${(distSize.bytes / 1024 / 1024).toFixed(2)} MB（上传 EdgeOne）`)
if (moved.length) {
  for (const line of moved) console.log(line)
} else {
  console.log('dist-static：本次没有需要移出的静态资源')
}
