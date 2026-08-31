@echo off
title Microservicio de Consulta Normativa DGNNA - Puerto 8011
echo Iniciando Servicio de Consulta Normativa (normativa-service)...
python -m uvicorn main:app --host 0.0.0.0 --port 8011 --reload
pause
