# Guía de Empaquetado - Sistema de Apelaciones

## Preparación para Distribución

### Paso 1: Construir la aplicación para producción

```bash
npm run build
```

Este comando:
- Compila Next.js en modo producción
- Optimiza todos los archivos
- Genera la carpeta `.next` con los archivos listos

### Paso 2: Instalar pkg (si no lo tienes)

```bash
npm install -g pkg
```

### Paso 3: Generar el ejecutable

```bash
npm run package
```

Este comando:
1. Ejecuta `npm run build` automáticamente
2. Empaqueta todo en un ejecutable usando `pkg`
3. Genera `dist/SistemaApelaciones.exe`

### Paso 4: Preparar la carpeta de distribución

Crear manualmente la siguiente estructura:

```
📁 SistemaApelaciones/
├── 📄 SistemaApelaciones.exe  (copiar desde dist/)
├── 📁 .next/                  (copiar toda la carpeta)
├── 📁 node_modules/           (copiar toda la carpeta)
├── 📁 prisma/
│   └── 📄 schema.prisma       (copiar el archivo)
├── 📁 public/                 (copiar toda la carpeta si existe)
└── 📄 README.txt              (ya existe en el proyecto)
```

**IMPORTANTE:** La base de datos (`apelaciones.db`) NO se incluye. Se creará automáticamente en la primera ejecución.

### Paso 5: Comprimir para distribución

1. Comprimir la carpeta `SistemaApelaciones` en un archivo ZIP
2. Nombrar el archivo: `SistemaApelaciones_v1.0.zip`

### Paso 6: Entregar al usuario

El usuario debe:
1. Descomprimir el ZIP en cualquier carpeta de su PC
2. Hacer doble clic en `SistemaApelaciones.exe`
3. Esperar a que se cree la base de datos (primera vez)
4. Usar el sistema normalmente

---

## Método Alternativo: Distribución Simplificada (Sin pkg)

Si `pkg` presenta problemas, puedes distribuir el proyecto completo:

### Estructura a entregar:

```
📁 SistemaApelaciones/
├── 📄 Iniciar_Sistema.bat     (crear este archivo)
├── 📁 [todo el proyecto]
└── 📄 README.txt
```

### Contenido de `Iniciar_Sistema.bat`:

```batch
@echo off
title Sistema de Apelaciones DGNNA
echo ========================================
echo   Sistema de Apelaciones DGNNA
echo ========================================
echo.
echo Iniciando servidor...
echo.

cd /d "%~dp0"

REM Verificar si existe la base de datos
if not exist "prisma\apelaciones.db" (
    echo Primera ejecucion detectada. Creando base de datos...
    call npm run db:push
    call npm run db:seed
)

REM Construir si no existe .next
if not exist ".next" (
    echo Construyendo aplicacion...
    call npm run build
)

REM Iniciar servidor
start /B npm start

REM Esperar 5 segundos
timeout /t 5 /nobreak >nul

REM Abrir navegador
start http://localhost:3000

echo.
echo ========================================
echo   Sistema iniciado correctamente
echo   URL: http://localhost:3000
echo ========================================
echo.
echo Presiona cualquier tecla para detener el servidor...
pause >nul

REM Cerrar servidor
taskkill /F /IM node.exe >nul 2>&1
```

### Requisitos para el usuario (Método Alternativo):
- Node.js instalado (versión 18 o superior)
- Descomprimir el ZIP
- Ejecutar `Iniciar_Sistema.bat`

---

## Notas Importantes

1. **Tamaño del ejecutable:** El archivo .exe pesará aproximadamente 100-150MB porque incluye Node.js completo.

2. **Antivirus:** Algunos antivirus pueden marcar el .exe como sospechoso. Esto es normal con ejecutables generados por `pkg`. El usuario debe agregarlo a excepciones.

3. **Actualizaciones:** Para actualizar, simplemente reemplazar el archivo .exe y las carpetas `.next` y `node_modules`.

4. **Respaldos:** Recordar al usuario que haga copias de `prisma/apelaciones.db` regularmente.

5. **Windows Defender:** Si el sistema no inicia, verificar que Windows Defender no esté bloqueando el ejecutable.
