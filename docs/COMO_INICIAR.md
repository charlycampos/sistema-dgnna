# 🚀 GUÍA DE INICIO - Sistema de Apelaciones DGNNA

## ⚠️ PROBLEMA IDENTIFICADO

El instalador de Electron tiene un error al empaquetar. Mientras lo resolvemos, usa una de estas alternativas:

---

## ✅ SOLUCIÓN 1: Usar el Script de PowerShell (RECOMENDADO)

### Pasos:

1. **Haz doble clic en:** `INICIAR.bat`
   
   O si prefieres:
   
2. **Click derecho en** `Iniciar_Sistema.ps1` → **Ejecutar con PowerShell**

### ¿Qué hace?
- ✅ Verifica que Node.js esté instalado
- ✅ Instala dependencias si faltan
- ✅ Crea la base de datos en primera ejecución
- ✅ Construye la aplicación
- ✅ Inicia el servidor
- ✅ Abre el navegador automáticamente

### Tiempo de espera:
- **Primera vez:** 3-5 minutos (instala todo)
- **Siguientes veces:** 15-20 segundos

---

## ✅ SOLUCIÓN 2: Inicio Manual (Más rápido para desarrollo)

### Opción A: Desde PowerShell

```powershell
# 1. Abrir PowerShell en la carpeta del proyecto
cd "d:\Usuarios\ccampos\Documents\Python Scripts\asigna_apelaciones\sistema-apelaciones"

# 2. Iniciar el servidor
npm start

# 3. Esperar a ver el mensaje: "Ready in X.Xs"

# 4. Abrir navegador en: http://localhost:3000
```

### Opción B: Desde la terminal de VS Code

```bash
# 1. Abrir terminal (Ctrl + `)

# 2. Ejecutar:
npm start

# 3. Esperar el mensaje "Ready"

# 4. Ctrl + Click en: http://localhost:3000
```

---

## 🔧 SOLUCIÓN 3: Si nada funciona

### Verificar que Node.js esté instalado:

```powershell
node --version
npm --version
```

**Si no aparecen versiones:**
1. Descargar Node.js desde: https://nodejs.org
2. Instalar la versión LTS (recomendada)
3. Reiniciar la computadora
4. Volver a intentar

---

## 📝 NOTAS IMPORTANTES

### Primera ejecución:
- Puede tardar 3-5 minutos
- Se crearán las carpetas `node_modules` y `.next`
- Se creará la base de datos `prisma/apelaciones.db`
- Se cargarán los datos iniciales

### Ejecuciones siguientes:
- Tarda solo 15-20 segundos
- Si el navegador muestra "ERR_CONNECTION_REFUSED":
  - **Espera 10 segundos más**
  - **Recarga la página (F5)**

### Para cerrar el sistema:
- Presiona cualquier tecla en la ventana del script
- O cierra la ventana de PowerShell/CMD
- Esto cerrará el servidor automáticamente

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### El navegador no carga (página en blanco):
1. Espera 15 segundos
2. Recarga la página (F5)
3. Si persiste, cierra todo y vuelve a ejecutar `INICIAR.bat`

### Error "npm-cli.js no encontrado":
- Este error ya está resuelto en los nuevos scripts
- Usa `INICIAR.bat` o `Iniciar_Sistema.ps1`

### El servidor no inicia:
1. Cierra todos los procesos de Node.js:
   ```powershell
   taskkill /F /IM node.exe
   ```
2. Espera 5 segundos
3. Vuelve a ejecutar `INICIAR.bat`

### Puerto 3000 en uso:
```powershell
# Ver qué está usando el puerto 3000
netstat -ano | findstr :3000

# Matar el proceso (reemplaza PID con el número que aparece)
taskkill /F /PID [PID]
```
