// Real Python quote fixtures; fetch is controlled to inspect cache misses/in-flight requests.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {parseHTML} = require('linkedom');
const root = require('node:path').resolve(__dirname,'..');
const specs = [
  {product_id:'gpt-4o-mini',requests_day:10,input_tokens:100,output_tokens:20},
  {product_id:'gpt-4o-mini',requests_day:11,input_tokens:100,output_tokens:20},
  {product_id:'gpt-4o-mini',requests_day:10,input_tokens:100,output_tokens:20,request_mode:'batch'},
  {product_id:'gpt-5-mini',requests_day:10,input_tokens:100,output_tokens:20},
  {product_id:'gpt-4o-mini',requests_day:12,input_tokens:100,output_tokens:20},
  {product_id:'avanvis-fa',minutes:342}
];
const payload = JSON.parse(execFileSync(process.env.TOROBAI_TEST_PYTHON || 'python',[
  '-c','import json,sys; from app.main import catalog,estimate,PriceScenario; specs=json.load(sys.stdin); print(json.dumps({"catalog":catalog(),"quotes":[estimate(PriceScenario(**s)) for s in specs]}))'
],{cwd:root,input:JSON.stringify(specs),encoding:'utf8',maxBuffer:4*1024*1024}));
const {window,document}=parseHTML(fs.readFileSync(root+'/app/static/index.html','utf8'));
let hash='#api/gpt-4o-mini', focus=document.body;
const location={get hash(){return hash;},href:'https://example.test/'};
window.history={pushState:(_a,_b,url)=>{hash=url;},replaceState:(_a,_b,url)=>{hash=url;}};
window.localStorage={getItem:()=>null,setItem:()=>{}};
window.scrollX=0;window.scrollY=0;window.innerHeight=700;
window.scrollTo=({left=0,top=0})=>{window.scrollX=left;window.scrollY=top;};
window.HTMLElement.prototype.focus=function(){focus=this;};
window.HTMLElement.prototype.scrollIntoView=()=>{throw Error('Unexpected scrolling');};
window.HTMLElement.prototype.getBoundingClientRect=()=>({height:1200});
Object.defineProperty(document.documentElement,'scrollHeight',{value:3500});
Object.defineProperty(document,'activeElement',{get:()=>focus});
const $=id=>document.getElementById(id), dialog=$('infoDialog');
dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;};
const calls=[],pending=[],timers=[],loading=[];
const canonical=body=>JSON.stringify(Object.entries({...body,request_mode:body.request_mode||'instant'}).sort(([a],[b])=>a.localeCompare(b)));
const context=vm.createContext({window,document,location,URL,URLSearchParams,console,navigator:{},
 matchMedia:()=>({matches:false}),setTimeout:(fn,ms)=>{timers.push(ms);if(ms<=1000)setImmediate(fn);return timers.length;},clearTimeout:()=>{},
 fetch:async(url,options)=>{
   if(url==='/api/catalog')return {ok:true,json:async()=>payload.catalog};
   assert.equal(url,'/api/estimate');
   const body=JSON.parse(options.body);calls.push(body);
   const index=specs.findIndex(s=>canonical(s)===canonical(body));
   assert.ok(index>=0,'Unexpected uncached request: '+JSON.stringify(body));
   return new Promise((resolve,reject)=>pending.push({resolve:()=>resolve({ok:true,json:async()=>payload.quotes[index]}),reject}));
 },
 observeBusy:busy=>{if(busy)loading.push(true);}
});
const run=code=>vm.runInContext(code,context);
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
const answer=async()=>{assert.ok(pending.length);pending.shift().resolve();await flush();};
const click=node=>node.dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true}));
const inputA='#api/gpt-4o-mini?usage_unit=tokens&requests_day=10&input_tokens=100&output_tokens=20';
(async()=>{
 for(const name of ['ui','motion','marketplace','performance','app'])run(fs.readFileSync(root+'/app/static/'+name+'.js','utf8'));
 await flush();
 run('globalThis.originalBusy=setNavigationBusy;setNavigationBusy=busy=>{observeBusy(busy);originalBusy(busy)}');
 assert.equal(calls.length,0);assert.ok($('featuredOffer').dataset.offerId);
 assert.equal(timers.length,0,'A fetched catalog must not wait on a presentation timer');

 // 1. Cold same-product quote holds the previous offer and shows real loading.
 window.scrollY=410;
 const old=$('featuredOffer').innerHTML;
 const cold=run('navigate('+JSON.stringify(inputA)+')');
 assert.equal(calls.length,1);assert.equal($('navigationStatus').hidden,false);
 assert.equal($('featuredOffer').innerHTML,old);
 window.scrollY=460;

 // 2. Duplicate navigation does not duplicate the pending request.
 await run('navigate('+JSON.stringify(inputA)+')');assert.equal(calls.length,1);
 await answer();await cold;
 assert.equal(window.scrollY,460);assert.equal($('navigationStatus').hidden,true);
 assert.equal($('summaryRate').textContent.includes('۲,۵۸۶'),true);

 // 3. Reordered URL parameters hit the same cache without even starting loading.
 const busyBefore=loading.length;
 await run('navigate("#api/gpt-4o-mini?output_tokens=20&requests_day=10&usage_unit=tokens&input_tokens=100")');
 assert.equal(calls.length,1);assert.equal(loading.length,busyBefore);

 // 4. Reapplying the exact consumption has a synchronous usable result.
 const form=$('budgetForm');
 form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(form.querySelector('[type=submit]').disabled,false);
 assert.ok($('featuredOffer').dataset.offerId);assert.equal(calls.length,1);

 // 5. Leaving and reopening preserves ready custom data.
 await run('navigate("#api")');await run('navigate('+JSON.stringify(inputA)+')');
 assert.equal(calls.length,1);assert.equal(loading.length,busyBefore);

 // 6. Model, workload and processing mode are all part of the key.
 for(const index of [1,2,3]){
   const {product_id,...values}=specs[index];
   const quote=run('estimate(products.find(p=>p.id==='+JSON.stringify(product_id)+'),"custom",'+JSON.stringify(values)+')');
   await answer();assert.deepEqual(JSON.parse(JSON.stringify(await quote)),payload.quotes[index]);
 }
 assert.equal(calls.length,4);
 const aliases=run('estimate(products.find(p=>p.id==="gpt-4o-mini"),"other-label",{output_tokens:20,input_tokens:100,requests_day:10,request_mode:"instant"})');
 assert.deepEqual(JSON.parse(JSON.stringify(await aliases)),payload.quotes[0]);
 assert.equal(calls.length,4);

 // 7. Simultaneous identical requests share work; errors are never cached.
 const query='estimate(products.find(p=>p.id==="gpt-4o-mini"),"custom",{requests_day:12,input_tokens:100,output_tokens:20})';
 const first=run(query).catch(e=>e.message),second=run(query).catch(e=>e.message);
 assert.equal(calls.length,5);
 pending.shift().reject(Error('temporary network failure'));
 assert.equal(await first,'temporary network failure');assert.equal(await second,'temporary network failure');
 const retry=run(query);assert.equal(calls.length,6);await answer();await retry;
 await run(query);assert.equal(calls.length,6);

 // 8. API-to-weights cancels pending UI work; a late response cannot switch the tab.
 await run('navigate("#api/avanvis-fa?access=weights&usage_unit=minute&minutes=342")');
 window.scrollY=610;
 click(document.querySelector('.purchase-tabs a:not([href*="access=weights"])'));
 assert.equal(calls.length,7);assert.equal($('navigationStatus').hidden,false);
 click(document.querySelector('.purchase-tabs a[href*="access=weights"]'));
 assert.equal(run('purchaseMode'),'weights');assert.equal($('navigationStatus').hidden,true);
 await answer();assert.equal(run('purchaseMode'),'weights');assert.equal(window.scrollY,610);

 // 9. The successful response remains reusable even when its previous view was cancelled.
 const count=loading.length;
 click(document.querySelector('.purchase-tabs a:not([href*="access=weights"])'));
 assert.equal(run('purchaseMode'),'api');assert.equal(calls.length,7);
 assert.equal(loading.length,count);assert.equal(window.scrollY,610);
 assert.ok($('featuredOffer').dataset.offerId);
 assert.ok(timers.every(ms=>ms>1000),'Ready and remote-result paths add no presentation delay');
 // 10. A late quote from before a catalog edit cannot refill or delete the new cache entry.
 run('estimateCache.clear()');
 const stale=run(query);run('applyMarket()');const fresh=run(query);
 assert.equal(pending.length,2);await answer();await stale;
 assert.equal(run('estimateCache.size'),0);assert.equal(run('pendingEstimates.size'),1);
 await answer();await fresh;assert.equal(run('estimateCache.size'),1);
 console.log(JSON.stringify({status:'passed',scenarios:10,scope:'Served DOM with real Python fixtures, controlled network and cache assertions; no browser rendering'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
