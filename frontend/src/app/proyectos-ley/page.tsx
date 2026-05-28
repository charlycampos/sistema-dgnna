'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Plus, X, FileText, LayoutGrid,
  Building2, CheckCircle, ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { useMe } from '@/lib/use-me'

// ── TIPOS ──────────────────────────────────────────────────────────────

type TipoEvento = 'ingreso' | 'derivacion' | 'informe' | 'opinion_final' | 'reingreso'

type CatItem = { id: string; nombre: string; activo: boolean }
type CatCongresista = CatItem & { partido: string }

type Catalogos = {
  comisiones: CatItem[]
  congresistas: CatCongresista[]
  tiposOpinion: CatItem[]
  direcciones: CatItem[]
  profesionales: CatItem[]
}

type PlEvento = {
  id: string
  tipo: TipoEvento
  fecha: string
  documento?: string
  expediente?: string
  direcciones?: string[]
  profesionales?: string[]
  direccionInforme?: string
  numeroInforme?: string
  opinionDireccion?: string
  fechaSalidaDireccion?: string
  opinionFinal?: string
  fechaSalidaDGNNA?: string
  memoNota?: string
  observaciones?: string
  registradoPor?: string
  createdAt: string
}

type ProyectoLey = {
  id: string
  numeroPL: string
  expediente: string
  documento: string
  comisionId?: string
  comision: string
  congresistaId?: string
  congresista: string
  partido: string
  sumilla: string
  tema: string
  opinion: string
  estado: 'en_proceso' | 'emitido' | 'archivado'
  estadoCongresoComision?: string
  observaciones?: string
  eventos: PlEvento[]
  creadoEn: string
}

// ── MAPPER API → TIPO FRONTEND ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiPL(api: any): ProyectoLey {
  return {
    id: api.id,
    numeroPL: api.numeroPL ?? '',
    expediente: api.expediente ?? '',
    documento: api.documento ?? '',
    comisionId: api.comisionId ?? undefined,
    comision: api.comision?.nombre ?? '',
    congresistaId: api.congresistaId ?? undefined,
    congresista: api.congresista?.nombre ?? '',
    partido: api.congresista?.partido ?? '',
    sumilla: api.sumilla ?? '',
    tema: api.tema ?? '',
    opinion: api.opinion ?? '',
    estado: (api.estado ?? 'en_proceso') as ProyectoLey['estado'],
    estadoCongresoComision: api.estadoCongreso ?? '',
    observaciones: api.observaciones ?? '',
    creadoEn: api.createdAt ?? '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventos: (api.eventos ?? []).map((ev: any): PlEvento => ({
      id: ev.id,
      tipo: ev.tipo as TipoEvento,
      fecha: ev.fecha ?? '',
      documento: ev.documento ?? undefined,
      expediente: ev.expediente ?? undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      direcciones: (ev.direcciones ?? []).map((d: any) => d.nombre ?? d),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profesionales: (ev.profesionales ?? []).map((p: any) => p.nombre ?? p),
      direccionInforme: ev.direccionInforme ?? undefined,
      numeroInforme: ev.numeroInforme ?? undefined,
      opinionDireccion: ev.opinionDireccion ?? undefined,
      fechaSalidaDireccion: ev.fechaSalidaDireccion ?? undefined,
      opinionFinal: ev.opinionFinal ?? undefined,
      fechaSalidaDGNNA: ev.fechaSalidaDGNNA ?? undefined,
      memoNota: ev.memoNota ?? undefined,
      observaciones: ev.observaciones ?? undefined,
      registradoPor: ev.registradoPor ?? undefined,
      createdAt: ev.createdAt ?? '',
    })),
  }
}

// ── HELPERS ────────────────────────────────────────────────────────────

function opinionColors(op: string) {
  if (op === 'No viable')           return { bg: '#FEE2E2', color: '#DC2626', border: '#FECACA', label: 'No viable' }
  if (op === 'Viable')              return { bg: '#DCFCE7', color: '#16A34A', border: '#BBF7D0', label: 'Viable' }
  if (op?.startsWith('Viable con')) return { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A', label: op }
  if (op === 'No se emite opinión') return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: op }
  return { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1', label: op || 'Pendiente' }
}

function estadoColors(estado: string) {
  if (estado === 'en_proceso') return { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', label: 'En proceso' }
  if (estado === 'emitido')    return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: 'Emitido' }
  return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: estado }
}

function tipoEventoConfig(tipo: TipoEvento) {
  const map: Record<TipoEvento, { label: string; icon: string; color: string; badgeBg: string; badgeColor: string }> = {
    ingreso:       { label: 'Ingreso',         icon: '📥', color: '#2563EB', badgeBg: '#DBEAFE', badgeColor: '#1D4ED8' },
    derivacion:    { label: 'Derivación',       icon: '📤', color: '#8B5CF6', badgeBg: '#EDE9FE', badgeColor: '#7C3AED' },
    informe:       { label: 'Informe',          icon: '📋', color: '#10B981', badgeBg: '#DCFCE7', badgeColor: '#16A34A' },
    opinion_final: { label: 'Opinión final',    icon: '✅', color: '#EF4444', badgeBg: '#FEE2E2', badgeColor: '#DC2626' },
    reingreso:     { label: 'Reingreso',        icon: '🔄', color: '#F59E0B', badgeBg: '#FEF3C7', badgeColor: '#D97706' },
  }
  return map[tipo]
}

function formatFecha(f: string): string {
  if (!f) return '—'
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const [y, m, d] = f.split('-')
  if (!y || !m || !d) return f
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`
}

function today() { return new Date().toISOString().split('T')[0] }

// ── BADGE ──────────────────────────────────────────────────────────────

function Badge({ label, bg, color, border }: { label: string; bg: string; color: string; border?: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: bg, color, border: `1px solid ${border ?? bg}`, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

// ── BARRA DE PROGRESO ──────────────────────────────────────────────────

function ProgresoBar({ eventos }: { eventos: PlEvento[] }) {
  const tipos = eventos.map(e => e.tipo)
  const steps = [
    { label: 'Ingreso',       done: tipos.some(t => t === 'ingreso' || t === 'reingreso') },
    { label: 'Derivación',    done: tipos.includes('derivacion') },
    { label: 'En revisión',   done: tipos.includes('informe') },
    { label: 'Informe(s)',    done: tipos.includes('informe') },
    { label: 'Opinión DGNNA', done: tipos.includes('opinion_final') },
  ]
  const lastDone = steps.reduce((acc, s, i) => s.done ? i : acc, -1)
  return (
    <div style={{ padding: '12px 22px', borderBottom: '1px solid #E2E8F0', background: '#FAFBFD', flexShrink: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Progreso del expediente</div>
      <div style={{ position: 'relative', display: 'flex' }}>
        <div style={{ position: 'absolute', top: 11, left: 11, right: 11, height: 2, background: '#E2E8F0', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 11, left: 11, height: 2, background: '#2563EB', zIndex: 1, width: lastDone < 0 ? 0 : `calc(${(lastDone / (steps.length - 1)) * 100}% - 0px)`, transition: 'width .4s ease-out' }} />
        {steps.map((s, i) => {
          const isActive = i === lastDone + 1
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, position: 'relative', zIndex: 2 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${s.done || isActive ? '#2563EB' : '#E2E8F0'}`, background: s.done ? '#2563EB' : isActive ? '#EFF6FF' : '#fff', boxShadow: isActive ? '0 0 0 4px #EFF6FF' : undefined, transition: 'all .3s' }}>
                {s.done ? <span style={{ color: '#fff', fontSize: 10, fontWeight: 800 }}>✓</span> : <span style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? '#2563EB' : '#E2E8F0', display: 'block' }} />}
              </div>
              <div style={{ fontSize: 9, fontWeight: s.done ? 700 : isActive ? 700 : 500, color: s.done ? '#16A34A' : isActive ? '#2563EB' : '#94A3B8', textAlign: 'center', lineHeight: 1.3, maxWidth: 65 }}>{s.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── TARJETA PL (sidebar) ───────────────────────────────────────────────

function PLCard({ pl, active, onClick }: { pl: ProyectoLey; active: boolean; onClick: () => void }) {
  const op = opinionColors(pl.opinion)
  const est = estadoColors(pl.estado)
  const N2 = '#1E3A5F'
  return (
    <div onClick={onClick} style={{ padding: '11px 13px', marginBottom: 3, borderRadius: 8, cursor: 'pointer', background: active ? 'rgba(255,255,255,.12)' : 'transparent', border: `1px solid ${active ? 'rgba(255,255,255,.18)' : 'transparent'}`, borderLeft: `3px solid ${active ? '#2563EB' : 'transparent'}`, transition: 'all .12s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3, gap: 6 }}>
        <span style={{ color: '#93C5FD', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{pl.numeroPL}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: op.bg, color: op.color, whiteSpace: 'nowrap', flexShrink: 0 }}>{op.label || 'Pendiente'}</span>
      </div>
      <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 11, lineHeight: 1.4, marginBottom: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{pl.sumilla}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{pl.comision}</span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: pl.estado === 'en_proceso' ? 'rgba(251,191,36,.2)' : 'rgba(255,255,255,.08)', color: pl.estado === 'en_proceso' ? '#FCD34D' : 'rgba(255,255,255,.4)' }}>{est.label}</span>
      </div>
    </div>
  )
}

// ── TAB: DATOS DEL PL ──────────────────────────────────────────────────

function DatosTab({ pl, catalogos, onChange, onGuardar, hasPending }: {
  pl: ProyectoLey
  catalogos: Catalogos
  onChange: (field: string, val: string) => void
  onGuardar: () => void
  hasPending: boolean
}) {
  const BR = '#E2E8F0'; const TX3 = '#94A3B8'; const N2 = '#1E3A5F'
  const inpS: React.CSSProperties = { width: '100%', padding: '7px 10px', border: `1.5px solid ${BR}`, borderRadius: 7, fontSize: 13, color: '#0F172A', background: '#FAFBFD', outline: 'none' }
  const selS: React.CSSProperties = { ...inpS, cursor: 'pointer' }
  const taS: React.CSSProperties = { ...inpS, resize: 'none' as const }

  const Sec = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
    <div style={{ gridColumn: 'span 4', background: '#F1F5F9', padding: '7px 13px', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: N2 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.06em' }}>{title}</span>
    </div>
  )

  const Cell = ({ label, field, type = 'text', opts, span = 1, readOnly = false }: {
    label: string; field: string; type?: string; opts?: {value: string; label: string}[]; span?: number; readOnly?: boolean
  }) => {
    const val = ((pl as unknown as Record<string, string>)[field]) ?? ''
    return (
      <div style={{ gridColumn: `span ${span}`, padding: '10px 13px', borderRight: `1px solid ${BR}`, borderBottom: `1px solid ${BR}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>{label}</div>
        {type === 'select' ? (
          <select value={val} onChange={e => onChange(field, e.target.value)} style={selS}>
            <option value="">—</option>
            {opts?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea rows={3} value={val} onChange={e => onChange(field, e.target.value)} style={taS} />
        ) : (
          <input type={type} value={val} onChange={e => onChange(field, e.target.value)} readOnly={readOnly}
            style={{ ...inpS, background: readOnly ? '#F1F5F9' : '#FAFBFD', color: readOnly ? '#64748B' : '#0F172A' }} />
        )}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Sec title="Identificación del PL" icon={<FileText size={13} color={N2} />} />
        <Cell label="Nº PL / Año" field="numeroPL" span={2} />
        <Cell label="Expediente DGNNA" field="expediente" span={2} />
        <Cell label="Documento de ingreso (Oficio)" field="documento" span={4} />

        <Sec title="Origen" icon={<Building2 size={13} color={N2} />} />
        <Cell label="Comisión del Congreso" field="comisionId" type="select"
          opts={catalogos.comisiones.map(c => ({ value: c.id, label: c.nombre }))} span={2} />
        <Cell label="Congresista proponente" field="congresistaId" type="select"
          opts={catalogos.congresistas.map(c => ({ value: c.id, label: c.nombre }))} span={2} />
        <Cell label="Partido político" field="partido" readOnly span={2} />

        <Sec title="Contenido del Proyecto" icon={<FileText size={13} color={N2} />} />
        <Cell label="Sumilla" field="sumilla" span={4} />
        <Cell label="Tema / Descripción extendida" field="tema" type="textarea" span={4} />

        <Sec title="Estado en el Congreso" icon={<Building2 size={13} color={N2} />} />
        <Cell label="Comisión donde se encuentra actualmente" field="estadoCongresoComision" span={3} />
        <Cell label="Observaciones generales" field="observaciones" type="textarea" span={4} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 22px' }}>
        <button onClick={() => onChange('_reset', '')} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#F9FAFB', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={onGuardar} disabled={!hasPending} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: hasPending ? '#1E3A5F' : '#CBD5E1', color: '#fff', fontSize: 13, fontWeight: 700, cursor: hasPending ? 'pointer' : 'default' }}>
          Guardar cambios
        </button>
      </div>
    </div>
  )
}

// ── TAB: HISTORIAL DE EVENTOS ──────────────────────────────────────────

function FieldItem({ label, val, highlight }: { label: string; val?: string | null; highlight?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</div>
      <div style={{ fontSize: 12, color: highlight ?? '#0F172A', fontWeight: highlight ? 700 : 500 }}>{val ?? '—'}</div>
    </div>
  )
}

function EventosTab({ pl, onAddEvento }: { pl: ProyectoLey; onAddEvento: () => void }) {
  const sorted = [...pl.eventos].sort((a, b) => a.fecha.localeCompare(b.fecha))
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
        <div style={{ position: 'relative', paddingLeft: 32 }}>
          <div style={{ position: 'absolute', left: 10, top: 4, bottom: 4, width: 2, background: '#E2E8F0', borderRadius: 99 }} />
          {sorted.map(ev => {
            const cfg = tipoEventoConfig(ev.tipo)
            const opColor = ev.opinionDireccion === 'No viable' || ev.opinionFinal === 'No viable' ? '#DC2626'
              : ev.opinionDireccion === 'Viable' || ev.opinionFinal === 'Viable' ? '#16A34A' : '#D97706'
            return (
              <div key={ev.id} style={{ position: 'relative', marginBottom: 20 }}>
                <div style={{ position: 'absolute', left: -26, top: 5, width: 14, height: 14, borderRadius: '50%', background: cfg.color, border: '2px solid #fff', boxShadow: `0 0 0 2px ${cfg.color}` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <span style={{ fontSize: 15 }}>{cfg.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{cfg.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: cfg.badgeBg, color: cfg.badgeColor }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto' }}>{formatFecha(ev.fecha)}</span>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 9, padding: '10px 13px', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {(ev.tipo === 'ingreso') && <><FieldItem label="Documento" val={ev.documento} /><FieldItem label="Expediente" val={ev.expediente} />{ev.registradoPor && <FieldItem label="Registrado por" val={ev.registradoPor} />}</>}
                    {(ev.tipo === 'reingreso') && <><FieldItem label="Documento" val={ev.documento} /><FieldItem label="Expediente" val={ev.expediente} />{ev.observaciones && <FieldItem label="Motivo / Observación" val={ev.observaciones} />}</>}
                    {(ev.tipo === 'derivacion') && <><FieldItem label="Dirección(es)" val={ev.direcciones?.join(' · ')} /><FieldItem label="Profesional(es)" val={ev.profesionales?.join(' · ')} /></>}
                    {(ev.tipo === 'informe') && <><FieldItem label="Dirección" val={ev.direccionInforme} /><FieldItem label="Informe" val={ev.numeroInforme} /><FieldItem label="Opinión" val={ev.opinionDireccion} highlight={opColor} />{ev.fechaSalidaDireccion && <FieldItem label="Fecha salida dirección" val={formatFecha(ev.fechaSalidaDireccion)} />}</>}
                    {(ev.tipo === 'opinion_final') && <><FieldItem label="Opinión DGNNA" val={ev.opinionFinal} highlight={opColor} />{ev.fechaSalidaDGNNA && <FieldItem label="Fecha salida DGNNA" val={formatFecha(ev.fechaSalidaDGNNA)} />}{ev.memoNota && <FieldItem label="Memo / Nota" val={ev.memoNota} />}</>}
                    {ev.observaciones && ev.tipo !== 'reingreso' && <FieldItem label="Observaciones" val={ev.observaciones} />}
                  </div>
                </div>
              </div>
            )
          })}
          {sorted.length === 0 && <div style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8', fontSize: 13 }}>Sin eventos registrados aún</div>}
        </div>
      </div>
      <div style={{ padding: '14px 22px', borderTop: '1px solid #E2E8F0', background: '#fff', flexShrink: 0 }}>
        <button onClick={onAddEvento} style={{ width: '100%', background: '#EFF6FF', border: '1.5px dashed #93C5FD', color: '#2563EB', borderRadius: 9, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Plus size={16} /> Registrar nuevo evento
        </button>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 5 }}>Ingreso · Derivación · Informe de Dirección · Opinión Final DGNNA · Reingreso</div>
      </div>
    </div>
  )
}

// ── MODAL: NUEVO PL ────────────────────────────────────────────────────

function NuevoPLModal({ catalogos, onSave, onClose }: {
  catalogos: Catalogos
  onSave: (data: Record<string, string>) => Promise<void>
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({ numeroPL: '', expediente: '', documento: '', comisionId: '', congresistaId: '', partido: '', sumilla: '', tema: '', fechaIngreso: today() })
  const set = (k: string) => (v: string) => setF(p => ({ ...p, [k]: v }))
  const inpS: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#0F172A', background: '#F9FAFB', outline: 'none' }
  const selS: React.CSSProperties = { ...inpS, cursor: 'pointer' }
  const Lbl = ({ text }: { text: string }) => <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{text}</label>

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(10,20,40,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Registrar nuevo Proyecto de Ley</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Proyectos de Ley · DGNNA</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><Lbl text="Nº PL / Año" /><input value={f.numeroPL} onChange={e => set('numeroPL')(e.target.value)} placeholder="ej. 12742/2025-CR" style={inpS} /></div>
          <div><Lbl text="Expediente DGNNA" /><input value={f.expediente} onChange={e => set('expediente')(e.target.value)} placeholder="ej. 2025-0053153" style={inpS} /></div>
          <div style={{ gridColumn: '1/-1' }}><Lbl text="Documento de ingreso (Oficio)" /><input value={f.documento} onChange={e => set('documento')(e.target.value)} placeholder="ej. Oficio Múltiple N° D000981-2025-PCM-SC" style={inpS} /></div>
          <div>
            <Lbl text="Comisión del Congreso" />
            <select value={f.comisionId} onChange={e => set('comisionId')(e.target.value)} style={selS}>
              <option value="">Seleccionar comisión…</option>
              {catalogos.comisiones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <Lbl text="Congresista proponente" />
            <select value={f.congresistaId} onChange={e => {
              const id = e.target.value
              const cong = catalogos.congresistas.find(c => c.id === id)
              setF(p => ({ ...p, congresistaId: id, partido: cong?.partido ?? '' }))
            }} style={selS}>
              <option value="">Seleccionar…</option>
              {catalogos.congresistas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div><Lbl text="Partido político" /><input value={f.partido} readOnly placeholder="Se completa automáticamente" style={{ ...inpS, background: '#F1F5F9', color: '#64748B' }} /></div>
          <div><Lbl text="Fecha de ingreso a DGNNA" /><input type="date" value={f.fechaIngreso} onChange={e => set('fechaIngreso')(e.target.value)} style={inpS} /></div>
          <div style={{ gridColumn: '1/-1' }}><Lbl text="Sumilla del proyecto" /><input value={f.sumilla} onChange={e => set('sumilla')(e.target.value)} placeholder="Descripción breve del proyecto de ley…" style={inpS} /></div>
          <div style={{ gridColumn: '1/-1' }}><Lbl text="Tema / Descripción extendida" /><textarea rows={3} value={f.tema} onChange={e => set('tema')(e.target.value)} placeholder="¿Qué propone este proyecto de ley?" style={{ ...inpS, resize: 'none' }} /></div>
        </div>
        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#F9FAFB', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button disabled={saving} onClick={async () => {
            if (!f.numeroPL || !f.sumilla) { toast.error('Complete el Nº PL y la sumilla para continuar.'); return }
            setSaving(true)
            await onSave(f)
            setSaving(false)
          }} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: saving ? '#93C5FD' : '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,.35)' }}>
            {saving ? 'Guardando…' : 'Registrar PL'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MODAL: NUEVO EVENTO ────────────────────────────────────────────────

const TIPOS_EV = [
  { tipo: 'ingreso'       as TipoEvento, icon: '📥', name: 'Ingreso',              desc: 'Llegó un nuevo documento del Congreso al DGNNA' },
  { tipo: 'derivacion'    as TipoEvento, icon: '📤', name: 'Derivación interna',   desc: 'Se envía a una o más Direcciones con profesional asignado' },
  { tipo: 'informe'       as TipoEvento, icon: '📋', name: 'Informe de Dirección', desc: 'Una Dirección emite su informe con opinión técnica' },
  { tipo: 'opinion_final' as TipoEvento, icon: '✅', name: 'Opinión final DGNNA',  desc: 'Se emite la opinión institucional oficial al Congreso' },
  { tipo: 'reingreso'     as TipoEvento, icon: '🔄', name: 'Reingreso',            desc: 'El PL vuelve del Congreso con observaciones o nuevo documento' },
]

type EventoApiPayload = {
  tipo: string; fecha: string; documento?: string; expediente?: string
  observaciones?: string; registradoPor?: string
  fechaSalidaDireccion?: string; direccionIds?: string[]; profesionalIds?: string[]
  numeroInforme?: string; opinionDireccion?: string; direccionInforme?: string
  opinionFinal?: string; fechaSalidaDGNNA?: string; memoNota?: string
}

function NuevoEventoModal({ catalogos, onSave, onClose }: {
  catalogos: Catalogos
  onSave: (ev: EventoApiPayload) => Promise<void>
  onClose: () => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [tipo, setTipo] = useState<TipoEvento | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{
    fecha: string; documento?: string; expediente?: string; observaciones?: string
    direccionIds: string[]; profesionalIds: string[]
    direccionInformeId?: string; opinionDireccion?: string; numeroInforme?: string; fechaSalidaDireccion?: string
    opinionFinal?: string; fechaSalidaDGNNA?: string; memoNota?: string
  }>({ fecha: today(), direccionIds: [], profesionalIds: [] })

  const set = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))
  const toggleDirId = (id: string) => setForm(p => ({ ...p, direccionIds: p.direccionIds.includes(id) ? p.direccionIds.filter(x => x !== id) : [...p.direccionIds, id] }))
  const toggleProfId = (id: string) => setForm(p => ({ ...p, profesionalIds: p.profesionalIds.includes(id) ? p.profesionalIds.filter(x => x !== id) : [...p.profesionalIds, id] }))

  const inpS: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, color: '#0F172A', background: '#F9FAFB', outline: 'none' }
  const selS: React.CSSProperties = { ...inpS, cursor: 'pointer' }
  const Lbl = ({ text }: { text: string }) => <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>{text}</label>

  const tiposOpinionNombres = catalogos.tiposOpinion.map(t => t.nombre)
  const dirNombreById = (id: string) => catalogos.direcciones.find(d => d.id === id)?.nombre ?? id

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(10,20,40,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{step === 1 ? 'Registrar nuevo evento' : `Registrar: ${TIPOS_EV.find(t => t.tipo === tipo)?.name}`}</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{step === 1 ? 'Seleccione el tipo de acción a registrar' : 'Complete los datos del evento'}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>
        </div>

        <div style={{ padding: '10px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
          {([1, 2] as const).map(n => (
            <React.Fragment key={n}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, background: step > n ? '#22C55E' : step === n ? '#2563EB' : '#F1F5F9', color: step >= n ? '#fff' : '#94A3B8' }}>{step > n ? '✓' : n}</div>
              <span style={{ fontSize: 11, color: step === n ? '#0F172A' : '#94A3B8', fontWeight: step === n ? 600 : 400 }}>{n === 1 ? 'Tipo de evento' : 'Datos del evento'}</span>
              {n < 2 && <div style={{ flex: 1, height: 1, background: step > n ? '#22C55E' : '#E2E8F0' }} />}
            </React.Fragment>
          ))}
        </div>

        <div style={{ padding: '18px 22px' }}>
          {step === 1 && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>¿Qué desea registrar?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                {TIPOS_EV.map(t => (
                  <button key={t.tipo} onClick={() => { setTipo(t.tipo); setForm({ fecha: today(), direccionIds: [], profesionalIds: [] }); setStep(2) }}
                    style={{ padding: '14px 13px', border: '2px solid #E2E8F0', borderRadius: 11, background: '#F9FAFB', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={{ fontSize: 22 }}>{t.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{t.name}</span>
                    <span style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>{t.desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && tipo && (
            <>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, cursor: 'pointer', padding: 0 }}>
                <ArrowLeft size={13} /> Cambiar tipo
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div><Lbl text="Fecha del evento" /><input type="date" value={form.fecha} onChange={e => set('fecha')(e.target.value)} style={inpS} /></div>

                {(tipo === 'ingreso' || tipo === 'reingreso') && <>
                  <div><Lbl text="Documento (Oficio)" /><input value={form.documento ?? ''} onChange={e => set('documento')(e.target.value)} placeholder="ej. Oficio N° 0393-2025-2026-CMF/CR" style={inpS} /></div>
                  <div><Lbl text="Expediente DGNNA" /><input value={form.expediente ?? ''} onChange={e => set('expediente')(e.target.value)} placeholder="ej. 2025-0055365" style={inpS} /></div>
                  {tipo === 'reingreso' && <div><Lbl text="Motivo del reingreso" /><textarea rows={2} value={form.observaciones ?? ''} onChange={e => set('observaciones')(e.target.value)} placeholder="¿Por qué regresa el PL?" style={{ ...inpS, resize: 'none' }} /></div>}
                </>}

                {tipo === 'derivacion' && <>
                  <div>
                    <Lbl text="Dirección(es) — puede marcar varias" />
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', padding: '10px', border: '1.5px solid #E2E8F0', borderRadius: 8, background: '#F9FAFB' }}>
                      {catalogos.direcciones.map(d => {
                        const checked = form.direccionIds.includes(d.id)
                        return (
                          <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer', padding: '6px 11px', background: checked ? '#EFF6FF' : '#fff', border: `1.5px solid ${checked ? '#2563EB' : '#E2E8F0'}`, borderRadius: 7, transition: 'all .1s' }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleDirId(d.id)} style={{ width: 15, height: 15 }} />
                            {d.nombre}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <Lbl text="Profesional(es) asignado(s) — puede marcar varios" />
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', padding: '10px', border: '1.5px solid #E2E8F0', borderRadius: 8, background: '#F9FAFB' }}>
                      {catalogos.profesionales.map(p => {
                        const checked = form.profesionalIds.includes(p.id)
                        return (
                          <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', padding: '5px 10px', background: checked ? '#EFF6FF' : '#fff', border: `1.5px solid ${checked ? '#2563EB' : '#E2E8F0'}`, borderRadius: 7, transition: 'all .1s' }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleProfId(p.id)} style={{ width: 15, height: 15 }} />
                            {p.nombre}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </>}

                {tipo === 'informe' && <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <Lbl text="Dirección que responde" />
                      <select value={form.direccionInformeId ?? ''} onChange={e => set('direccionInformeId')(e.target.value)} style={selS}>
                        <option value="">Seleccionar…</option>
                        {catalogos.direcciones.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <Lbl text="Opinión técnica" />
                      <select value={form.opinionDireccion ?? ''} onChange={e => set('opinionDireccion')(e.target.value)} style={selS}>
                        <option value="">Seleccionar…</option>
                        {(tiposOpinionNombres.length > 0 ? tiposOpinionNombres : ['Viable','No viable','Viable con observaciones']).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><Lbl text="Número de informe" /><input value={form.numeroInforme ?? ''} onChange={e => set('numeroInforme')(e.target.value)} placeholder="ej. Informe N° 04-2026-MIMP-DGNNA" style={inpS} /></div>
                  <div><Lbl text="Fecha de salida de la dirección" /><input type="date" value={form.fechaSalidaDireccion ?? today()} onChange={e => set('fechaSalidaDireccion')(e.target.value)} style={inpS} /></div>
                </>}

                {tipo === 'opinion_final' && <>
                  <div>
                    <Lbl text="Opinión institucional DGNNA" />
                    <select value={form.opinionFinal ?? ''} onChange={e => set('opinionFinal')(e.target.value)} style={{ ...selS, fontSize: 15, padding: '11px 12px' }}>
                      <option value="">Seleccionar opinión…</option>
                      {(tiposOpinionNombres.length > 0 ? tiposOpinionNombres : ['Viable','No viable','Viable con observaciones']).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><Lbl text="Memo / Nota DGNNA (opcional)" /><input value={form.memoNota ?? ''} onChange={e => set('memoNota')(e.target.value)} placeholder="ej. Memorandum N° 101-2026-MIMP-DGNNA" style={inpS} /></div>
                  <div><Lbl text="Fecha de salida de DGNNA" /><input type="date" value={form.fechaSalidaDGNNA ?? today()} onChange={e => set('fechaSalidaDGNNA')(e.target.value)} style={inpS} /></div>
                </>}

                <div><Lbl text="Observaciones (opcional)" /><textarea rows={2} value={form.observaciones ?? ''} onChange={e => set('observaciones')(e.target.value)} placeholder="Notas adicionales…" style={{ ...inpS, resize: 'none' }} /></div>
              </div>
            </>
          )}
        </div>

        {step === 2 && (
          <div style={{ padding: '0 22px 20px', display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#F9FAFB', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button disabled={saving} onClick={async () => {
              if (!tipo) return
              setSaving(true)
              const payload: EventoApiPayload = {
                tipo, fecha: form.fecha,
                documento: form.documento,
                expediente: form.expediente,
                observaciones: form.observaciones,
                direccionIds: form.direccionIds,
                profesionalIds: form.profesionalIds,
                fechaSalidaDireccion: form.fechaSalidaDireccion,
                numeroInforme: form.numeroInforme,
                opinionDireccion: form.opinionDireccion,
                direccionInforme: form.direccionInformeId ? dirNombreById(form.direccionInformeId) : undefined,
                opinionFinal: form.opinionFinal,
                fechaSalidaDGNNA: form.fechaSalidaDGNNA,
                memoNota: form.memoNota,
              }
              await onSave(payload)
              setSaving(false)
            }} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: saving ? '#93C5FD' : '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,.35)' }}>
              {saving ? 'Guardando…' : 'Guardar evento'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────

const CATALOGOS_VACIOS: Catalogos = { comisiones: [], congresistas: [], tiposOpinion: [], direcciones: [], profesionales: [] }

export default function ProyectosLeyPage() {
  const router = useRouter()
  const { me } = useMe()

  const [pls, setPls]           = useState<ProyectoLey[]>([])
  const [catalogos, setCatalogos] = useState<Catalogos>(CATALOGOS_VACIOS)
  const [loading, setLoading]   = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab]           = useState<'datos' | 'eventos'>('datos')
  const [search, setSearch]     = useState('')
  const [fOpinion, setFOpinion] = useState('')
  const [fEstado, setFEstado]   = useState('')
  const [showNew, setShowNew]   = useState(false)
  const [showEvento, setShowEvento] = useState(false)
  const [pending, setPending]   = useState<Partial<ProyectoLey>>({})

  // ── Carga inicial ──────────────────────────────────────────────────
  const fetchPLs = useCallback(async () => {
    const params = new URLSearchParams()
    if (fOpinion) params.set('opinion', fOpinion)
    if (fEstado)  params.set('estado', fEstado)
    if (search)   params.set('q', search)
    const res = await fetch(`/api/proyectos-ley?${params}`)
    if (!res.ok) { toast.error('Error cargando proyectos'); return }
    const data = await res.json()
    setPls(data.map(mapApiPL))
  }, [fOpinion, fEstado, search])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/proyectos-ley/catalogos').then(r => r.ok ? r.json() : CATALOGOS_VACIOS).then(d => setCatalogos(d)),
      fetchPLs(),
    ]).finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-filtrar al cambiar filtros
  useEffect(() => { fetchPLs() }, [fetchPLs])

  const hasPending = Object.keys(pending).filter(k => k !== '_reset').length > 0

  const filtered = useMemo(() => pls.filter(pl => {
    if (search && !pl.numeroPL.toLowerCase().includes(search.toLowerCase()) && !pl.sumilla.toLowerCase().includes(search.toLowerCase())) return false
    if (fOpinion && pl.opinion !== fOpinion) return false
    if (fEstado && pl.estado !== fEstado) return false
    return true
  }), [pls, search, fOpinion, fEstado])

  const selected = pls.find(p => p.id === selectedId) ?? null
  const selPL = selected ? { ...selected, ...pending } : null

  const onChange = (field: string, val: string) => {
    if (field === '_reset') { setPending({}); return }
    if (field === 'congresistaId') {
      const cong = catalogos.congresistas.find(c => c.id === val)
      setPending(p => ({ ...p, congresistaId: val, congresista: cong?.nombre ?? '', partido: cong?.partido ?? '' }))
    } else if (field === 'comisionId') {
      const com = catalogos.comisiones.find(c => c.id === val)
      setPending(p => ({ ...p, comisionId: val, comision: com?.nombre ?? '' }))
    } else {
      setPending(p => ({ ...p, [field]: val }))
    }
  }

  const guardar = async () => {
    if (!selected || !hasPending) return
    try {
      const body: Record<string, string | undefined> = {}
      if (pending.numeroPL !== undefined) body.numeroPL = pending.numeroPL
      if (pending.expediente !== undefined) body.expediente = pending.expediente
      if (pending.documento !== undefined) body.documento = pending.documento
      if (pending.comisionId !== undefined) body.comisionId = pending.comisionId
      if (pending.congresistaId !== undefined) body.congresistaId = pending.congresistaId
      if (pending.sumilla !== undefined) body.sumilla = pending.sumilla
      if (pending.tema !== undefined) body.tema = pending.tema
      if (pending.estadoCongresoComision !== undefined) body.estadoCongreso = pending.estadoCongresoComision
      if (pending.observaciones !== undefined) body.observaciones = pending.observaciones

      const res = await fetch(`/api/proyectos-ley/${selected.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Error al guardar')
      const updated = await res.json()
      setPls(ps => ps.map(p => p.id === selected.id ? mapApiPL(updated) : p))
      setPending({})
      toast.success('Cambios guardados correctamente')
    } catch {
      toast.error('No se pudo guardar. Intenta nuevamente.')
    }
  }

  const handleSaveNewPL = async (data: Record<string, string>) => {
    try {
      const res = await fetch('/api/proyectos-ley', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, creadoPor: me?.nombre ?? '' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? 'Error al registrar')
      }
      const created = await res.json()
      const newPL = mapApiPL(created)
      setPls(ps => [newPL, ...ps])
      setSelectedId(newPL.id)
      setPending({})
      setShowNew(false)
      setTab('eventos')
      toast.success('Proyecto de Ley registrado correctamente')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al registrar')
    }
  }

  const handleSaveEvento = async (payload: EventoApiPayload) => {
    if (!selected) return
    try {
      const res = await fetch(`/api/proyectos-ley/${selected.id}/eventos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, registradoPor: me?.nombre ?? '' }),
      })
      if (!res.ok) throw new Error('Error al guardar evento')
      // Recargar el PL completo para reflejar cambios (estado, opinión, etc.)
      const plRes = await fetch(`/api/proyectos-ley/${selected.id}`)
      if (plRes.ok) {
        const updated = await plRes.json()
        setPls(ps => ps.map(p => p.id === selected.id ? mapApiPL(updated) : p))
      }
      setShowEvento(false)
      setTab('eventos')
      toast.success('Evento registrado correctamente')
    } catch {
      toast.error('No se pudo guardar el evento. Intenta nuevamente.')
    }
  }

  const N2 = '#1E3A5F'
  const BR = '#E2E8F0'
  const opSel  = selPL ? opinionColors(selPL.opinion) : opinionColors('')
  const estSel = selPL ? estadoColors(selPL.estado)   : estadoColors('en_proceso')
  const tiposOpinionNombres = catalogos.tiposOpinion.map(t => t.nombre)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F9FAFB', overflow: 'hidden' }}>

      {/* ── HEADER ── */}
      <header style={{ background: '#fff', flexShrink: 0, borderBottom: `1px solid ${BR}`, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
        <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={15} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.5px', lineHeight: 1 }}>DGNNA — MIMP</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', lineHeight: 1.2, letterSpacing: '-.01em' }}>Proyectos de Ley</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => router.push('/menu')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F9FAFB', color: '#475569', border: `1px solid ${BR}`, borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <LayoutGrid size={13} /> Menú
            </button>
            <button onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 700, boxShadow: '0 2px 8px rgba(37,99,235,.4)', cursor: 'pointer' }}>
              <Plus size={13} /> Nuevo PL
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width: 340, background: N2, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><Search size={13} color="rgba(255,255,255,.35)" /></span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por Nº PL o sumilla…"
                style={{ width: '100%', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 8, padding: '7px 9px 7px 30px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <select value={fOpinion} onChange={e => setFOpinion(e.target.value)}
                style={{ flex: 1, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 7, padding: '5px 8px', color: fOpinion ? '#fff' : 'rgba(255,255,255,.45)', fontSize: 11, outline: 'none', cursor: 'pointer' }}>
                <option value="">Todas las opiniones</option>
                {(tiposOpinionNombres.length > 0 ? tiposOpinionNombres : ['Viable','No viable','Viable con observaciones','No se emite opinión']).map(o => (
                  <option key={o} value={o} style={{ background: N2 }}>{o}</option>
                ))}
              </select>
              <select value={fEstado} onChange={e => setFEstado(e.target.value)}
                style={{ flex: 1, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 7, padding: '5px 8px', color: fEstado ? '#fff' : 'rgba(255,255,255,.45)', fontSize: 11, outline: 'none', cursor: 'pointer' }}>
                <option value="">Todos los estados</option>
                <option value="en_proceso" style={{ background: N2 }}>En proceso</option>
                <option value="emitido" style={{ background: N2 }}>Emitido</option>
                <option value="archivado" style={{ background: N2 }}>Archivado</option>
              </select>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', fontWeight: 500 }}>
              {loading ? 'Cargando…' : `${filtered.length} proyecto${filtered.length !== 1 ? 's' : ''} de ley`}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'rgba(255,255,255,.3)', fontSize: 12 }}>Cargando proyectos…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'rgba(255,255,255,.3)', fontSize: 12 }}>
                {pls.length === 0 ? 'Aún no hay proyectos registrados' : 'No se encontraron proyectos con ese criterio'}
              </div>
            ) : (
              filtered.map(pl => (
                <PLCard key={pl.id} pl={pl} active={selectedId === pl.id}
                  onClick={() => {
                    if (hasPending && !confirm('¿Descartar cambios no guardados?')) return
                    setSelectedId(pl.id); setPending({}); setTab('datos')
                  }} />
              ))
            )}
          </div>
        </div>

        {/* ── PANEL PRINCIPAL ── */}
        {!selPL ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: '#94A3B8' }}>
            <FileText size={40} color="#E2E8F0" />
            <div style={{ fontSize: 13 }}>Selecciona un Proyecto de Ley del panel izquierdo</div>
            {pls.length === 0 && !loading && (
              <button onClick={() => setShowNew(true)} style={{ marginTop: 8, padding: '9px 20px', borderRadius: 9, border: 'none', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                + Registrar primer PL
              </button>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Encabezado de la ficha */}
            <div style={{ background: '#fff', padding: '12px 22px', borderBottom: `1px solid ${BR}`, flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 700, marginBottom: 2 }}>
                {selPL.numeroPL}{selPL.expediente ? ` · Exp. ${selPL.expediente}` : ''}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', lineHeight: 1.25, marginBottom: 8 }}>{selPL.sumilla || '—'}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {selPL.comision && <span style={{ fontSize: 11, color: '#475569', background: '#F8FAFC', border: `1px solid ${BR}`, padding: '3px 9px', borderRadius: 5 }}>🏛️ {selPL.comision}</span>}
                {selPL.congresista && <span style={{ fontSize: 11, color: '#475569', background: '#F8FAFC', border: `1px solid ${BR}`, padding: '3px 9px', borderRadius: 5 }}>👤 {selPL.congresista}{selPL.partido ? ` · ${selPL.partido}` : ''}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Badge label={opSel.label || 'Pendiente'} bg={opSel.bg} color={opSel.color} border={opSel.border} />
                  <Badge label={estSel.label} bg={estSel.bg} color={estSel.color} border={estSel.border} />
                </div>
                {hasPending && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#92400E', fontWeight: 600, background: '#FFFBEB', border: '1px solid #FDE68A', padding: '4px 10px', borderRadius: 6 }}>Cambios sin guardar</span>
                    <button onClick={() => setPending({})} style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${BR}`, background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Descartar</button>
                    <button onClick={guardar} style={{ padding: '5px 16px', borderRadius: 7, border: 'none', background: N2, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Guardar</button>
                  </div>
                )}
              </div>
            </div>

            <ProgresoBar eventos={selPL.eventos} />

            {/* Tabs */}
            <div style={{ background: '#fff', display: 'flex', borderBottom: `1px solid ${BR}`, padding: '0 22px', flexShrink: 0 }}>
              {([
                ['datos',   'Datos del PL',        <FileText size={12} key="datos" />],
                ['eventos', 'Historial de eventos', <CheckCircle size={12} key="eventos" />],
              ] as const).map(([id, lbl, ico]) => (
                <button key={id} onClick={() => setTab(id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 13, background: 'none', border: 'none', borderBottom: `2.5px solid ${tab === id ? N2 : 'transparent'}`, color: tab === id ? N2 : '#64748B', fontWeight: tab === id ? 700 : 500, marginBottom: -1, cursor: 'pointer', transition: 'all .15s' }}>
                  {ico} {lbl}
                  {id === 'eventos' && <span style={{ background: '#EFF6FF', color: '#2563EB', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{selPL.eventos.length}</span>}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {tab === 'datos'   && <DatosTab pl={selPL} catalogos={catalogos} onChange={onChange} onGuardar={guardar} hasPending={hasPending} />}
              {tab === 'eventos' && <EventosTab pl={selPL} onAddEvento={() => setShowEvento(true)} />}
            </div>
          </div>
        )}
      </div>

      {showNew    && <NuevoPLModal    catalogos={catalogos} onSave={handleSaveNewPL}  onClose={() => setShowNew(false)} />}
      {showEvento && <NuevoEventoModal catalogos={catalogos} onSave={handleSaveEvento} onClose={() => setShowEvento(false)} />}
    </div>
  )
}
