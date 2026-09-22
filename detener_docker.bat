@echo off
cd /d "%~dp0"
echo =====================================================
echo  Deteniendo contenedores Docker de Sistema DGNNA...
echo =====================================================
echo.

docker compose down

echo.
echo =====================================================
echo  Contenedores detenidos con exito.
echo  Ahora puedes ejecutar iniciar.bat para desarrollo local.
echo =====================================================
pause
