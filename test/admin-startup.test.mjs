import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const html=await readFile(new URL('../admin.html',import.meta.url),'utf8');
function startup(){
  let timeout;
  const dom=new JSDOM(html,{url:'https://admin.example.test/admin',runScripts:'dangerously',beforeParse(window){
    window.setTimeout=callback=>{timeout=callback;return 1;};window.clearTimeout=()=>{timeout=null;};
  }});
  return {dom,timeout:()=>timeout?.()};
}
test('Admin startup stays readable and offers recovery when a script fails to load',()=>{
  const {dom}=startup();try{
    assert.match(dom.window.document.body.textContent,/Đang tải trang quản trị/);
    dom.window.dispatchEvent(new dom.window.Event('sanco-admin-load-error'));
    const alert=dom.window.document.querySelector('[role="alert"]');assert.ok(alert);assert.match(alert.textContent,/Chưa tải được trang quản trị/);assert.ok(alert.querySelector('button'));
  }finally{dom.window.close();}
});
test('An unfinished admin startup times out visibly and never replaces a mounted dashboard',()=>{
  const first=startup();try{first.timeout();assert.ok(first.dom.window.document.querySelector('[role="alert"]'));}finally{first.dom.window.close();}
  const second=startup();try{
    const root=second.dom.window.document.getElementById('root');root.setAttribute('data-admin-mounted','true');root.textContent='Mounted dashboard';
    second.dom.window.dispatchEvent(new second.dom.window.Event('sanco-admin-mounted'));second.timeout();second.dom.window.dispatchEvent(new second.dom.window.Event('sanco-admin-load-error'));
    assert.equal(root.textContent,'Mounted dashboard');assert.equal(root.querySelector('[role="alert"]'),null);
  }finally{second.dom.window.close();}
});
