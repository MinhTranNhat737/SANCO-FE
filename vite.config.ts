import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {devDiagnostics} from './dev-diagnostics.ts';
import {publicPages, siteOrigin} from './scripts/public-pages.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {apiOrigin} from './src/api-origin.ts';

export default defineConfig(({command, mode}) => {
  const env=loadEnv(mode,process.cwd(),'');
  const backend=apiOrigin(env.VITE_API_URL||'');
  if(command==='build'&&env.VERCEL_ENV&&!backend)throw new Error('Vercel has no /api or Socket.IO proxy. Set VITE_API_URL to the HTTPS backend origin.');
  if(command==='build'&&env.VERCEL_ENV&&(!backend.startsWith('https://')||backend===`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`))throw new Error('Vercel requires a separate HTTPS backend origin.');
  const productionHost=env.VERCEL_ENV==='production' && env.VERCEL_PROJECT_PRODUCTION_URL;
  const origin=siteOrigin(env.SITE_URL || (productionHost ? `https://${productionHost}` : 'https://www.sanco.games'));
  if(command==='build'&&env.VERCEL_ENV&&backend===origin)throw new Error('VITE_API_URL points back to this Vercel frontend; use the backend origin.');
  const httpsKey = env.DEV_HTTPS_KEY, httpsCert = env.DEV_HTTPS_CERT;
  if (command === 'serve' && Boolean(httpsKey) !== Boolean(httpsCert)) {
    throw new Error('Set both DEV_HTTPS_KEY and DEV_HTTPS_CERT for local HTTPS.');
  }
  const https = command === 'serve' && httpsKey && httpsCert
    ? { key: readFileSync(resolve(httpsKey)), cert: readFileSync(resolve(httpsCert)) }
    : undefined;

  return {
  cacheDir:'node_modules/.vite-sanco',
  resolve:{dedupe:['react','react-dom']},
  optimizeDeps:{include:['react','react-dom/client','react/jsx-dev-runtime','lucide-react','socket.io-client']},
  plugins: [react(),devDiagnostics(),publicPages(origin,command==='build' && (!env.VERCEL_ENV || env.VERCEL_ENV==='production')),{
    name:'sanco-admin-route',
    configureServer(server){server.middlewares.use((req,res,next)=>{if(/^\/admin\/?(?:\?|$)/.test(req.url||'')){req.url=req.url!.replace(/^\/admin\/?/,'/admin.html');res.setHeader('X-Robots-Tag','noindex, nofollow');}next();});},
    configurePreviewServer(server){server.middlewares.use((req,res,next)=>{if(/^\/admin\/?(?:\?|$)/.test(req.url||'')){req.url=req.url!.replace(/^\/admin\/?/,'/admin.html');res.setHeader('X-Robots-Tag','noindex, nofollow');}next();});},
  }],
  server: { https, fs:{allow:['..']}, port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3001', '/socket.io': { target: 'http://127.0.0.1:3001', ws: true } } },
  build: { outDir: 'dist',manifest:true,rolldownOptions:{input:['index.html','bi-kip.html','admin.html'],output:{codeSplitting:{groups:[{name:'three',test:/[\\/]node_modules[\\/]three[\\/]/}]}}} },
  };
});
