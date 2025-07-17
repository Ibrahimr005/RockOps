import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    devSourcemap: true, // Enable CSS source maps
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable sourcemaps in production for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        }
      }
    }
  },
  // Configure dev server for SPA routing during development
  server: {
    historyApiFallback: true,
  },
  // Configure preview server for SPA routing
  preview: {
    port: 4173,
    host: true,
  },
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_BASE_URL)
  }
})