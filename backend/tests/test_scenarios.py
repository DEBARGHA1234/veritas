"""
backend/tests/test_scenarios.py

Integration tests asserting all 15 scenarios (S1 - S15).
"""

import pytest
from backend.app.scenarios import SCENARIO_RUNNERS, run_scenario
from backend.app.seed import seed_database


@pytest.fixture(autouse=True)
def setup_clean_state():
    seed_database()
    yield
    seed_database()


@pytest.mark.parametrize("scenario_id", [f"S{i}" for i in range(1, 16)])
def test_scenario(scenario_id):
    res = run_scenario(scenario_id)
    assert res["passed"] is True, f"Scenario {scenario_id} failed: Expected {res['expected_verdict']}, got {res['actual_verdict']} ({res.get('deciding_check')})"
