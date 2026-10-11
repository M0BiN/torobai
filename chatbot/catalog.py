"""Expose existing published coding evidence as an ordinary catalog filter."""
import re

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
