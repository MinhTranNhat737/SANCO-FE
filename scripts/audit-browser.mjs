import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {createApplication} from '../../be/src/app.js';

// Local-only production builds, isolated SQL and system Chrome. Never targets production.
const root=path.resolve('..'),temporary=await mkdtemp(path.join(os.tmpdir(),'sanco-network-'));
const applications=[],contexts=[],results=[];
let browser;
const duration=Number(process.env.AUDIT_IDLE_MS||300000);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  for(const [label,folder]of [['before-20-Nov','.audit-before'],['deployment-4815172','.audit-deployed'],['fixed','.audit-fe']]){
    const port=31991+applications.length;
    const app=await createApplication({origins:'http://127.0.0.1:'+port,database:{url:null,directory:path.join(temporary,label)},staticDirectory:path.join(root,folder,'dist'),secureCookies:false});
    applications.push(app);await new Promise(resolve=>app.server.listen(port,'127.0.0.1',resolve));
    const origin=`http://127.0.0.1:${app.server.address().port}`,context=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(context);
    const page=await context.newPage(),events=[],errors=[],wire=[],cached=new Set();
    const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
    cdp.on('Network.requestWillBeSent',e=>{if(/^https?:/.test(e.request.url))wire.push({id:e.requestId,local:e.request.url.startsWith(origin),at:Date.now()});});
    cdp.on('Network.requestServedFromCache',e=>cached.add(e.requestId));
    cdp.on('Network.responseReceived',e=>{if(e.response.fromDiskCache||e.response.fromPrefetchCache||e.response.fromServiceWorker)cached.add(e.requestId);});
    page.on('request',request=>events.push({path:new URL(request.url()).pathname,local:request.url().startsWith(origin),method:request.method(),at:Date.now()}));
    page.on('pageerror',error=>errors.push(error.message));
    const start=Date.now();await page.goto(origin);await page.waitForSelector('.collection-card').catch(async error=>{console.log(JSON.stringify({label,errors,events,text:await page.locator('body').innerText()}));throw error;});await pause(2000);
    results.push({label,origin,page,events,errors,wire,cached,start,loaded:Date.now(),loadCount:events.length});
    console.log(JSON.stringify({phase:'loaded',label,requests:events.length}));
  }
  // All three pages remain open for at least five wall-clock minutes.
  const target=Date.now()+duration;while(Date.now()<target)await pause(Math.min(1000,target-Date.now()));
  const summary=results.map(({label,events,errors,wire,cached,loaded,loadCount})=>({label,loadCount,networkRequests:wire.filter(e=>!cached.has(e.id)).length,browserCacheHits:wire.filter(e=>cached.has(e.id)).length,sameOriginNetwork:wire.filter(e=>e.local&&!cached.has(e.id)).length,thirdPartyNetwork:wire.filter(e=>!e.local&&!cached.has(e.id)).length,idleMs:Date.now()-loaded,idleRequests:events.filter(e=>e.at>loaded).length,api:events.filter(e=>e.path.startsWith('/api/')).length,paths:Object.fromEntries([...new Set(events.map(e=>e.path))].map(key=>[key,events.filter(e=>e.path===key).length])),errors}));
  await writeFile('audit-browser-results.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
  assert.ok(summary.every(item=>item.idleRequests===0),'Idle home must not poll HTTP');
}finally{
  await browser?.close();for(const app of applications)await app.close();
  if(path.resolve(temporary).startsWith(path.join(os.tmpdir(),'sanco-network-')))await rm(temporary,{recursive:true,force:true});
}
