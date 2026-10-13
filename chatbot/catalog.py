"""Public guide context and published coding evidence from the existing catalog."""
import re
from app.market import build_market


def conversation_catalog():
    """Public facts only; effective prices and offer eligibility stay in the UI."""
    catalog = []
    for product in (build_market('api') + build_market('gpu'))[:80]:
        facts = {key: product[key] for key in (
            'id', 'title', 'model_id', 'task', 'context', 'vram', 'open_weights', 'license'
        ) if product.get(key) is not None}
        facts['description'] = product.get('description', '')[:240]
        facts['providers'] = list(dict.fromkeys(offer['seller'] for offer in product['offers']))[:8]
        catalog.append(facts)
    return catalog


def coding_evidence(benchmarks):
    evidence = {}
    for group in benchmarks['groups']:
        if not group.get('measured') or group.get('kind') == 'scenario':
            continue
        metrics = [m for m in group['metrics'] if re.search(r'HumanEval|LiveCodeBench|SWE-bench|Terminal-bench|Aider', m['name'], re.I)]
        for record in group['records']:
            for metric in metrics:
                if record['values'].get(metric['id']) is None:
                    continue
                evidence.setdefault(record['product_id'], []).append({
                    'name': metric['name'], 'key': metric['key'],
                    'source': record.get('source_url') or group['source']['url'],
                    'group': group['id'],
                })
    return evidence
