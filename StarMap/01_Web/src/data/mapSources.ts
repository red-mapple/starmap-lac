import {
  Credit,
  Ion,
  TileMapServiceImageryProvider,
  WebMercatorTilingScheme,
  WebMapTileServiceImageryProvider,
  buildModuleUrl,
  createWorldImageryAsync,
} from 'cesium'
import type { ImageryProvider } from 'cesium'

export type MapSourceId = 'cesium' | 'tianditu' | 'local'

export type MapSourceOption = {
  id: MapSourceId
  label: string
  description: string
  configured: boolean
}

type MapSourceLayers = {
  base: ImageryProvider | Promise<ImageryProvider>
  labels?: ImageryProvider
}

const cesiumIonToken = (import.meta.env.VITE_CESIUM_ION_TOKEN ?? '').trim()
const tiandituToken = (import.meta.env.VITE_TIANDITU_TOKEN ?? '').trim()
const configuredDefault = (import.meta.env.VITE_MAP_SOURCE ?? 'auto').trim().toLowerCase()
const mapSourceStorageKey = 'starmap:map-source'
const tiandituSubdomains = ['0', '1', '2', '3', '4', '5', '6', '7']
const tiandituTileMatrixLabels = Array.from({ length: 18 }, (_, index) => String(index + 1))
// 天地图 WMTS 的 'w' 矩阵集从第 1 级开始，且第 1 级就是 2×2 个瓦片；Cesium 默认第 0 级只有 1×1 个瓦片。
// 若沿用默认切片方案，Cesium 的第 L 级会去请求天地图第 L+1 级的同一行列号，实际取到的是"经度折半、纬度抬高"的另一区域瓦片
// （例如相机在天津时会请求到南大西洋/极地海面的空白瓦片，看起来就像"中国区域无瓦片"）。这里把零级瓦片数设为 2×2，使两级编号严格对齐。
const tiandituTilingScheme = new WebMercatorTilingScheme({
  numberOfLevelZeroTilesX: 2,
  numberOfLevelZeroTilesY: 2,
})

if (cesiumIonToken) {
  Ion.defaultAccessToken = cesiumIonToken
}

export const mapSourceOptions: MapSourceOption[] = [
  {
    id: 'cesium',
    label: 'Cesium',
    description: 'Cesium ion 全球影像',
    configured: Boolean(cesiumIonToken),
  },
  {
    id: 'tianditu',
    label: '天地图',
    description: '国内影像与中文注记',
    configured: Boolean(tiandituToken),
  },
  {
    id: 'local',
    label: '本地低清',
    description: '无需网络与凭据',
    configured: true,
  },
]

const configuredMapSourceIds = new Set<MapSourceId>(
  mapSourceOptions.filter((option) => option.configured).map((option) => option.id),
)

const isConfiguredMapSource = (value: string | null): value is MapSourceId => (
  value !== null && configuredMapSourceIds.has(value as MapSourceId)
)

const automaticMapSource = (): MapSourceId => {
  if (cesiumIonToken) return 'cesium'
  if (tiandituToken) return 'tianditu'
  return 'local'
}

export const getInitialMapSource = (): MapSourceId => {
  if (typeof window !== 'undefined') {
    try {
      const storedSource = window.localStorage.getItem(mapSourceStorageKey)
      if (isConfiguredMapSource(storedSource)) return storedSource
    } catch {
      // Storage can be unavailable in privacy-focused browser modes.
    }
  }

  if (configuredDefault !== 'auto' && isConfiguredMapSource(configuredDefault)) {
    return configuredDefault
  }

  return automaticMapSource()
}

export const rememberMapSource = (source: MapSourceId) => {
  if (!isConfiguredMapSource(source) || typeof window === 'undefined') return
  try {
    window.localStorage.setItem(mapSourceStorageKey, source)
  } catch {
    // The selected source still works for this session when storage is blocked.
  }
}

const createLocalImagery = () => TileMapServiceImageryProvider.fromUrl(
  buildModuleUrl('Assets/Textures/NaturalEarthII'),
)

const createTiandituImagery = (layer: 'img' | 'cia', includeCredit = false) => (
  new WebMapTileServiceImageryProvider({
    url: `https://t{s}.tianditu.gov.cn/${layer}_w/wmts?tk=${encodeURIComponent(tiandituToken)}`,
    layer,
    style: 'default',
    format: 'tiles',
    tileMatrixSetID: 'w',
    tileMatrixLabels: tiandituTileMatrixLabels,
    tilingScheme: tiandituTilingScheme,
    subdomains: tiandituSubdomains,
    maximumLevel: 17,
    enablePickFeatures: false,
    credit: includeCredit ? new Credit('天地图') : undefined,
  })
)

export const createMapSourceLayers = (source: MapSourceId): MapSourceLayers => {
  if (source === 'cesium' && cesiumIonToken) {
    return { base: createWorldImageryAsync().catch(createLocalImagery) }
  }

  if (source === 'tianditu' && tiandituToken) {
    return {
      base: createTiandituImagery('img', true),
      labels: createTiandituImagery('cia'),
    }
  }

  return { base: createLocalImagery() }
}
