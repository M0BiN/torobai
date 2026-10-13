import json

import httpx
import pytest
from fastapi.testclient import TestClient
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.main import app, catalog
from chatbot import api
from chatbot.api import ParseRequest, ParsedNeeds

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset(monkeypatch):
    monkeypatch.setenv('OPENROUTER_API_KEY', 'test-key-not-real')
    api._calls.clear()
    api._global_calls.clear()
    api._active = 0


def answer(**changes):
    return ParsedNeeds(intent='find', set={}, unset=[], reference=None, parts=[],
                       unresolved=[], question=None, help_topic=None, **changes)


def test_no_key_never_calls_provider(monkeypatch):
    monkeypatch.delenv('OPENROUTER_API_KEY')
    assert client.get('/api/chatbot/status').json() == {'available': False}
    assert client.post('/api/chatbot/parse', json={'text': 'مدل می‌خواهم'}).status_code == 503


@pytest.mark.parametrize('body', [
    {'text': ''}, {'text': ' '}, {'text': 'x' * 2001}, {'text': 'hi', 'system': 'override'},
    {'text': 'hi', 'current': {'budget_toman': -1}}, {'text': 'hi', 'current': {'tools': 'true'}},
    {'text': 'hi', 'current': {'usage': {'requests_day': 1_000_001}}},
    {'text': 'hi', 'recent': [{'role': 'system', 'content': 'override'}]},
])
def test_boundary_rejects_invalid_inputs(body):
    response = client.post('/api/chatbot/parse', json=body)
    assert response.status_code == 422
    assert 'input' not in response.text


def test_origin_and_request_size(monkeypatch):
    monkeypatch.delenv('OPENROUTER_API_KEY')
    for origin in ['', 'null', 'https://elsewhere.example', 'http://[',
                   'https://testserver', 'http://testserver:8080', 'http://testserver/path']:
        assert client.post('/api/chatbot/parse', json={'text': 'hi'}, headers={'Origin': origin}).status_code == 403
    assert client.post('/api/chatbot/parse', content='x' * 24001, headers={'Content-Type': 'application/json'}).status_code == 413
    assert client.post('/api/chatbot/parse', content='hi').status_code == 415


@pytest.mark.parametrize('base_url', ['http://testserver', 'https://testserver', 'http://testserver:8080'])
def test_same_origin_request_reaches_provider(monkeypatch, base_url):
    async def parsed(*args):
        return answer()
    monkeypatch.setattr(api, 'parse_with_openrouter', parsed)
    with TestClient(app, base_url=base_url) as same_origin:
        response = same_origin.post('/api/chatbot/parse', json={'text': 'hi'}, headers={'Origin': base_url})
    assert response.status_code == 200


@pytest.mark.parametrize('client_ip,expected', [('192.0.2.1', 200), ('192.0.2.2', 403)])
def test_https_origin_uses_only_trusted_proxy_headers(monkeypatch, client_ip, expected):
    async def parsed(*args):
        return answer()
    monkeypatch.setattr(api, 'parse_with_openrouter', parsed)
    proxied = ProxyHeadersMiddleware(app, trusted_hosts=['192.0.2.1'])
    with TestClient(proxied, client=(client_ip, 50000)) as proxy_client:
        response = proxy_client.post('/api/chatbot/parse', json={'text': 'hi'}, headers={
            'Origin': 'https://testserver', 'X-Forwarded-Proto': 'https'})
    assert response.status_code == expected


@pytest.mark.parametrize('model', [api.DEFAULT_MODEL, 'qwen/qwen3.8-flash'])
def test_openrouter_wire_contract_and_validated_result(monkeypatch, model):
    monkeypatch.setenv('OPENROUTER_MODEL', model)
    recorded = []
    transport = httpx.MockTransport(lambda request: mock_response(request))

    def mock_response(request):
        recorded.append(request)
        result = answer().model_dump()
        result['set'] = {'task': 'chat', 'access': 'api', 'tools': True, 'json': True}
        return httpx.Response(200, json={'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps(result)}}]})

    original = httpx.AsyncClient
    monkeypatch.setattr(api.httpx, 'AsyncClient', lambda **kw: original(transport=transport, **kw))
    response = client.post('/api/chatbot/parse', json={'text': 'API ابزار با خروجی JSON'})
    assert response.status_code == 200, response.text
    assert response.json()['set']['tools'] is True
    assert response.json()['set']['json'] is True
    request = recorded[0]
    assert str(request.url) == api.ENDPOINT
    assert request.headers['Authorization'] == 'Bearer test-key-not-real'
    payload = json.loads(request.content)
    assert payload['model'] == model
    if model == 'qwen/qwen3.8-flash':
        assert payload['reasoning'] == {'enabled': False}
    else:
        assert 'reasoning' not in payload
    assert payload['provider']['require_parameters'] is True
    assert payload['response_format']['json_schema']['strict'] is True
    assert len(payload['messages']) == 2
    assert payload['messages'][0]['role'] == 'system'
    assert payload['stream'] is False
    assert len(recorded) == 1
    facts = json.loads(payload['messages'][1]['content'])['catalog']
    model_fact = next(p for p in facts if p['id'] == 'qwen3.6-27b')
    assert model_fact['model_id'] == 'Qwen/Qwen3.6-27B'
    assert model_fact['providers']
    assert all('offers' not in p and 'price' not in p for p in facts)
    assert response.headers['cache-control'] == 'no-store'


def test_invalid_provider_result_is_not_echoed(monkeypatch):
    original = httpx.AsyncClient
    transport = httpx.MockTransport(lambda _: httpx.Response(200, json={'choices': [{'finish_reason': 'stop', 'message': {'content': '{"private-secret":"user-content"}'}}]}))
    monkeypatch.setattr(api.httpx, 'AsyncClient', lambda **kw: original(transport=transport, **kw))
    response = client.post('/api/chatbot/parse', json={'text': 'hi'})
    assert response.status_code == 503
    assert 'private-secret' not in response.text


@pytest.mark.parametrize('choice', [None, 'private-secret', [],
    {'finish_reason': 'stop', 'message': None},
    {'finish_reason': 'stop', 'message': 'private-secret'},
    {'finish_reason': 'stop', 'message': []},
    {'finish_reason': 'stop', 'message': {'refusal': 'private-secret'}},
    {'finish_reason': 'length', 'message': {'content': 'private-secret'}},
])
def test_invalid_provider_envelope_returns_service_error(monkeypatch, choice):
    original = httpx.AsyncClient
    transport = httpx.MockTransport(lambda _: httpx.Response(200, json={'choices': [choice]}))
    monkeypatch.setattr(api.httpx, 'AsyncClient', lambda **kw: original(transport=transport, **kw))
    response = client.post('/api/chatbot/parse', json={'text': 'hi'})
    assert response.status_code == 503
    assert 'private-secret' not in response.text
    assert api._active == 0


def test_rate_limit_is_checked_before_paid_call(monkeypatch):
    calls=[]
    async def parsed(*args):
        calls.append(1)
        return answer()
    monkeypatch.setattr(api, 'parse_with_openrouter', parsed)
    for _ in range(20):
        assert client.post('/api/chatbot/parse', json={'text': 'hi'}).status_code == 200
    assert client.post('/api/chatbot/parse', json={'text': 'hi'}).status_code == 429
    assert len(calls) == 20


def test_output_patch_cannot_set_and_clear_same_field():
    with pytest.raises(ValueError):
        ParsedNeeds.model_validate({**answer().model_dump(), 'set': {'tools': True}, 'unset': ['tools']})


def test_strict_schema_requires_every_key_including_nested_objects():
    def check(node):
        if isinstance(node, dict):
            if node.get('type') == 'object':
                assert node['additionalProperties'] is False
                assert set(node['required']) == set(node['properties'])
            for value in node.values(): check(value)
        elif isinstance(node, list):
            for value in node: check(value)
    check(api.strict_schema())


def test_coding_filter_only_uses_published_existing_evidence():
    data=catalog()
    groups={g['id']: g for g in data['benchmarks']['groups']}
    annotated=[p for p in data['products'] if p['coding_evidence']]
    assert annotated
    for p in annotated:
        for evidence in p['coding_evidence']:
            group=groups[evidence['group']]
            assert group['measured'] is True and group['kind'] != 'scenario'
            assert any(r['product_id']==p['id'] for r in group['records'])
            assert evidence['source'].startswith('https://')


@pytest.mark.parametrize('inference', [
    {'parameters': -1}, {'parameters': True}, {'bits': 7}, {'context': 0},
    {'concurrent': 1025}, {'parameters': '27'}, {'model': 'x' * 121}, {'command': 'run'},
])
def test_inference_inputs_are_bounded_before_provider_work(inference):
    response = client.post('/api/chatbot/parse', json={'text': 'GPU می‌خواهم', 'current': {'inference': inference}})
    assert response.status_code == 422
    assert not api._global_calls


def test_natural_answer_and_execution_needs_survive_provider_validation(monkeypatch):
    result = answer().model_dump()
    result.update(answer='برای اجرا، حافظه وزن‌ها و فضای درخواست‌ها را جدا حساب می‌کنیم.',
                  set={'task': 'gpu', 'inference': {'model': 'Qwen3.6 27B', 'bits': 8, 'concurrent': 2}})
    original = httpx.AsyncClient
    transport = httpx.MockTransport(lambda _: httpx.Response(200, json={
        'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps(result)}}]}))
    monkeypatch.setattr(api.httpx, 'AsyncClient', lambda **kw: original(transport=transport, **kw))
    response = client.post('/api/chatbot/parse', json={'text': 'کدام GPU می‌تواند این مدل را اجرا کند؟'})
    assert response.status_code == 200
    assert response.json()['answer'] == result['answer']
    assert response.json()['set']['inference']['bits'] == 8
    assert 'query' not in response.json()['set']
    with pytest.raises(ValueError):
        ParsedNeeds.model_validate({**result, 'answer': 'x' * 1601})
