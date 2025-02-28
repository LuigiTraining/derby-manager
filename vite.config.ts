import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'material-ui': ['@mui/material', '@mui/icons-material'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'date-utils': ['date-fns'],
          'charts': ['react-minimal-pie-chart']
        }
      }
    }
  }
})
