"""Protect comparability and provenance, not a visual snapshot."""
from app.main import catalog


def test_cohorts_keep_task_unit_identity_and_provenance():
    data = catalog()
    products = {p['id']: p for p in data['products']}
    groups = data['benchmarks']['groups']
    assert len({g['id'] for g in groups}) == len(groups)
    for group in groups:
        rows = group['records']
        assert len({r['product_id'] for r in rows}) == len(rows)
        assert len({(products[r['product_id']]['task'], products[r['product_id']]['unit']) for r in rows}) == 1
        metrics = {m['id']: m for m in group['metrics']}
        assert group['conditions'] and group['recorded_at']
        for row in rows:
            assert row['model_id'] == (products[row['product_id']].get('model_id') or products[row['product_id']]['title'])
            assert set(row['values']) == set(metrics)
            assert all(v is None or isinstance(v, (int, float)) for v in row['values'].values())
        if group['kind'] == 'scenario':
            assert group['measured'] is False
            assert group['source'] is None
            assert 'فرضی' in group['conditions'] and 'اجرا نشده' in group['conditions']
        elif group['kind'] != 'unavailable':
            assert group['source']['url'].startswith('https://')
        else:
            assert not group['measured']
            assert all(v is None for r in rows for v in r['values'].values())
        assert all(m['direction'] in {'higher', 'lower'} and m['unit'] for m in metrics.values())


def test_reported_snapshots_do_not_replace_unknowns_or_vendor_measurements():
    data = catalog()
    groups = {g['id']: g for g in data['benchmarks']['groups']}
    assert groups['gemma4']['records'][0]['values']['mmlu'] == 85.2
    assert groups['qwen-tiny']['records'][0]['values']['mmlu'] == 55.3  # Non-thinking, not 66.5.
    assert groups['embedding']['records'][1]['values']['retrieval'] == 54.60
    hardware = {r['product_id']: r for r in groups['gpu-specs']['records']}
    assert hardware['rtx-3090']['values']['bandwidth'] is None
    assert hardware['h100-80gb']['values']['power'] is None  # Form factor is not specified.
    assert not groups['gpu-specs']['measured']
    assert all(c['tokens_second'] is None and c['latency_ms'] is None
               for c in data['marketplace']['capabilities'].values())


def test_every_catalog_identity_has_an_audited_evaluation_profile():
    data = catalog()
    profiles = data['benchmarks']['profiles']
    groups = {g['id']: g for g in data['benchmarks']['groups']}
    assert set(profiles) == {p['id'] for p in data['products']}
    for product in data['products']:
        profile = profiles[product['id']]
        assert profile['model_id'] == (product.get('model_id') or product['title'])
        assert profile['task'] == product['task']
        assert profile['reviewed_at'] and profile['note'] and profile['group_ids']
        own = [groups[g] for g in profile['group_ids']]
        assert all(any(r['product_id'] == product['id'] for r in g['records']) for g in own)
        if profile['status'] == 'published':
            assert profile['source_urls']
            assert any(g['kind'] in {'publisher_report', 'research_report'} and g['measured'] for g in own)
        if profile['status'] == 'scenario':
            assert all(not g['measured'] for g in own)
    assert {p for p, v in profiles.items() if v['status'] == 'unavailable'} == {
        'whisper-1', 'tts-1', 'hezar-crnn-fa', 'gtx-1660s', 'rtx-family'
    }


def test_exact_versions_and_metrics_do_not_merge_unlike_tests():
    groups = {g['id']: g for g in catalog()['benchmarks']['groups']}
    def record(group, product):
        return next(r for r in groups[group]['records'] if r['product_id'] == product)
    assert record('gemma3-it','gemma-3-12b')['values']['gpqa-diamond'] == 40.9
    assert record('gemma4','gemma-4-12b')['values']['mmlu'] == 77.2
    assert record('qwen36','qwen3.6-27b')['values']['mmlu-pro'] == 86.2
    assert record('qwen38-flash','qwen3.8-27b')['values']['gpqa-diamond'] == 89.2
    assert record('qwen38-max','qwen3.8-max')['values']['gpqa-diamond'] == 92.6
    assert record('decider','decider-2b')['evaluated_version'].startswith('v11')
    assert record('decider','decider-4b')['values']['decider-heldout'] == 78.4
    assert record('laya-decision','laya')['values']['typed-laya'] == 36.2
    assert record('gpt4o-snapshots','gpt-4o-mini')['values']['gpqa-diamond'] == 40.2
    assert 'gpqa-main' not in record('gpt4o-snapshots','gpt-4o')['values']
    assert record('gpt4o-snapshots','gpt-4o')['evaluated_version'] == 'gpt-4o-2024-08-06'
    assert record('whisper-fa','whisper-fa-cv17')['values']['wer-cv17-publisher'] == 21.43
    assert record('parsinlu-translation','parsinlu-en-fa')['values']['bleu-mizan-mofid'] == 4.957
    assert record('image-geneval','flux-2-klein-4b')['values']['geneval-prism'] == 81.9
    assert not any(r['product_id']=='parsinlu-en-fa' for g in groups.values()
                   if g['kind']=='scenario' for r in g['records'])
    metric_keys = {m['key'] for g in groups.values() for m in g['metrics']}
    assert {'mmlu','mmlu-pro','gpqa-diamond','hle','hle-verified'} <= metric_keys
    for g in groups.values():
        if g['kind'] == 'scenario':
            assert all(m['key'].startswith('scenario-') for m in g['metrics'])
