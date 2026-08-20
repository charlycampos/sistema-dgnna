@echo off
echo ==================================================
echo  Microservicio: Prevenir para Proteger - Puerto 8010
echo ==================================================

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
if not exist "venv\Scripts\activate.bat" (
    echo Creando entorno virtual...
    %PYTHON% -m venv venv
)
call venv\Scripts\activate.bat
%PYTHON% -m pip install -r requirements.txt --quiet

echo Verificando schema PREVENIR_DB...
%PYTHON% setup_database.py
if %errorlevel% neq 0 (
    echo ERROR: No se pudo crear o validar el schema PREVENIR_DB.
    echo Revisa la conexion Oracle de servicio-auth y vuelve a intentar.
    pause
    exit /b 1
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8010 .*LISTENING" 2^>nul') do (
    taskkill /PID %%p /F >nul 2>&1
)

echo Servidor listo en http://localhost:8010
echo Docs: http://localhost:8010/docs
uvicorn main:app --host 0.0.0.0 --port 8010 --reload
pause
