@echo off
chcp 65001 >nul
setlocal
title NutriFlow - Arranque completo

REM ============================================================
REM  NutriFlow - Launcher de un clic
REM  Levanta: PostgreSQL (Docker) + API (3001) + Panel (3300) + Web (3000)
REM  No modifica codigo ni diseno; solo inicia los servicios.
REM ============================================================

set "ROOT=E:\nuevo"
set "FITLIFE=%ROOT%\FitLife_v3\fitlife"
set "API=%FITLIFE%\apps\api"
set "WEB=%FITLIFE%\apps\web"
set "DATABASE_URL=postgresql://nutriflow:password123@127.0.0.1:5433/nutriflow"

echo ============================================================
echo    NutriFlow - Levantando la plataforma completa
echo ============================================================
echo.

echo [1/4] Docker + PostgreSQL (contenedor nutriflow-postgres)...
docker info >nul 2>&1
if not errorlevel 1 goto docker_ok
echo    - Docker Desktop no esta activo. Iniciandolo...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo    - Esperando al motor de Docker (puede tardar 1-2 min)...
:waitdocker
timeout /t 5 /nobreak >nul
docker info >nul 2>&1
if errorlevel 1 goto waitdocker
:docker_ok
docker start nutriflow-postgres >nul 2>&1
echo    - PostgreSQL listo en 127.0.0.1:5433
echo.

echo [2/4] API (puerto 3001)...
start "NutriFlow API" /D "%API%" cmd /k "set DATABASE_URL=%DATABASE_URL%&& set PORT=3001&& set NODE_OPTIONS=--max-old-space-size=512&& node src/index.js"

echo [3/4] Panel simple (puerto 3300)...
start "NutriFlow Panel" /D "%ROOT%" cmd /k "node simple-server.js"

echo [4/4] Web admin (puerto 3000)...
start "NutriFlow Web" /D "%WEB%" cmd /k "set NODE_OPTIONS=--max-old-space-size=1024&& .\node_modules\.bin\next.cmd dev -p 3000"

echo.
echo    Esperando a que la web compile...
timeout /t 12 /nobreak >nul
start "" http://localhost:3000/super-admin

echo.
echo ============================================================
echo   Servicios disponibles:
echo     Web admin  : http://localhost:3000/super-admin
echo     API        : http://localhost:3001/health
echo     Panel      : http://localhost:3300
echo     PostgreSQL : 127.0.0.1:5433
echo.
echo   Credenciales demo (Super Admin):
echo     super_admin@nutriflow.com / password123
echo.
echo   Para DETENER: cierra las ventanas
echo   "NutriFlow API", "NutriFlow Panel" y "NutriFlow Web".
echo ============================================================
echo.
pause
