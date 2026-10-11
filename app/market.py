"""Catalog filters and cost arithmetic. Every price keeps its seller and unit."""
import json
import math
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from app.pricing_plan import api_plan, evaluate_plan

DATA = Path(__file__).resolve().parent / 'data'
PRODUCTS = json.loads((DATA / 'products.json').read_text(encoding='utf-8'))
OFFERS = json.loads((DATA / 'offers.json').read_text(encoding='utf-8'))
BATCH_TERMS = json.loads((DATA / 'batch_terms.json').read_text(encoding='utf-8'))
for offer in OFFERS:
    if offer['kind'] == 'api':
        offer['batch'] = BATCH_TERMS.get(offer['id'], {'supported': None})
SELLERS = json.loads((DATA / 'sellers.json').read_text(encoding='utf-8'))
WEIGHT_OFFERS = json.loads((DATA / 'weight_offers.json').read_text(encoding='utf-8'))
PRODUCT_BY_ID = {p['id']: p for p in PRODUCTS}
OFFER_BY_ID = {o['id']: o for o in OFFERS}


def money(value):
    return float(value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


def api_rates(offer, usd_to_toman=None):
    if offer['kind'] != 'api':
        raise ValueError('API offer required')
    if offer.get('toman_input_m') is not None and offer.get('toman_output_m') is not None:
        return offer['toman_input_m'], offer['toman_output_m']
    if usd_to_toman is not None:
        if not math.isfinite(usd_to_toman) or not 1000 <= usd_to_toman <= 10_000_000:
            raise ValueError('Invalid exchange rate')
        if offer.get('usd_input_m') is not None and offer.get('usd_output_m') is not None:
            return offer['usd_input_m'] * usd_to_toman, offer['usd_output_m'] * usd_to_toman
    return None


def api_monthly(offer, requests_per_day, input_tokens, output_tokens, days=30, usd_to_toman=None):
    if not (1 <= days <= 31 and all(0 <= n <= 1_000_000 for n in
                                   [requests_per_day, input_tokens, output_tokens])):
        raise ValueError('Invalid workload')
    rates = api_rates(offer, usd_to_toman)
    if rates is None:
        return None
    cost = (Decimal(input_tokens) * Decimal(str(rates[0])) +
            Decimal(output_tokens) * Decimal(str(rates[1])))
    return money(cost * days * requests_per_day / 1_000_000)


def gpu_cost(offer, hours, sessions=1):
    if offer['kind'] != 'gpu':
        raise ValueError('GPU offer required')
    if not math.isfinite(hours) or not (0 < hours <= 744 and 1 <= sessions <= 31):
        raise ValueError('Invalid rental period')
    if offer.get('availability') == 'unavailable':
        return None
    billed_hours = max(hours, offer.get('min_hours') or 0)
    step = offer.get('billing_step_hours')
    if step:
        billed_hours = math.ceil(billed_hours / step) * step
    if offer.get('hourly_toman') is not None:
        return money(Decimal(str(billed_hours)) * sessions * Decimal(str(offer['hourly_toman'])))
    if offer.get('daily_toman') is not None:
        # Separate bookings each incur the daily minimum.
        return money(Decimal(math.ceil(billed_hours / 24)) * sessions * Decimal(str(offer['daily_toman'])))
    return None


def normalize(text):
    return str(text).casefold().translate(str.maketrans('يك۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩',
                                                      'یک01234567890123456789')).replace('\u200c', ' ')


def public_offer(offer):
    return {**offer, 'seller_info': SELLERS[offer['seller_id']]}


def build_market(kind, query='', min_vram=0, paid_only=False, task='', maker='',
                 multiple=False, ssh_only=False, iran_only=False, open_only=False,
                 min_context=0, persian_only=False, access='', publisher=''):
    if kind not in {'api', 'gpu'}:
        raise ValueError('Unknown market')
    words = normalize(query).split()
    rows = []
    for product in PRODUCTS:
        if product['kind'] != kind or task and product['task'] != task or maker and product['maker'] != maker:
            continue
        if persian_only and not product.get('persian_specialist'):
            continue
        if publisher and product.get('publisher_type') != publisher:
            continue
        if min_vram and (product.get('vram') or 0) < min_vram:
            continue
        if open_only and not product.get('open_weights'):
            continue
        if min_context and (product.get('context') or 0) < min_context:
            continue
        offers = []
        for offer in OFFERS:
            if offer['product_id'] != product['id']:
                continue
            if paid_only and offer['price_status'] != 'public_snapshot':
                continue
            if ssh_only and offer.get('ssh') is not True:
                continue
            if iran_only and offer.get('region_code') != 'ir':
                continue
            offers.append(public_offer(offer))
        haystack = normalize(' '.join([product['title'], product['maker'], product['description'],
                                     product.get('model_id', ''), product.get('search_terms', ''),
                                     product.get('capability', {}).get('base_model', ''),
                                     product.get('capability', {}).get('language_detail', ''),
                                     *product['tags'], *(o['seller'] for o in offers)]))
        weight_offers = [public_offer(w) for w in WEIGHT_OFFERS if w['product_id'] == product['id']]
        if access == 'api' and not offers:
            continue
        if access == 'weights' and not (weight_offers or product.get('weights_url')):
            continue
        downloadable = (product.get('weights_url') or weight_offers) and not any([paid_only, multiple, ssh_only, iran_only])
        if not (offers or downloadable) or not all(word in haystack for word in words):
            continue
        if multiple and len({o['seller_id'] for o in offers}) < 2:
            continue
        rows.append({**product, 'offers': offers, 'weight_offers': weight_offers})
    return rows


def estimate_offer(offer, scenario):
    product = PRODUCT_BY_ID[offer['product_id']]
    seller = SELLERS[offer['seller_id']]
    cost = None
    reason = None
    converted = False
    minimum_credit = offer.get('min_credit_toman', seller.get('min_credit_toman'))
    unit = product['unit']
    if product['kind'] == 'api':
        mode = scenario.get('request_mode', 'instant')
        cost, reason, effective_rates = evaluate_plan(
            api_plan(product, offer, mode, scenario.get('usd_to_toman')),
            {**scenario, 'days': 30})
        converted = cost is not None and offer.get('toman_input_m') is None and mode == 'instant' and unit == 'tokens'
    elif offer.get('availability') == 'unavailable':
        reason = 'در آخرین مشاهده ناموجود بود.'
    elif offer['price_status'] == 'needs_recheck':
        reason = 'این تعرفه به بررسی دوباره نیاز دارد.'
    elif (offer.get('service_terms', {}).get('monthly_characters_limit') is not None
          and scenario['characters'] > offer['service_terms']['monthly_characters_limit']):
        reason = 'این مصرف از سقف ماهانه دسترسی پژوهشی بیشتر است.'
    elif product['kind'] == 'gpu':
        cost = gpu_cost(offer, scenario['hours'], scenario['sessions'])
        if cost is None and offer.get('monthly_toman') is not None:
            reason = 'تعرفه قرارداد ماهانه است؛ نرخ اجاره کوتاه‌مدت ثبت نشده است.'
        if offer.get('min_credit_hours') and offer.get('hourly_toman') is not None:
            minimum_credit = offer['min_credit_hours'] * offer['hourly_toman']
    if cost is None and reason is None:
        reason = 'تعرفه تومانی قابل محاسبه ثبت نشده است.'
    tax = seller.get('tax_percent')
    minimum_payment = None if minimum_credit is None or tax is None else money(
        Decimal(str(minimum_credit)) * (1 + Decimal(str(tax)) / 100))
    return {**public_offer(offer), 'estimate_toman': cost, 'estimate_reason': reason,
            'scenario_converted': converted, 'minimum_credit_toman': minimum_credit,
            'minimum_payment_toman': minimum_payment,
            **({'request_mode': scenario.get('request_mode', 'instant'),
                'effective_rates': effective_rates if cost is not None else {}} if product['kind'] == 'api' else {})}


