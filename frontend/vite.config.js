import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const REPO_NAME = '/Heart-of-guro/';
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? REPO_NAME : '/',
})
