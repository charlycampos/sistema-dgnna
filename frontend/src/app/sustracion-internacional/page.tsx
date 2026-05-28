'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMe } from '@/lib/use-me'
import {
  Search, Plus, X, Trash2, Globe, User, FileText,
  Scale, CheckCircle, Clock, Archive, Filter, ChevronDown,
  LogOut, LayoutGrid, TrendingUp, Download,
} from 'lucide-react'
import { descargarExcelSustracion } from '@/lib/export-excel'
import { toast } from 'sonner'

// ── Tipos ──────────────────────────────────────────────────────────────

type Bitacora = {
  id: string; casoId: string; fecha: string
  texto: string; creadoPor?: string; createdAt: string
}

type HistorialJudicial = {
  id: string; casoId: string; etapa: string; fecha: string
  descripcion?: string; creadoPor?: string; createdAt: string
}

type Caso = {
  id: string; codigo: string
  nnaNombre: string; nnaSexo?: string; nnaEdad?: string; nnaTipoEdad?: string; nnaFechaNac?: string
  pais: string; etapa?: string; tipoSolicitud?: string; acPeru?: string
  fechaIngreso: string; fechaSalida?: string
  solicitanteNombre?: string; solicitanteSexo?: string; solicitanteTelefono?: string
  solicitanteCorreo?: string; solicitanteDomicilio?: string
  requeridoNombre?: string; requeridoSexo?: string; requeridoTelefono?: string
  requeridoCorreo?: string; requeridoDomicilio?: string
  profesional?: string; estado: string; fechaEntrevista?: string; resultadoEntrevista?: string
  estadoJudicial?: string; fechaDemanda?: string; numExpedienteJudicial?: string
  juzgado?: string; sentencia1ra?: string; sentencia2da?: string; casacion?: string
  motivoCierre?: string; retorno?: string; observaciones?: string; creadoPor?: string
  bitacora: Bitacora[]
  historialJudicial?: HistorialJudicial[]
}

// ── TOKENS ─────────────────────────────────────────────────────────────
const NK='#111827', N2='#1E3A5F', BL='#2563EB', BLH='#1D4ED8';
const SURF='#FFFFFF', BG='#F9FAFB', BR='#E2E8F0';
const TX='#0F172A', TX2='#475569', TX3='#94A3B8';

// ── Constantes ─────────────────────────────────────────────────────────

const ETAPAS_JUDICIALES = [
  'Sin demanda','Demanda presentada','En audiencia',
  'Sentencia 1ra instancia','Sentencia 2da instancia','Casación','Ejecución de sentencia','Archivado',
]
const PAISES = [
  'Alemania','Argentina','Australia','Bolivia','Bosnia','Brasil','Canadá','Chile','Colombia',
  'Ecuador','El Salvador','España','Estados Unidos','Francia','Honduras','Italia','México',
  'Países Bajos','Paraguay','Perú','Portugal','Reino Unido','Uruguay','Venezuela','Otro',
]
const PROFESIONALES = ['EMMA','JANNY','CECILIA']
const SEXOS = ['Hombre','Mujer']
const TIPO_EDAD = ['Años','Meses','Días']
const ETAPAS = ['Administrativo','Judicial']
const TIPO_SOLICITUD = ['Restitución','Régimen de Visitas']
const AC_PERU_OPTS = ['Requirente','Requerida']
const RESULTADO_ENTREVISTA = ['Favorable','Desfavorable','Pendiente','No aplica']
const RETORNO_OPTS = ['SI','NO','Pendiente','No aplica']
const MOTIVOS_CIERRE = [
  'Retorno voluntario','Retorno por sentencia judicial','Acuerdo entre las partes','Sentencia infundada',
  'AC rechaza solicitud - Violencia familiar','AC rechaza solicitud - Art. 12',
  'No cumple requisitos del Convenio','Transcurrió plazo sin ubicar al NNA',
  'Desistimiento del solicitante','Sentencia infundada - Art. 13 A','Sentencia infundada - Art. 13 B',
  'Sentencia infundada - Art. 20','AC rechaza solicitud - Art. 27','Otro',
]

// ── Helpers ────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
  switch (estado) {
    case 'Tramite':   return { bg:'#EFF6FF', color:'#1D4ED8', border:'#BFDBFE', label:'En trámite', accent:'#2563EB' }
    case 'Pendiente': return { bg:'#FFFBEB', color:'#92400E', border:'#FDE68A', label:'Pendiente', accent:'#D97706' }
    case 'Archivado': return { bg:'#F1F5F9', color:'#475569', border:'#CBD5E1', label:'Archivado', accent:'#64748B' }
    default:          return { bg:'#F1F5F9', color:'#475569', border:'#CBD5E1', label:estado, accent:'#64748B' }
  }
}

function today() { return new Date().toISOString().split('T')[0] }

function mensajeApiError(data: Record<string, unknown> | null, fallback: string): string {
  const detail = data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((e) =>
        typeof e === 'object' && e !== null && 'msg' in e ? String((e as { msg: unknown }).msg) : JSON.stringify(e)
      )
      .filter(Boolean)
      .join(' ')
  }
  if (typeof data?.error === 'string') return data.error
  return fallback
}

function compararFechaHistorial(a: HistorialJudicial, b: HistorialJudicial) {
  return String(a?.fecha ?? '').localeCompare(String(b?.fecha ?? ''))
}

// ── Judicial embebido en bitácora ──────────────────────────────────────
const JUD = '__JUD__:'

function isJudicialEntry(b: Bitacora): boolean {
  return b.texto.startsWith(JUD)
}

function parseJudicialEntry(b: Bitacora): HistorialJudicial | null {
  if (!isJudicialEntry(b)) return null
  try {
    const j = JSON.parse(b.texto.slice(JUD.length))
    return { id: b.id, casoId: b.casoId, etapa: j.etapa ?? '', fecha: b.fecha,
             descripcion: j.descripcion ?? null, creadoPor: b.creadoPor, createdAt: b.createdAt }
  } catch { return null }
}

function formatFechaEs(fecha: string): string {
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const [y,m,d] = fecha.split('-')
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`
}

function emptyForm(): Partial<Caso> {
  return {
    codigo:'', nnaNombre:'', nnaSexo:'', nnaEdad:'', nnaTipoEdad:'Años', nnaFechaNac:'',
    pais:'', etapa:'', tipoSolicitud:'', acPeru:'', fechaIngreso:today(), fechaSalida:'',
    solicitanteNombre:'', solicitanteSexo:'', solicitanteTelefono:'', solicitanteCorreo:'', solicitanteDomicilio:'',
    requeridoNombre:'', requeridoSexo:'', requeridoTelefono:'', requeridoCorreo:'', requeridoDomicilio:'',
    profesional:'', estado:'Tramite', fechaEntrevista:'', resultadoEntrevista:'',
    estadoJudicial:'Sin demanda', fechaDemanda:'', numExpedienteJudicial:'', juzgado:'',
    sentencia1ra:'', sentencia2da:'', casacion:'', motivoCierre:'', retorno:'', observaciones:'',
  }
}

// ── CSS compartido ─────────────────────────────────────────────────────

const cellBase: React.CSSProperties = {
  borderRight:'0.5px solid #F1F5F9', borderBottom:'0.5px solid #F1F5F9',
  padding:'5px 9px', cursor:'pointer', position:'relative', minHeight:42,
}
const labelStyle: React.CSSProperties = {
  fontSize:10, color:'#94A3B8', letterSpacing:'.3px', marginBottom:2, display:'block',
  textTransform:'uppercase', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
}
const valueStyle: React.CSSProperties = { fontSize:12, color:'#1E293B', lineHeight:1.4 }
const emptyValueStyle: React.CSSProperties = { ...valueStyle, color:'#CBD5E1', fontStyle:'italic' }
const inpStyle: React.CSSProperties = {
  width:'100%', border:'none', outline:'none', background:'transparent',
  fontSize:12, color:'#1E293B', fontFamily:'inherit', padding:0,
}
const selStyle: React.CSSProperties = {
  width:'100%', border:'none', outline:'none', background:'transparent',
  fontSize:12, color:'#1E293B', fontFamily:'inherit', padding:0,
}

// ══════════════════════════════════════════════════════════════════════
// CELDA EDITABLE
// ══════════════════════════════════════════════════════════════════════

type CeldaProps = {
  label: string
  value?: string | null
  type?: 'text' | 'date' | 'select' | 'textarea'
  opts?: string[]
  onChange: (v: string) => void
  span?: number
}

function Celda({ label, value, type='text', opts=[], onChange, span=1 }: CeldaProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const ref = useRef<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement>(null)

  useEffect(() => { if (editing && ref.current) ref.current.focus() }, [editing])

  const displayVal = value || ''

  return (
    <div
      onClick={() => { if (!editing) { setDraft(value || ''); setEditing(true) } }}
      style={{
        ...cellBase,
        gridColumn: span > 1 ? `span ${span}` : undefined,
        background: editing ? '#F0F9FF' : 'transparent',
        outline: editing ? '2px solid #2563EB' : 'none',
        outlineOffset: -2,
      }}>
      <span style={labelStyle}>{label}</span>
      {editing ? (
        type === 'select' ? (
          <select ref={ref} style={selStyle} value={draft}
            onChange={e => { setDraft(e.target.value); onChange(e.target.value); setEditing(false) }}
            onBlur={() => setEditing(false)}>
            <option value="">—</option>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea ref={ref} style={{ ...inpStyle, resize:'none', minHeight:48 }} value={draft}
            rows={2} onChange={e => { setDraft(e.target.value); onChange(e.target.value) }} onBlur={() => setEditing(false)}
            onKeyDown={e => { if (e.key==='Escape') { setDraft(value||''); setEditing(false) } }} />
        ) : (
          <input ref={ref} type={type} style={inpStyle} value={draft}
            onChange={e => { setDraft(e.target.value); onChange(e.target.value) }} onBlur={() => setEditing(false)}
            onKeyDown={e => { if (e.key==='Enter') setEditing(false); if (e.key==='Escape') { setDraft(value||''); setEditing(false) } }} />
        )
      ) : (
        <span style={displayVal ? valueStyle : emptyValueStyle}>{displayVal || '—'}</span>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════

export default function SustracionPage() {
  const router = useRouter()
  const { me, loading: meLoading, hasAccess } = useMe()
  const [casos, setCasos] = useState<Caso[]>([])
  const [selected, setSelected] = useState<Caso | null>(null)

  // Guard de acceso: solo admins y usuarios con módulo 'sustraccion'
  useEffect(() => {
    if (!meLoading && me && !hasAccess('sustraccion')) {
      router.replace('/menu')
    }
  }, [me, meLoading, hasAccess, router])

  const [view, setView] = useState<'casos'|'dashboard'>('casos')
  const [tab, setTab] = useState<'ficha'|'bitacora'|'judicial'>('ficha')
  const [loading, setLoading] = useState(true)

  // Filtros sidebar
  const [search, setSearch] = useState('')
  const [fEstado, setFEstado] = useState('')
  const [fProfesional, setFProfesional] = useState('')
  const [fPais, setFPais] = useState('')
  const [fDesde, setFDesde] = useState('')
  const [fHasta, setFHasta] = useState('')
  const [showFiltros, setShowFiltros] = useState(false)

  // Cambios pendientes
  const [pending, setPending] = useState<Partial<Caso>>({})
  const [saving, setSaving] = useState(false)
  const hasPending = Object.keys(pending).length > 0

  // Modal nuevo caso
  const [showNew, setShowNew] = useState(false)
  const [formNew, setFormNew] = useState<Partial<Caso>>(emptyForm())
  const [savingNew, setSavingNew] = useState(false)
  const [errorNew, setErrorNew] = useState('')

  // Bitácora
  const [bitTexto, setBitTexto] = useState('')
  const [savingBit, setSavingBit] = useState(false)

  // Historial judicial
  const [hjEtapa, setHjEtapa] = useState('')
  const [hjFecha, setHjFecha] = useState(today())
  const [hjDesc, setHjDesc] = useState('')
  const [savingHj, setSavingHj] = useState(false)
  const [errorHj, setErrorHj] = useState('')

  // ── Fetch ─────────────────────────────────────────────────────────

  const fetchCasos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sustracion')
      if (res.ok) {
        const data = await res.json()
        setCasos(data)
        if (selected) {
          const upd = data.find((c: Caso) => c.id === selected.id)
          if (upd) setSelected(upd)
        }
      }
    } finally { setLoading(false) }
  }, [selected])

  useEffect(() => { fetchCasos() }, []) // eslint-disable-line

  // ── Filtrado ─────────────────────────────────────────────────────

  const casosFiltrados = casos.filter(c => {
    if (search && !c.nnaNombre.toLowerCase().includes(search.toLowerCase()) &&
        !c.codigo.toLowerCase().includes(search.toLowerCase())) return false
    if (fEstado && c.estado !== fEstado) return false
    if (fProfesional && c.profesional !== fProfesional) return false
    if (fPais && c.pais !== fPais) return false
    if (fDesde && c.fechaIngreso < fDesde) return false
    if (fHasta && c.fechaIngreso > fHasta) return false
    return true
  })

  const filtrosActivos = [fEstado,fProfesional,fPais,fDesde,fHasta].filter(Boolean).length

  // ── Cambios inline ────────────────────────────────────────────────

  function onChange(field: keyof Caso, val: string) {
    setPending(prev => ({ ...prev, [field]: val }))
  }

  function getVal(field: keyof Caso): string {
    if (field in pending) return (pending as Record<string, unknown>)[field] as string ?? ''
    if (!selected) return ''
    return (selected as Record<string, unknown>)[field] as string ?? ''
  }

  async function guardar() {
    if (!selected || !hasPending) return
    setSaving(true)
    const body = { ...pending }
    try {
      const res = await fetch(`/api/sustracion/${selected.id}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json() as Caso
        
        // Actualizamos la lista y el seleccionado con la respuesta oficial del servidor
        setCasos(prev => prev.map(c => c.id === updated.id ? updated : c))
        setSelected(updated)
        
        // Limpiamos de pending SOLO lo que enviamos (por si hubo cambios concurrentes)
        setPending(prev => {
          const next = { ...prev }
          Object.keys(body).forEach(k => delete (next as Record<string, unknown>)[k])
          return next
        })
        
        toast.success('Cambios guardados')
      } else {
        const err = await res.json().catch(() => null)
        toast.error(mensajeApiError(err, `Error al guardar (${res.status})`))
      }
    } catch {
      toast.error('Error de conexión al guardar')
    } finally { setSaving(false) }
  }

  function descartar() { setPending({}) }

  async function handleLogout() {
    if (hasPending && !confirm('Tienes cambios sin guardar. ¿Deseas salir de todas formas?')) return
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function irAModulos() {
    if (hasPending && !confirm('Tienes cambios sin guardar. ¿Deseas volver al menú?')) return
    router.push('/menu')
  }

  // ── Crear caso ────────────────────────────────────────────────────

  async function crearCaso() {
    if (!formNew.codigo || !formNew.nnaNombre || !formNew.pais || !formNew.fechaIngreso) {
      setErrorNew('Código, nombre del NNA, país y fecha de ingreso son obligatorios.')
      return
    }
    setSavingNew(true); setErrorNew('')
    try {
      const res = await fetch('/api/sustracion', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...formNew, creadoPor: me?.nombre }),
      })
      if (res.status === 409) { const d = await res.json(); setErrorNew(d.detail || 'Código duplicado.'); return }
      if (!res.ok) throw new Error()
      const nuevo = await res.json()
      setCasos(prev => [nuevo, ...prev])
      setSelected(nuevo); setTab('ficha')
      setShowNew(false); setFormNew(emptyForm())
    } catch { setErrorNew('Error de conexión.') }
    finally { setSavingNew(false) }
  }

  // ── Eliminar caso ─────────────────────────────────────────────────

  async function eliminarCaso() {
    if (!selected || !confirm(`¿Eliminar el caso ${selected.codigo}?`)) return
    await fetch(`/api/sustracion/${selected.id}`, { method:'DELETE' })
    setCasos(prev => prev.filter(c => c.id !== selected.id))
    setSelected(null); setPending({})
  }

  // ── Bitácora ──────────────────────────────────────────────────────

  async function agregarBitacora() {
    if (!selected || !bitTexto.trim()) return
    setSavingBit(true)
    try {
      const res = await fetch(`/api/sustracion/${selected.id}/bitacora`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ fecha: today(), texto: bitTexto.trim(), creadoPor: me?.nombre }),
      })
      if (!res.ok) throw new Error()
      const entrada = await res.json()
      const updated = { ...selected, bitacora: [...selected.bitacora, entrada].sort((a,b)=>a.fecha.localeCompare(b.fecha)) }
      setSelected(updated); setCasos(prev => prev.map(c => c.id === updated.id ? updated : c))
      setBitTexto('')
    } finally { setSavingBit(false) }
  }

  async function eliminarBitacora(entradaId: string) {
    if (!selected || !confirm('¿Eliminar esta entrada?')) return
    await fetch(`/api/sustracion/${selected.id}/bitacora/${entradaId}`, { method:'DELETE' })
    const updated = { ...selected, bitacora: selected.bitacora.filter(b => b.id !== entradaId) }
    setSelected(updated); setCasos(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  // ── Historial Judicial ────────────────────────────────────────────

  async function agregarHistorialJudicial() {
    if (!selected || !hjEtapa || !hjFecha) return
    setSavingHj(true)
    setErrorHj('')
    try {
      // Guardamos el evento judicial en la bitácora usando el endpoint que ya funciona
      const texto = JUD + JSON.stringify({ etapa: hjEtapa, descripcion: hjDesc.trim() || null })
      const res = await fetch(`/api/sustracion/${selected.id}/bitacora`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ fecha: hjFecha, texto, creadoPor: me?.nombre }),
      })
      const payload = await res.json().catch(() => null) as Record<string, unknown> | null
      if (!res.ok) {
        setErrorHj(mensajeApiError(payload, `No se pudo registrar (${res.status})`))
        return
      }

      // También actualizamos estadoJudicial en el caso
      await fetch(`/api/sustracion/${selected.id}`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ estadoJudicial: hjEtapa }),
      })

      const nuevaBit: Bitacora = payload as unknown as Bitacora
      const updated = {
        ...selected,
        estadoJudicial: hjEtapa,
        bitacora: [...selected.bitacora, nuevaBit].sort((a,b) => a.fecha.localeCompare(b.fecha)),
      }
      setSelected(updated)
      setCasos(prev => prev.map(c => c.id === updated.id ? updated : c))
      
      // Limpiamos de pending si existía una edición manual de este campo
      setPending(prev => {
        if (!('estadoJudicial' in prev)) return prev
        const next = { ...prev }; delete next.estadoJudicial; return next
      })

      setHjEtapa(''); setHjFecha(today()); setHjDesc('')
    } catch {
      setErrorHj('Error de conexión.')
    } finally { setSavingHj(false) }
  }

  async function eliminarHistorialJudicial(entradaId: string) {
    if (!selected || !confirm('¿Eliminar este evento judicial?')) return
    const res = await fetch(`/api/sustracion/${selected.id}/bitacora/${entradaId}`, { method:'DELETE' })
    if (!res.ok) return

    const nuevaBit = selected.bitacora.filter(b => b.id !== entradaId)
    // Recalcular estadoJudicial desde eventos restantes
    const judicialRestante = nuevaBit
      .filter(isJudicialEntry)
      .map(parseJudicialEntry)
      .filter((h): h is HistorialJudicial => h !== null)
      .sort((a,b) => b.fecha.localeCompare(a.fecha))
    const ultimaEtapa = judicialRestante.length > 0 ? judicialRestante[0].etapa : 'Sin demanda'

    await fetch(`/api/sustracion/${selected.id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ estadoJudicial: ultimaEtapa }),
    })

    const updated = { ...selected, bitacora: nuevaBit, estadoJudicial: ultimaEtapa }
    setSelected(updated); setCasos(prev => prev.map(c => c.id === updated.id ? updated : c))

    // Limpiamos de pending si existía una edición manual de este campo
    setPending(prev => {
      if (!('estadoJudicial' in prev)) return prev
      const next = { ...prev }; delete next.estadoJudicial; return next
    })
  }

  // ── Render ────────────────────────────────────────────────────────

  const selEstado = getVal('estado') || 'Tramite'
  const bSelEstado = estadoBadge(selEstado)

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:BG}}>
      {/* Header */}
      <header style={{background:SURF,flexShrink:0,borderBottom:`1px solid ${BR}`,boxShadow:'0 1px 3px rgba(0,0,0,.05)'}}>
        <div style={{padding:'0 20px',display:'flex',alignItems:'center',gap:12,height:56}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:9,background:BL,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Globe size={15} color="#fff"/>
            </div>
            <div>
              <div style={{fontSize:10,color:TX3,textTransform:'uppercase',letterSpacing:'.5px',lineHeight:1}}>DGNNA — MIMP</div>
              <div style={{fontSize:14,fontWeight:800,color:TX,lineHeight:1.2,letterSpacing:'-.01em'}}>Sustracción Internacional</div>
            </div>
          </div>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
            {me && (
              <div style={{ display:'flex', alignItems:'center', gap:7, background:BG, borderRadius:999, padding:'4px 12px 4px 5px', marginRight:5, border:`1px solid ${BR}` }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:BL, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff' }}>
                  {me.nombre?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <span style={{ color:TX, fontSize:12, fontWeight:600 }}>{me.nombre}</span>
              </div>
            )}
            <button onClick={irAModulos} title="Volver al menú de módulos"
              style={{display:'flex',alignItems:'center',gap:6,background:SURF,color:TX2,border:`1px solid ${BR}`,borderRadius:8,padding:'7px 12px',fontSize:12,cursor:'pointer',fontWeight:600}}>
              <LayoutGrid size={14} /> Módulos
            </button>
            <button onClick={handleLogout} title="Cerrar sesión"
              style={{display:'flex',alignItems:'center',gap:6,background:'#FEF2F2',color:'#DC2626',border:'1px solid #FECACA',borderRadius:8,padding:'7px 12px',fontSize:12,cursor:'pointer',fontWeight:600}}>
              <LogOut size={14} /> Salir
            </button>
            <div style={{width:1,height:20,background:BR,margin:'0 4px'}}/>
            <button onClick={() => setView(view === 'casos' ? 'dashboard' : 'casos')}
              style={{display:'flex',alignItems:'center',gap:6,background:view==='dashboard'?BL:BG,color:view==='dashboard'?'#fff':TX2,border:`1px solid ${view==='dashboard'?BL:BR}`,borderRadius:8,padding:'7px 13px',fontSize:12,fontWeight:600}}>
              {view === 'casos' ? (
                <><TrendingUp size={13} color={TX2} /> Estadísticas</>
              ) : (
                <><FileText size={13} color="#fff" /> Registro</>
              )}
            </button>
            <button onClick={() => { setFormNew(emptyForm()); setShowNew(true) }}
              style={{display:'flex',alignItems:'center',gap:5,background:BL,color:'#fff',border:'none',borderRadius:8,padding:'7px 13px',fontSize:12,fontWeight:700,boxShadow:'0 2px 8px rgba(37,99,235,.4)',cursor:'pointer'}}>
              <Plus size={13} /> Nuevo caso
            </button>
          </div>
        </div>
      </header>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {view === 'dashboard' ? (
          <div style={{ flex:1, overflowY:'auto', background:'#F8FAFC' }}>
            <div style={{ maxWidth:1200, margin:'0 auto' }}>
              <div style={{ padding:'20px 20px 0', display:'flex', alignItems:'center', gap:10 }}>
                <TrendingUp style={{ color:'#1E3A5F', width:24, height:24 }} />
                <h2 style={{ fontSize:20, fontWeight:700, color:'#1E3A5F', margin:0 }}>Panel de Estadísticas Globales</h2>
              </div>
              <TabDashboard casos={casos} />
            </div>
          </div>
        ) : (
          <>
            {/* ── SIDEBAR ──────────────────────────────────────────────── */}
            <div style={{width:340,background:N2,display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
              <div style={{padding:'10px 12px',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
                <div style={{position:'relative',marginBottom:8}}>
                  <span style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><Search size={14} color="rgba(255,255,255,.3)"/></span>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o código…"
                    style={{width:'100%',background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.14)',borderRadius:8,padding:'7px 9px 7px 30px',color:'#fff',fontSize:12,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <button onClick={()=>setShowFiltros(v=>!v)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',background:'none',border:'1px solid rgba(255,255,255,.15)',borderRadius:7,padding:'6px 10px',color:'rgba(255,255,255,.65)',fontSize:11,cursor:'pointer'}}>
                  <span style={{display:'flex',alignItems:'center',gap:5}}><Filter size={13} color="rgba(255,255,255,.5)"/>Filtros {filtrosActivos>0&&<span style={{background:BL,color:'#fff',borderRadius:99,padding:'0 5px',fontSize:10,fontWeight:700}}>{filtrosActivos}</span>}</span>
                  <ChevronDown size={12} color="rgba(255,255,255,.4)"/>
                </button>
                {showFiltros&&(
                  <div style={{marginTop:8, display:'flex', flexDirection:'column', gap:6}}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      <div>
                        <p style={{ color:'rgba(255,255,255,.4)', fontSize:10, marginBottom:3, textTransform:'uppercase', letterSpacing:'.3px' }}>Desde</p>
                        <input type="date" value={fDesde} onChange={e => setFDesde(e.target.value)}
                          style={{ width:'100%', background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.14)', borderRadius:6, padding:'5px 8px', color:'#fff', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                      </div>
                      <div>
                        <p style={{ color:'rgba(255,255,255,.4)', fontSize:10, marginBottom:3, textTransform:'uppercase', letterSpacing:'.3px' }}>Hasta</p>
                        <input type="date" value={fHasta} onChange={e => setFHasta(e.target.value)}
                          style={{ width:'100%', background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.14)', borderRadius:6, padding:'5px 8px', color:'#fff', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                      </div>
                    </div>
                    <select value={fEstado} onChange={e=>setFEstado(e.target.value)} style={{width:'100%',background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.14)',borderRadius:7,padding:'6px 9px',color:fEstado?'#fff':'rgba(255,255,255,.4)',fontSize:11,outline:'none'}}>
                      <option value="">Estado: todos</option>
                      <option value="Tramite">En trámite</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Archivado">Archivado</option>
                    </select>
                    <select value={fProfesional} onChange={e => setFProfesional(e.target.value)}
                      style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.14)', borderRadius:6, padding:'5px 8px', color: fProfesional ? '#fff' : 'rgba(255,255,255,.4)', fontSize:11, outline:'none' }}>
                      <option value="">Profesional: todas</option>
                      {PROFESIONALES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={fPais} onChange={e => setFPais(e.target.value)}
                      style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.14)', borderRadius:6, padding:'5px 8px', color: fPais ? '#fff' : 'rgba(255,255,255,.4)', fontSize:11, outline:'none' }}>
                      <option value="">País: todos</option>
                      {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      <button 
                        onClick={() => {
                          if (casosFiltrados.length === 0) { toast.error('No hay datos para exportar'); return }
                          try {
                            descargarExcelSustracion(casosFiltrados);
                            toast.success(`Exportados ${casosFiltrados.length} casos correctamente`);
                          } catch {
                            toast.error('Error al exportar a Excel');
                          }
                        }}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, background:BL, border:'none', borderRadius:6, padding:'6px 10px', color:'#fff', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                        <Download size={12} /> Exportar
                      </button>
                      <button onClick={() => { setFEstado(''); setFProfesional(''); setFPais(''); setFDesde(''); setFHasta('') }}
                        style={{ background:'rgba(255,100,100,.2)', border:'none', borderRadius:6, padding:'6px 10px', color:'#FCA5A5', fontSize:11, cursor:'pointer' }}>
                        Limpiar filtros
                      </button>
                    </div>
                  </div>
                )}
                <div style={{fontSize:10,color:'rgba(255,255,255,.28)',margin:'6px 1px 0',fontWeight:500}}>{casosFiltrados.length} caso{casosFiltrados.length!==1?'s':''} {filtrosActivos>0 ? '(filtrado)' : ''}</div>
              </div>
              <div style={{flex:1,overflowY:'auto',padding:'6px 8px'}} className="main-scroll">
                {loading && <p style={{ color:'rgba(255,255,255,.35)', fontSize:12, textAlign:'center', padding:20 }}>Cargando...</p>}
                {!loading && casosFiltrados.length === 0 && (
                  <p style={{ color:'rgba(255,255,255,.3)', fontSize:11, textAlign:'center', padding:'24px 12px', lineHeight:1.6 }}>
                    {search || filtrosActivos > 0 ? 'Sin resultados para los filtros aplicados.' : 'No hay casos registrados.\nUsa "Nuevo caso" para agregar uno.'}
                  </p>
                )}
                {casosFiltrados.map(c=>{
                  const active = selected?.id===c.id;
                  const b = estadoBadge(c.estado);
                  const diasDesde = (f: string) => { if (!f) return 0; const diff=Date.now()-new Date(f).getTime(); return Math.floor(diff/(1000*60*60*24)) };
                  const dias = diasDesde(c.fechaIngreso);
                  return (
                    <div key={c.id} onClick={()=>{if(hasPending&&!confirm('¿Descartar cambios no guardados?'))return;setSelected(c);setPending({});setTab('ficha')}} 
                      style={{padding:'12px 14px',marginBottom:2,borderRadius:8,cursor:'pointer',background:active?'rgba(255,255,255,.14)':'transparent',border:`1px solid ${active?'rgba(255,255,255,.2)':'transparent'}`,borderLeft:`3px solid ${active?b.accent:'transparent'}`,transition:'all .12s'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                        <span style={{color:'#fff',fontSize:13,fontWeight:600,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginRight:8}}>{c.nnaNombre}</span>
                        <span style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:b.bg,color:b.color,fontWeight:700,flexShrink:0,whiteSpace:'nowrap'}}>{b.label}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                        <span style={{color:'rgba(255,255,255,.4)',fontSize:10,fontWeight:600}}>{c.codigo}</span>
                        <span style={{display:'flex',alignItems:'center',gap:3,color:'rgba(255,255,255,.35)',fontSize:10}}><Globe size={9} color="rgba(255,255,255,.35)"/>{c.pais}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:10,color:'rgba(255,255,255,.3)'}}>{c.profesional||'—'} · {c.etapa||'Sin etapa'}</span>
                        {dias>0&&c.estado!=='Archivado'&&<span style={{fontSize:10,padding:'1px 7px',borderRadius:99,background:'rgba(255,255,255,.08)',color:'rgba(255,255,255,.4)',fontWeight:600}}>{dias}d</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Main panel */}
            {!selected?(
              <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,color:TX3}}>
                <Scale size={40} color={BR}/>
                <div style={{fontSize:13}}>Selecciona un caso del panel izquierdo</div>
                <button onClick={() => { setFormNew(emptyForm()); setShowNew(true) }}
                  style={{display:'flex',alignItems:'center',gap:5,background:N2,color:'#fff',border:'none',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,cursor:'pointer',marginTop:6}}>
                  <Plus size={14} /> Registrar primer caso
                </button>
              </div>
            ):(
              <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}} className="anim-r">
                {/* Case header */}
                <div style={{background:SURF,padding:'12px 20px',borderBottom:`1px solid ${BR}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,gap:12}}>
                  <div style={{flex:1,overflow:'hidden'}}>
                    <div style={{fontSize:10,color:TX3,textTransform:'uppercase',letterSpacing:'.04em',fontWeight:700,marginBottom:1}}>{selected.codigo} · {selected.pais}</div>
                    <div style={{fontSize:16,fontWeight:800,color:TX,lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selected.nnaNombre}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                    <select value={selEstado} onChange={e=>onChange('estado',e.target.value)}
                      style={{fontSize:12,padding:'5px 10px',borderRadius:99,background:bSelEstado.bg,color:bSelEstado.color,border:`1px solid ${bSelEstado.border}`,fontWeight:700,outline:'none',cursor:'pointer'}}>
                      <option value="Tramite">En trámite</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Archivado">Archivado</option>
                    </select>
                    <button onClick={eliminarCaso} title="Eliminar caso"
                      style={{width:32,height:32,borderRadius:8,border:'1px solid #FECACA',background:'#FEF2F2',display:'flex',alignItems:'center',justifyContent:'center',color:'#DC2626',cursor:'pointer'}}>
                      <Trash2 size={13} color="#DC2626"/>
                    </button>
                  </div>
                </div>
                {/* Pending bar */}
                {hasPending&&(
                  <div style={{background:'#FFFBEB',borderBottom:'1px solid #FDE68A',padding:'8px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,zIndex:10}}>
                    <span style={{fontSize:12,color:'#92400E',fontWeight:600}}>{Object.keys(pending).length} cambio{Object.keys(pending).length!==1?'s':''} sin guardar</span>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={descartar} style={{padding:'5px 12px',borderRadius:7,border:`1px solid ${BR}`,background:SURF,color:TX2,fontSize:12,fontWeight:600,cursor:'pointer'}}>Descartar</button>
                      <button onClick={guardar} disabled={saving} style={{padding:'5px 16px',borderRadius:7,border:'none',background:N2,color:'#fff',fontSize:12,fontWeight:700,cursor:saving?'not-allowed':'pointer'}}>{saving ? 'Guardando...' : 'Guardar'}</button>
                    </div>
                  </div>
                )}
                {/* Tabs */}
                <div style={{background:SURF,display:'flex',borderBottom:`1px solid ${BR}`,padding:'0 20px',flexShrink:0}}>
                  {([['ficha','Ficha del caso',<FileText size={12} key="ficha"/>],['bitacora','Historial de gestión',<svg key="bitacora" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>],['judicial','Proceso judicial',<Scale size={12} key="judicial"/>]] as const).map(([id,lbl,ico])=>(
                    <button key={id} onClick={()=>setTab(id)}
                      style={{display:'flex',alignItems:'center',gap:6,padding:'10px 14px',fontSize:12,background:'none',border:'none',borderBottom:`2px solid ${tab===id?N2:'transparent'}`,color:tab===id?N2:TX2,fontWeight:tab===id?700:500,marginBottom:-1,cursor:'pointer'}}>
                      {ico}{lbl}
                    </button>
                  ))}
                </div>
                {/* Tab content */}
                <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                  {tab==='ficha'&&<TabFicha caso={{...(selected||{}), ...pending}} onChange={onChange} />}
                  {tab==='bitacora'&&<TabBitacora caso={selected} bitTexto={bitTexto} setBitTexto={setBitTexto} saving={savingBit} onAgregar={agregarBitacora} onEliminar={eliminarBitacora}/>}
                  {tab==='judicial'&&<TabJudicial getVal={getVal} onChange={onChange} caso={selected} hjEtapa={hjEtapa} setHjEtapa={setHjEtapa} hjFecha={hjFecha} setHjFecha={setHjFecha} hjDesc={hjDesc} setHjDesc={setHjDesc} savingHj={savingHj} errorHj={errorHj} onAgregarHj={agregarHistorialJudicial} onEliminarHj={eliminarHistorialJudicial}/>}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal nuevo caso */}
      {showNew && (
        <ModalOverlay onClose={() => setShowNew(false)}>
          <ModalNuevoCaso form={formNew} setForm={setFormNew} error={errorNew}
            saving={savingNew} onSave={crearCaso} onClose={() => setShowNew(false)} />
        </ModalOverlay>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB FICHA (maqueta HTML)
// ══════════════════════════════════════════════════════════════════════

function TabFicha({ caso, onChange }: { caso: Caso | Partial<Caso>; onChange: (f: keyof Caso, v: string) => void }) {
  const inpS: React.CSSProperties = { width: '100%', padding: '7px 10px', border: `1.5px solid ${BR}`, borderRadius: 7, fontSize: 12, color: TX, background: '#FAFBFD', outline: 'none' };
  const selS: React.CSSProperties = { ...inpS, cursor: 'pointer' };

  const Row = ({ label, field, type = 'text', opts, span = 1, val }: { label: string, field: keyof Caso, type?: 'text'|'date'|'select'|'textarea', opts?: string[], span?: number, val?: string }) => {
    const v = val !== undefined ? val : ((caso as any)[field] ?? '');
    return (
      <div style={{ gridColumn: `span ${span}`, padding: '12px 14px', borderRight: `1px solid ${BR}`, borderBottom: `1px solid ${BR}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>{label}</div>
        {type === 'select' ? (
          <select value={v} onChange={e => onChange(field, e.target.value)} style={selS}>
            <option value="">—</option>
            {opts?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea rows={2} value={v} onChange={e => onChange(field, e.target.value)} style={{ ...inpS, resize: 'none' }} />
        ) : (
          <input type={type} value={v} onChange={e => onChange(field, e.target.value)} style={inpS} />
        )}
      </div>
    );
  };

  const Sec = ({ title, icon }: { title: string, icon: React.ReactNode }) => (
    <div style={{ gridColumn: 'span 4', background: '#F1F5F9', padding: '8px 14px', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: N2, display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.06em' }}>{title}</span>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto' }} className="main-scroll">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
        <Sec title="Datos del NNA" icon={<User size={13} color={N2} />} />
        <Row label="Nombre completo" field="nnaNombre" span={2} />
        <Row label="Sexo" field="nnaSexo" type="select" opts={SEXOS} />
        <Row label="Fecha de nacimiento" field="nnaFechaNac" type="date" />
        <Row label="Edad" field="nnaEdad" />
        <Row label="Tipo edad" field="nnaTipoEdad" type="select" opts={TIPO_EDAD} />
        <Row label="País contraparte" field="pais" type="select" opts={PAISES} />

        <Sec title="Trámite" icon={<FileText size={13} color={N2} />} />
        <Row label="Código / Hoja de trámite" field="codigo" />
        <Row label="Etapa" field="etapa" type="select" opts={ETAPAS} />
        <Row label="Tipo de solicitud" field="tipoSolicitud" type="select" opts={TIPO_SOLICITUD} />
        <Row label="AC Perú" field="acPeru" type="select" opts={AC_PERU_OPTS} />
        <Row label="Profesional" field="profesional" type="select" opts={PROFESIONALES} />
        <Row label="Fecha ingreso" field="fechaIngreso" type="date" />
        <Row label="Fecha salida/cierre" field="fechaSalida" type="date" />
        <Row label="Fecha entrevista" field="fechaEntrevista" type="date" />
        <Row label="Resultado entrevista" field="resultadoEntrevista" type="select" opts={RESULTADO_ENTREVISTA} />
        <Row label="Retorno" field="retorno" type="select" opts={RETORNO_OPTS} />
        <Row label="Motivo de cierre" field="motivoCierre" type="select" opts={MOTIVOS_CIERRE} span={2} />

        <Sec title="Solicitante" icon={<User size={13} color={N2} />} />
        <Row label="Nombre" field="solicitanteNombre" span={2} />
        <Row label="Sexo" field="solicitanteSexo" type="select" opts={SEXOS} />
        <Row label="Teléfono" field="solicitanteTelefono" />
        <Row label="Correo electrónico" field="solicitanteCorreo" span={2} />
        <Row label="Domicilio" field="solicitanteDomicilio" span={2} />

        <Sec title="Requerido / Presunto sustractor" icon={<User size={13} color={N2} />} />
        <Row label="Nombre" field="requeridoNombre" span={2} />
        <Row label="Sexo" field="requeridoSexo" type="select" opts={SEXOS} />
        <Row label="Teléfono" field="requeridoTelefono" />
        <Row label="Correo electrónico" field="requeridoCorreo" span={2} />
        <Row label="Domicilio en el exterior" field="requeridoDomicilio" span={2} />

        <Sec title="Proceso judicial" icon={<Scale size={13} color={N2} />} />
        <Row label="Estado judicial" field="estadoJudicial" type="select" opts={ETAPAS_JUDICIALES} />
        <Row label="Fecha de demanda" field="fechaDemanda" type="date" />
        <Row label="N° expediente" field="numExpedienteJudicial" span={2} />
        <Row label="Juzgado" field="juzgado" span={2} />
        <Row label="Sentencia 1ra instancia" field="sentencia1ra" span={2} />
        <Row label="Sentencia 2da instancia" field="sentencia2da" span={2} />
        <Row label="Casación" field="casacion" span={4} />

        <Sec title="Observaciones" icon={<FileText size={13} color={N2} />} />
        <Row label="Observaciones generales" field="observaciones" type="textarea" span={4} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAB HISTORIAL DE GESTIÓN (maqueta HTML)
// ══════════════════════════════════════════════════════════════════════

function TabBitacora({ caso, bitTexto, setBitTexto, saving, onAgregar, onEliminar }: {
  caso: Caso; bitTexto: string; setBitTexto:(v:string)=>void
  saving: boolean; onAgregar:()=>void; onEliminar:(id:string)=>void
}) {
  const entries=[...caso.bitacora].filter(b => !isJudicialEntry(b)).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}} className="main-scroll">
        {entries.length===0&&<div style={{textAlign:'center',padding:'48px 0',color:TX3,fontSize:13}}>Sin entradas registradas.</div>}
        <div style={{position:'relative',paddingLeft:32}}>
          <div style={{position:'absolute',left:10,top:4,bottom:4,width:2,background:BR,borderRadius:99}}></div>
          {entries.map((b)=>(
            <div key={b.id} className="anim-u" style={{position:'relative',marginBottom:20}}>
              <div style={{position:'absolute',left:-28,top:4,width:14,height:14,borderRadius:'50%',background:'#EEF2FF',border:`2px solid #A5B4FC`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div style={{background:SURF,borderRadius:10,border:`1px solid ${BR}`,padding:'12px 14px',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                  <div style={{fontSize:11,fontWeight:700,color:TX2}}>{formatFechaEs(b.fecha)}</div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {b.creadoPor&&<div style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:TX3}}><User style={{ width:10, height:10 }} color={TX3}/>{b.creadoPor}</div>}
                    <button onClick={()=>onEliminar(b.id)} style={{background:'none',border:'none',color:'#CBD5E1',padding:2,display:'flex',lineHeight:1,cursor:'pointer'}}><Trash2 style={{ width:11, height:11 }} color="#CBD5E1"/></button>
                  </div>
                </div>
                <div style={{fontSize:12,color:TX,lineHeight:1.6}}>{b.texto}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:'14px 24px',borderTop:`1px solid ${BR}`,background:SURF,flexShrink:0}}>
        <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <textarea rows={2} value={bitTexto} onChange={e=>setBitTexto(e.target.value)} placeholder="Escribe una nueva gestión o seguimiento…" style={{flex:1,padding:'10px 12px',border:`1.5px solid ${BR}`,borderRadius:8,fontSize:13,color:TX,background:BG,outline:'none',resize:'none'}} onKeyDown={e => { if (e.key==='Enter' && (e.ctrlKey||e.metaKey)) onAgregar() }}/>
          <button onClick={onAgregar} disabled={saving||!bitTexto.trim()} style={{padding:'10px 18px',borderRadius:8,border:'none',background:saving||!bitTexto.trim()?'#F1F5F9':BL,color:saving||!bitTexto.trim()?'#94A3B8':'#fff',fontSize:13,fontWeight:700,boxShadow:saving||!bitTexto.trim()?'none':'0 2px 8px rgba(37,99,235,.3)',height:60,cursor:saving||!bitTexto.trim()?'not-allowed':'pointer'}}>{saving?'Guardando...':'Agregar'}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAB PROCESO JUDICIAL (con historial diferido)
// ══════════════════════════════════════════════════════════════════════

function JudicialStepper({currentStage}: {currentStage: string}){
  const idx=ETAPAS_JUDICIALES.indexOf(currentStage);
  return(
    <div style={{padding:'20px 24px 16px',borderBottom:`1px solid ${BR}`,background:'#FAFBFD'}}>
      <div style={{fontSize:11,fontWeight:700,color:TX3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:14}}>Proceso judicial</div>
      <div style={{position:'relative'}}>
        <div style={{position:'absolute',top:14,left:14,right:14,height:2,background:BR,zIndex:0}}></div>
        <div style={{position:'absolute',top:14,left:14,height:2,background:BL,zIndex:1,transition:'width .4s ease-out',width:idx<=0?0:`calc(${Math.min(idx/(ETAPAS_JUDICIALES.length-1),1)*100}% - 0px)`}}></div>
        <div style={{display:'flex',justifyContent:'space-between',position:'relative',zIndex:2}}>
          {ETAPAS_JUDICIALES.map((e,i)=>{
            const done=i<idx, active=i===idx;
            return(
              <div key={e} style={{display:'flex',flexDirection:'column',alignItems:'center',flex:1,gap:6}}>
                <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:`2px solid ${done||active?BL:BR}`,background:done?BL:active?'#EFF6FF':SURF,transition:'all .3s',boxShadow:active?`0 0 0 4px #EFF6FF`:'none'}}>
                  {done?<CheckCircle style={{ width:11, height:11, color:'#fff' }} />:<span style={{width:8,height:8,borderRadius:'50%',background:active?BL:BR}}></span>}
                </div>
                <div style={{fontSize:9,fontWeight:active?700:500,color:active?BL:done?TX2:TX3,textAlign:'center',lineHeight:1.3,maxWidth:68,wordBreak:'break-word'}}>{e}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TabJudicial({ getVal, onChange, caso, hjEtapa, setHjEtapa, hjFecha, setHjFecha, hjDesc, setHjDesc, savingHj, errorHj, onAgregarHj, onEliminarHj }: {
  getVal:(f:keyof Caso)=>string; onChange:(f:keyof Caso,v:string)=>void
  caso: Caso
  hjEtapa: string; setHjEtapa:(v:string)=>void
  hjFecha: string; setHjFecha:(v:string)=>void
  hjDesc: string; setHjDesc:(v:string)=>void
  savingHj: boolean
  errorHj: string
  onAgregarHj:()=>void
  onEliminarHj:(id:string)=>void
}) {
  const historial = caso.bitacora
    .filter(isJudicialEntry)
    .map(parseJudicialEntry)
    .filter((h): h is HistorialJudicial => h !== null)
    .sort(compararFechaHistorial)

  const inpS: React.CSSProperties = {width:'100%',padding:'8px 11px',border:`1.5px solid ${BR}`,borderRadius:8,fontSize:12,color:TX,background:BG,outline:'none'};

  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <JudicialStepper currentStage={getVal('estadoJudicial')||'Sin demanda'}/>
      <div style={{flex:1,overflowY:'auto',padding:'20px 24px', display:'grid', gridTemplateColumns:'1fr 276px', gap: 20}} className="main-scroll">
        
        {/* Lado izquierdo: Historial real */}
        <div style={{ overflowY:'auto', borderRight:`1px solid ${BR}`, paddingRight: 20 }}>
          <p style={{ fontSize:11, fontWeight:700, color:TX3, textTransform:'uppercase', letterSpacing:'.06em', margin:'0 0 14px' }}>
            Historial · {historial.length} evento{historial.length !== 1 ? 's' : ''}
          </p>

          {historial.length === 0 && (
            <div style={{ textAlign:'center', padding:'32px 0', color:TX3 }}>
              <Scale style={{ width:28, height:28, opacity:.25, margin:'0 auto 8px' }} />
              <p style={{ fontSize:12 }}>Sin eventos registrados.</p>
            </div>
          )}

          {historial.map((h, i) => {
            const isLast = i === historial.length - 1
            return (
              <div key={h.id} style={{ display:'flex', gap:10, marginBottom: isLast ? 0 : 18, position:'relative' }}>
                {!isLast && (
                  <div style={{ position:'absolute', left:11, top:22, bottom:-18, width:2, background:BR }} />
                )}
                <div style={{ width:24, height:24, borderRadius:'50%', background:BL, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, zIndex:1 }}>
                  <Scale style={{ width:11, height:11, color:'#fff' }} />
                </div>
                <div style={{ flex:1, background:SURF, border:`1px solid ${BR}`, borderRadius:8, padding:'8px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <span style={{ fontSize:11, fontWeight:700, color:BL, display:'block', textTransform:'uppercase', letterSpacing:'.3px' }}>{h.etapa}</span>
                      <span style={{ fontSize:11, color:TX2 }}>{formatFechaEs(h.fecha)}</span>
                      {h.creadoPor && <span style={{ fontSize:10, color:TX3 }}> · {h.creadoPor}</span>}
                    </div>
                    <button onClick={() => onEliminarHj(h.id)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:TX3, padding:2, display:'flex', flexShrink:0 }}>
                      <Trash2 style={{ width:11, height:11 }} />
                    </button>
                  </div>
                  {h.descripcion && (
                    <p style={{ fontSize:12, color:TX, lineHeight:1.55, margin:'6px 0 0', whiteSpace:'pre-wrap' }}>{h.descripcion}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Lado derecho: Formulario */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:TX3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:14}}>Registrar evento</div>
          {errorHj && <div style={{ background:'#FEF2F2', border:'0.5px solid #FECACA', borderRadius:7, padding:'7px 10px', marginBottom:10, color:'#991B1B', fontSize:11 }}>{errorHj}</div>}
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:TX3,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:5}}>Nueva etapa *</div>
              <select value={hjEtapa} onChange={e=>setHjEtapa(e.target.value)} style={inpS}>
                <option value="">Seleccionar etapa…</option>
                {ETAPAS_JUDICIALES.map(e=><option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:TX3,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:5}}>Fecha *</div>
              <input type="date" value={hjFecha} onChange={e=>setHjFecha(e.target.value)} style={inpS}/>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:TX3,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:5}}>Descripción</div>
              <textarea value={hjDesc} onChange={e=>setHjDesc(e.target.value)} placeholder="Detalles del evento judicial…" style={{...inpS, resize: 'none'}} rows={4} onKeyDown={e => { if (e.key==='Enter' && (e.ctrlKey||e.metaKey)) onAgregarHj() }}/>
            </div>
            <button onClick={onAgregarHj} disabled={savingHj || !hjEtapa || !hjFecha} style={{padding:'9px 20px',borderRadius:8,border:'none',background:savingHj || !hjEtapa || !hjFecha? '#F1F5F9' : N2,color:savingHj || !hjEtapa || !hjFecha? '#94A3B8' : '#fff',fontSize:13,fontWeight:700, cursor: savingHj || !hjEtapa || !hjFecha? 'not-allowed':'pointer'}}>{savingHj ? 'Guardando...' : 'Registrar evento'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MODAL NUEVO CASO
// ══════════════════════════════════════════════════════════════════════

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:24 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:680, maxHeight:'90vh', overflowY:'auto', background:'#ffffff', borderRadius:12, boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
        {children}
      </div>
    </div>
  )
}

function SecModal({ label }: { label: string }) {
  return (
    <div style={{ gridColumn:'span 2', paddingTop:4, borderBottom:'0.5px solid #E2E8F0', marginBottom:2 }}>
      <p style={{ fontSize:11, fontWeight:700, color:'#1E3A5F', textTransform:'uppercase', letterSpacing:'.5px', margin:'0 0 4px' }}>{label}</p>
    </div>
  )
}


function ModalNuevoCaso({
  form, setForm, error, saving, onSave, onClose
}: {
  form: Partial<Caso>; setForm: React.Dispatch<React.SetStateAction<Partial<Caso>>>
  error: string; saving: boolean; onSave: () => void; onClose: () => void
}) {
  const set= (k: keyof Caso) => (v: string) => setForm(p=>({...p,[k]:v}));
  const inpS: React.CSSProperties = {width:'100%',padding:'9px 12px',border:`1.5px solid ${BR}`,borderRadius:8,fontSize:13,color:TX,background:BG,outline:'none'};
  const selS: React.CSSProperties = {...inpS,cursor:'pointer'};

  return(
    <div className="anim-u" style={{background:SURF,borderRadius:16,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,.3)'}} onClick={e=>e.stopPropagation()}>
      <div style={{padding:'20px 24px 16px',borderBottom:`1px solid ${BR}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:TX}}>Nuevo caso</div>
          <div style={{fontSize:12,color:TX3,marginTop:2}}>Sustracción Internacional · DGNNA</div>
        </div>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:`1px solid ${BR}`,background:BG,display:'flex',alignItems:'center',justifyContent:'center',color:TX2,cursor:'pointer'}}><X size={14}/></button>
      </div>
      <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:14}}>
        {error && <div style={{ background:'#FEF2F2', border:'0.5px solid #FECACA', borderRadius:7, padding:'9px 13px', marginBottom:14, color:'#991B1B', fontSize:12 }}>{error}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {([['Código / Hoja trámite','codigo'],['Nombre del NNA','nnaNombre']] as const).map(([lbl,k])=>(
            <div key={k}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:TX3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>{lbl}</label>
              <input autoFocus={k==='codigo'} value={(form[k] as string)||''} onChange={e=>set(k)(e.target.value)} style={inpS}/>
            </div>
          ))}
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:700,color:TX3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>País contraparte</label>
            <select value={form.pais||''} onChange={e=>set('pais')(e.target.value)} style={selS}>
              <option value="">Seleccionar…</option>
              {PAISES.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:700,color:TX3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>Fecha de ingreso</label>
            <input type="date" value={form.fechaIngreso||''} onChange={e=>set('fechaIngreso')(e.target.value)} style={inpS}/>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:700,color:TX3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>Etapa</label>
            <select value={form.etapa||''} onChange={e=>set('etapa')(e.target.value)} style={selS}>
              <option value="">—</option>
              {ETAPAS.map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:700,color:TX3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>Profesional</label>
            <select value={form.profesional||''} onChange={e=>set('profesional')(e.target.value)} style={selS}>
              <option value="">—</option>
              {PROFESIONALES.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div style={{padding:'0 24px 20px',display:'flex',gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:'10px',borderRadius:8,border:`1.5px solid ${BR}`,background:BG,color:TX2,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancelar</button>
        <button onClick={()=>{if(!form.codigo||!form.nnaNombre||!form.pais)return;onSave()}} disabled={saving} style={{flex:2,padding:'10px',borderRadius:8,border:'none',background:saving?'#94A3B8':BL,color:'#fff',fontSize:13,fontWeight:700,boxShadow:saving?'none':'0 2px 8px rgba(37,99,235,.35)',cursor:saving?'not-allowed':'pointer'}}>{saving ? 'Guardando...':'Registrar caso'}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAB DASHBOARD — helpers de UI (definidos fuera del render)
// ══════════════════════════════════════════════════════════════════════

function mesLabel(ym: string) {
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const [y, m] = ym.split('-')
  return `${meses[parseInt(m)-1]} ${y.slice(2)}`
}

function DashCard({ title, children, icon, span2 }: { title: string; children: React.ReactNode; icon?: React.ReactNode; span2?: boolean }) {
  return (
    <div style={{ background:'#fff', border:'0.5px solid #E2E8F0', borderRadius:10, padding:16, display:'flex', flexDirection:'column', gap:12, gridColumn: span2 ? 'span 2' : undefined }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h3 style={{ fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.5px', margin:0 }}>{title}</h3>
        {icon && <span style={{ color:'#94A3B8' }}>{icon}</span>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function DashProgressBar({ label, count, tot, color }: { label: string; count: number; tot: number; color: string }) {
  const pct = tot > 0 ? Math.round((count / tot) * 100) : 0
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
        <span style={{ color:'#1E293B', fontWeight:500 }}>{label}</span>
        <span style={{ color:'#64748B' }}>{count} <small style={{ opacity:0.6 }}>({pct}%)</small></span>
      </div>
      <div style={{ height:6, background:'#F1F5F9', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:99 }} />
      </div>
    </div>
  )
}

function DashBarChart({ data, max, color }: { data: [string, number][]; max: number; color: string }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:100, paddingBottom:20, position:'relative' }}>
      {data.length === 0 && (
        <p style={{ fontSize:12, color:'#94A3B8', margin:'auto' }}>Sin datos</p>
      )}
      {data.map(([mes, val]) => {
        const h = max > 0 ? Math.round((val / max) * 80) : 0
        return (
          <div key={mes} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            <span style={{ fontSize:9, color:'#64748B', fontWeight:600 }}>{val}</span>
            <div style={{ width:'100%', height:h, background:color, borderRadius:'3px 3px 0 0', minHeight: val > 0 ? 4 : 0 }} title={`${mesLabel(mes)}: ${val}`} />
            <span style={{ fontSize:8, color:'#94A3B8', whiteSpace:'nowrap', position:'absolute', bottom:0 }}>{mesLabel(mes)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// TAB DASHBOARD (Estadísticas)
// ══════════════════════════════════════════════════════════════════════

function TabDashboard({ casos }: { casos: Caso[] }) {
  // ── Filtro por período ────────────────────────────────────────────
  const [periodo, setPeriodo] = useState('todo')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')

  // Deriva las fechas desde el período elegido; solo en modo 'personalizado' usa el estado custom
  const { desde, hasta } = useMemo(() => {
    if (periodo === 'personalizado') return { desde: customDesde, hasta: customHasta }
    const hoy = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const fmt = (d: Date)   => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
    if (periodo === 'semana') {
      const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - hoy.getDay() + 1)
      return { desde: fmt(lunes), hasta: fmt(hoy) }
    } else if (periodo === 'mes') {
      return { desde: `${hoy.getFullYear()}-${pad(hoy.getMonth()+1)}-01`, hasta: fmt(hoy) }
    } else if (periodo === 'anio') {
      return { desde: `${hoy.getFullYear()}-01-01`, hasta: fmt(hoy) }
    }
    return { desde: '', hasta: '' } // 'todo'
  }, [periodo, customDesde, customHasta])

  const casosFiltrados = casos.filter(c => {
    if (!c.fechaIngreso) return true
    if (desde && c.fechaIngreso < desde) return false
    if (hasta && c.fechaIngreso > hasta) return false
    return true
  })

  // ── Exportar CSV ──────────────────────────────────────────────────
  function exportarCSV() {
    const cols = ['Código','NNA','Sexo','País','Etapa','Estado','Fecha Ingreso','Profesional']
    const rows = casosFiltrados.map(c => [
      c.codigo, c.nnaNombre, c.nnaSexo ?? '', c.pais,
      c.etapa ?? '', c.estado, c.fechaIngreso, c.profesional ?? '',
    ])
    const csv = [cols, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `sustraccion_estadisticas_${desde || 'inicio'}_${hasta || 'hoy'}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const total = casosFiltrados.length

  // ── 1. NNA por sexo ───────────────────────────────────────────────
  const nnaHombre   = casosFiltrados.filter(c => c.nnaSexo === 'Hombre').length
  const nnaMujer    = casosFiltrados.filter(c => c.nnaSexo === 'Mujer').length
  const nnaSinDato  = total - nnaHombre - nnaMujer

  // ── 2. Por etapa: Trámite / Administrativo / Judicial ────────────
  const enTramite        = casosFiltrados.filter(c => c.estado === 'Tramite').length
  const enPendiente      = casosFiltrados.filter(c => c.estado === 'Pendiente').length
  const enAdministrativo = casosFiltrados.filter(c => c.etapa === 'Administrativo').length
  const enJudicial       = casosFiltrados.filter(c => c.etapa === 'Judicial').length
  const enSinEtapa       = casosFiltrados.filter(c => !c.etapa).length
  const concluidos       = casosFiltrados.filter(c => c.estado === 'Archivado' || c.estado === 'Concluido').length

  // ── 3. Ingresos por mes ───────────────────────────────────────────
  const ingresosPorMes: Record<string, number> = {}
  casosFiltrados.forEach(c => {
    if (!c.fechaIngreso) return
    const mes = c.fechaIngreso.slice(0, 7)
    ingresosPorMes[mes] = (ingresosPorMes[mes] || 0) + 1
  })
  const ingresosMeses = Object.entries(ingresosPorMes)
    .sort(([a], [b]) => a.localeCompare(b))

  // ── 4. Ingresos por país (top 10) ─────────────────────────────────
  const porPaisMap: Record<string, number> = {}
  casosFiltrados.forEach(c => { const p = c.pais || 'Sin dato'; porPaisMap[p] = (porPaisMap[p] || 0) + 1 })
  const porPais = Object.entries(porPaisMap)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10)

  // ── 5. Concluidos por mes ─────────────────────────────────────────
  const concluidosPorMes: Record<string, number> = {}
  casosFiltrados.filter(c => c.estado === 'Archivado' || c.estado === 'Concluido').forEach(c => {
    const fecha = c.fechaSalida || c.fechaIngreso
    if (!fecha) return
    const mes = fecha.slice(0, 7)
    concluidosPorMes[mes] = (concluidosPorMes[mes] || 0) + 1
  })
  const concluidosMeses = Object.entries(concluidosPorMes)
    .sort(([a], [b]) => a.localeCompare(b))

  // ── Helpers ───────────────────────────────────────────────────────
  const COLORES_PAIS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#6366F1','#84CC16']

  const maxIngresos   = Math.max(...ingresosMeses.map(([,v]) => v), 1)
  const maxConcluidos = Math.max(...concluidosMeses.map(([,v]) => v), 1)

  return (
    <div style={{ padding:20, display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16 }}>

      {/* ── Barra de filtro ───────────────────────────────────────── */}
      <div style={{ gridColumn:'span 2', background:'#fff', border:'0.5px solid #E2E8F0', borderRadius:10, padding:'10px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>

        {/* Ícono filtro */}
        <Filter style={{ width:13, height:13, color:'#64748B', flexShrink:0 }} />

        {/* Selector de período */}
        <select value={periodo} onChange={e => setPeriodo(e.target.value)}
          style={{ border:'1px solid #E2E8F0', borderRadius:7, padding:'6px 10px', fontSize:12, color:'#1E293B', background:'#F8FAFC', outline:'none', cursor:'pointer', fontWeight:500, minWidth:120 }}>
          <option value="semana">Esta semana</option>
          <option value="mes">Este mes</option>
          <option value="anio">Este año</option>
          <option value="todo">Todo</option>
          <option value="personalizado">Personalizado</option>
        </select>

        {/* Separador */}
        <div style={{ width:1, height:22, background:'#E2E8F0' }} />

        {/* Fechas */}
        <input type="date" value={desde}
          onChange={e => { setCustomDesde(e.target.value); setPeriodo('personalizado') }}
          style={{ border:'1px solid #E2E8F0', borderRadius:7, padding:'6px 9px', fontSize:12, color:'#1E293B', outline:'none', background:'#F8FAFC' }} />
        <span style={{ fontSize:12, color:'#94A3B8' }}>—</span>
        <input type="date" value={hasta}
          onChange={e => { setCustomHasta(e.target.value); setPeriodo('personalizado') }}
          style={{ border:'1px solid #E2E8F0', borderRadius:7, padding:'6px 9px', fontSize:12, color:'#1E293B', outline:'none', background:'#F8FAFC' }} />

        {/* Contador */}
        <span style={{ fontSize:11, color:'#3B82F6', fontWeight:600, background:'#EFF6FF', padding:'3px 10px', borderRadius:99, marginLeft:4 }}>
          {total} caso{total !== 1 ? 's' : ''}
        </span>

        {/* Spacer */}
        <div style={{ flex:1 }} />

        {/* Botón Exportar */}
        <button onClick={exportarCSV}
          style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', border:'1px solid #E2E8F0', borderRadius:7, padding:'6px 14px', fontSize:12, color:'#1E293B', cursor:'pointer', fontWeight:500, transition:'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#F8FAFC'; (e.currentTarget as HTMLButtonElement).style.borderColor='#CBD5E1' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor='#E2E8F0' }}>
          <Download style={{ width:13, height:13 }} />
          Exportar
        </button>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────── */}
      <div style={{ gridColumn:'span 2', display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12 }}>
        <div style={{ background:'#1E3A5F', padding:'14px 18px', borderRadius:10, color:'#fff' }}>
          <p style={{ fontSize:10, opacity:0.7, textTransform:'uppercase', fontWeight:600, margin:'0 0 4px' }}>Total Casos</p>
          <p style={{ fontSize:26, fontWeight:700, margin:0 }}>{total}</p>
          {(desde || hasta) && <p style={{ fontSize:9, opacity:0.5, margin:'2px 0 0' }}>en el rango</p>}
        </div>
        <div style={{ background:'#fff', border:'1px solid #BFDBFE', padding:'14px 18px', borderRadius:10 }}>
          <p style={{ fontSize:10, color:'#1D4ED8', textTransform:'uppercase', fontWeight:600, margin:'0 0 4px' }}>En Trámite</p>
          <p style={{ fontSize:26, fontWeight:700, color:'#1E293B', margin:0 }}>{enTramite}</p>
        </div>
        <div style={{ background:'#fff', border:'1px solid #FDE68A', padding:'14px 18px', borderRadius:10 }}>
          <p style={{ fontSize:10, color:'#92400E', textTransform:'uppercase', fontWeight:600, margin:'0 0 4px' }}>Pendiente</p>
          <p style={{ fontSize:26, fontWeight:700, color:'#1E293B', margin:0 }}>{enPendiente}</p>
        </div>
        <div style={{ background:'#fff', border:'1px solid #BBF7D0', padding:'14px 18px', borderRadius:10 }}>
          <p style={{ fontSize:10, color:'#15803D', textTransform:'uppercase', fontWeight:600, margin:'0 0 4px' }}>Concluidos</p>
          <p style={{ fontSize:26, fontWeight:700, color:'#1E293B', margin:0 }}>{concluidos}</p>
        </div>
        <div style={{ background:'#fff', border:'1px solid #E2E8F0', padding:'14px 18px', borderRadius:10 }}>
          <p style={{ fontSize:10, color:'#64748B', textTransform:'uppercase', fontWeight:600, margin:'0 0 4px' }}>Retornos Ef.</p>
          <p style={{ fontSize:26, fontWeight:700, color:'#1E293B', margin:0 }}>{casosFiltrados.filter(c => c.retorno === 'SI').length}</p>
        </div>
      </div>

      {/* ── 1. NNA por sexo ─────────────────────────────────────── */}
      <DashCard title="NNA por Sexo" icon={<User style={{ width:13, height:13 }} />}>
        <div style={{ display:'flex', gap:12, marginBottom:14 }}>
          <div style={{ flex:1, background:'#EFF6FF', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
            <p style={{ fontSize:22, fontWeight:700, color:'#2563EB', margin:0 }}>{nnaHombre}</p>
            <p style={{ fontSize:10, color:'#3B82F6', textTransform:'uppercase', margin:'2px 0 0' }}>Hombres</p>
          </div>
          <div style={{ flex:1, background:'#FDF2F8', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
            <p style={{ fontSize:22, fontWeight:700, color:'#DB2777', margin:0 }}>{nnaMujer}</p>
            <p style={{ fontSize:10, color:'#EC4899', textTransform:'uppercase', margin:'2px 0 0' }}>Mujeres</p>
          </div>
          {nnaSinDato > 0 && (
            <div style={{ flex:1, background:'#F8FAFC', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
              <p style={{ fontSize:22, fontWeight:700, color:'#94A3B8', margin:0 }}>{nnaSinDato}</p>
              <p style={{ fontSize:10, color:'#94A3B8', textTransform:'uppercase', margin:'2px 0 0' }}>Sin dato</p>
            </div>
          )}
        </div>
        {/* Barra proporcional */}
        {total > 0 && (
          <div style={{ height:10, borderRadius:99, overflow:'hidden', display:'flex', gap:2 }}>
            {nnaHombre > 0 && <div style={{ flex: nnaHombre, background:'#3B82F6', borderRadius:99 }} />}
            {nnaMujer > 0  && <div style={{ flex: nnaMujer,  background:'#EC4899', borderRadius:99 }} />}
            {nnaSinDato > 0 && <div style={{ flex: nnaSinDato, background:'#E2E8F0', borderRadius:99 }} />}
          </div>
        )}
      </DashCard>

      {/* ── 2. Por etapa: Trámite / Administrativo / Judicial ───── */}
      <DashCard title="Estado del Trámite" icon={<Scale style={{ width:13, height:13 }} />}>
        <DashProgressBar label="En Trámite (total)" count={enTramite} tot={total} color="#3B82F6" />
        {enPendiente > 0 && <DashProgressBar label="Pendiente" count={enPendiente} tot={total} color="#F59E0B" />}
        <DashProgressBar label="Concluidos / Archivados" count={concluidos} tot={total} color="#10B981" />
        {total > 0 && <>
          <div style={{ height:1, background:'#F1F5F9', margin:'8px 0 6px' }} />
          <p style={{ fontSize:10, color:'#94A3B8', textTransform:'uppercase', fontWeight:600, margin:'0 0 6px' }}>Desglose por Etapa</p>
          <DashProgressBar label="Etapa Administrativa" count={enAdministrativo} tot={total} color="#F59E0B" />
          <DashProgressBar label="Etapa Judicial" count={enJudicial} tot={total} color="#8B5CF6" />
          {enSinEtapa > 0 && <DashProgressBar label="Sin etapa asignada" count={enSinEtapa} tot={total} color="#CBD5E1" />}
        </>}
      </DashCard>

      {/* ── 3. Ingresos por mes ──────────────────────────────────── */}
      <DashCard title="Ingresos por Mes" icon={<TrendingUp style={{ width:13, height:13 }} />}>
        <DashBarChart data={ingresosMeses} max={maxIngresos} color="#3B82F6" />
        {ingresosMeses.length === 0 && <p style={{ fontSize:12, color:'#94A3B8', textAlign:'center', margin:0 }}>Sin datos</p>}
      </DashCard>

      {/* ── 5. Concluidos por mes ────────────────────────────────── */}
      <DashCard title="Concluidos por Mes" icon={<CheckCircle style={{ width:13, height:13 }} />}>
        <DashBarChart data={concluidosMeses} max={maxConcluidos} color="#10B981" />
        {concluidosMeses.length === 0 && <p style={{ fontSize:12, color:'#94A3B8', textAlign:'center', margin:0 }}>Sin datos</p>}
      </DashCard>

      {/* ── 4. Ingresos por país ─────────────────────────────────── */}
      <DashCard title="Ingresos por País" icon={<Globe style={{ width:13, height:13 }} />} span2>
        {porPais.length === 0 ? (
          <p style={{ fontSize:12, color:'#94A3B8', textAlign:'center', margin:0 }}>Sin datos</p>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
            {porPais.map((p, i) => (
              <DashProgressBar key={p.nombre} label={p.nombre} count={p.cantidad} tot={total} color={COLORES_PAIS[i % COLORES_PAIS.length]} />
            ))}
          </div>
        )}
      </DashCard>

    </div>
  )
}
