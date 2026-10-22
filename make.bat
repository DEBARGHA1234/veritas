@echo off
setlocal

set TARGET=%1
if "%TARGET%"=="" set TARGET=help

if "%TARGET%"=="setup" goto setup
if "%TARGET%"=="seed" goto seed
if "%TARGET%"=="dev" goto dev
if "%TARGET%"=="test" goto test
if "%TARGET%"=="scenarios" goto scenarios
if "%TARGET%"=="zk-build" goto zk_build
if "%TARGET%"=="clean" goto clean
goto help

:setup
echo === Setting up VERITAS dependencies ===
python -m pip install -r requirements.txt
cd frontend && npm install && cd ..
cd zk && npm install && cd ..
goto end

:seed
echo === Generating artifacts and seeding database ===
python scripts\make_artifacts.py
python -m backend.app.seed
goto end

:dev
echo === Starting VERITAS Services (:8000 and :5173) ===
start "VERITAS Backend" python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
cd frontend && npm run dev
goto end

:test
echo === Running Pytest Suite ===
python -m pytest backend/tests
goto end

:scenarios
echo === Running S1 - S15 Scenarios Suite ===
python scripts\run_scenarios.py
goto end

:zk_build
echo === Running ZK Circuit Build ===
cd zk
if exist build.sh (
    bash build.sh
) else (
    node tree.js
)
cd ..
goto end

:clean
echo === Cleaning database and generated artifacts ===
if exist data\veritas.db del /f /q data\veritas.db
if exist data\scratch rmdir /s /q data\scratch
goto end

:help
echo Usage: make [setup^|seed^|dev^|test^|scenarios^|zk-build^|clean]
goto end

:end
