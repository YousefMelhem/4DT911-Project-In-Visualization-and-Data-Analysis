// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-10-01',
  devtools: { enabled: true },
  
  // Runtime configuration
  runtimeConfig: {
    // Public keys (exposed to client)
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:8000'
    }
  },
  
  // Exclude large directories from file watching
  ignore: [
    '**/data/**',
    '**/Ml-Notebook/venv/**',
    '**/node_modules/**',
    '**/.git/**',
    '**/.nuxt/**',
    '**/dist/**',
    '**/backend/**',
    '**/*.log',
    '**/*.pyc',
    '**/__pycache__/**'
  ],
  
  vite: {
    server: {
      watch: {
        ignored: [
          '**/data/**', 
          '**/Ml-Notebook/venv/**',
          '**/node_modules/**',
          '**/.git/**',
          '**/.nuxt/**',
          '**/dist/**',
          '**/backend/**',
          '**/*.log',
          '**/*.pyc',
          '**/__pycache__/**'
        ]
      }
    }
  }
})
