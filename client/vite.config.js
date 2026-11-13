import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En desarrollo, las llamadas a /api se envían al servidor de Node
export default defineConfig({
    plugins: [react()],
    server: { proxy: { '/api': 'http://localhost:8085' } }
})
