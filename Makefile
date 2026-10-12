.PHONY: run test test-docker export

run:
	python -m uvicorn app.main:app --reload

test:
	python -m pytest -q tests chatbot/tests
	python scripts/export_catalog.py
	npm test
	node --check app/static/app.js

export:
	python scripts/export_catalog.py

test-docker:
	python scripts/check_container.py
