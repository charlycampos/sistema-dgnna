/**
 * Utilidades de días hábiles para el módulo Ley de Transparencia.
 * Plazo legal: 10 días hábiles desde la fecha de ingreso.
 * Se excluyen sábados, domingos y feriados nacionales peruanos fijos.
 */

// Feriados fijos peruanos (MM-DD)
const FERIADOS_FIJOS = new Set([
  '01-01', // Año Nuevo
  '05-01', // Día del Trabajo
  '06-29', // San Pedro y San Pablo
  '07-28', // Fiestas Patrias
  '07-29', // Fiestas Patrias
  '08-30', // Santa Rosa de Lima
  '10-08', // Combate de Angamos
  '11-01', // Todos los Santos
  '12-08', // Inmaculada Concepción
  '12-09', // Batalla de Ayacucho
  '12-25', // Navidad
])

function esDiaHabil(fecha: Date): boolean {
  const dow = fecha.getDay() // 0=dom, 6=sab
  if (dow === 0 || dow === 6) return false
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')
  return !FERIADOS_FIJOS.has(`${mm}-${dd}`)
}

/**
 * Calcula la fecha límite sumando `dias` días hábiles a `fechaInicio`.
 */
export function calcularPlazoHabiles(fechaInicio: Date, dias = 10): Date {
  const resultado = new Date(fechaInicio)
  let contados = 0
  while (contados < dias) {
    resultado.setDate(resultado.getDate() + 1)
    if (esDiaHabil(resultado)) contados++
  }
  return resultado
}

/**
 * Devuelve los días hábiles restantes hasta `plazo` desde hoy.
 * Negativo = ya venció.
 */
export function diasHabilesRestantes(plazo: Date): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const limite = new Date(plazo)
  limite.setHours(0, 0, 0, 0)

  if (hoy > limite) {
    // Vencido: contar hábiles entre plazo y hoy (negativo)
    let dias = 0
    const cursor = new Date(limite)
    while (cursor < hoy) {
      cursor.setDate(cursor.getDate() + 1)
      if (esDiaHabil(cursor)) dias--
    }
    return dias
  } else {
    let dias = 0
    const cursor = new Date(hoy)
    while (cursor < limite) {
      cursor.setDate(cursor.getDate() + 1)
      if (esDiaHabil(cursor)) dias++
    }
    return dias
  }
}

export type AlertaPlazo = 'vencido' | 'urgente' | 'proximo' | 'normal' | null

/**
 * Clasifica el estado de alerta de un plazo.
 * Retorna null si el registro ya está Atendido.
 */
export function clasificarAlerta(
  plazo: Date | string | null | undefined,
  estado: string
): AlertaPlazo {
  if (estado === 'Atendido' || !plazo) return null
  const restantes = diasHabilesRestantes(new Date(plazo))
  if (restantes < 0)  return 'vencido'
  if (restantes === 0) return 'urgente'
  if (restantes <= 3) return 'proximo'
  return 'normal'
}
