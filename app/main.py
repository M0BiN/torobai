"""Read-only marketplace. Calculations use the checked-in price observations."""
import json
from pathlib import Path
from typing import Literal
from app.pricing_plan import api_plan
from app.marketplace import marketplace_data
from chatbot.api import router as chatbot_router
from chatbot.catalog import coding_evidence

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

from app.market import OFFER_BY_ID, PRODUCT_BY_ID, build_market, estimate_offer

BASE = Path(__file__).resolve().parent
app = FastAPI(title='torobai', version='0.26.0')
app.mount('/static', StaticFiles(directory=BASE / 'static'), name='static')
app.mount('/chatbot/static', StaticFiles(directory=BASE.parent / 'chatbot/static'), name='chatbot-static')
app.include_router(chatbot_router)


@app.get('/', include_in_schema=False)
def home():
    return FileResponse(BASE / 'static/index.html')


@app.get('/api/health')
def health():
    return {'ok': True, 'catalog_version': '0.26', 'live_prices': False}


@app.get('/api/catalog')
def catalog():
    products = build_market('api') + build_market('gpu')
    benchmarks = json.loads((BASE / 'data/benchmarks.json').read_text(encoding='utf-8'))
    evidence = coding_evidence(benchmarks)
    for product in products:
        product['coding_evidence'] = evidence.get(product['id'], [])
    presets = json.loads((BASE / 'data/scenarios.json').read_text(encoding='utf-8'))
    # Catalog sorting and detail pages use the same Python pricing engine.
    estimates = {
        p['id']: {key: estimate(PriceScenario(product_id=p['id'], **values))
                  for key, values in presets[p['unit']].items()}
        for p in products
    }
    plans = {o['id']: {mode: api_plan(PRODUCT_BY_ID[o['product_id']], o, mode)
                          for mode in ['instant', 'batch']}
             for o in OFFER_BY_ID.values() if o['kind'] == 'api'}
    return {'products': products, 'presets': presets, 'estimates': estimates, 'pricing_plans': plans,
            'marketplace': marketplace_data(products, presets),
            'benchmarks': benchmarks,
            'reliability': json.loads((BASE / 'data/reliability.json').read_text(encoding='utf-8')),
            'presentation_reliability': json.loads((BASE / 'data/presentation_reliability.json').read_text(encoding='utf-8'))}


@app.get('/api/market')
def market(kind: str = Query('api', pattern='^(api|gpu)$'), query: str = Query('', max_length=80),
           min_vram: int = Query(0, ge=0, le=192), paid_only: bool = False,
           task: str = Query('', pattern='^(|chat|embedding|transcription|speech|image|decision|translation|ocr|extraction|classification)$'),
           maker: str = Query('', max_length=40), multiple: bool = False,
           ssh_only: bool = False, iran_only: bool = False, open_only: bool = False,
           min_context: int = Query(0, ge=0, le=2_000_000), persian_only: bool = False,
           access: str = Query('', pattern='^(|api|weights)$'),
           publisher: str = Query('', pattern='^(|person|company)$')):
    products = build_market(kind, query, min_vram, paid_only, task, maker, multiple,
                            ssh_only, iran_only, open_only, min_context, persian_only, access, publisher)
    return {'kind': kind, 'products': products, 'live_prices': False}


class PriceScenario(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra='forbid', strict=True)
    product_id: str = Field(max_length=80)
    request_mode: Literal['instant', 'batch'] = 'instant'
    requests_day: int = Field(1000, ge=0, le=1_000_000)
    input_tokens: int = Field(850, ge=0, le=1_000_000)
    output_tokens: int = Field(250, ge=0, le=1_000_000)
    monthly_tokens: int = Field(1_000_000, ge=0, le=1_000_000_000)
    minutes: float = Field(600, ge=0, le=1_000_000)
    characters: int = Field(100_000, ge=0, le=1_000_000_000)
    images: int = Field(100, ge=0, le=1_000_000)
    pages: int = Field(1000, ge=0, le=1_000_000)
    monthly_requests: int = Field(10000, ge=0, le=1_000_000)
    hours: float = Field(8, gt=0, le=744)
    sessions: int = Field(1, ge=1, le=31)
    usd_to_toman: float | None = Field(None, ge=1000, le=10_000_000)


@app.post('/api/estimate')
def estimate(body: PriceScenario):
    product = PRODUCT_BY_ID.get(body.product_id)
    if product is None:
        raise HTTPException(404, 'Unknown product')
    if body.request_mode == 'batch' and product['kind'] != 'api':
        raise HTTPException(422, 'Batch applies to model APIs only')
    rows = [estimate_offer(o, body.model_dump()) for o in OFFER_BY_ID.values()
            if o['product_id'] == body.product_id]
    rows.sort(key=lambda o: (o['estimate_toman'] is None, o['estimate_toman'] or 0))
    return {'product': product, 'kind': product['kind'], 'offers': rows,
            'assumptions': {**body.model_dump(exclude={'product_id'}), 'days': 30},
            'currency': 'تومان', 'includes_tax': False, 'live_prices': False}


@app.get('/api/history/{offer_id}')
def history(offer_id: str):
    if offer_id not in OFFER_BY_ID:
        raise HTTPException(404, 'Unknown offer')
    return {'offer_id': offer_id, 'history': [], 'status': 'not_collected'}
