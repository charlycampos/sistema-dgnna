// Definición manual de tipos para coincidir con el esquema y evitar errores de generación

export interface Abogado {
  id: string
  nombre: string
  activo: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ComplejidadJuridica {
  id: string
  nombre: string
  puntos: number
  activo: boolean
}

export interface ExtensionRango {
  id: string
  descripcion: string
  minFolios: number
  maxFolios: number | null
  puntos: number
  activo: boolean
}

export interface Procedencia {
  id: string
  nombre: string
  activo: boolean
}

export interface Revisor {
  id: string
  nombre: string
  activo: boolean
  createdAt: Date
  updatedAt: Date
}

export type Estado = 'Pendiente' | 'Resuelto' | 'Atendido' | 'Observado'

// Para el dashboard
export interface CargaAbogado {
  abogado:        Abogado
  casosActivos:   number
  casosResueltos: number
  casosCerrados:  number
  puntosActivos:  number
}

export interface CargaRevisor {
  revisor:         Revisor
  totalCasos:      number
  casosPendientes: number
  casosResueltos:  number
  casosAtendidos:  number
}

// Apelación con relaciones incluidas
export interface ApelacionConRelaciones {
  id: string
  numeroExpediente: string
  fechaIngreso: Date
  fechaIngresoMIMP: Date | null
  plazoVencimiento: Date | null
  apelante: string
  nnaCar: string | null
  procedencia: string
  documento: string
  asunto: string
  folios: number
  puntosExtension: number
  complejidadId: string
  complejidad: ComplejidadJuridica
  puntosComplejidad: number
  puntosTotal: number
  abogadoId: string
  abogado: Abogado
  revisorId: string | null
  revisor: Revisor | null
  fechaRevisor: Date | string | null
  fechaAsignacionRevisor?: Date | string | null
  fechaAsignacion: Date
  estado: string
  numeroResolucion: string | null
  documentoAtencion: string | null
  cargos: string | null
  observaciones: string | null
  createdAt: Date
  updatedAt: Date
  apelantes?: Array<{
    id?: string
    tipo: 'natural' | 'institucion'
    nombres?: string
    apellidoPaterno?: string
    apellidoMaterno?: string
    institucion?: string
    documento?: string
  }>
  nnas?: Array<{
    id?: string
    tipo: 'natural' | 'institucion'
    nombres?: string
    primerApellido?: string
    segundoApellido?: string
    edad?: number | string | null
    institucion?: string
  }>
}

// Para el formulario
export interface ApelacionFormData {
  numeroExpediente: string
  fechaIngreso: Date
  fechaIngresoMIMP?: Date | null
  plazoVencimiento?: Date | null
  apelante: string
  nnaCar?: string | null
  procedencia: string
  documento: string
  asunto: string
  folios: number
  complejidadId: string
  abogadoId: string
  fechaAsignacion: Date
  estado: Estado
  numeroResolucion?: string
  documentoAtencion?: string
  cargos?: string
  observaciones?: string
}

// Para estadísticas del dashboard
export interface EstadisticasDashboard {
  totalCasos: number
  casosPendientes: number
  casosResueltos: number
  casosAtendidos: number
  casosConPlazoProximo: number   // plazo vencimiento en ≤5 días
  cargaPorAbogado: CargaAbogado[]
  cargaPorRevisor: CargaRevisor[]
  casosPorComplejidad: { nombre: string; cantidad: number }[]
  casosPorProcedencia: { nombre: string; cantidad: number }[]
}

// ─────────────────────────────────────────────
// MÓDULO LEY DE TRANSPARENCIA
// ─────────────────────────────────────────────

export type EstadoTransparencia = 'Pendiente' | 'En Proceso' | 'Atendido'

export interface TransparenciaRegistro {
  id: string
  numeroExpediente: string
  fechaIngreso: string | Date
  documentoIngreso: string | null
  direccion: 'DPNNA' | 'DSLD' | 'DA' | 'DPE' | 'DGNNA'
  estado: EstadoTransparencia
  fechaAtencion: string | Date | null
  asunto: string
  documentoRespuesta: string | null
  categoria: string | null
  plazoVencimiento: string | Date | null
  observaciones: string | null
  creadoPor: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

export interface TransparenciaDashboard {
  total: number
  pendientes: number
  enProceso: number
  atendidos: number
  vencidos: number
  proximosVencer: number
  porDireccion: { nombre: string; cantidad: number }[]
  porCategoria:  { nombre: string; cantidad: number }[]
}

// ─────────────────────────────────────────────
// Interfaces para Reportes Avanzados
export interface FiltrosReporte {
  fechaInicio: Date | null
  fechaFin: Date | null
  periodo: 'hoy' | 'semana' | 'mes' | 'año' | 'personalizado' | 'todos'
}

export interface DatosReporte {
  resumen: {
    total: number
    pendientes: number
    atendidos: number
    promedioAtencionXDias: number
  }
  evolucionSemanal: {
    fecha: string // DD/MM
    cantidad: number
  }[]
  productividadAbogados: {
    nombre: string
    asignados: number
    atendidos: number
    puntos: number
    eficiencia: number // %
  }[]
  distribucionComplejidad: {
    nombre: string
    cantidad: number
    fill: string // color para gráfica
  }[]
  topProcedencias: {
    nombre: string
    cantidad: number
    porcentaje: number
  }[]
}
