import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {devDiagnostics} from './dev-diagnostics';
export default defineConfig({
  cacheDir:'node_modules/.vite-sanco',
  resolve:{dedupe:['react','react-dom']},
  optimizeDeps:{include:['react','react-dom/client','react/jsx-dev-runtime','lucide-react','socket.io-client']},
  plugins: [react(),devDiagnostics()],
  server: { fs:{allow:['..']}, port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3001', '/socket.io': { target: 'http://127.0.0.1:3001', ws: true } } },
  build: { outDir: 'dist',manifest:true,rolldownOptions:{output:{codeSplitting:{groups:[{name:'three',test:/[\\/]node_modules[\\/]three[\\/]/}]}}} },
});
