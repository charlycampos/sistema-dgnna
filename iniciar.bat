@echo off
cd /d "%~dp0"
rem La aplicacion actual usa el API Gateway y microservicios.
rem Delegar al iniciador unico evita levantar por error el backend monolitico.
call servicios\iniciar-todo.bat
