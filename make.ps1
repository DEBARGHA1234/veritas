param (
    [string]$Target = "help"
)

switch ($Target) {
    "setup" {
        Write-Host "=== Setting up VERITAS dependencies ===" -ForegroundColor Cyan
        python -m pip install -r requirements.txt
        Set-Location frontend; npm install; Set-Location ..
        Set-Location zk; npm install; Set-Location ..
    }
    "seed" {
        Write-Host "=== Generating artifacts and seeding database ===" -ForegroundColor Cyan
        python scripts\make_artifacts.py
        python -m backend.app.seed
    }
    "dev" {
        Write-Host "=== Starting VERITAS Services (:8000 and :5173) ===" -ForegroundColor Cyan
        Start-Process python -ArgumentList "-m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"
        Set-Location frontend; npm run dev
    }
    "test" {
        Write-Host "=== Running Pytest Suite ===" -ForegroundColor Cyan
        python -m pytest backend/tests
    }
    "scenarios" {
        Write-Host "=== Running S1 - S15 Scenarios Suite ===" -ForegroundColor Cyan
        python scripts\run_scenarios.py
    }
    "zk-build" {
        Write-Host "=== Running ZK Circuit Build ===" -ForegroundColor Cyan
        Set-Location zk; bash build.sh; Set-Location ..
    }
    "clean" {
        Write-Host "=== Cleaning database and generated artifacts ===" -ForegroundColor Cyan
        if (Test-Path "data\veritas.db") { Remove-Item "data\veritas.db" -Force }
        if (Test-Path "data\scratch") { Remove-Item "data\scratch" -Recurse -Force }
    }
    Default {
        Write-Host "Usage: .\make.ps1 [setup|seed|dev|test|scenarios|zk-build|clean]"
    }
}
