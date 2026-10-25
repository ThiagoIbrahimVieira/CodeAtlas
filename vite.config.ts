import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Suporte a subdiretório para GitHub Pages (/CodeAtlas/) e raiz para Vercel / domínio customizado (/)
const rawBase = process.env.BASE_PATH || (process.env.GITHUB_PAGES === 'true' || process.env.GITHUB_ACTIONS === 'true' ? '/CodeAtlas/' : './')
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base,
})
