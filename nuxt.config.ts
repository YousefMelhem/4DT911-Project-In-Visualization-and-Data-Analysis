// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  // Exclude large directories from file watching
  ignore: [
    '**/data/**',
    '**/Ml-Notebook/venv/**',
    '**/node_modules/**'
  ],
  
  vite: {
    server: {
      watch: {
        ignored: [
          '**/data/**', 
          '**/Ml-Notebook/venv/**',
          '**/node_modules/**'
        ]
      }
    }
  }
})
