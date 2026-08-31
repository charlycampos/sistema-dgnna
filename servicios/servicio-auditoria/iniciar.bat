@echo off
title Microservicio: Auditoria (Puerto 8009)
color 0B
echo ============================================================
echo   Iniciando Microservicio de Auditoria DGNNA (Puerto 8009)
echo ============================================================

if not exist venv (
    echo Creando entorno virtual...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -r requirements.txt -q

python main.py
pause
