# 🎨 GUÍA DE DISEÑO Y SISTEMA DE INTERFAZ (UI/UX) — SISTEMA DGNNA

Este documento define el **Sistema de Diseño Oficial (Design System)** del Sistema Integral DGNNA (MIMP Perú). Establece los lineamientos visuales, paleta cromática, tipografía, componentes e integración ergonómica que deben cumplir **todos los módulos** para garantizar una experiencia de usuario homogénea, accesible y profesional.

---

## 🏛️ 1. Principios de Diseño Institucional

1. **Ergonomía Operativa de Alto Rendimiento:**
   * Las pantallas operativas deben aprovechar el **100% del ancho disponible** (`w-full` o contenedores `max-w-7xl` según la vista) sin márgenes laterales vacíos que reduzcan el espacio de trabajo de los especialistas.
   * Sustituir selectores desplegables tediosos por **botoneras interactivas de 1-clic** con iconos y colores representativos.

2. **Jerarquía Visual Clara y Luminosa:**
   * Fondo general de la aplicación en **Gris Neutro Claro (`bg-slate-50`)**.
   * Tarjetas, contenedores principales y cabeceras en **Blanco Puro (`bg-white`)** con bordes sutiles **`border-slate-200`** y sombras suaves **`shadow-xs` / `shadow-sm`**.
   * **Prohibido el uso de cabeceras oscuras o barras negras desentonadas** en las vistas principales. Todas las cabeceras de módulo deben mantener fondo blanco o gris claro institucional.

3. **Retroalimentación Inmediata:**
   * Badges de estado coloreados, tooltips normativos `ⓘ`, estados de carga (*spinners*) y notificaciones toast (*Sonner*).

---

## 🎨 2. Paleta Cromática y Tokens Semánticos

| Token Semántico | Color Hex | Clases Tailwind (Fondo / Texto / Borde) | Significado Institucional | Uso en la Interfaz |
| :--- | :--- | :--- | :--- | :--- |
| **Primario / Institucional** | `#2563EB` / `#1D4ED8` | `bg-blue-600` / `text-blue-700` / `border-blue-200` | Identidad DGNNA, acciones principales, selección activa | Botones primarios, enlaces activos, pestañas activas |
| **Acento Secundario** | `#4F46E5` / `#4338CA` | `bg-indigo-600` / `text-indigo-700` / `border-indigo-200` | Motor RAG, consulta normativa, inteligencia jurídica | Asistente IA, citas legales, sustentos |
| 🟢 **Éxito / Vigente / Conforme** | `#16A34A` / `#DCFCE7` | `bg-emerald-100` / `text-emerald-800` / `border-emerald-200` | Norma vigente, acuerdo de retorno, requisito completo, CREAR | Badges de vigencia, resoluciones favorables |
| 🔵 **Modificación / En Trámite** | `#3B82F6` / `#DBEAFE` | `bg-blue-100` / `text-blue-800` / `border-blue-200` | Expediente en evaluación, registro modificado, etapa activa | Badges de proceso, filtros seleccionados |
| 🟠 **Alerta / Pendiente / Plazo** | `#D97706` / `#FEF3C7` | `bg-amber-100` / `text-amber-800` / `border-amber-200` | Plazo por vencer, subsanación pendiente, concordancia legal | Avisos de SLA, notas de advertencia |
| 🔴 **Riesgo / Derogado / Vencido** | `#DC2626` / `#FEE2E2` | `bg-rose-100` / `text-rose-800` / `border-rose-200` | Plazo vencido, norma derogada, rechazo, ELIMINAR | Alertas de vencimiento, derogaciones |
| ⚪ **Neutro / Deshabilitado** | `#64748B` / `#F1F5F9` | `bg-slate-100` / `text-slate-700` / `border-slate-200` | No aplica, texto secundario, filtros inactivos | Botones secundarios, badges neutrales |

---

## 📐 3. Estructura de Pantalla Estándar

Todas las pantallas de los módulos deben seguir la siguiente estructura de 3 niveles:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. HEADER DE MÓDULO (bg-white border-b border-slate-200 px-6 py-3.5)   │
│    [← Volver] [Icono Módulo] Nombre del Módulo · Badge Sub-estado       │
│    Acciones Principales: [Buscador] [Filtros] [Botón Primario +]       │
├────────────────────────────────────────────────────────────────────────┤
│ 2. RESUMEN KPI / FILTROS (bg-white rounded-xl border border-slate-200) │
│    [KPI 1: Total]  [KPI 2: En trámite]  [KPI 3: Alertas]  [Botonera]   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. ÁREA DE TRABAJO OPERATIVA (Tablas, Paneles divididos o Visores)     │
│    - Tablas: bg-white rounded-xl border border-slate-200 overflow-hid  │
│    - Paneles RAG: Explorador (Izquierda), Visor (Centro), Chat (Der.)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎛️ 4. Componentes y Patrones UI

### A. Cabecera de Módulo (Header)
```tsx
<header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
  <div className="w-full px-5 py-3 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Link href="/menu" className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition">
        <ArrowLeft className="w-4 h-4" />
      </Link>
      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
        <IconoModulo className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[10px] font-bold tracking-wider text-blue-600 uppercase">Módulo XX · DGNNA</div>
        <h1 className="text-sm font-bold text-slate-900 leading-none">Título del Módulo</h1>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {/* Botones de acción y filtros */}
    </div>
  </div>
</header>
```

### B. Botones de Acción
* **Botón Primario (Azul Institucional):**
  `bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold px-3 py-2 shadow-xs transition flex items-center gap-1.5`
* **Botón Secundario / Neutro:**
  `bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold px-3 py-2 shadow-xs transition flex items-center gap-1.5`
* **Botón de Éxito / Copiar / Concluir (Verde):**
  `bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold px-3 py-2 shadow-xs transition flex items-center gap-1.5`

### C. Badges de Estado (Píldoras)
```tsx
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Vigente
</span>
```

### D. Cajas de Entrada (Inputs y Búsqueda)
```tsx
<div className="relative">
  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
  <input
    type="text"
    placeholder="Buscar..."
    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 shadow-2xs text-slate-800"
  />
</div>
```

### E. Modales y Ventanas Emergentes
* Fondo oscuro con efecto traslúcido: `fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4`
* Contenedor de modal: `bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-5 space-y-4`

---

## 📋 5. Lista de Verificación de Consistencia (Checklist)

Antes de dar por finalizada cualquier vista o módulo, verificar:
- [x] **Fondo general:** `bg-slate-50` y texto principal en `text-slate-900` / `text-slate-800`.
- [x] **Header:** Fondo blanco (`bg-white`) con borde inferior `border-slate-200`, botón de retorno `ArrowLeft` y badge institucional.
- [x] **Bordes y Esquinas:** `rounded-lg` para botones e inputs; `rounded-xl` para tarjetas y modales.
- [x] **Contraste de Citas y Normas:** Citas legales en fondo blanco o `bg-slate-50` con tipografía clara y legible.
- [x] **Navegación:** Integrado en `AppSidebar` y en la cuadrícula de tarjetas de `MenuClient.tsx`.
- [x] **TypeScript:** 0 errores en compilación (`npx tsc --noEmit`).
