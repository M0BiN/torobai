import pytest

from scripts.export_catalog import embed_code


@pytest.mark.parametrize('stylesheet', [
    '<link rel="stylesheet" href="/static/styles.css">',
    '<link rel="stylesheet" href="/static/styles.css" />',
    "<link\n href = '/static/styles.css'\n rel='stylesheet'\n/>",
])
def test_export_embeds_css_after_html_formatting(stylesheet):
    page = f'''<html><head>{stylesheet}
        <script defer src='/static/ui.js'></script>
        <script src="/static/app.js" defer></script>
        </head><body><main></main></body></html>'''
    result = embed_code(page, 'body { margin: 0; }', '<script>window.ready = true;</script>')
    assert '<style>body { margin: 0; }</style>' in result
    assert '/static/' not in result
    assert '<main></main><script>window.ready = true;</script></body>' in result


def test_export_refuses_to_silently_omit_the_stylesheet():
    with pytest.raises(ValueError, match='stylesheet'):
        embed_code('<html><body></body></html>', 'body {}', '')
