import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const manifest=JSON.parse(await readFile('dist/.vite/manifest.json','utf8'));
assert.ok(manifest['src/admin-entry.tsx'],'Build the frontend before running the admin smoke check.');
const dom=new JSDOM('<!doctype html><html lang="vi"><body><div id="root"></div></body></html>',{url:'https://admin.example.test/admin',pretendToBeVisual:true});
// These generic EasyList rules previously hid the dashboard after it rendered.
const advertisingFilters=dom.window.document.createElement('style');advertisingFilters.textContent='.ad-main,.ad-sidebar,.ad-card{display:none!important}';dom.window.document.head.append(advertisingFilters);
for(const key of ['window','document','location','localStorage','history','HTMLElement','HTMLInputElement','MutationObserver','Event','MouseEvent'])Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key]});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
const user={id:'build-admin',name:'Build Admin',username:'buildadmin',email:null,account:true,admin:true};
const requests=[];
globalThis.fetch=async url=>{
  const pathname=new URL(String(url),location.href).pathname;requests.push(pathname);
  if(pathname==='/api/me')return Response.json({user});
  if(pathname==='/api/admin/overview')return Response.json({stats:{players:517,accounts:35,suspended:0,rooms:0,playing:0,matches:11,practice:0,reports:1,online:0},activity:[],system:{database:'PostgreSQL',uptime:600,now:Date.now()}});
  if(pathname==='/api/admin/users')return Response.json({items:[{id:user.id,display_name:user.name,username:user.username,email:null,account:true,is_admin:true,suspended_at:null,sessions:1,created_at:Date.now()}],total:1,page:1,size:20});
  throw Error('Unexpected build smoke request: '+pathname);
};
async function until(check){for(let i=0;i<100;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,20));}assert.fail('Admin build did not render the expected data.');}
try{
  await import(pathToFileURL(path.resolve('dist',manifest['src/admin-entry.tsx'].file)).href);
  await until(()=>document.querySelector('.sanco-admin-stats')?.textContent.includes('517'));
  for(const selector of ['.sanco-admin-main','.sanco-admin-sidebar','.sanco-admin-card'])assert.notEqual(dom.window.getComputedStyle(document.querySelector(selector)).display,'none',selector);
  assert.ok(document.querySelector('.sanco-admin-summary').textContent.includes('11'));
  const users=[...document.querySelectorAll('nav button')].find(button=>button.textContent==='Người dùng');assert.ok(users);users.click();
  await until(()=>document.querySelector('tbody')?.textContent.includes('buildadmin'));
  assert.ok(requests.includes('/api/admin/overview'));assert.ok(requests.includes('/api/admin/users'));
  console.log('Production admin bundle renders statistics and username-only user records.');
}finally{dom.window.close();}
