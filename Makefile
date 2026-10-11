.PHONY: run test export

run:
	python -m uvicorn app.main:app --reload

test:
	python -m pytest -q tests chatbot/tests
	python scripts/export_catalog.py
	npm test
	node --check app/static/app.js

export:
	python scripts/export_catalog.py
