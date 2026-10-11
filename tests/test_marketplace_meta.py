from decimal import Decimal

from app.main import catalog
from app.market import gpu_cost
from app.pricing_plan import evaluate_plan


def test_gpu_tariff_templates_preserve_python_billing_rules():
    data = catalog()
    for product in data['products']:
        if product['kind'] != 'gpu':
            continue
        for offer in product['offers']:
            for name, plan in data['marketplace']['gpu_plans'].get(offer['id'], {}).items():
                key = plan['terms'][0]['rate_key']
                for rate in [0, 0.05, 1234.56]:
                    modified = {**plan, 'terms': [{**plan['terms'][0], 'rate': str(rate)}]}
                    actual, _, _ = evaluate_plan(modified, {'quantity': plan['quantity']})
                    expected = gpu_cost({**offer, key: rate, 'availability': 'available'},
                                        **data['presets'][product['unit']][name])
                    assert actual == expected


def test_tax_rounding_and_initial_funding_stay_separate():
    plan = catalog()['marketplace']['tax_plan']
    assert evaluate_plan(plan, {'subtotal': 100, 'tax': 10})[0] == 110
    assert evaluate_plan(plan, {'subtotal': Decimal('0.05'), 'tax': 10})[0] == 0.06
    assert evaluate_plan(plan, {'subtotal': 0, 'tax': 10})[0] == 0


def test_unknown_provider_capabilities_are_not_invented():
    data = catalog()
    for product in data['products']:
        for offer in product['offers']:
            caps = data['marketplace']['capabilities'][offer['id']]
            assert caps['latency_ms'] is None
            assert caps['tokens_second'] is None
            if offer['seller_info'].get('listing_basis') != 'fictional_scenario':
                assert all(caps[key] is None for key in ['json', 'tools', 'no_retention'])


def test_new_offer_templates_cover_every_api_billing_unit():
    data = catalog()
    assert set(data['marketplace']['flat_plans']) == {
        p['unit'] for p in data['products'] if p['kind'] == 'api'
    }
    for unit, plan in data['marketplace']['flat_plans'].items():
        for values in data['presets'][unit].values():
            amount, reason, _ = evaluate_plan(plan, {**values, 'days': 30})
            assert amount is not None and reason is None
