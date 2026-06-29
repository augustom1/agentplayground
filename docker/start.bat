@echo off
setlocal EnableDelayedExpansion
echo Starting AgentPlayground...

REM Create .env.local from template if it doesn't exist
if not exist .env.local (
  copy .env.example .env.local
  echo Created .env.local from template.
)

REM Auto-generate AUTH_SECRET if still the placeholder value
findstr /C:"replace-this-with-a-random-32-character-string" .env.local >nul 2>&1
if not errorlevel 1 (
  for /f "delims=" %%G in ('powershell -NoProfile -Command "[System.Guid]::NewGuid().ToString(\"N\") + [System.Guid]::NewGuid().ToString(\"N\")"') do set "NEWSECRET=%%G"
  powershell -NoProfile -Command "(Get-Content '.env.local') -replace 'replace-this-with-a-random-32-character-string', '!NEWSECRET!' | Set-Content '.env.local'"
  echo Generated AUTH_SECRET automatically.
)

docker compose up -d
echo.
echo Waiting for AgentPlayground to be ready...

REM Poll health endpoint — first run can take 60-90s (DB init + image pull)
set WAITED=0
:waitloop
if !WAITED! geq 120 goto timeout_reached
curl -sf http://localhost:3000/api/health >nul 2>&1
if not errorlevel 1 goto ready
timeout /t 3 /nobreak >nul
set /a WAITED=!WAITED!+3
goto waitloop

:ready
echo AgentPlayground is ready!
start http://localhost:3000
goto done

:timeout_reached
echo AgentPlayground is taking longer than expected to start.
echo Try visiting http://localhost:3000 in your browser in a minute.
start http://localhost:3000

:done
echo Run stop.bat to shut it down.
endlocal
