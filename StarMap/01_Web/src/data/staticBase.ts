// 静态资源分仓：媒体文件由外部分发（COS），此处集中拼接绝对地址。
// __STARMAP_STATIC_BASE__ 由 vite.config.ts 依据 VITE_STATIC_BASE 注入；留空表示资源随站点部署。
declare const __STARMAP_STATIC_BASE__: string

const STATIC_BASE = (__STARMAP_STATIC_BASE__ ?? '').trim().replace(/\/+$/, '')

export const staticBase = STATIC_BASE

/** 把站点内的 /media/user/... 路径改写到静态资源仓；未配置时保持原样（本地直出）。 */
export const staticMediaUrl = (value: string) =>
  STATIC_BASE && value.startsWith('/media/') ? `${STATIC_BASE}${value}` : value
