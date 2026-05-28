# Sistema de Gestión de Apelaciones - DGNNA
## Versión Electron (Aplicación de Escritorio)

### 📦 Archivos Generados

Después de ejecutar `npm run dist`, encontrarás en la carpeta `dist-electron`:

1. **`Sistema de Apelaciones DGNNA Setup X.X.X.exe`** ← Instalador para distribuir
2. **`win-unpacked/`** ← Versión portable (sin instalar)

### 🚀 Distribución al Usuario

#### Opción 1: Con Instalador (Recomendado)
1. Enviar el archivo `Sistema de Apelaciones DGNNA Setup.exe` al usuario
2. El usuario ejecuta el instalador
3. Sigue el asistente de instalación
4. La aplicación queda instalada con acceso directo en el escritorio

#### Opción 2: Versión Portable
1. Comprimir la carpeta `win-unpacked` en un ZIP
2. El usuario descomprime donde quiera
3. Ejecuta `Sistema de Apelaciones DGNNA.exe`

### 👤 Instrucciones para el Usuario Final

**INSTALACIÓN:**
1. Hacer doble clic en `Sistema de Apelaciones DGNNA Setup.exe`
2. Aceptar el acuerdo de licencia
3. Elegir carpeta de instalación (o dejar por defecto)
4. Clic en "Instalar"
5. Esperar a que termine
6. Clic en "Finalizar"

**USO DIARIO:**
1. Hacer doble clic en el icono del escritorio "Sistema de Apelaciones"
2. Esperar unos segundos mientras inicia (primera vez puede tardar más)
3. La aplicación se abrirá en una ventana
4. Usar normalmente
5. Para cerrar, cerrar la ventana (X en la esquina)

**PRIMERA EJECUCIÓN:**
- La primera vez que se ejecuta, creará automáticamente la base de datos
- Cargará los datos iniciales (abogados, complejidades, etc.)
- Esto puede tomar 10-20 segundos
- Las siguientes veces iniciará más rápido

**UBICACIÓN DE DATOS:**
- Base de datos: `C:\Users\[Usuario]\AppData\Roaming\Sistema de Apelaciones DGNNA\prisma\apelaciones.db`
- Para hacer respaldo, copiar ese archivo

**DESINSTALACIÓN:**
1. Panel de Control → Programas → Desinstalar un programa
2. Buscar "Sistema de Apelaciones DGNNA"
3. Clic en "Desinstalar"

### 🔧 Para Desarrolladores

**Probar en modo desarrollo:**
```bash
npm run electron
```

**Crear instalador:**
```bash
npm run dist
```

**Solo empaquetar (sin instalador):**
```bash
npm run electron:build
```

### 📊 Tamaño Aproximado

- **Instalador:** ~150-200 MB
- **Aplicación instalada:** ~300-400 MB
- **Base de datos:** Crece según uso (inicial ~100 KB)

### ⚙️ Requisitos del Sistema

- Windows 10 o superior (64-bit)
- 4 GB RAM mínimo
- 500 MB espacio en disco
- Conexión a internet NO requerida (funciona offline)

### 🔄 Actualizaciones

Para actualizar la aplicación:
1. Desinstalar versión anterior (opcional, puede sobrescribir)
2. Instalar nueva versión
3. Los datos se mantienen (están en AppData)

### ⚠️ Notas Importantes

- La aplicación NO requiere conexión a internet
- Todos los datos se guardan localmente
- Cada usuario de Windows tiene su propia base de datos
- Para compartir datos entre usuarios, usar la función de exportar/importar Excel

### 🐛 Solución de Problemas

**La aplicación no inicia:**
- Verificar que no haya otra instancia ejecutándose
- Revisar el Administrador de Tareas y cerrar procesos "Sistema de Apelaciones"

**Error de base de datos:**
- Eliminar la carpeta: `C:\Users\[Usuario]\AppData\Roaming\Sistema de Apelaciones DGNNA`
- Volver a ejecutar la aplicación (recreará la base de datos)

**La ventana se ve en blanco:**
- Esperar 10 segundos (el servidor está iniciando)
- Si persiste, cerrar y volver a abrir

### 📝 Changelog

**Versión 1.0.0** (Enero 2026)
- Versión inicial
- Gestión completa de apelaciones
- Módulo de reportes avanzados
- Exportación a Excel
- Sistema de triaje automático
