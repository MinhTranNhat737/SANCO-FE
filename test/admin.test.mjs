import { before, beforeEach, after, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { act, createElement } from 'react';

let vite, cache, Admin, dom, root, user, requests, settings, report, failure;
const admin = {id:'admin-id',name:'Admin',email:'admin@example.test',account:true,admin:true};
const json = (body,status=200) => new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
before(async () => {
  cache = await mkdtemp(path.join(os.tmpdir(),'sanco-admin-ui-'));
  vite = await createServer({configFile:false,root:process.cwd(),cacheDir:cache,plugins:[react()],server:{middlewareMode:true},appType:'custom'});
  ({default:Admin} = await vite.ssrLoadModule('/src/AdminDashboard.tsx'));
});
beforeEach(async () => {
  dom = new JSDOM('<div id="root"></div>',{url:'http://127.0.0.1:5173/admin'});
  for (const key of ['window','document','location','localStorage','HTMLElement','HTMLInputElement','HTMLDialogElement','Event','MouseEvent']) globalThis[key] = dom.window[key];
  dom.window.HTMLDialogElement.prototype.showModal = function(){this.setAttribute('open','');};
  dom.window.HTMLDialogElement.prototype.close = function(){this.removeAttribute('open');};
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const {createRoot} = await import('react-dom/client'); root = createRoot(document.getElementById('root'));
  user = {...admin}; requests = []; failure = false;
  settings = {announcement:'Thông báo cũ',registration_enabled:true,rooms_enabled:true,updated_at:0};
  report = {id:'report-id',display_name:'Người gửi',body:'Góp ý đầy đủ để xử lý',status:'open',admin_note:'',created_at:Date.now()};
  globalThis.fetch = async (url,options={}) => {
    const parsed = new URL(String(url),location.href), method = options.method || 'GET', body = options.body ? JSON.parse(options.body) : null;
    requests.push({path:parsed.pathname,params:parsed.searchParams,method,body});
    if (parsed.pathname==='/api/me') return json({user});
    if (parsed.pathname==='/api/auth/login') {user={...admin,username:body.login,email:null};return json({user});}
    if (parsed.pathname==='/api/auth/logout') {user={...user,admin:false,account:false};return json({ok:true});}
    if (parsed.pathname==='/api/admin/overview') return json({stats:{players:42,online:3,playing:2,rooms:4,reports:1,accounts:20,suspended:2,matches:56,practice:10},activity:[],system:{database:'PostgreSQL test',uptime:7200,now:Date.now()}});
    if (parsed.pathname==='/api/admin/settings') {if(body)settings=body;return json({settings});}
    if (parsed.pathname==='/api/admin/reports/report-id') {
      if(failure)return json({error:'Không lưu được, thử lại.'},500);
      report={...report,...body};return json({ok:true});
    }
    if (parsed.pathname==='/api/admin/reports') return json({items:[report],total:1,page:1,size:20});
    if (parsed.pathname==='/api/admin/users') {
      if(failure)return json({error:'Quyền quản trị đã bị thu hồi.'},403);
      return json({items:[{id:admin.id,display_name:'Admin',email:admin.email,is_admin:true,account:true,suspended_at:null,created_at:Date.now(),sessions:1}],total:41,page:Number(parsed.searchParams.get('page')||1),size:20});
    }
    if (parsed.pathname==='/api/admin/users/admin-id') return json({ok:true});
    throw new Error('Unexpected request: '+parsed.pathname);
  };
});
afterEach(async () => { await act(async()=>root.unmount()); dom.window.close(); });
after(async () => { await vite.close(); if(path.resolve(cache).startsWith(path.join(os.tmpdir(),'sanco-admin-ui-')))await rm(cache,{recursive:true,force:true}); });
const settle = async () => {await act(async()=>{await new Promise(resolve=>setTimeout(resolve,20));});};
const render = async () => {await act(async()=>root.render(createElement(Admin)));await settle();};
const button = text => [...document.querySelectorAll('button')].find(b=>b.textContent===text);
async function click(element){assert.ok(element);await act(async()=>element.click());await settle();}
async function submit(form){await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await settle();}

test('A regular account sees the access gate and never requests admin data', async () => {
  user={...admin,admin:false}; await render();
  assert.match(document.body.textContent,/chưa có quyền quản trị/);
  assert.ok(!requests.some(r=>r.path.startsWith('/api/admin')));
});

test('Admin login accepts provisioned passwords shorter than the registration minimum', async () => {
  user={...admin,admin:false,account:false};await render();
  const password = document.querySelector('input[autocomplete="current-password"]');
  password.value='Short123!';assert.equal(password.minLength,1);assert.equal(password.checkValidity(),true);
  password.value='';assert.equal(password.checkValidity(),false);
});

test('Admin login accepts a username without email browser validation',async()=>{
  user={...admin,admin:false,account:false};await render();
  const input=document.querySelector('input[autocomplete="username"]');assert.equal(input.type,'text');input.value='testadmin';assert.equal(input.checkValidity(),true);
});
test('Overview uses real statistics and navigation supports pagination and filters', async () => {
  await render(); assert.match(document.body.textContent,/42/); assert.match(document.body.textContent,/PostgreSQL test/);
  await click(button('Người dùng')); assert.ok(document.querySelector('table'));assert.match(document.body.textContent,/admin@example.test/);
  await click(document.querySelector('[aria-label="Trang sau"]'));
  assert.equal(requests.filter(r=>r.path==='/api/admin/users').at(-1).params.get('page'),'2');
  const filter = document.querySelector('[aria-label="Lọc trạng thái"]');
  await act(async()=>{filter.value='suspended';filter.dispatchEvent(new Event('change',{bubbles:true}));});await settle();
  const last = requests.filter(r=>r.path==='/api/admin/users').at(-1);assert.equal(last.params.get('status'),'suspended');assert.equal(last.params.get('page'),'1');
  await click(button('Chỉnh sửa')); const toggles=document.querySelectorAll('dialog input[type="checkbox"]');assert.equal(toggles[0].disabled,true);assert.equal(toggles[1].disabled,true);
});
test('Report review retains edits after a failed save and successfully retries', async () => {
  await render();await click(button('Góp ý & báo cáo'));await click(button('Xử lý'));
  assert.match(document.querySelector('dialog').textContent,/Góp ý đầy đủ/);
  const select = document.querySelector('dialog select');
  await act(async()=>{select.value='resolved';select.dispatchEvent(new Event('change',{bubbles:true}));});await settle();
  failure=true;await submit(document.querySelector('dialog form'));
  assert.match(document.querySelector('dialog').textContent,/Không lưu được/);assert.equal(document.querySelector('dialog select').value,'resolved');
  failure=false;await submit(document.querySelector('dialog form'));assert.equal(document.querySelector('dialog'),null);assert.equal(report.status,'resolved');assert.match(document.body.textContent,/Đã lưu xử lý góp ý/);
});
test('Site configuration writes actual booleans and returns a success state', async () => {
  await render();await click(button('Cấu hình website'));const toggles=document.querySelectorAll('.ad-settings input[type="checkbox"]');
  await click(toggles[0]);await submit(document.querySelector('.ad-settings'));
  assert.equal(settings.registration_enabled,false);assert.equal(settings.rooms_enabled,true);assert.match(document.body.textContent,/Đã lưu cấu hình website/);
});
test('Losing backend admin permission removes the dashboard immediately', async () => {
  await render();failure=true;await click(button('Người dùng'));
  assert.equal(document.querySelector('table'),null);assert.match(document.body.textContent,/Quyền quản trị đã bị thu hồi/);
});
