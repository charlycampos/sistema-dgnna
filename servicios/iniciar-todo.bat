@echo off
cd /d "%~dp0"
echo =====================================================
echo  Sistema DGNNA - Arquitectura Microservicios
echo =====================================================
echo.

echo [1/11] Iniciando servicio-auth (puerto 8001)...
start "Auth Service" cmd /k "cd servicio-auth && iniciar.bat"
timeout /t 5 /nobreak >nul

echo [2/11] Iniciando servicio-apelaciones (puerto 8002)...
start "Apelaciones Service" cmd /k "cd servicio-apelaciones && iniciar.bat"
timeout /t 5 /nobreak >nul

echo [3/11] Iniciando servicio-sustracion (puerto 8003)...
start "Sustracion Service" cmd /k "cd servicio-sustracion && iniciar.bat"
timeout /t 5 /nobreak >nul

echo [4/11] Iniciando servicio-sala (puerto 8004)...
start "Sala Service" cmd /k "cd servicio-sala && iniciar.bat"
timeout /t 5 /nobreak >nul

echo [5/11] Iniciando servicio-proyectos-ley (puerto 8005)...
start "Proyectos Ley Service" cmd /k "cd servicio-proyectos-ley && iniciar.bat"
timeout /t 5 /nobreak >nul

echo [6/11] Iniciando servicio-transparencia (puerto 8006)...
start "Transparencia Service" cmd /k "cd servicio-transparencia && iniciar.bat"
timeout /t 5 /nobreak >nul

echo [7/11] Iniciando servicio-poi-pp117 (puerto 8007)...
start "POI-PP117 Service" cmd /k "cd servicio-poi-pp117 && iniciar.bat"
timeout /t 5 /nobreak >nul

echo [8/11] Iniciando servicio-mapa (puerto 8008)...
start "Mapa Service" cmd /k "cd servicio-mapa && iniciar.bat"
timeout /t 5 /nobreak >nul

echo [9/11] Iniciando servicio-prevenir-proteger (puerto 8010)...
start "Prevenir para Proteger Service" cmd /k "cd servicio-prevenir-proteger && iniciar.bat"
timeout /t 5 /nobreak >nul

echo [10/11] Iniciando API Gateway (puerto 8000)...
start "API Gateway" cmd /k "cd api-gateway && iniciar.bat"
timeout /t 5 /nobreak >nul

echo [11/11] Iniciando Frontend Next.js (puerto 3000)...
start "Frontend" cmd /k "cd ..\frontend && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo =====================================================
echo  Sistema iniciado:
echo   Frontend:      http://localhost:3000
echo   Gateway:       http://localhost:8000
echo   Auth:          http://localhost:8001
echo   Apelaciones:   http://localhost:8002
echo   Sustracion:    http://localhost:8003
echo   Sala:          http://localhost:8004
echo   Proyectos Ley: http://localhost:8005
echo   Transparencia: http://localhost:8006
echo   POI-PP117:     http://localhost:8007
echo   Mapa:          http://localhost:8008
echo   Prevenir:      http://localhost:8010
echo.
echo   Health check:  http://localhost:8000/health
echo =====================================================
pause
