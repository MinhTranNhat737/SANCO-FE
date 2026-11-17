import type {Plugin} from 'vite';

// Local development only: capture startup failures before React can mount.
export function devDiagnostics():Plugin{
  const errors:unknown[]=[];
  return {name:'sanco-dev-diagnostics',apply:'serve',configureServer(server){
    server.middlewares.use('/__dev/client-errors',(req,res)=>{
      res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
      if(req.method==='GET'){res.end(JSON.stringify(errors));return;}
      if(req.method!=='POST'){res.statusCode=405;res.end('{}');return;}
      let body='';req.on('data',chunk=>{if(body.length<16000)body+=String(chunk);});
      req.on('end',()=>{try{const value=JSON.parse(body);errors.push({message:String(value.message||'').slice(0,2000),stack:String(value.stack||'').slice(0,6000),source:String(value.source||'').split('?')[0],at:Date.now()});if(errors.length>10)errors.shift();res.end('{"ok":true}');}catch{res.statusCode=400;res.end('{}');}});
    });
  },transformIndexHtml(){return [{tag:'script',injectTo:'head-prepend',children:`(()=>{const report=(error,source)=>fetch('/__dev/client-errors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:String(error?.message||error),stack:error?.stack||'',source:source||''})}).catch(()=>{});window.addEventListener('error',e=>report(e.error||e.message,e.filename));window.addEventListener('unhandledrejection',e=>report(e.reason));})();`}];}};
}
