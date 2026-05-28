@echo off
echo ============================================
echo  Sistema de Apelaciones DGNNA
echo ============================================
echo.

echo [1/2] Iniciando Backend (FastAPI - puerto 8000)...
start "Backend API" cmd /k "cd backend && iniciar.bat"

timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend (Next.js - puerto 3000)...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================
echo  Sistema iniciado:
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Frontend: http://localhost:3000
echo ============================================
