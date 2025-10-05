import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const REPO_NAME = '/buzz-joe-project/';
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? REPO_NAME : '/',
})
