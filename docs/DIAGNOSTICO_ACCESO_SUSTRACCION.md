# Diagnóstico Técnico: Acceso al Módulo de Sustracción Internacional

**Fecha:** 2026-08-20  
**Sistema:** DGNNA - Sistema de Gestión  
**Módulos analizados:** Menú principal (`/menu`) y navegación a Sustracción Internacional (`/sustracion-internacional`)

---

## 1. Contexto y Arquitectura Actual

El sistema está ejecutándose con la arquitectura de microservicios:
* **Frontend:** Next.js (App Router) en puerto `3000`.
* **API Gateway:** FastAPI en puerto `8000`.
* **Microservicio Auth:** Puerto `8001`.
* **Microservicio Apelaciones:** Puerto `8002`.
* **Microservicio Sustracción:** Puerto `8003` (`/api/sustracion`).
* **Otros microservicios:** `8004` (Sala), `8005` (Proyectos Ley), `8006` (Transparencia), `8007` (POI-PP117), `8008` (Mapa), `8010` (Prevenir).

---

## 2. Hallazgos del Diagnóstico

### A. Estado `● Rendering...` al hacer clic en el Menú
1. **Mecanismo en `MenuClient.tsx`:**  
   Las tarjetas del menú usan `<button onClick={() => handleClick(modulo)}>` que disparan `router.push('/sustracion-internacional')`.
2. **Comportamiento en Next.js (App Router):**  
   `router.push()` ejecuta una transición asíncrona de React (`useTransition`). Mientras Next.js compila el bundle de la nueva página:
   - La URL en la barra del navegador se mantiene fija en `/menu`.
   - La interfaz no muestra ningún estado de carga visual dentro de la tarjeta.
   - En la esquina inferior izquierda se muestra la notificación interna de desarrollo `● Rendering...`.
3. **Carga del componente `page.tsx`:**  
   `frontend/src/app/sustracion-internacional/page.tsx` es un componente de cliente extenso (+1,370 líneas de código) con 10 sub-pestañas operativas y cálculos reactivos (`deriveCaseFlow`, `useMemo`, `flows`), lo que requiere mayor tiempo de procesamiento inicial que módulos más pequeños.

### B. Guard de Permisos en el Cliente (`page.tsx`)
En `sustracion-internacional/page.tsx` (L328-L332):
```tsx
useEffect(() => {
  if (!meLoading && me && !hasAccess('sustraccion') && !hasAccess('sustracion') && me.rol !== 'admin') {
    router.replace('/menu');
  }
}, [me, meLoading, hasAccess, router]);
```
Si un usuario no administrador ingresa sin tener el permiso asignado o si la sesión cliente tarda en resolver, el guard lo regresa automáticamente al `/menu`.

### C. Consumo de la API de Casos (`fetchCasos`)
En `sustracion-internacional/page.tsx` (L356-L370):
```tsx
const res = await fetch('/api/sustracion');
if (res.ok) {
  const data = await res.json();
  setCasos(data);
}
```
Debe asegurar siempre `Array.isArray(data) ? data : []` para evitar fallos en `casos.filter()` o `casos.map()`.

---

## 3. Plan de Solución Recomendado

1. **Optimizar la navegación en `MenuClient.tsx`:**
   - Usar el componente `<Link href={modulo.ruta}>` de Next.js en lugar de botones con `router.push()`.
   - Esto habilita el *prefetching* automático en segundo plano y hace que el cambio de pantalla sea inmediato.
2. **Blindar el estado de casos:**
   - Asegurar que `casos` se inicialice y mantenga siempre como arreglo en caso de respuestas no estándar.
