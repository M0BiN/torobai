// Exact offline amounts and exclusions must agree with the Python evaluator.
const {execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
const ui = require('../app/static/ui.js');
const payload = JSON.parse(execFileSync(process.env.TOROBAI_TEST_PYTHON || 'python', ['-c', `
import json,random
from app.main import PriceScenario
from app.market import OFFERS,PRODUCT_BY_ID,estimate_offer
from app.pricing_plan import api_plan
rng=random.Random(12012)
cases=[]
for o in OFFERS:
 if o['kind']!='api': continue
 p=PRODUCT_BY_ID[o['product_id']]
 for mode in ['instant','batch']:
  for i in range(15):
   v=PriceScenario(product_id=p['id'],request_mode=mode).model_dump()
   v.update(requests_day=rng.choice([0,1,17,1000,1000000]),input_tokens=rng.choice([0,850,64000,200001,1000000]),output_tokens=rng.choice([0,250,8000,1000000]),monthly_tokens=rng.randrange(0,1000000000),minutes=rng.choice([0,0.0000001,0.005,30.55,1000000]),characters=rng.choice([0,999999,1000001,1000000000]),pages=rng.randrange(0,1000000),images=rng.randrange(0,1000000),monthly_requests=rng.randrange(0,1000000))
   expected=estimate_offer(o,v)
   cases.append(dict(id=o['id'],mode=mode,values={**v,'days':30},plan=api_plan(p,o,mode),amount=expected['estimate_toman'],reason=expected['estimate_reason']))
print(json.dumps(cases))
`], {cwd:require('node:path').resolve(__dirname,'..'),encoding:'utf8',maxBuffer:16*1024*1024}));
for (const c of payload) {
  const actual=ui.evaluatePlan(c.plan,c.values);
  assert.equal(actual.estimate_toman,c.amount,`${c.id}/${c.mode} amount`);
  assert.equal(actual.estimate_reason,c.reason,`${c.id}/${c.mode} exclusion`);
}
console.log(JSON.stringify({status:'passed',exact_python_js_cases:payload.length}));
