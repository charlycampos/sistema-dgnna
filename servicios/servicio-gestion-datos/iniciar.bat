@echo off
title Servicio Gestion de Datos DGNNA (Puerto 8014)
echo =====================================================
echo  Iniciando Servicio Gestion de Datos (Puerto 8014)...
echo  Esquema Oracle: GESTION_DATOS_DB (Suite DSLD / DPNNA CAR)
echo =====================================================
echo.

if exist "..\..\backend\venv\Scripts\activate.bat" (
    call "..\..\backend\venv\Scripts\activate.bat"
)

set PORT=8014
set DATABASE_URL=oracle+oracledb://system:123456@localhost:1521/?service_name=XEPDB1

python main.py
pause
