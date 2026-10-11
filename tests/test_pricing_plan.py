from copy import deepcopy

import pytest
from fastapi.testclient import TestClient
from app.main import app, catalog, estimate, PriceScenario
from app.market import OFFERS, PRODUCT_BY_ID, estimate_offer
from app.pricing_plan import api_plan, evaluate_plan


def test_batch_quotes_have_their_own_rates_and_terms():
    offer = next(o for o in OFFERS if o.get('batch', {}).get('supported') and o['unit'] == 'tokens')
    values = PriceScenario(product_id=offer['product_id']).model_dump()
    regular = estimate_offer(offer, values)
    batch = estimate_offer(offer, {**values, 'request_mode': 'batch'})
    assert batch['estimate_toman'] < regular['estimate_toman']
    assert batch['effective_rates']['toman_input_m'] == offer['batch']['toman_input_m']
    assert batch['batch']['completion_hours'] > 0
    assert batch['batch']['max_requests'] > 0
    assert batch['batch']['verified'] is False


def test_batch_unknown_cannot_win_even_at_zero_consumption():
    offer = next(o for o in OFFERS if o['kind'] == 'api' and not o['batch'].get('supported'))
    values = PriceScenario(product_id=offer['product_id'], requests_day=0, request_mode='batch').model_dump()
    result = estimate_offer(offer, values)
    assert result['estimate_toman'] is None
    assert 'Batch' in result['estimate_reason']


def test_batch_is_validated_as_an_api_execution_mode():
    with TestClient(app) as client:
        assert client.post('/api/estimate', json={'product_id':'gpt-4o-mini', 'request_mode':'wrong'}).status_code == 422
        gpu = next(p for p in PRODUCT_BY_ID.values() if p['kind'] == 'gpu')
        assert client.post('/api/estimate', json={'product_id':gpu['id'], 'request_mode':'batch'}).status_code == 422


def test_plan_preserves_context_quota_and_long_context_rules():
    original = next(o for o in OFFERS if o['kind'] == 'api' and o['unit']=='tokens' and o.get('toman_input_m'))
    offer = {**deepcopy(original), 'context':1000, 'max_output':400, 'long_context_threshold':500,
             'toman_input_long_m':200000, 'toman_output_long_m':400000}
    product = PRODUCT_BY_ID[offer['product_id']]
    values = PriceScenario(product_id=product['id'], requests_day=1, input_tokens=600, output_tokens=100).model_dump()
    result = estimate_offer(offer, values)
    assert result['estimate_toman'] == 4800
    assert result['effective_rates']['toman_input_m'] == 200000
    assert estimate_offer(offer,{**values,'output_tokens':401})['estimate_toman'] is None
    assert estimate_offer(offer,{**values,'input_tokens':1001})['estimate_toman'] is None
    offer['toman_input_long_m'] = None
    assert estimate_offer(offer,values)['estimate_toman'] is None


def test_plan_rounds_once_after_all_components():
    plan = {'terms':[{'rate':'0.005','fields':['n'],'denominator':1},
                     {'rate':'0.005','fields':['n'],'denominator':1}]}
    assert evaluate_plan(plan, {'n':1})[0] == 0.01
    assert evaluate_plan({'terms':[{'rate':'0.005','fields':['n'],'denominator':1}]}, {'n':1})[0] == 0.01


def test_every_model_api_offer_has_both_compiled_modes():
    data = catalog()
    for product in data['products']:
        if product['kind'] == 'api':
            for offer in product['offers']:
                assert set(data['pricing_plans'][offer['id']]) == {'instant','batch'}
