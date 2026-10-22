"""
scripts/run_scenarios.py

CLI Runner for VERITAS scenarios S1 to S15.
Prints a formatted table and exits 0 if all expected verdicts match, non-zero otherwise.
"""

import sys
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.app.scenarios import run_all_scenarios


def main():
    print("\n" + "=" * 90)
    print(" VERITAS SCENARIO EVALUATION SUITE (S1 - S15)")
    print("=" * 90)
    print(f"{'ID':<5} | {'Scenario':<34} | {'Expected':<13} | {'Actual':<13} | {'Deciding Check':<25} | {'Status'}")
    print("-" * 105)

    results = run_all_scenarios()
    all_passed = True

    for r in results:
        status_str = "[PASS]" if r["passed"] else "[FAIL]"
        if not r["passed"]:
            all_passed = False
        deciding_short = (r.get("deciding_check") or "")[:24]
        print(f"{r['id']:<5} | {r['name'][:34]:<34} | {r['expected_verdict'][:13]:<13} | {r['actual_verdict'][:13]:<13} | {deciding_short:<25} | {status_str}")

    print("=" * 105)
    passed_count = sum(1 for r in results if r["passed"])
    print(f"Summary: {passed_count}/{len(results)} scenarios passed successfully.\n")

    if not all_passed:
        print("ERROR: One or more scenarios did not match expected verdicts.")
        sys.exit(1)

    print("SUCCESS: All 15 scenarios produced expected verdicts.")
    sys.exit(0)


if __name__ == "__main__":
    main()
