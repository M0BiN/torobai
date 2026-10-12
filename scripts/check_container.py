"""Build and check the Compose service without using a provider key."""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
env = {**os.environ, 'PORT': '0', 'OPENROUTER_API_KEY': '',
       'OPENROUTER_MODEL': 'openai/gpt-4.1-mini', 'FORWARDED_ALLOW_IPS': ''}
compose = ['docker', 'compose', '--project-name', f'torobai-check-{os.getpid()}',
           '--file', str(ROOT / 'compose.yaml')]

if shutil.which('docker') is None:
    raise SystemExit('Install Docker with Compose v2 before running this check.')


def run(*args, capture=False):
    return subprocess.run(args, cwd=ROOT, env=env, check=True, text=True,
                          stdout=subprocess.PIPE if capture else None).stdout


def request(path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    with urlopen(Request(base_url + path, data=data,
                         headers={'Content-Type': 'application/json'}), timeout=10) as response:
        return response.read()


# This file would leak through COPY chatbot/ without the ignore rules.
sentinel = ROOT / 'chatbot' / 'static' / f'.env.docker-check-{os.getpid()}'
with sentinel.open('x') as file:
    file.write('DOCKER_TEST_SENTINEL=not-a-real-secret\n')
permission_probe = None
try:
    # A private checkout must still produce assets readable by the runtime UID.
    permission_probe = Path(tempfile.mkdtemp(prefix='docker-permission-check-', dir=ROOT / 'app' / 'static'))
    (permission_probe / 'probe.txt').write_text('private checkout asset\n')
    (permission_probe / 'probe.txt').chmod(0o600)
    run(*compose, 'config', '--quiet')
    run(*compose, 'build', '--pull')
    run(*compose, 'up', '--detach', '--wait', '--wait-timeout', '90')
    container = run(*compose, 'ps', '--quiet', 'web', capture=True).strip()
    base_url = 'http://' + run(*compose, 'port', 'web', '8000', capture=True).strip()

    assert json.loads(request('/api/health'))['ok'] is True
    catalog = json.loads(request('/api/catalog'))
    assert catalog['products'] and catalog['pricing_plans'] and catalog['benchmarks']
    page = request('/').decode()
    assets = set(re.findall(r'(?:src|href)="(/(?:static|chatbot/static)/[^"?#]+)', page))
    assert '/static/app.js' in assets and '/chatbot/static/panel.js' in assets
    for path in sorted(assets):
        assert request(path), path
    assert request('/static/fonts/Vazirmatn.woff2')
    assert request(f'/static/{permission_probe.name}/probe.txt') == b'private checkout asset\n'
    assert json.loads(request('/api/chatbot/status')) == {'available': False}
    offers = json.loads(request('/api/estimate', {'product_id': 'gpt-4o-mini'}))['offers']
    assert any(row['estimate_toman'] is not None for row in offers)
    try:
        request('/api/chatbot/parse', {'text': 'مدل می‌خواهم'})
    except HTTPError as error:
        assert error.code == 503, error.code
    else:
        raise AssertionError('Unconfigured chat must not accept a provider request')

    run('docker', 'exec', container, 'python', '-c', """
import importlib.util
import errno
import os
from pathlib import Path
assert os.geteuid() == 10001
assert importlib.util.find_spec('pytest') is None
assert not list(Path('/app').rglob('.env*'))
assert not Path('/app/chatbot/tests').exists()
for path in Path('/app').glob('*/**/*'):
    assert path.stat().st_uid == 0, path
    assert path.stat().st_mode & 0o022 == 0, path
try:
    Path('/tmp/torobai-write-check').write_text('check')
except OSError as error:
    assert error.errno == errno.EROFS, error
else:
    raise AssertionError('The container filesystem must be read-only')
""")

    # A dummy key checks runtime configuration without making a paid request.
    env['OPENROUTER_API_KEY'] = 'docker-test-not-a-real-key'
    run(*compose, 'up', '--detach', '--force-recreate', '--wait', '--wait-timeout', '90')
    container = run(*compose, 'ps', '--quiet', 'web', capture=True).strip()
    base_url = 'http://' + run(*compose, 'port', 'web', '8000', capture=True).strip()
    assert json.loads(request('/api/chatbot/status')) == {'available': True}

    run(*compose, 'stop', 'web')
    state = json.loads(run('docker', 'inspect', container, capture=True))[0]['State']
    assert state['ExitCode'] == 0 and not state['OOMKilled'], state
    print('Container checks passed: catalog, assets, pricing, chat configuration, read-only non-root runtime and shutdown.')
finally:
    subprocess.run([*compose, 'logs', '--no-color'], cwd=ROOT, env=env, check=False)
    subprocess.run([*compose, 'down', '--remove-orphans'], cwd=ROOT, env=env, check=False)
    sentinel.unlink(missing_ok=True)
    if permission_probe is not None:
        shutil.rmtree(permission_probe)
