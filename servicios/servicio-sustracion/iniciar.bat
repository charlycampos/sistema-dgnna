@echo off
echo ============================================
echo  Microservicio: Sustraccion - Puerto 8003
echo ============================================

set PYTHON=
where py >nul 2>&1
if %errorlevel%==0 ( set PYTHON=py & goto :python_ok )
where python >nul 2>&1
if %errorlevel%==0 ( set PYTHON=python & goto :python_ok )
where python3 >nul 2>&1
if %errorlevel%==0 ( set PYTHON=python3 & goto :python_ok )
echo ERROR: No se encontro Python 3.
pause & exit /b 1

:python_ok
echo Python encontrado: %PYTHON%

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat >nul 2>&1
    pip --version >nul 2>&1
    if %errorlevel% neq 0 rmdir /s /q venv
)
if not exist "venv\Scripts\activate.bat" (
    echo Creando entorno virtual...
    %PYTHON% -m venv venv
)
call venv\Scripts\activate.bat

echo Instalando dependencias...
%PYTHON% -m pip install -r requirements.txt --quiet

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8003 .*LISTENING" 2^>nul') do (
    taskkill /PID %%p /F >nul 2>&1
)

echo.
echo  Servidor listo en http://localhost:8003
echo  Docs:            http://localhost:8003/docs
echo  Presiona Ctrl+C para detener
echo.

uvicorn main:app --host 0.0.0.0 --port 8003 --reload
pause
