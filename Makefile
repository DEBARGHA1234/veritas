.PHONY: setup seed dev test scenarios zk-build clean

setup:
	python -m pip install -r requirements.txt
	cd frontend && npm install
	cd zk && npm install

seed:
	python scripts/make_artifacts.py
	python -m backend.app.seed

dev:
	@echo "Starting VERITAS Backend on :8000 and Frontend on :5173..."
	python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
	cd frontend && npm run dev

test:
	python -m pytest backend/tests

scenarios:
	python scripts/run_scenarios.py

zk-build:
	cd zk && bash build.sh

clean:
	rm -rf data/artifacts data/scratch data/veritas.db
