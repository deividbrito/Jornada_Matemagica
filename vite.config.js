// vite.config.js
import { defineConfig } from 'vite';

// Vite serve `public/` em `/` e processa `src/main.js` como módulo ES.
// `npm run dev`  → http://localhost:5173 com HMR
// `npm run build` → gera `dist/` pronta para deploy (Vercel/Netlify/Cloudflare/WAMP)
export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
  },
});
