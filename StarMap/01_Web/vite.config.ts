import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import cesium from 'vite-plugin-cesium'
// @ts-expect-error Node-only Vite plugin is intentionally kept outside the browser TypeScript project.
import { travelAtlasLocalEditor } from './scripts/local-editor-plugin.mjs'
// @ts-expect-error Node-only profile helper is intentionally kept outside the browser TypeScript project.
import { getPrivatePaths } from './scripts/private-profile.mjs'

// 静态资源分仓：媒体文件改由外部分发（COS），dist 保留应用外壳与 Cesium。
// Cesium 的 Worker 受同源策略限制，跨域托管会黑屏，因此仍随 dist 部署。
const staticBaseUrl = (value?: string) => `${(value ?? '').trim().replace(/\/+$/, '')}`

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const profile = mode === 'personal' ? 'personal' : 'public'
  const privatePaths = getPrivatePaths()
  const envDir = profile === 'personal' ? privatePaths.configRoot : false
  const personalEnv = profile === 'personal' ? loadEnv(mode, envDir, '') : {}
  const staticBase = staticBaseUrl(profile === 'personal' ? personalEnv.VITE_STATIC_BASE : process.env.VITE_STATIC_BASE)

  return {
    // Public mode never reads repository-local .env files. Hosting variables from process.env still work.
    envDir,
    plugins: [
      travelAtlasLocalEditor({
        profile,
        privateRoot: privatePaths.root,
        cesiumAccessToken: personalEnv.VITE_CESIUM_ION_TOKEN,
      }),
      react(),
      tailwindcss(),
      cesium(),
    ],
    define: {
      __STARMAP_STATIC_BASE__: JSON.stringify(staticBase),
    },
    server: {
      watch: {
        ignored: [
          '**/public/media/user/**',
        ],
      },
    },
  }
})
