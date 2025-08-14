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
      https: (process.env.DEV_HTTPS ? (httpsOptions || true) : undefined) as any
    }
  },

  // And for Nuxt dev server (Nuxt 3/4 supports devServer.https)
  devServer: {
    https: (process.env.DEV_HTTPS ? (httpsOptions || true) : undefined) as any
  },

  nitro: {
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
      ensure('/upload', './pages/upload.vue', 'upload')
      ensure('/profile', './pages/profile/index.vue', 'profile-index')
      ensure('/profile/certificates', './pages/profile/certificates.vue', 'profile-certificates')
      ensure('/profile/profiles', './pages/profile/profiles.vue', 'profile-profiles')
      ensure('/auth/login', './pages/auth/login.vue', 'auth-login')
      ensure('/admin/approvals', './pages/admin/approvals.vue', 'admin-approvals')
    }
  }
})