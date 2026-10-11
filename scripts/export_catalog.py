"""Build a portable catalog with the same UI and Python-calculated scenarios."""
import base64
import json
import mimetypes
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.main import catalog


def embed_code(page, css, scripts):
    # HTML formatting can change whitespace, attribute order and the closing slash.
    page, count = re.subn(
        r'<link\b(?=[^>]*\bhref\s*=\s*[\"\']/static/styles\.css[\"\'])[^>]*>',
        lambda _: '<style>' + css + '</style>', page, flags=re.I,
    )
    if count != 1:
        raise ValueError('Expected exactly one application stylesheet to embed')
    for name in ['ui', 'motion', 'marketplace', 'performance', 'app']:
        page, count = re.subn(
            r'<script\b(?=[^>]*\bsrc\s*=\s*[\"\']/static/' + name
            + r'\.js[\"\'])[^>]*>\s*</script\s*>', '', page, flags=re.I,
        )
        if count != 1 and not (name in {'motion', 'marketplace', 'performance'} and count == 0):
            raise ValueError(f'Expected exactly one {name}.js script to embed')
    page = re.sub(r'<link\b[^>]*href=[\"\']/chatbot/static/chatbot\.css[\"\'][^>]*>', '', page)
    page = re.sub(r'<script\b[^>]*src=[\"\']/chatbot/static/(?:core|panel)\.js[\"\'][^>]*>\s*</script>', '', page)
    # Fonts are already in the inline CSS; a second preload is unnecessary.
    page = re.sub(r'<link\b(?=[^>]*\bas\s*=\s*[\"\']font[\"\'])[^>]*>', '', page, flags=re.I)
    page, count = re.subn(r'</body\s*>', lambda _: scripts + '</body>', page, flags=re.I)
    if count != 1:
        raise ValueError('Expected exactly one body in the export template')
    return page


def build():
    static = ROOT / 'app/static'
    data = catalog()
    assets = {}
    for folder in ['brands', 'fonts']:
        for path in (static / folder).iterdir():
            if path.suffix not in {'.svg', '.png', '.webp', '.woff2'}:
                continue
            mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
            assets[str(path.relative_to(static))] = 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode()
    logo = static / 'logo.svg'
    assets['logo.svg'] = 'data:image/svg+xml;base64,' + base64.b64encode(logo.read_bytes()).decode()
    page = (static / 'index.html').read_text(encoding='utf-8')
    css = (static / 'styles.css').read_text(encoding='utf-8')
    ui = (static / 'ui.js').read_text(encoding='utf-8')
    motion = (static / 'motion.js').read_text(encoding='utf-8')
    marketplace = (static / 'marketplace.js').read_text(encoding='utf-8')
    performance = (static / 'performance.js').read_text(encoding='utf-8')
    app = (static / 'app.js').read_text(encoding='utf-8')
    chatbot = ROOT / 'chatbot/static'
    css += '\n' + (chatbot / 'chatbot.css').read_text(encoding='utf-8')
    guide_code = '\n'.join((chatbot / name).read_text(encoding='utf-8') for name in ['core.js', 'panel.js'])
    inline = lambda obj: json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    # Keep all executable code at the end so the DOM is ready without a server.
    scripts = '<script>window.TOROBAI_CATALOG=' + inline(data) + ';window.TOROBAI_ASSETS=' + inline(assets) + ';</script>'
    scripts += '<script>' + ui + '</script><script>' + motion + '</script><script>' + marketplace + '</script><script>' + performance + '</script><script>' + guide_code + '</script><script>' + app + '</script>'
    page = embed_code(page, css, scripts)
    page = re.sub(r'/static/([A-Za-z0-9_./-]+\.(?:woff2|svg|png|webp))', lambda m: assets[m[1]], page)
    assert '<style>' in page and '/static/styles.css' not in page
    assert not re.search(r'<script\b[^>]*\bsrc\s*=', page, re.I)
    assert '/static/fonts/' not in page
    assert len(data['estimates']) == len(data['products'])
    target = ROOT / 'dist/torobai.html'
    target.parent.mkdir(exist_ok=True)
    target.write_text(page, encoding='utf-8')
    print(f'{target}: {len(data["products"])} products, {len(assets)} local assets, {target.stat().st_size:,} bytes')
    return target


if __name__ == '__main__':
    build()
