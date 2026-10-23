/**
 * Regla del semáforo de metas PP 0117 (documento REGLA · Chris, reunión 21-oct-2026).
 * Única fuente de verdad: la usan la Bandeja de metas, el Dashboard y la Carga mensual.
 *
 *   Cumplimiento = logro ÷ meta esperada del mes × 100 (a 1 decimal)
 *     ≥ 100%        → Avance favorable
 *     90% a < 100%  → Requiere seguimiento
 *     < 90%         → Riesgo de incumplimiento
 *
 *   Meta esperada del mes:
 *     1) la meta MEF del mes (la registrada para ese mes o, si no, la de todo el año);
 *     2) si no hay meta MEF: meta anual × mes ÷ 12, con los umbrales de la tabla del
 *        documento (8.3%, 16.7% … 100% de la meta anual; amarillo desde el 90%).
 */

export type NivelClave = 'fav' | 'seg' | 'rie' | 'pen' | 'sm'

export interface NivelEstilo {
  label: string
  bg: string
  fg: string
  dot: string
  bd: string
  cell: string
  cellFg: string
}

export const NIVELES: Record<NivelClave, NivelEstilo> = {
  fav: { label: 'Avance favorable', bg: '#ECFDF5', fg: '#047857', dot: '#10B981', bd: '#A7F3D0', cell: '#D1FAE5', cellFg: '#065F46' },
  seg: { label: 'Requiere seguimiento', bg: '#FFFBEB', fg: '#92400E', dot: '#F59E0B', bd: '#FDE68A', cell: '#FEF3C7', cellFg: '#92400E' },
  rie: { label: 'Riesgo de incumplimiento', bg: '#FFF1F2', fg: '#BE123C', dot: '#E11D48', bd: '#FECDD3', cell: '#FFE4E6', cellFg: '#9F1239' },
  pen: { label: 'Pendiente de carga', bg: '#F1F5F9', fg: '#475569', dot: '#94A3B8', bd: '#E2E8F0', cell: '#F8FAFC', cellFg: '#64748B' },
  sm: { label: 'Sin meta registrada', bg: '#F1F5F9', fg: '#475569', dot: '#CBD5E1', bd: '#E2E8F0', cell: '#F8FAFC', cellFg: '#64748B' }
}

/** Redondeo a 1 decimal estable frente a errores de coma flotante (37.45 → 37.5). */
export function r1(x: number) {
  return Math.round(x * 10 + 1e-9) / 10
}

export function nivelPorCumplimiento(c: number): NivelClave {
  if (c >= 100) return 'fav'
  if (c >= 90) return 'seg'
  return 'rie'
}

/** Umbrales de la tabla del documento, en % de la meta anual, a 1 decimal. */
export function umbralesMes(mes: number) {
  const exacto = (mes / 12) * 100
  return { esperado: r1(exacto), minimo: r1(exacto * 0.9) }
}

/** Logro frente a la meta MEF del mes. */
export function evaluarConMef(logro: number, metaMes: number) {
  const cumplimiento = r1((logro / metaMes) * 100)
  return { nivel: nivelPorCumplimiento(cumplimiento), cumplimiento, meta: metaMes, brecha: logro - metaMes }
}

/** Sin meta MEF: logro frente a la meta anual repartida mes a mes (tabla del documento). */
export function evaluarConAnual(logro: number, metaAnual: number, mes: number) {
  const { esperado, minimo } = umbralesMes(mes)
  const avance = r1((logro / metaAnual) * 100)
  const nivel: NivelClave = avance >= esperado ? 'fav' : avance >= minimo ? 'seg' : 'rie'
  const meta = (metaAnual * mes) / 12
  return {
    nivel,
    cumplimiento: r1((avance / esperado) * 100),
    meta,
    brecha: logro - meta,
    avanceAnual: avance,
    esperadoAnual: esperado
  }
}

/**
 * Evalúa un logro con la meta disponible. Devuelve null si no hay ninguna meta.
 */
export function evaluarLogro(logro: number, mes: number, metaMef: number | null | undefined, metaAnual: number | null | undefined) {
  if (metaMef != null && metaMef > 0) return { ...evaluarConMef(logro, metaMef), base: 'mef' as const, avanceAnual: 0, esperadoAnual: 0 }
  if (metaAnual != null && metaAnual > 0) return { ...evaluarConAnual(logro, metaAnual, mes), base: 'anual' as const }
  return null
}
