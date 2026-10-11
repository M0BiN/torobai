"""Metadata and portable tariff templates. Unknown capabilities remain unknown."""
from .pricing_plan import api_plan
from .market import gpu_cost


def marketplace_data(products, presets):
    templates = {}
    for unit in ['tokens', 'input_tokens', 'minute', 'characters', 'image', 'page', 'request']:
        templates[unit] = api_plan({'unit': unit}, {
            'price_status': 'provider_declared', 'toman_input_m': 1,
            'toman_output_m': 1, 'toman_unit': 1})
    capabilities = {}
    for p in products:
        for o in p['offers']:
            caps = {'streaming': o.get('streaming'), 'json': None, 'tools': None,
                    'no_retention': None, 'quantization': None,
                    'latency_ms': None, 'tokens_second': None,
                    'basis': 'catalog_fields', 'source_url': o.get('docs_url')}
            # These are terms of the existing fictional publishers, not claims
            # about commercial providers or measured service performance.
            if o.get('seller_info', {}).get('listing_basis') == 'fictional_scenario':
                caps.update(json=p['task'] in ['chat', 'decision', 'extraction', 'classification'],
                            tools=p['task'] == 'chat',
                            no_retention=o['seller_id'] in ['ava-studio', 'vajeh-lab', 'narvan-cloud'],
                            basis='illustrative_scenario')
            capabilities[o['id']] = caps
    rate_keys = ['toman_input_m', 'toman_output_m', 'toman_unit',
                 'toman_input_long_m', 'toman_output_long_m']
    editable = {o['id']: {mode: api_plan(p, {**o, 'availability': 'available',
                         **({k: o.get(k) if o.get(k) is not None else 1 for k in rate_keys}
                            if mode == 'instant' else {})}, mode)
                         for mode in ['instant', 'batch']}
                for p in products if p['kind'] == 'api' for o in p['offers']}
    # Compile the existing Python rental rounding/minimums at the three supported
    # workloads. The portable app only substitutes a tariff, never rental rules.
    gpu_plans = {}
    for p in products:
        if p['kind'] != 'gpu':
            continue
        for o in p['offers']:
            key = next((k for k in ['hourly_toman', 'daily_toman'] if o.get(k) is not None), None)
            if key is None or o['price_status'] == 'needs_recheck':
                continue
            gpu_plans[o['id']] = {name: {'terms': [{
                'rate': str(o[key]), 'rate_key': key, 'fields': ['quantity'], 'denominator': 1}],
                'quantity': gpu_cost({**o, key: 1, 'availability': 'available'}, **values)}
                for name, values in presets[p['unit']].items()}
    return {'capabilities': capabilities, 'flat_plans': templates, 'editable_plans': editable,
            'gpu_plans': gpu_plans,
            'tax_plan': {'terms': [
                {'rate': '1', 'fields': ['subtotal'], 'denominator': 1},
                {'rate': '0.01', 'fields': ['subtotal', 'tax'], 'denominator': 1}]}}
