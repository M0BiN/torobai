"""Compile API tariffs into data, shared by Python and the portable evaluator."""
from decimal import Decimal, ROUND_HALF_UP


def api_plan(product, offer, mode='instant', usd_to_toman=None):
    missing = 'تعرفه تومانی قابل محاسبه ثبت نشده است.'
    rates = dict(offer)
    if mode == 'batch':
        batch = offer.get('batch', {})
        if not batch.get('supported'):
            return {'reason': 'تعرفه Batch برای این پیشنهاد ثبت نشده است.'}
        for key in ['toman_input_m', 'toman_output_m', 'toman_unit',
                    'toman_input_long_m', 'toman_output_long_m']:
            rates[key] = batch.get(key)
    elif rates.get('toman_input_m') is None and usd_to_toman is not None:
        for key in ['input', 'output']:
            value = rates.get(f'usd_{key}_m')
            if value is not None:
                rates[f'toman_{key}_m'] = value * usd_to_toman
    if offer.get('availability') == 'unavailable':
        return {'reason': 'در آخرین مشاهده ناموجود بود.'}
    if offer['price_status'] == 'needs_recheck':
        return {'reason': 'این تعرفه به بررسی دوباره نیاز دارد.'}
    plan = {'checks': [], 'terms': [], 'rates': {k: rates.get(k) for k in
            ['toman_input_m', 'toman_output_m', 'toman_unit']}}
    quota = offer.get('service_terms', {}).get('monthly_characters_limit')
    if quota is not None:
        plan['checks'].append({'fields': ['characters'], 'max': quota,
                              'reason': 'این مصرف از سقف ماهانه دسترسی پژوهشی بیشتر است.'})
    def term(value, fields, denominator=1, rate_key=None):
        return {'rate': str(value), 'fields': fields, 'denominator': denominator, 'rate_key': rate_key}
    def token_terms(input_key, output_key):
        if rates.get(input_key) is None or rates.get(output_key) is None:
            return None
        return [term(rates[input_key], ['requests_day', 'input_tokens', 'days'], 1000000, input_key),
                term(rates[output_key], ['requests_day', 'output_tokens', 'days'], 1000000, output_key)]
    if product['unit'] == 'tokens':
        for fields, key in [(['input_tokens', 'output_tokens'], 'context'),
                            (['output_tokens'], 'max_output')]:
            if offer.get(key):
                plan['checks'].append({'fields': fields, 'max': offer[key],
                    'reason': 'مصرف هر درخواست از سقف اعلام‌شده این پیشنهاد بیشتر است.'})
        plan['terms'] = token_terms('toman_input_m', 'toman_output_m')
        if offer.get('long_context_threshold'):
            plan['long'] = {'field': 'input_tokens', 'above': offer['long_context_threshold'],
                           'terms': token_terms('toman_input_long_m', 'toman_output_long_m'),
                           'rates': {'toman_input_m': rates.get('toman_input_long_m'),
                                     'toman_output_m': rates.get('toman_output_long_m')},
                           'reason': 'تعرفه ورودی بلند این فروشنده ثبت نشده است.'}
    else:
        field, denominator, rate_key = {
            'input_tokens': ('monthly_tokens', 1000000, 'toman_input_m'),
            'minute': ('minutes', 1, 'toman_unit'),
            'characters': ('characters', 1000000, 'toman_unit'),
            'image': ('images', 1, 'toman_unit'),
            'page': ('pages', 1, 'toman_unit'),
            'request': ('monthly_requests', 1, 'toman_unit'),
        }[product['unit']]
        plan['terms'] = [term(rates[rate_key], [field], denominator, rate_key)] if rates.get(rate_key) is not None else None
    plan['reason'] = missing
    return plan


def evaluate_plan(plan, values):
    for check in plan.get('checks', []):
        if sum(values[field] for field in check['fields']) > check['max']:
            return None, check['reason'], {}
    branch = plan.get('long')
    selected = branch if branch and values[branch['field']] > branch['above'] else plan
    if selected.get('terms') is None:
        return None, selected['reason'], {}
    total = Decimal(0)
    for term in selected['terms']:
        cost = Decimal(term['rate'])
        for field in term['fields']:
            cost *= Decimal(str(values[field]))
        total += cost / term['denominator']
    return float(total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)), None, selected.get('rates', {})
