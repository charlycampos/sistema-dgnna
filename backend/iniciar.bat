@echo off
echo ========================================
echo  Backend - Sistema de Apelaciones DGNNA
echo ========================================

REM ── Detectar Python ──────────────────────────────────────────────
set PYTHON=

REM Intentar con "py" (Python Launcher para Windows)
where py >nul 2>&1
if %errorlevel%==0 (
    set PYTHON=py
    goto :python_ok
)

REM Intentar con "python"
where python >nul 2>&1
if %errorlevel%==0 (
    python --version 2>&1 | findstr /i "Python 3" >nul
    if %errorlevel%==0 (
        set PYTHON=python
        goto :python_ok
    )
)

REM Intentar con "python3"
where python3 >nul 2>&1
if %errorlevel%==0 (
    set PYTHON=python3
    goto :python_ok
)

echo.
echo ERROR: No se encontro Python 3 en el sistema.
echo.
echo Soluciones:
echo   1. Descarga Python desde https://www.python.org/downloads/
echo      IMPORTANTE: marca "Add Python to PATH" durante la instalacion
echo   2. O instala desde Microsoft Store buscando "Python 3"
echo   3. Si ya lo tienes instalado, abre una nueva terminal e intenta de nuevo
echo.
pause
exit /b 1

:python_ok
echo Python encontrado: %PYTHON%
%PYTHON% --version

REM ── Crear entorno virtual si no existe o si pip no funciona ────────
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat >nul 2>&1
    pip --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo Venv desactualizado, recreando...
        rmdir /s /q venv
    )
)

if not exist "venv\Scripts\activate.bat" (
    echo Creando entorno virtual...
    %PYTHON% -m venv venv
    if %errorlevel% neq 0 (
        echo ERROR al crear entorno virtual.
        pause
        exit /b 1
    )
)

REM ── Activar entorno virtual ───────────────────────────────────────
call venv\Scripts\activate.bat

REM ── Instalar dependencias ────────────────────────────────────────
echo Instalando dependencias...
%PYTHON% -m pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo ERROR al instalar dependencias.
    pause
    exit /b 1
)

REM ── Crear .env si no existe ──────────────────────────────────────
if not exist ".env" (
    copy .env.example .env
    echo Archivo .env creado desde .env.example
)

echo.
echo ========================================
echo  Servidor listo para iniciar
echo  API:  http://localhost:8000
echo  Docs: http://localhost:8000/docs
echo  Presiona Ctrl+C para detener
echo ========================================
echo.

REM ── Liberar puerto 8000 si hay procesos anteriores ────────────────
echo Verificando procesos en puerto 8000...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000 .*LISTENING" 2^>nul') do (
    echo   Cerrando proceso anterior PID: %%p
    taskkill /PID %%p /F >nul 2>&1
)
echo.

REM ── Limpiar cache de bytecode para cargar modulos frescos ────────
echo Limpiando cache de bytecode Python...
for /d /r . %%d in (__pycache__) do (
    if exist "%%d" rmdir /s /q "%%d"
)
echo Cache limpiado.
echo.

REM ── Iniciar servidor ─────────────────────────────────────────────
echo Iniciando servidor FastAPI...
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

