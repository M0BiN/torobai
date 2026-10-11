"""Purchase paths, Persian billing and evidence boundaries."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.market import OFFER_BY_ID

client = TestClient(app)

@pytest.mark.parametrize('product,amount,seller,expected', [
    ('avanvis-fa', {'minutes': 120}, 'ava-studio', 150000),
    ('tarjoman-en-fa', {'characters': 100000}, 'vajeh-lab', 26000),
    ('negar-ocr', {'pages': 12}, 'negar-lab', 7680),
    ('nazar-fa', {'monthly_requests': 300}, 'indie-sepehr', 28500),
])
def test_persian_task_billing_keeps_units_separate(product, amount, seller, expected):
    result=client.post('/api/estimate',json={'product_id':product,**amount})
    assert result.status_code == 200
    row=next(o for o in result.json()['offers'] if o['seller_id']==seller)
    assert row['estimate_toman'] == expected


def test_weights_never_enter_api_consumption_or_become_public_open_weights():
    rows = client.get('/api/market?persian_only=true&access=weights').json()['products']
    assert len(rows) == 10
    dual_access = next(p for p in rows if p['id'] == 'tarjoman-fa-en')
    assert len(dual_access['offers']) == 3
    assert dual_access['weight_offers'][0]['price_toman'] == 14000000
    assert dual_access['open_weights'] is False
    api_offers = client.post('/api/estimate',json={'product_id':'tarjoman-fa-en','characters':100000}).json()['offers']
    assert min(o['estimate_toman'] for o in api_offers) == 21000
    assert all(o['estimate_toman'] != 14000000 for o in api_offers)
    assert client.post('/api/estimate',json={'product_id':'avanvis-fa','minutes':0}).json()['offers'][0]['estimate_toman']==0


def test_publisher_and_access_filters_are_intersections():
    rows=client.get('/api/market?persian_only=true&access=api&publisher=person').json()['products']
    assert {p['id'] for p in rows} == {'nazar-fa', 'tarjoman-fa-en', 'whisper-fa-cv17'}
    assert client.get('/api/market?task=translation').status_code == 200
    assert client.get('/api/market?access=invalid').status_code == 422
    assert client.post('/api/estimate',json={'product_id':'negar-ocr','pages':-1}).status_code == 422
    assert client.post('/api/estimate',json={'product_id':'nazar-fa','monthly_requests':1.5}).status_code == 422


def test_display_uptime_is_explicitly_separate_from_observed_evidence():
    data=client.get('/api/catalog').json()
    display=data['presentation_reliability']
    assert display['basis']=='illustrative_scenario' and display['measured'] is False
    assert set(display['offers']) == set(OFFER_BY_ID)
    assert all(99 < r['percent'] < 100 for r in display['offers'].values())
    assert 'groups' in data['reliability']


def test_search_includes_task_aliases_base_model_and_language_details():
    for query, task in [('ASR', 'transcription'), ('TTS', 'speech'), ('OCR', 'ocr'), ('RAG', 'embedding')]:
        rows = client.get('/api/market', params={'persian_only': True, 'query': query}).json()['products']
        assert any(p['task'] == task for p in rows)
    rows = client.get('/api/market', params={'persian_only': True, 'query': 'Whisper'}).json()['products']
    assert any(p['id'] == 'avanvis-fa' for p in rows)


def test_weight_offers_include_their_publisher_identity():
    rows = client.get('/api/market', params={'access': 'weights'}).json()['products']
    model = next(p for p in rows if p['id'] == 'tarjoman-fa-en')
    assert model['weight_offers'][0]['seller_info']['name']
    assert any(o['seller_id'] == model['weight_offers'][0]['seller_id'] for o in model['offers'])


def test_daily_history_is_complete_and_matches_the_aggregate():
    from datetime import date, timedelta
    from decimal import Decimal
    display = client.get('/api/catalog').json()['presentation_reliability']
    start = date.fromisoformat(display['window_start'])
    for record in display['offers'].values():
        days = record['daily']
        assert [d['date'] for d in days] == [str(start + timedelta(days=i)) for i in range(30)]
        assert days[-1]['date'] == display['window_end']
        assert all(0 <= d['percent'] <= 100 for d in days)
        assert sum(Decimal(str(d['percent'])) for d in days) / 30 == Decimal(str(record['percent']))


def test_fictional_hosts_have_priced_offers_for_every_persian_product():
    rows = client.get('/api/market?persian_only=true').json()['products']
    for p in rows:
        assert len({o['seller_id'] for o in p['offers']}) >= 2
        assert all(o['model_id'] == p['model_id'] for o in p['offers'])
        assert all(o['seller_info']['listing_basis'] == 'fictional_scenario' for o in p['offers'])
        assert all(o['request_only'] and o['source_url'] is None for o in p['offers'])
        estimates = client.post('/api/estimate', json={'product_id': p['id']}).json()['offers']
        assert all(o['estimate_toman'] is not None for o in estimates)
        if p['weight_offers']:
            assert any(o['seller_id'] == p['publisher_id'] and o['provider_role'] == 'creator' for o in p['offers'])


def test_noncommercial_access_has_no_charge_and_an_enforced_quota():
    rows = client.post('/api/estimate', json={'product_id':'parsinlu-en-fa','characters':1000000}).json()['offers']
    assert len(rows) == 2
    assert all(o['access_scope'] == 'noncommercial' and o['estimate_toman'] == 0 for o in rows)
    assert all(o['minimum_credit_toman'] == 0 and o['minimum_payment_toman'] == 0 for o in rows)
    over = client.post('/api/estimate', json={'product_id':'parsinlu-en-fa','characters':1000001}).json()['offers']
    assert all(o['estimate_toman'] is None and o['estimate_reason'] for o in over)
