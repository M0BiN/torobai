// Interaction/scroll-command regression checks. This is not a browser layout test.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {parseHTML} = require('linkedom');
const {window, document} = parseHTML(fs.readFileSync(require('node:path').resolve(__dirname,'../dist/torobai.html'),'utf8'));
let hash='#api?task=chat&page=2', hashNavigations=0, reduced=false;
const scrollCalls=[], intoViewCalls=[], timers=[];
const location={get hash(){return hash;},set hash(value){hash=value;hashNavigations++;},href:'file:///torobai.html'};
window.history={replaceState:(_s,_t,url)=>{hash=url;}};
window.localStorage={getItem:()=>null,setItem:()=>{}};
window.scrollX=0;window.scrollY=420;window.innerHeight=700;
window.scrollTo=({left=0,top=0})=>{window.scrollX=left;window.scrollY=top;scrollCalls.push({left,top});};
window.HTMLElement.prototype.scrollIntoView=function(){intoViewCalls.push(this.id);};
window.HTMLElement.prototype.focus=function(){};
window.HTMLElement.prototype.getBoundingClientRect=()=>({height:1200});
Object.defineProperty(document.documentElement,'scrollHeight',{value:3000,writable:true});
const dialog=document.getElementById('infoDialog');dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;};
const context=vm.createContext({window,document,location,URL,URLSearchParams,console,
  fetch:()=>{throw Error('offline');},navigator:{clipboard:{writeText:async()=>{}}},
  matchMedia:()=>({matches:reduced}),
  setTimeout:(fn,ms)=>{timers.push(ms);if(ms<=1000)setImmediate(fn);return timers.length;},clearTimeout:()=>{}});
const run=code=>vm.runInContext(code,context);
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
async function route(url){hash=url;await run('route()');await flush();}
const field=(form,name)=>form.querySelector(`[name=${name}]`);
function submit(form){form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));}
function edit(form,name,value){field(form,name).value=value;field(form,name).dispatchEvent(new window.Event('input',{bubbles:true}));}
function hold(){run('globalThis.originalPause = presentationPause; globalThis.releases=[]; presentationPause=()=>new Promise(resolve=>releases.push(resolve))');}
async function release(){run('releases.shift()()');await flush();}
(async()=>{
  for(const script of document.querySelectorAll('script'))run(script.textContent);
  await flush();
  let form=document.getElementById('catalogUsageForm');
  const rail=document.querySelector('.category-tabs');
  const oldPrice=document.querySelector('.card-price').textContent;
  scrollCalls.length=0;intoViewCalls.length=0;hashNavigations=0;window.scrollY=420;
  hold();edit(form,'requests_day','۷');submit(form);submit(form);
  assert.equal(run('releases.length'),1,'double submit must not duplicate work');
  assert.equal(form.getAttribute('aria-busy'),'true');
  assert.equal(form.querySelector('[type=submit]').disabled,true);
  assert.ok(form.querySelector('[type=submit]').classList.contains('is-loading'));
  assert.equal(document.getElementById('catalogResults').getAttribute('aria-busy'),'true');
  assert.ok(document.getElementById('catalogResults').hasAttribute('inert'));
  assert.equal(document.querySelector('.card-price').textContent,oldPrice,'old cards stay in place during loading');
  window.scrollY=470; // A user scroll during calculation must be respected.
  await release();
  assert.equal(document.getElementById('catalogUsageForm'),form,'form node must survive');
  assert.equal(document.querySelector('.category-tabs'),rail,'rail and its scroll survive');
  assert.equal(window.scrollY,470);
  assert.deepEqual(scrollCalls,[{left:0,top:470}]);
  assert.equal(intoViewCalls.length,0);
  assert.equal(hashNavigations,0);
  assert.ok(hash.includes('requests_day=7'));
  assert.equal(run('state.page'),1);
  assert.equal(form.getAttribute('aria-busy'),'false');
  assert.equal(document.getElementById('catalogResults').hasAttribute('inert'),false);
  assert.ok(document.getElementById('catalogUsagePending').textContent.includes('به‌روز'));
  assert.notEqual(document.querySelector('.card-price').textContent,oldPrice);

  // The exact computed workload is ready: do not schedule or show loading again.
  submit(form);
  assert.equal(run('releases.length'),0);
  assert.equal(form.querySelector('[type=submit]').classList.contains('is-loading'),false);
  assert.equal(window.scrollY,470);

  // Editing while the update is pending cancels stale values and releases controls.
  edit(form,'requests_day','۹');submit(form);
  edit(form,'requests_day','۱۱');await release();
  assert.equal(run('state.usage.requests_day'),7);
  assert.equal(field(form,'requests_day').value,'۱۱');
  assert.equal(form.querySelector('[type=submit]').disabled,false);
  assert.equal(document.getElementById('catalogResults').hasAttribute('inert'),false);

  // A failed quote retains the previous applied state and has a usable retry.
  run('globalThis.originalEvaluator=HB.evaluatePlan; HB.evaluatePlan=()=>{throw Error("quote")};');
  submit(form);await release();
  assert.equal(run('state.usage.requests_day'),7);
  assert.equal(document.getElementById('catalogUsageError').hidden,false);
  assert.equal(form.querySelector('[type=submit]').disabled,false);
  run('HB.evaluatePlan=globalThis.originalEvaluator');
  submit(form);await release();
  assert.equal(run('state.usage.requests_day'),11);
  assert.equal(document.getElementById('catalogUsageError').hidden,true);

  // A restrictive file host must not trigger fallback hash navigation or scrolling.
  window.history.replaceState=()=>{throw Error('file origin');};
  scrollCalls.length=0;hashNavigations=0;window.scrollY=530;
  edit(form,'requests_day','۱۳');submit(form);await release();
  assert.equal(run('state.usage.requests_day'),13);
  assert.equal(hashNavigations,0);assert.equal(window.scrollY,530);
  assert.equal(document.getElementById('catalogUsageForm'),form);
  window.history.replaceState=(_s,_t,url)=>{hash=url;};

  // Default values are already fetched: reset is immediate and still preserves scroll.
  document.documentElement.scrollHeight=600;
  form.querySelector('[data-action=reset-usage]').click();
  assert.equal(run('releases.length'),0);
  assert.equal(field(form,'requests_day').value,'۱,۰۰۰');
  assert.equal(window.scrollY,530);
  assert.ok(parseInt(document.getElementById('main').style.minHeight)>0);
  document.documentElement.scrollHeight=3000;

  // Navigation wins over a pending update; the old result cannot reopen the catalog.
  edit(form,'requests_day','۱۷');submit(form);
  await route('#gpu');const afterNavigation=scrollCalls.length;
  await release(); // A cancelled calculation cannot overwrite the ready catalog.
  assert.equal(run('state.kind'),'gpu');
  assert.equal(document.getElementById('catalogUsageForm'),null);
  assert.equal(scrollCalls.length,afterNavigation);
  run('presentationPause=globalThis.originalPause');
  await route('#api?task=chat');form=document.getElementById('catalogUsageForm');
  window.scrollY=310;reduced=true;edit(form,'requests_day','۱۹');submit(form);await flush();
  assert.equal(timers.at(-1),0,'reduced motion bypasses the intentional pause');
  assert.equal(window.scrollY,310);
  assert.equal(form.querySelector('[type=submit]').disabled,false);
  console.log(JSON.stringify({status:'passed',scenarios:9,scope:'DOM and scroll-command assertions; not browser rendering'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
