import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createApplication} from '../../be/src/app.js';
import {liveState} from '../../be/src/wire.js';

const port=31994,origin=`http://127.0.0.1:${port}`,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const app=await createApplication({database:{memory:true},origins:origin,secureCookies:false,staticDirectory:path.resolve('../.audit-fe/dist')});
await new Promise(resolve=>app.server.listen(port,'127.0.0.1',resolve));
let browser;
const result={};
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);
  async function call(context,route,body){const response=body?await context.request.post(origin+'/api'+route,{data:body}):await context.request.get(origin+'/api'+route);assert.ok(response.ok(),await response.text());return response.json();}
  for(const context of contexts){await call(context,'/me');context.identity=(await call(context,'/auth/register',{name:'Network audit',email:randomUUID()+'@example.test',password:randomUUID()})).user;}
  const created=await call(contexts[0],'/rooms',{kind:'caro',minutes:10,side:'first'});let room=created.room;
  room=(await call(contexts[1],`/rooms/${room.id}/join`,{token:created.token})).room;
  for(const context of contexts){room=(await call(context,`/rooms/${room.id}/actions`,{actionId:randomUUID(),version:room.version,action:'ready'})).room;}
  const pages=await Promise.all(contexts.map(context=>context.newPage())),events=[],frames=[],wire=[],cached=new Set();
  for(const [index,page]of pages.entries()){
    const cdp=await contexts[index].newCDPSession(page);await cdp.send('Network.enable');
    cdp.on('Network.requestWillBeSent',e=>{if(/^https?:/.test(e.request.url))wire.push({id:index+':'+e.requestId,at:Date.now()});});
    cdp.on('Network.requestServedFromCache',e=>cached.add(index+':'+e.requestId));
    cdp.on('Network.responseReceived',e=>{if(e.response.fromDiskCache||e.response.fromPrefetchCache||e.response.fromServiceWorker)cached.add(index+':'+e.requestId);});
    page.on('request',r=>events.push({page:index,path:new URL(r.url()).pathname,method:r.method(),at:Date.now()}));page.on('websocket',ws=>ws.on('framesent',event=>frames.push(String(event.payload))));await page.goto(origin+'/?room='+room.id);await page.waitForSelector('[data-square="0"]');}
  await pause(1500);let start=events.length,frameStart=frames.length;const onlineStart=Date.now();
  await pages[0].locator('[data-square="0"]').click();
  await pages[1].locator('[data-square="0"] .flat-piece').waitFor();
  await pages[1].locator('[data-square="15"]').click();
  await pages[0].locator('[data-square="15"] .flat-piece').waitFor();
  await pause(32000);
  const paths=list=>Object.fromEntries([...new Set(list.map(e=>e.path.replace(/\/rooms\/[^/]+/,'/rooms/:id')))].map(key=>[key,list.filter(e=>e.path.replace(/\/rooms\/[^/]+/,'/rooms/:id')===key).length]));
  result.online={seconds:32,moves:(await call(contexts[0],`/rooms/${room.id}`)).room.game.moves.length,httpRequests:events.length-start,networkRequests:wire.filter(e=>e.at>onlineStart&&!cached.has(e.id)).length,browserCacheHits:wire.filter(e=>e.at>onlineStart&&cached.has(e.id)).length,paths:paths(events.slice(start)),actionPosts:events.slice(start).filter(e=>e.method==='POST').length,sentSocketFrames:frames.length-frameStart};
  assert.equal(result.online.moves,2);assert.equal(result.online.actionPosts,0);
  // Corrupt both the pushed delta and recovery endpoint. No recursive HTTP loop.
  const snapshot=(await call(contexts[0],`/rooms/${room.id}`)).room,broken=liveState(snapshot);broken.game.moveCount=100;broken.version+=10;
  await pages[0].route('**/api/rooms/'+room.id,route=>route.fulfill({json:{room:broken}}));start=events.length;
  for(let i=0;i<100;i++)app.io.to('player:'+contexts[0].identity.id).emit('room',broken);
  await pause(1000);
  result.malformed={packets:100,roomGetsIncludingScheduledPolls:events.slice(start).filter(e=>e.path==='/api/rooms/'+room.id).length};assert.ok(result.malformed.roomGetsIncludingScheduledPolls<=2);
  await pages[0].unroute('**/api/rooms/'+room.id);
  // Close transport, then emulate a genuine network outage and restore it.
  start=events.length;await contexts[0].setOffline(true);
  for(const socket of app.io.sockets.sockets.values())if(socket.data.user.id===contexts[0].identity.id)socket.conn.close();
  await pause(20000);result.outage={seconds:20,allPagesRequests:events.length-start,affectedPageRequests:events.slice(start).filter(e=>e.page===0).length,affectedPaths:paths(events.slice(start).filter(e=>e.page===0))};
  await contexts[0].setOffline(false);await pages[0].evaluate(()=>window.dispatchEvent(new Event('online')));
  await pages[0].waitForFunction(()=>!document.querySelector('.connection-label')?.textContent.includes('Đang nối lại'),{timeout:45000});
  result.outage.restored=true;
  // Stop the actual HTTP listener with navigator.onLine still true. Preserve SQL
  // and restart the same listener, so the application's own retry policy recovers.
  start=events.length;
  for(const socket of app.io.sockets.sockets.values())socket.conn.close();
  await new Promise(resolve=>app.server.close(resolve));await pause(20000);
  result.backendOutage={seconds:20,attemptedRequests:events.length-start,paths:paths(events.slice(start))};
  await new Promise(resolve=>app.server.listen(port,'127.0.0.1',resolve));
  await pages[0].waitForFunction(()=>!document.querySelector('.connection-label')?.textContent.includes('Đang nối lại'),null,{timeout:45000});
  result.backendOutage.restored=true;
  // A second tab shares the session; realtime remains live in both tabs.
  const extra=await contexts[0].newPage();extra.on('request',r=>events.push({page:2,path:new URL(r.url()).pathname,method:r.method(),at:Date.now()}));
  await extra.goto(origin+'/?room='+room.id);await extra.waitForSelector('[data-square="15"] .flat-piece');start=events.length;
  await pages[0].bringToFront();await pause(1000);await extra.bringToFront();await pause(1000);
  result.multitab={tabs:3,requestsOnTwoSwitches:events.length-start,hidden:await Promise.all([...pages,extra].map(page=>page.evaluate(()=>document.hidden)))};
  // Leaving the room removes its polling; a late packet cannot reopen it.
  await pages[0].bringToFront();await pages[0].locator('.practice-breadcrumb button').click();await pages[0].waitForSelector('.online-workspace',{state:'detached'});start=events.length;
  app.io.to('player:'+contexts[0].identity.id).emit('room',broken);await pause(33000);
  result.leave={seconds:33,roomGetsForLeftPage:events.slice(start).filter(e=>e.page===0&&e.path==='/api/rooms/'+room.id).length};
  assert.equal(result.leave.roomGetsForLeftPage,0);assert.equal(await pages[0].locator('.online-workspace').count(),0);
  // Server logout revokes the session for every tab and further room reads stop.
  await call(contexts[0],'/auth/logout',{});const response=await contexts[0].request.get(origin+'/api/rooms/'+room.id);assert.equal(response.status(),401);
  result.logout={revokedStatus:response.status()};
  await writeFile('audit-scenarios-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser?.close();await app.close();}
