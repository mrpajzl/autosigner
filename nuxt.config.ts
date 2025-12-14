// https://nuxt.com/docs/api/configuration/nuxt-config
import { resolve } from 'pathe'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'

const httpsOptions = (() => {
  if (!(process.env.DEV_HTTPS === '1' || process.env.DEV_HTTPS === 'true')) return undefined
  const keyPath = process.env.DEV_HTTPS_KEY_PATH || resolve('certs/dev-key.pem')
  const certPath = process.env.DEV_HTTPS_CERT_PATH || resolve('certs/dev-cert.pem')
  try {
    const key = fs.readFileSync(keyPath)
    const cert = fs.readFileSync(certPath)
    return { key, cert }
  } catch (e) {
    // Will fall back to vite-plugin-mkcert
    return null as unknown as any
  }
})()

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  pages: true,
  experimental: {
    // Allow composables (like useHead) to be used safely during plugin execution
    // and across async boundaries (required for some modules with Unhead v2)
    asyncContext: true
  },


  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/ui',
    '@nuxtjs/tailwindcss'
  ],

  css: ['~/assets/css/tailwind.css'],

  ui: {},

  runtimeConfig: {
    encryptionSecret: process.env.CRYPTO_SECRET || '',
    public: {
      baseUrl: process.env.PUBLIC_BASE_URL || ''
    }
  },

  // Enable HTTPS for Vite dev server when configured
  vite: {
    plugins: (() => {
      if (!process.env.DEV_HTTPS || httpsOptions) return [] as any[]
      try {
        const require = createRequire(import.meta.url)
        const mod = require('vite-plugin-mkcert')
        const mkcert = (mod && (mod.default || mod)) as any
        const envHosts = (process.env.DEV_HTTPS_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean)
        const localIps = Object.values(os.networkInterfaces()).flat().filter(Boolean).map(n => n!.address).filter(a => /^(\d+\.){3}\d+$/.test(a))
        const hosts = Array.from(new Set([...envHosts, ...localIps, 'localhost']))
        return [mkcert({ force: true, hosts })]
      } catch {
        console.warn('DEV_HTTPS enabled but vite-plugin-mkcert is not installed')
        return []
      }
    })(),
    server: {
      https: (process.env.DEV_HTTPS ? (httpsOptions || true) : undefined) as any,
      watch: {
        // Use polling instead of native file watchers to avoid EMFILE errors on macOS
        usePolling: true,
        interval: 1000,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.nuxt/**', '**/.output/**', '**/dist/**', '**/.storage-tmp/**']
      }
    }
  },

  // And for Nuxt dev server (Nuxt 3/4 supports devServer.https)
  devServer: {
    https: (process.env.DEV_HTTPS ? (httpsOptions || true) : undefined) as any
  },

  nitro: {
    // Allow large file uploads (500MB) for IPA files
    maxRequestBodySize: 500 * 1024 * 1024,
    routeRules: {
      '/apps/**': { headers: { 'cache-control': 'public, max-age=3600, immutable' } }
    },
  },

  hooks: {
    'pages:extend'(pages) {
      const ensure = (path: string, file: string, name?: string) => {
        const has = pages.some((p) => p.path === path)
        if (!has) pages.push({ name: name || path.replace(/[\/]/g, '_') || 'index', path, file: resolve(file) })
      }
      // Ensure key routes exist even if scanner misbehaves
      ensure('/', './pages/index.vue', 'index')
      ensure('/apps', './pages/apps/index.vue', 'apps')
      ensure('/apps/new', './pages/apps/new.vue', 'apps-new')
      // legacy upload removed
      ensure('/profile', './pages/profile/index.vue', 'profile-index')
      ensure('/profile/certificates', './pages/profile/certificates.vue', 'profile-certificates')
      // legacy upload removed
      // Apple Developer integration pages
      ensure('/profile/apple-developer', './pages/profile/apple-developer.vue', 'profile-apple-developer')
      ensure('/profile/devices', './pages/profile/devices.vue', 'profile-devices')
      ensure('/profile/apple-profiles', './pages/profile/apple-profiles.vue', 'profile-apple-profiles')
      // User database pages
      ensure('/profile/user-database', './pages/profile/user-database.vue', 'profile-user-database')
      ensure('/profile/user-import', './pages/profile/user-import.vue', 'profile-user-import')
      ensure('/signing', './pages/signing.vue', 'signing')
      ensure('/auth/login', './pages/auth/login.vue', 'auth-login')
      ensure('/admin/approvals', './pages/admin/approvals.vue', 'admin-approvals')
      ensure('/admin/apps', './pages/admin/apps.vue', 'admin-apps')
      // Guides pages
      ensure('/guides/apple-tv-sideloading', './pages/guides/apple-tv-sideloading.vue', 'guides-apple-tv-sideloading')
      ensure('/guides/ios-mac-installation', './pages/guides/ios-mac-installation.vue', 'guides-ios-mac-installation')
      ensure('/guides/hackintosh-vmware', './pages/guides/hackintosh-vmware.vue', 'guides-hackintosh-vmware')
      ensure('/guides/self-signing', './pages/guides/self-signing.vue', 'guides-self-signing')
    }
  }
})