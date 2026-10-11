// Actual exported UI, local storage and events. These are DOM tests, not browser QA.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const {parseHTML} = require('linkedom');
const {window,document} = parseHTML(fs.readFileSync(require('node:path').resolve(__dirname,'../dist/torobai.html'),'utf8'));
let hash = '#api', failStorage = false, nativeHashWrites = 0;
const entries = new Map(), downloads = [];
const location = {get hash(){return hash;},set hash(v){nativeHashWrites++;hash=v;},href:'file:///torobai.html'};
window.history = {pushState:(_s,_t,url)=>{hash=url;},replaceState:(_s,_t,url)=>{hash=url;}};
window.localStorage = {getItem:key=>entries.get(key)||null,setItem:(key,value)=>{if(failStorage)throw Error('Blocked');entries.set(key,value);}};
window.scrollX=0;window.scrollY=0;window.innerHeight=700;
window.scrollTo=({top=0})=>{window.scrollY=top;};
window.HTMLElement.prototype.focus=()=>{};
window.HTMLElement.prototype.scrollIntoView=()=>{};
window.HTMLElement.prototype.getBoundingClientRect=()=>({top:0,height:100});
window.getComputedStyle=()=>({position:'static'});
const dialog=document.getElementById('infoDialog');
dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;};
const context=vm.createContext({window,document,location,URL,URLSearchParams,console,navigator:{},Blob,
  matchMedia:()=>({matches:true}),fetch:()=>{throw Error('Portable UI must not fetch');},
  setTimeout:(fn,ms)=>{if(ms<=1000)setImmediate(fn);return 1;},clearTimeout:()=>{}});
const run=code=>vm.runInContext(code,context), $=id=>document.getElementById(id);
const flush=async()=>{for(let i=0;i<6;i++)await new Promise(setImmediate);};
const click=node=>{assert.ok(node);const e=new window.Event('click',{bubbles:true,cancelable:true});e.button=0;node.dispatchEvent(e);return e;};
const submit=node=>{const e=new window.Event('submit',{bubbles:true,cancelable:true});node.dispatchEvent(e);assert.equal(e.defaultPrevented,true);};
const go=async url=>{await run(`route({url:${JSON.stringify(url)},writeHistory:true})`);await flush();};
const text=()=>document.getElementById('main').textContent;
(async()=>{
  for(const script of document.querySelectorAll('script'))run(script.textContent);
  await flush();
  context.captureDownload=(...args)=>downloads.push(args);
  run('downloadRecord=(...args)=>captureDownload(...args)');
  assert.equal(run('HB.routeState("#providers/one").path'),'providers/one');
  assert.equal(run('HB.routeState("#providers/%3Cscript%3E").path'),'not-found');

  await go('#providers');
  assert.equal(document.querySelectorAll('.provider-card').length,15);
  window.scrollY=420;
  $('providerSearch').querySelector('[name=query]').value='نارون';
  submit($('providerSearch'));await flush();
  assert.equal(document.querySelectorAll('.provider-card').length,1);
  assert.equal(window.scrollY,420);
  assert.match(hash,/q=/);
  click(document.querySelector('.provider-card h2 a'));await flush();
  assert.equal(run('state.path'),'providers/narvan-cloud');
  assert.ok(document.querySelectorAll('.provider-product').length>0);
  assert.equal($('providersNav').getAttribute('aria-current'),'page');
  assert.ok(text().includes('پایداری با اعتبار فروشنده فرق دارد'));

  await go('#providers/ava-studio');
  assert.ok(text().includes('API · مصرف معمول'));
  assert.ok(text().includes('مجوز وزن‌ها · یک‌باره'));
  await go('#providers/ava-studio?service=weights');
  assert.ok(!text().includes('API · مصرف معمول'));
  assert.ok(document.querySelector('.provider-product h3 a').getAttribute('href').includes('access=weights'));
  await go('#providers/one?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E');
  assert.equal(document.querySelectorAll('#main img[onerror]').length,0);
  assert.ok(text().includes('محصولی با این انتخاب پیدا نشد'));
  await go('#providers/missing');assert.ok(text().includes('ارائه‌دهنده پیدا نشد'));

  await go('#api/avanvis-fa?usage_unit=minute&minutes=321&mode=batch');
  assert.ok(document.querySelector('#featuredOffer .seller-profile-link'));
  click(document.querySelector('[data-watch]'));assert.equal(dialog.open,true);
  const baseline=run('watchDraft.amount');
  assert.ok(run('watchDraft.url').includes('minutes=321'));
  assert.ok(run('watchDraft.url').includes('mode=batch'));
  click(document.querySelector('[data-save-watch]'));
  assert.equal(JSON.parse(entries.get('torobai.watchlist')).length,1);
  await go('#watchlist');assert.ok(text().includes('بدون تغییر قیمت'));
  assert.equal(run('watchSnapshot(products.find(p=>p.id==="avanvis-fa"),watchRecords()[0].url).amount'),baseline);
  // Snapshot changes are detected without changing the saved comparison basis.
  const record=JSON.parse(entries.get('torobai.watchlist'))[0];record.amount+=100;record.seller='عرضه‌کننده قبلی';
  entries.set('torobai.watchlist',JSON.stringify([record]));run('renderWatchlist()');
  assert.ok(document.querySelector('.price-down'));
  assert.ok(text().includes('ارزان‌ترین عرضه‌کننده تغییر کرده است'));
  click(document.querySelector('[data-refresh-watch]'));assert.ok(text().includes('بدون تغییر قیمت'));
  click(document.querySelector('[data-export-watch]'));assert.equal(downloads.at(-1)[1].amount,baseline);
  const changed=JSON.parse(entries.get('torobai.watchlist'));changed[0].version='older';
  entries.set('torobai.watchlist',JSON.stringify(changed));run('renderWatchlist()');
  assert.ok(text().includes('نسخه مدل تغییر کرده'));
  run('globalThis.removedProduct=products.find(p=>p.id === "avanvis-fa");products=products.filter(p=>p.id !== "avanvis-fa");renderWatchlist()');
  assert.ok(text().includes('این مدل در کاتالوگ فعلی موجود نیست'));
  assert.equal(run('watchRecords().length'),1);
  run('products.push(removedProduct)');
  click(document.querySelector('[data-delete-watch]'));assert.ok(text().includes('هنوز قیمتی را پیگیری نمی‌کنید'));

  await go('#api/avanvis-fa?access=weights&provider=ava-studio');
  assert.ok(document.querySelector('#featuredOffer [data-report-mode="weights"]'));
  click(document.querySelector('[data-watch]'));
  assert.equal(run('watchDraft.access'),'weights');assert.equal(run('watchDraft.amount'),18000000);
  failStorage=true;click(document.querySelector('[data-save-watch]'));
  assert.equal(dialog.open,true);assert.match($('toast').textContent,/ذخیره در مرورگر ممکن نشد/);
  assert.equal(JSON.parse(entries.get('torobai.watchlist')).length,0);
  failStorage=false;click(document.querySelector('[data-save-watch]'));

  // A GPU watch and its product link retain the exact preset, not the default day.
  const gpu=run('products.find(p=>p.kind === "gpu" && p.offers.length).id');
  await go('#gpu/'+gpu+'?rental=heavy');
  assert.equal(run('activePreset'),'heavy');
  click(document.querySelector('[data-watch]'));
  assert.ok(run('watchDraft.url').includes('rental=heavy'));
  assert.equal(run('watchDraft.amount'),run('activeEstimate.offers.filter(o=>o.estimate_toman!=null).sort((a,b)=>a.estimate_toman-b.estimate_toman)[0].estimate_toman'));
  click(document.querySelector('[data-save-watch]'));

  await go('#api/avanvis-fa');window.scrollY=812;
  click(document.querySelector('#featuredOffer [data-report-offer]'));
  $('reportForm').querySelector('[name=detail]').value='<script>alert(1)</script> نرخ متفاوت است';
  click(document.querySelector('[data-download-report-form]'));
  assert.match(downloads.at(-1)[1],/فایل گزارش؛ ارسال نشده/);
  assert.equal(entries.has('torobai.reports'),false);
  submit($('reportForm'));assert.equal(window.scrollY,812);assert.equal(dialog.open,false);
  assert.equal(JSON.parse(entries.get('torobai.reports')).length,1);
  await go('#reports');assert.equal(document.querySelector('#main script'),null);
  assert.ok(text().includes('<script>alert(1)</script>'));
  click(document.querySelector('[data-edit-report]'));$('reportForm').querySelector('[name=detail]').value='اصلاح توضیحات';
  submit($('reportForm'));assert.ok(text().includes('اصلاح توضیحات'));
  click(document.querySelector('[data-export-report]'));assert.match(downloads.at(-1)[1],/ذخیره در مرورگر؛ ارسال نشده/);
  click(document.querySelector('[data-delete-report]'));assert.ok(text().includes('گزارشی ذخیره نکرده‌اید'));
  entries.set('torobai.reports',JSON.stringify([{id:'bad',reason:'__proto__'}]));assert.equal(run('reportRecords().length'),0);
  entries.set('torobai.watchlist',JSON.stringify([{id:'bad',product_id:'avanvis-fa',access:'api',url:'javascript:alert(1)',amount:2}]));
  assert.equal(run('watchRecords().length'),0);
  entries.set('torobai.watchlist','broken JSON');assert.equal(run('watchRecords().length'),0);
  assert.equal(nativeHashWrites,0);
  console.log('Marketplace DOM scenarios passed: seller search/profiles, API + weights, scoped price watch, GPU presets, reports, exports, escaping and failed storage.');
})().catch(error=>{console.error(error);process.exitCode=1;});
