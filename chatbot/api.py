"""Answer questions and extract needs; the application owns quotes and calculations."""
import asyncio
import json
import os
import time
from collections import deque
from pathlib import Path
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator
from chatbot.catalog import conversation_catalog

router = APIRouter(prefix='/api/chatbot')
ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
DEFAULT_MODEL = 'openai/gpt-4.1-mini'
PROMPT = Path(__file__).with_name('prompt.txt').read_text(encoding='utf-8')
Task = Literal['chat', 'embedding', 'transcription', 'translation', 'speech', 'image',
               'ocr', 'extraction', 'classification', 'decision', 'gpu']
FieldName = Literal['task', 'access', 'query', 'persian', 'tools', 'json', 'streaming',
                    'no_retention', 'open', 'ssh', 'vram', 'context', 'usecase',
                    'priority', 'budget_toman', 'budget_period', 'usage', 'requestMode', 'rental', 'inference']


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, allow_inf_nan=False, serialize_by_alias=True)


class Usage(StrictModel):
    requests_day: int | None = Field(None, ge=0, le=1_000_000)
    input_tokens: int | None = Field(None, ge=0, le=1_000_000)
    output_tokens: int | None = Field(None, ge=0, le=1_000_000)
    monthly_tokens: int | None = Field(None, ge=0, le=1_000_000_000)
    minutes: float | None = Field(None, ge=0, le=1_000_000)
    characters: int | None = Field(None, ge=0, le=1_000_000_000)
    images: int | None = Field(None, ge=0, le=1_000_000)
    pages: int | None = Field(None, ge=0, le=1_000_000)
    monthly_requests: int | None = Field(None, ge=0, le=1_000_000)


class Inference(StrictModel):
    model: str | None = Field(None, max_length=120)
    parameters: float | None = Field(None, ge=0.001, le=2000)
    bits: Literal[4, 8, 16] | None = None
    context: int | None = Field(None, ge=1, le=2_000_000)
    concurrent: int | None = Field(None, ge=1, le=1024)


class Needs(StrictModel):
    task: Task | None = None
    access: Literal['api', 'weights'] | None = None
    query: str | None = Field(None, max_length=80)
    persian: bool | None = None
    tools: bool | None = None
    json_output: bool | None = Field(None, alias="json")
    streaming: bool | None = None
    no_retention: bool | None = None
    open: bool | None = None
    ssh: bool | None = None
    vram: int | None = Field(None, ge=0, le=192)
    context: int | None = Field(None, ge=0, le=2_000_000)
    usecase: Literal['coding'] | None = None
    priority: Literal['cost', 'quality', 'balanced'] | None = None
    budget_toman: float | None = Field(None, ge=0, le=1_000_000_000_000)
    budget_period: Literal['month', 'license', 'rental'] | None = None
    usage: Usage | None = None
    requestMode: Literal['instant', 'batch'] | None = None
    rental: Literal['light', 'standard', 'heavy'] | None = None
    inference: Inference | None = None


class Message(StrictModel):
    role: Literal['user', 'assistant']
    content: str = Field(max_length=2000)


class Card(StrictModel):
    id: str = Field(max_length=80, pattern=r'^[a-z0-9._-]+$')
    title: str = Field(max_length=120)
    task: Task


class ParseRequest(StrictModel):
    text: str = Field(min_length=1, max_length=2000)
    current: Needs = Field(default_factory=Needs)
    recent: list[Message] = Field(default_factory=list, max_length=6)
    last_cards: list[Card] = Field(default_factory=list, max_length=3)
    page: str = Field('', max_length=160)
    unresolved: list[str] = Field(default_factory=list, max_length=4)

    @model_validator(mode='after')
    def bounded_context(self):
        if not self.text.strip() or any(len(x) > 160 for x in self.unresolved):
            raise ValueError('Invalid context')
        return self


class ParsedNeeds(StrictModel):
    intent: Literal['find', 'compare', 'publish', 'help', 'answer', 'compound', 'unsupported']
    answer: str | None = Field(None, max_length=1600)
    set: Needs
    unset: list[FieldName] = Field(max_length=24)
    reference: int | None = Field(ge=1, le=3)
    parts: list[Task] = Field(max_length=3)
    compare_names: list[str] = Field(default_factory=list, max_length=4)
    unresolved: list[str] = Field(max_length=4)
    question: str | None = Field(max_length=180)
    help_topic: Literal['api', 'weights', 'batch', 'tokens', 'privacy', 'benchmarks', 'gpu'] | None

    @model_validator(mode='after')
    def no_conflicting_patch(self):
        changed = self.set.model_dump(exclude_none=True)
        if set(changed).intersection(self.unset):
            raise ValueError('A field cannot be both set and unset')
        if any(not x.strip() or len(x) > 120 for x in self.compare_names):
            raise ValueError('Invalid model name')
        if any(not x.strip() or len(x) > 160 for x in self.unresolved):
            raise ValueError('Invalid unresolved need')
        return self


def strict_schema():
    schema = ParsedNeeds.model_json_schema()

    def visit(node):
        if isinstance(node, dict):
            node.pop('default', None)
            if node.get('type') == 'object':
                node['required'] = list(node.get('properties', {}))
                node['additionalProperties'] = False
            for child in node.values():
                visit(child)
        elif isinstance(node, list):
            for child in node:
                visit(child)
    visit(schema)
    return schema


# shortcut: limits are process-local; use an edge limit before multi-worker public hosting.
_calls: dict[str, deque] = {}
_global_calls = deque()
_active = 0


def check_rate(ip):
    now = time.monotonic()
    for key in list(_calls):
        if not _calls[key] or _calls[key][-1] <= now - 60:
            del _calls[key]
    if ip not in _calls and len(_calls) >= 2048:
        raise HTTPException(429, 'کمی بعد دوباره تلاش کنید.')
    queue = _calls.setdefault(ip, deque())
    for q in (queue, _global_calls):
        while q and q[0] <= now - 60:
            q.popleft()
    if len(queue) >= 20 or len(_global_calls) >= 120 or _active >= 8:
        raise HTTPException(429, 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.')
    queue.append(now)
    _global_calls.append(now)


@router.get('/status')
def status():
    return JSONResponse({'available': bool(os.getenv('OPENROUTER_API_KEY', '').strip())},
                        headers={'Cache-Control': 'no-store'})


async def parse_with_openrouter(body: ParseRequest, key: str):
    context = body.model_dump(exclude_none=True)
    context['catalog'] = conversation_catalog()
    payload = {
        'model': os.getenv('OPENROUTER_MODEL', DEFAULT_MODEL).strip() or DEFAULT_MODEL,
        'messages': [
            {'role': 'system', 'content': PROMPT},
            {'role': 'user', 'content': json.dumps(context, ensure_ascii=False, separators=(',', ':'))},
        ],
        'response_format': {'type': 'json_schema', 'json_schema': {
            'name': 'torobai_needs', 'strict': True, 'schema': strict_schema()}},
        'provider': {'require_parameters': True},
        'temperature': 0,
        'max_tokens': 1800,
        'stream': False,
    }
    if payload['model'] == 'qwen/qwen3.8-flash':
        # Default thinking can exhaust the deadline for a short guide response.
        payload['reasoning'] = {'enabled': False}
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
            response = await client.post(ENDPOINT, headers={
                'Authorization': 'Bearer ' + key, 'X-Title': 'torobai',
                'Content-Type': 'application/json'}, json=payload)
        response.raise_for_status()
        choice = response.json()['choices'][0]
        if not isinstance(choice, dict) or choice.get('finish_reason') != 'stop':
            raise ValueError('Incomplete response')
        message = choice.get('message')
        if not isinstance(message, dict) or message.get('refusal'):
            raise ValueError('Invalid response message')
        parsed = ParsedNeeds.model_validate_json(message['content'])
        if parsed.reference and parsed.reference > len(body.last_cards):
            raise ValueError('Unknown previous card')
        return parsed
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError, ValidationError):
        # Provider responses can contain private text; never echo or log them.
        raise HTTPException(503, 'پاسخ متنی آماده نشد. دوباره تلاش کنید یا با گزینه‌ها ادامه بدهید.') from None


@router.post('/parse')
async def parse(request: Request):
    global _active
    origin = request.headers.get('origin')
    if origin is not None and origin != f'{request.url.scheme}://{request.url.netloc}':
        raise HTTPException(403, 'درخواست را از همین سایت ارسال کنید.')
    if request.headers.get('sec-fetch-site') == 'cross-site':
        raise HTTPException(403, 'درخواست را از همین سایت ارسال کنید.')
    if request.headers.get('content-type', '').split(';')[0].strip() != 'application/json':
        raise HTTPException(415, 'قالب درخواست نامعتبر است.')
    raw = bytearray()
    async for chunk in request.stream():
        raw.extend(chunk)
        if len(raw) > 24_000:
            raise HTTPException(413, 'پیام را کوتاه‌تر کنید.')
    try:
        body = ParseRequest.model_validate_json(bytes(raw))
    except ValidationError:
        raise HTTPException(422, 'پیام یا اطلاعات گفتگو معتبر نیست.') from None
    key = os.getenv('OPENROUTER_API_KEY', '').strip()
    if not key:
        raise HTTPException(503, 'گفتگوی متنی در دسترس نیست؛ با گزینه‌ها ادامه بدهید.')
    check_rate(request.client.host if request.client else 'unknown')
    _active += 1
    try:
        async with asyncio.timeout(22):
            result = await parse_with_openrouter(body, key)
        return JSONResponse(result.model_dump(exclude_none=True), headers={'Cache-Control': 'no-store'})
    except TimeoutError:
        raise HTTPException(504, 'دریافت پاسخ طول کشید. دوباره تلاش کنید.') from None
    finally:
        _active -= 1
