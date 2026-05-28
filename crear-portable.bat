@echo off
title Creando Version Portable
color 0B
cls

echo ========================================
echo   Creando Version Portable
echo   Sistema de Apelaciones DGNNA
echo ========================================
echo.

REM Crear carpeta de distribucion
set DIST_DIR=SistemaApelaciones_Portable
if exist "%DIST_DIR%" (
    echo Limpiando carpeta anterior...
    rmdir /s /q "%DIST_DIR%"
)

echo [1/6] Creando estructura de carpetas...
mkdir "%DIST_DIR%"
mkdir "%DIST_DIR%\app"
mkdir "%DIST_DIR%\node"

echo.
echo [2/6] Copiando archivos del proyecto...
xcopy /E /I /Y ".next" "%DIST_DIR%\app\.next" >nul
xcopy /E /I /Y "node_modules" "%DIST_DIR%\app\node_modules" >nul
xcopy /E /I /Y "prisma" "%DIST_DIR%\app\prisma" >nul
xcopy /E /I /Y "public" "%DIST_DIR%\app\public" >nul 2>nul
copy /Y "package.json" "%DIST_DIR%\app\" >nul
copy /Y "next.config.ts" "%DIST_DIR%\app\" >nul

echo.
echo [3/6] Descargando Node.js portable...
echo (Esto puede tomar unos minutos la primera vez)

REM Verificar si ya existe node portable
if not exist "node-portable.zip" (
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip' -OutFile 'node-portable.zip'}"
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] No se pudo descargar Node.js
        echo Por favor descarga manualmente desde: https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip
        pause
        exit /b 1
    )
)

echo.
echo [4/6] Extrayendo Node.js...
powershell -Command "Expand-Archive -Path 'node-portable.zip' -DestinationPath '%DIST_DIR%\node' -Force"
move "%DIST_DIR%\node\node-v20.11.0-win-x64\*" "%DIST_DIR%\node\" >nul
rmdir "%DIST_DIR%\node\node-v20.11.0-win-x64"

echo.
echo [5/6] Creando ejecutable de inicio...

REM Crear el script de inicio
(
echo @echo off
echo title Sistema de Apelaciones DGNNA
echo color 0A
echo cls
echo.
echo ========================================
echo    Sistema de Apelaciones DGNNA
echo    Ministerio de la Mujer
echo ========================================
echo.
echo Iniciando servidor...
echo.
echo.
echo cd /d "%%~dp0app"
echo.
echo REM Verificar si existe la base de datos
echo if not exist "prisma\apelaciones.db" ^(
echo     echo [INFO] Primera ejecucion. Creando base de datos...
echo     echo.
echo     "..\node\npx.cmd" prisma db push --accept-data-loss
echo     echo.
echo     echo Cargando datos iniciales...
echo     "..\node\npm.cmd" run db:seed
echo     echo.
echo     echo [OK] Base de datos creada
echo     echo.
echo ^)
echo.
echo echo [OK] Iniciando servidor...
echo start /B "..\node\node.exe" "..\node\node_modules\npm\bin\npm-cli.js" start
echo.
echo timeout /t 5 /nobreak ^>nul
echo.
echo echo [OK] Abriendo navegador...
echo start http://localhost:3000
echo.
echo echo.
echo echo ========================================
echo echo   Sistema iniciado correctamente
echo echo   URL: http://localhost:3000
echo echo ========================================
echo echo.
echo echo Mantén esta ventana abierta.
echo echo Para cerrar el sistema, presiona cualquier tecla.
echo echo.
echo pause ^>nul
echo.
echo echo.
echo echo Cerrando servidor...
echo taskkill /F /IM node.exe ^>nul 2^>^&1
echo.
echo echo Sistema cerrado.
echo timeout /t 2 /nobreak ^>nul
) > "%DIST_DIR%\Iniciar_Sistema.bat"

echo.
echo [6/6] Creando documentacion...

REM Crear README
(
echo ========================================
echo   SISTEMA DE APELACIONES - DGNNA
echo ========================================
echo.
echo INSTRUCCIONES DE USO:
echo.
echo 1. Hacer doble clic en "Iniciar_Sistema.bat"
echo.
echo 2. Esperar unos segundos mientras se inicia el servidor
echo.
echo 3. El navegador se abrira automaticamente
echo.
echo 4. Para cerrar el sistema, presionar cualquier tecla
echo    en la ventana que se abrio
echo.
echo ========================================
echo.
echo IMPORTANTE:
echo - NO eliminar la carpeta "node" ni "app"
echo - La base de datos se guarda en app\prisma\apelaciones.db
echo - Para hacer respaldo, copiar ese archivo
echo.
echo REQUISITOS:
echo - Windows 10 o superior
echo - 500MB de espacio libre
echo - Navegador web moderno ^(Chrome, Edge, Firefox^)
echo.
echo VERSION: 1.0.0
echo FECHA: Enero 2026
echo.
) > "%DIST_DIR%\LEEME.txt"

echo.
echo ========================================
echo   COMPLETADO
echo ========================================
echo.
echo La version portable se ha creado en:
echo %CD%\%DIST_DIR%
echo.
echo Puedes comprimir esta carpeta en ZIP
echo y distribuirla a los usuarios.
echo.
echo Tamano aproximado: ~150MB
echo.
pause
