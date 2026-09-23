@echo off
title Cloudflare D1 Database Setup - BS Express Report
echo ========================================================
echo   BS Express Report - Cloudflare D1 Database Setup
echo ========================================================
echo.

echo [1/3] Checking Cloudflare login...
call npx wrangler whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Please log in to Cloudflare first...
    call npx wrangler login
    if %errorlevel% neq 0 (
        echo [X] Login failed.
        pause
        exit /b 1
    )
)
echo [+] Cloudflare account authenticated!
echo.

echo [2/3] Applying D1 Schema (schema_d1.sql)...
call npx wrangler d1 execute bs-express-db --remote --file=./db/schema_d1.sql
if %errorlevel% neq 0 (
    echo.
    echo [!] Note: If database bs-express-db does not exist yet, create it with:
    echo     npx wrangler d1 create bs-express-db
    echo and update wrangler.toml with the generated database_id.
    pause
    exit /b 1
)

echo.
echo [3/3] Seeding Initial Admin Users & Sample Data (seed_all_d1.sql)...
call npx wrangler d1 execute bs-express-db --remote --file=./db/seed_all_d1.sql

echo.
echo ========================================================
echo   Cloudflare D1 Database Setup Complete!
echo ========================================================
pause

