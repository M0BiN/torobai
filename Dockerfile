FROM python:3.12-slim-bookworm@sha256:34386ef0cb081344d7ec1c103ba398e6e9f64e9ab3a1509accc92a4e24a07258

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UVICORN_PORT=8000 \
    FORWARDED_ALLOW_IPS=""

WORKDIR /app

COPY requirements.txt ./
RUN python -m pip install --no-cache-dir --no-compile --only-binary=:all: -r requirements.txt \
    && groupadd --gid 10001 torobai \
    && useradd --uid 10001 --gid torobai --no-create-home --shell /usr/sbin/nologin torobai

COPY app/ ./app/
COPY chatbot/ ./chatbot/
# Local checkouts may use a private umask; root-owned runtime files must stay readable.
RUN chmod -R u=rwX,go=rX app chatbot

USER 10001:10001
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import json, os, urllib.request; response = urllib.request.urlopen('http://127.0.0.1:' + os.environ['UVICORN_PORT'] + '/api/health', timeout=3); assert json.load(response)['ok'] is True"]

# Chat limits are process-local; keep one worker until shared limits exist.
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--workers", "1", "--timeout-graceful-shutdown", "25", "--no-access-log"]
