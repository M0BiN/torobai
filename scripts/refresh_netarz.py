"""Refresh only the Netarz models already in our catalog; restart the app afterwards."""
import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

DATA = Path(__file__).resolve().parents[1] / 'app/data/offers.json'
URL = 'https://netarz.ir/api/ai/v1/models'


def updated_offers(offers, payload, observed_at):
    models = {model['id']: model for model in payload['data']}
    if len(models) != len(payload['data']):
        raise ValueError('Duplicate model identifiers; catalog was not changed.')
    updated = []
    for offer in offers:
        if offer['seller_id'] != 'netarz' or offer.get('pricing_basis') == 'planning_catalog':
            updated.append(offer)
            continue
        model = models[offer['model_id']]
        prices = model['pricing_toman']
        keys = {'tokens': ['input_per_million', 'output_per_million'],
                'input_tokens': ['input_per_million'], 'minute': ['per_minute'],
                'characters': ['per_million_characters'], 'image': ['per_image']}[offer['unit']]
        # Missing or changed units abort the whole update rather than become free usage.
        for key in keys:
            value = prices[key]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
                raise ValueError(f'Invalid rate for {offer["model_id"]}: {key}')
        fields = dict(toman_input_m=prices.get('input_per_million'),
                      toman_output_m=prices.get('output_per_million'),
                      toman_unit=prices.get(keys[0]) if offer['unit'] in {'minute','characters','image'} else None,
                      long_context_threshold=model.get('pricing', {}).get('long_context_threshold'),
                      toman_input_long_m=prices.get('input_per_million_long'),
                      toman_output_long_m=prices.get('output_per_million_long'),
                      context=model.get('context_length'), max_output=model.get('max_output_tokens'),
                      observed_at=observed_at, price_status='public_snapshot')
        for key in ['toman_input_long_m', 'toman_output_long_m', 'context', 'max_output', 'long_context_threshold']:
            value = fields[key]
            if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0):
                raise ValueError(f'Invalid {key} for {offer["model_id"]}')
        updated.append({**offer, **fields})
    return updated


def main():
    offers = json.loads(DATA.read_text(encoding='utf-8'))
    request = Request(URL, headers={'Accept': 'application/json', 'User-Agent': 'torobai/0.3'})
    with urlopen(request, timeout=20) as response:
        raw = response.read(5_000_001)
    if len(raw) > 5_000_000:
        raise ValueError('Unexpected catalog size; local prices were not changed.')
    payload = json.loads(raw)
    updated = updated_offers(offers, payload, datetime.now(timezone.utc).date().isoformat())
    temporary = DATA.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(temporary, DATA)
    print('Netarz prices updated. Other sellers unchanged. Restart the app to load this snapshot.')


if __name__ == '__main__':
    main()
