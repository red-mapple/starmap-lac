/**
 * 给 JPEG 写入 / 替换最小 EXIF（含 GPS 经纬度与海拔）。
 * 只依赖 Node Buffer，不引第三方库。
 */

const TYPE = { BYTE: 1, ASCII: 2, SHORT: 3, LONG: 4, RATIONAL: 5 }

function asciiBuffer(text) {
  let value = String(text || "")
  // EXIF ASCII 需要以 NUL 结尾，长度补成偶数
  if (value.length % 2 !== 0) value += " "
  return Buffer.from(`${value}\0`, "latin1")
}

function rational(value, denominator = 10000) {
  return { num: Math.round(value * denominator), den: denominator }
}

function dms(value) {
  const abs = Math.abs(value)
  const deg = Math.floor(abs)
  const minutesFloat = (abs - deg) * 60
  const min = Math.floor(minutesFloat)
  const sec = (minutesFloat - min) * 60
  return [
    { num: deg, den: 1 },
    { num: min, den: 1 },
    { num: Math.round(sec * 10000), den: 10000 },
  ]
}

function rationalBuffer(items) {
  const buffer = Buffer.alloc(items.length * 8)
  items.forEach((item, index) => {
    buffer.writeUInt32BE(item.num, index * 8)
    buffer.writeUInt32BE(item.den, index * 8 + 4)
  })
  return buffer
}

function entry(tag, type, count, data) {
  return { tag, type, count, data }
}

function buildTiff({ lat, lng, altitude, dateTime, description }) {
  const dateText = String(dateTime || "").replace(/-/g, ":")
  const entriesGps = [
    entry(0x0000, TYPE.BYTE, 4, Buffer.from([2, 3, 0, 0])),
    entry(0x0001, TYPE.ASCII, 2, Buffer.from(lat >= 0 ? "N\0" : "S\0", "latin1")),
    entry(0x0002, TYPE.RATIONAL, 3, rationalBuffer(dms(lat))),
    entry(0x0003, TYPE.ASCII, 2, Buffer.from(lng >= 0 ? "E\0" : "W\0", "latin1")),
    entry(0x0004, TYPE.RATIONAL, 3, rationalBuffer(dms(lng))),
    entry(0x0005, TYPE.BYTE, 1, Buffer.from([altitude >= 0 ? 0 : 1])),
    entry(0x0006, TYPE.RATIONAL, 1, rationalBuffer([rational(Math.abs(altitude), 100)])),
  ]
  if (dateText) {
    entriesGps.push(entry(0x001D, TYPE.ASCII, 11, asciiBuffer(dateText.slice(0, 10))))
  }

  const entries0 = [
    entry(0x010F, TYPE.ASCII, asciiBuffer("StarMap").length, asciiBuffer("StarMap")),
    entry(0x0110, TYPE.ASCII, asciiBuffer("Drone Import").length, asciiBuffer("Drone Import")),
    entry(0x0112, TYPE.SHORT, 1, Buffer.from([0, 1])),
    entry(0x0132, TYPE.ASCII, asciiBuffer(dateText || "2026:01:01 00:00:00").length, asciiBuffer(dateText || "2026:01:01 00:00:00")),
  ]
  if (description) {
    entries0.push(entry(0x010E, TYPE.ASCII, asciiBuffer(description).length, asciiBuffer(description)))
  }
  // GPS IFD 指针稍后填
  entries0.push(entry(0x8825, TYPE.LONG, 1, Buffer.alloc(4)))

  const align = (size) => (size % 2 === 0 ? size : size + 1)

  const sizeOfExternal = (items) => {
    let total = 0
    const offsets = new Map()
    for (const item of items) {
      if (item.data.length > 4) {
        offsets.set(item, total)
        total += align(item.data.length)
      }
    }
    return { total, offsets }
  }

  const ifd0Size = 2 + entries0.length * 12 + 4
  const gpsIfdSize = 2 + entriesGps.length * 12 + 4
  const ifd0Externals = sizeOfExternal(entries0)
  const ifd0DataStart = 8 + ifd0Size
  const gpsIfdStart = ifd0DataStart + ifd0Externals.total
  const gpsExternals = sizeOfExternal(entriesGps)
  const gpsDataStart = gpsIfdStart + gpsIfdSize

  const total = gpsDataStart + gpsExternals.total
  const buffer = Buffer.alloc(total)

  // TIFF 头：大端
  buffer.write("MM", 0, "latin1")
  buffer.writeUInt16BE(42, 2)
  buffer.writeUInt32BE(8, 4)

  const writeIfd = (entries, ifdStart, dataStart, externals) => {
    buffer.writeUInt16BE(entries.length, ifdStart)
    entries.forEach((item, index) => {
      const pos = ifdStart + 2 + index * 12
      buffer.writeUInt16BE(item.tag, pos)
      buffer.writeUInt16BE(item.type, pos + 2)
      buffer.writeUInt32BE(item.count, pos + 4)
      if (item.tag === 0x8825) {
        buffer.writeUInt32BE(gpsIfdStart, pos + 8)
        return
      }
      if (item.data.length <= 4) {
        item.data.copy(buffer, pos + 8)
        return
      }
      const offset = dataStart + externals.offsets.get(item)
      buffer.writeUInt32BE(offset, pos + 8)
      item.data.copy(buffer, offset)
    })
    buffer.writeUInt32BE(0, ifdStart + 2 + entries.length * 12)
  }

  writeIfd(entries0, 8, ifd0DataStart, ifd0Externals)
  writeIfd(entriesGps, gpsIfdStart, gpsDataStart, gpsExternals)
  return buffer
}

function buildApp1(gps) {
  const tiff = buildTiff(gps)
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff])
  const header = Buffer.alloc(4)
  header.writeUInt16BE(0xffe1, 0)
  header.writeUInt16BE(payload.length + 2, 2)
  return Buffer.concat([header, payload])
}

/**
 * 在 JPEG 的 SOI 之后插入 APP1(EXIF)，并移除已有的 EXIF APP1。
 * 非 JPEG（PNG/TIFF/WebP）原样返回。
 */
function injectGps(jpegBuffer, gps) {
  if (!jpegBuffer || jpegBuffer.length < 4) return jpegBuffer
  if (jpegBuffer[0] !== 0xff || jpegBuffer[1] !== 0xd8) return jpegBuffer

  const parts = [jpegBuffer.subarray(0, 2), buildApp1(gps)]
  let offset = 2
  while (offset + 3 < jpegBuffer.length) {
    if (jpegBuffer[offset] !== 0xff) break
    let marker = jpegBuffer[offset + 1]
    while (marker === 0xff && offset + 2 < jpegBuffer.length) {
      offset += 1
      marker = jpegBuffer[offset + 1]
    }
    if (marker === 0xd9 || marker === 0xda) {
      parts.push(jpegBuffer.subarray(offset))
      return Buffer.concat(parts)
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(jpegBuffer.subarray(offset, offset + 2))
      offset += 2
      continue
    }
    const length = jpegBuffer.readUInt16BE(offset + 2)
    const segment = jpegBuffer.subarray(offset, offset + 2 + length)
    const isExif = marker === 0xe1 && segment.length > 8 && segment.toString("latin1", 4, 8) === "Exif"
    if (!isExif) parts.push(segment)
    offset += 2 + length
  }
  parts.push(jpegBuffer.subarray(offset))
  return Buffer.concat(parts)
}

module.exports = { injectGps, buildApp1 }
