import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'  // ← Changed from plugin-react
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],  // ← Now using vue plugin
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist'
  }
})
