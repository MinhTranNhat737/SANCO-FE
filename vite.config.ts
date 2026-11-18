import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {devDiagnostics} from './dev-diagnostics';
import {publicPages, siteOrigin} from './scripts/public-pages';

export default defineConfig(({command, mode}) => {
  const env=loadEnv(mode,process.cwd(),'');
  const origin=siteOrigin(env.SITE_URL || 'https://sanco.games');

  return {
  cacheDir:'node_modules/.vite-sanco',
  resolve:{dedupe:['react','react-dom']},
  optimizeDeps:{include:['react','react-dom/client','react/jsx-dev-runtime','lucide-react','socket.io-client']},
  plugins: [react(),devDiagnostics(),publicPages(origin,command==='build' && (!env.VERCEL_ENV || env.VERCEL_ENV==='production'))],
  server: { fs:{allow:['..']}, port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3001', '/socket.io': { target: 'http://127.0.0.1:3001', ws: true } } },
  build: { outDir: 'dist',manifest:true,rolldownOptions:{input:['index.html','bi-kip.html'],output:{codeSplitting:{groups:[{name:'three',test:/[\\/]node_modules[\\/]three[\\/]/}]}}} },
  };
});
