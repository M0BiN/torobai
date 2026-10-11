import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.market import DATA, OFFERS, PRODUCTS, OFFER_BY_ID, api_rates, gpu_cost, build_market
from scripts.refresh_netarz import updated_offers

client = TestClient(app)


def estimate(product_id, **values):
    response = client.post('/api/estimate', json={'product_id': product_id, **values})
    assert response.status_code == 200, response.text
    return {o['seller_id']: o for o in response.json()['offers']}


def test_same_model_cost_and_minimum_credit_are_different():
    rows = estimate('gpt-4o-mini')
    assert rows['one']['estimate_toman'] == 2_656_500
    assert rows['netarz']['estimate_toman'] == 3_146_850
    assert rows['one']['minimum_credit_toman'] == 1000
    assert rows['one']['minimum_payment_toman'] is None
    assert rows['netarz']['minimum_payment_toman'] == 54_500


def test_unrechecked_dollar_quote_does_not_win_with_a_made_up_fx_rate():
    rows = estimate('gpt-4o-mini', usd_to_toman=200000)
    assert rows['aval']['estimate_toman'] is None
    assert rows['aval']['estimate_reason']


def test_token_prices_are_per_million_not_per_thousand():
    assert api_rates(OFFER_BY_ID['one-gpt4omini']) == (48000, 191000)
    assert estimate('gpt-4o-mini', input_tokens=1000, output_tokens=1000)['one']['estimate_toman'] == 7_170_000


@pytest.mark.parametrize('product,amount,expected', [
    ('whisper-1', {'minutes': 600}, 1_360_800),
    ('text-embedding-3-small', {'monthly_tokens': 1_000_000}, 7560),
    ('tts-1', {'characters': 100_000}, 567_000),
    ('flux-2-klein-4b', {'images': 100}, 2_428_700),
])
def test_each_service_uses_its_real_billing_unit(product, amount, expected):
    assert estimate(product, **amount)['netarz']['estimate_toman'] == expected


def test_zero_workload_is_zero_not_unknown():
    assert estimate('whisper-1', minutes=0)['netarz']['estimate_toman'] == 0
    assert estimate('gpt-4o-mini', requests_day=0)['one']['estimate_toman'] == 0


def test_gpu_credit_is_not_added_to_usage_cost():
    offer = estimate('rtx-3090', hours=8)['servernet']
    assert offer['estimate_toman'] == 525600
    assert offer['minimum_credit_toman'] == 1576800
    assert offer['ssh'] is False
    assert offer['persistent_disk'] is False


def test_daily_minimum_applies_to_each_booking():
    daily = {'kind': 'gpu', 'daily_toman': 136000, 'min_hours': 24}
    assert gpu_cost(daily, 8, 3) == 408000
    assert gpu_cost(daily, 25) == 272000


def test_hourly_minimum_and_billing_increment():
    offer = {'kind': 'gpu', 'hourly_toman': 100, 'min_hours': 1, 'billing_step_hours': 0.5}
    assert gpu_cost(offer, 0.25) == 100
    assert gpu_cost(offer, 1.1) == 150


def test_real_gpu_daily_and_monthly_quotes_keep_their_commitments():
    rows = estimate('rtx-3090', hours=8, sessions=3)
    assert rows['gpurun']['estimate_toman'] == 2_376_000
    assert rows['gpurun']['daily_toman'] == 792000
    assert rows['lexoya']['monthly_toman'] == 22_999_000
    assert rows['lexoya']['estimate_toman'] is None
    assert rows['lexoya']['estimate_reason']


def test_unknown_or_unavailable_gpu_does_not_become_free():
    assert estimate('rtx-family')['ferdowsi']['estimate_toman'] is None
    assert estimate('gtx-1660s')['itp']['estimate_toman'] is None


def test_required_gpu_features_exclude_unknown_and_incompatible_offers():
    ssh = build_market('gpu', ssh_only=True)
    assert ssh and all(o['ssh'] is True for p in ssh for o in p['offers'])
    assert all(o['ssh'] is True and o['seller_id'] != 'servernet'
               for p in build_market('gpu', ssh_only=True, min_vram=24) for o in p['offers'])
    assert all(p['vram'] >= 24 for p in build_market('gpu', min_vram=24))


def test_filters_and_persian_search():
    rows = build_market('gpu', query='RTX ۳۰۹۰')
    assert [r['id'] for r in rows] == ['rtx-3090']
    assert {r['id'] for r in build_market('api', task='transcription')} == {'whisper-1', 'whisper-v3-turbo', 'avanvis-fa', 'shenava-call', 'whisper-fa-cv17'}
    assert all(len(p['offers']) >= 2 for p in build_market('api', multiple=True))


def test_long_input_uses_long_tariff_or_stays_unpriced():
    rows = estimate('claude-sonnet-4.5', requests_day=1, input_tokens=220000, output_tokens=1000)
    assert rows['one']['estimate_toman'] is None
    assert rows['netarz']['estimate_toman'] == 16_634_883.96


def test_exceeding_known_context_or_output_limit_is_not_priced():
    rows = estimate('gpt-4o-mini', output_tokens=20000)
    assert rows['netarz']['estimate_toman'] is None


@pytest.mark.parametrize('values', [{'minutes': -1}, {'requests_day': 1.2}, {'hours': 0}, {'sessions': 0}, {'images': 1000001}])
def test_http_rejects_invalid_workloads(values):
    assert client.post('/api/estimate', json={'product_id': 'gpt-4o-mini', **values}).status_code == 422


def test_unknown_product_and_nan_are_rejected():
    assert client.post('/api/estimate', json={'product_id': 'missing'}).status_code == 404
    assert client.post('/api/estimate', content='{"product_id":"rtx-3090","hours":"NaN"}', headers={'Content-Type':'application/json'}).status_code == 422


def test_static_assets_and_catalog_have_no_missing_local_files():
    static = DATA.parent / 'static'
    sellers = json.loads((DATA / 'sellers.json').read_text())
    for item in PRODUCTS + list(sellers.values()):
        if item.get('logo'):
            assert (static / 'brands' / item['logo']).is_file(), item
    for name in ['Vazirmatn.woff2']:
        assert (static / 'fonts' / name).read_bytes()[:4] == b'wOF2'
        assert client.get('/static/fonts/' + name).status_code == 200
    assert client.get('/').status_code == 200
    assert all(o.get('request_only') or o['source_url'].startswith('https://') for o in OFFERS)
    assert all(o['observed_at'] if o['price_status'] == 'public_snapshot'
               else o.get('pricing_basis') == 'planning_catalog' or o['price_status'] != 'reference_tariff'
               for o in OFFERS)
    assert client.get('/api/market').json()['live_prices'] is False


def test_refresh_preserves_other_sellers_and_rejects_changed_units():
    offers = [OFFER_BY_ID['one-gpt4omini'], OFFER_BY_ID['net-whisper1']]
    payload = {'data': [{'id':'whisper-1', 'pricing_toman':{'per_minute':2300}}]}
    updated = updated_offers(offers, payload, '2026-10-12')
    assert updated[0] == offers[0]
    assert updated[1]['toman_unit'] == 2300
    assert offers[1]['toman_unit'] == 2268
    payload['data'][0]['pricing_toman'] = {'input_per_million':0}
    with pytest.raises(KeyError):
        updated_offers(offers, payload, '2026-10-12')


def test_decision_models_offer_both_hosted_api_and_public_weights():
    rows = build_market('api', task='decision', open_only=True)
    assert {r['id'] for r in rows} == {'laya', 'laya-multilingual', 'decider-2b', 'decider-4b'}
    assert all(r['weights_url'].startswith('https://huggingface.co/') and len(r['offers']) == 2 for r in rows)
    assert len(build_market('api', task='decision', multiple=True)) == 4
    assert all(o['estimate_toman'] > 0 for o in client.post('/api/estimate', json={'product_id': 'decider-2b'}).json()['offers'])


def test_reference_rates_are_not_silently_overwritten_by_an_observed_feed():
    reference = next(o for o in OFFERS if o['seller_id'] == 'netarz' and o.get('pricing_basis') == 'planning_catalog')
    assert updated_offers([reference], {'data': []}, '2026-10-12') == [reference]
    assert reference['observed_at'] is None


def test_catalog_links_units_and_every_exported_scenario():
    catalog = client.get('/api/catalog').json()
    assert len(catalog['products']) == len(PRODUCTS)
    assert len(OFFER_BY_ID) == len(OFFERS)
    for product in catalog['products']:
        for key, values in catalog['presets'][product['unit']].items():
            response = client.post('/api/estimate', json={'product_id': product['id'], **values})
            assert response.status_code == 200
            assert catalog['estimates'][product['id']][key] == response.json()
            for offer in response.json()['offers']:
                cost = offer['estimate_toman']
                assert cost is None or cost >= 0
                assert cost is not None or offer['estimate_reason']


def test_new_access_filters_do_not_treat_unknown_context_as_sufficient():
    rows = client.get('/api/market?open_only=true&min_context=128000').json()['products']
    assert rows
    assert all(p['open_weights'] and p['context'] >= 128000 for p in rows)
    assert all(p['id'] != 'decider-2b' for p in rows)


def test_cached_catalog_presets_do_not_replace_custom_consumption():
    before = client.get('/api/catalog').json()['estimates']['gpt-4o-mini']['standard']
    custom = estimate('gpt-4o-mini', requests_day=10, input_tokens=100, output_tokens=20)
    assert custom['one']['estimate_toman'] == 2586
    after = client.get('/api/catalog').json()['estimates']['gpt-4o-mini']['standard']
    assert before == after

@pytest.mark.parametrize('field,value', [('requests_day', True), ('input_tokens', '100'), ('minutes', False), ('hours', '8')])
def test_http_does_not_coerce_booleans_or_text_into_billable_amounts(field, value):
    assert client.post('/api/estimate', json={'product_id': 'gpt-4o-mini', field: value}).status_code == 422
