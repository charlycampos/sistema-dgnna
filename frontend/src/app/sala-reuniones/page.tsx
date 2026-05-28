'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, ChevronLeft, ChevronRight,
  Trash2, Edit, X, AlertTriangle, CalendarDays,
  List, LayoutDashboard, Download, Search, Clock,
  User, Menu, LayoutGrid
} from 'lucide-react'
import Link from 'next/link'
import { useMe } from '@/lib/use-me'

// ─── Tipos ────────────────────────────────────────────────────────
interface Reserva {
  id: string
  fecha: string
  titulo: string
  horaInicio: string
  horaFin: string
  categoria: string
  estado: string
  descripcion?: string | null
  creadoPor?: string | null
  createdAt: string
  updatedAt: string
}

interface FormReserva {
  fecha: string
  titulo: string
  horaInicio: string
  horaFin: string
  categoria: string
  estado: string
  descripcion: string
}

type Tab = 'calendario' | 'bandeja' | 'dashboard'

// ─── TOKENS & COLORES (Sincronizado con maqueta) ───────────────────
const NK = '#111827'
const N2 = '#1E3A5F'
const BL = '#2563EB'
const BG = '#EEF2F7'
const SURF = '#FFFFFF'
const BR = '#E2E8F0'
const TX = '#3C4043' // Estilo Google Calendar (#3c4043)
const TX2 = '#5F6368' // Estilo Google Calendar (#5f6368)
const TX3 = '#80868B'

const CATEGORIAS = ['Reunión interna', 'Reunión externa', 'Capacitación', 'Coordinación', 'Directora', 'Otra']
const ESTADOS = ['Programado', 'Realizado', 'Cancelado', 'Reprogramado']

const CC: Record<string, { s: string; l: string; t: string }> = {
  'Reunión interna': { s: '#1A73E8', l: '#E8F0FE', t: '#174EA6' },
  'Reunión externa': { s: '#0F9D58', l: '#E6F4EA', t: '#137333' },
  'Capacitación':    { s: '#F4B400', l: '#FEF7E0', t: '#B06000' },
  'Coordinación':    { s: '#AF52DE', l: '#F3E8FD', t: '#7627A0' },
  'Directora':       { s: '#E91E63', l: '#FCE4EC', t: '#C2185B' },
  'Otra':            { s: '#70757A', l: '#F1F3F4', t: '#3C4043' },
}

const EC: Record<string, { s: string; l: string; t: string; r: string }> = {
  'Programado':   { s: '#1A73E8', l: '#E8F0FE', t: '#174EA6', r: '#D2E3FC' },
  'Realizado':    { s: '#0F9D58', l: '#E6F4EA', t: '#137333', r: '#CEEAD6' },
  'Cancelado':    { s: '#D93025', l: '#FCE8E6', t: '#C5221F', r: '#FAD2CF' },
  'Reprogramado': { s: '#E37400', l: '#FEF3E6', t: '#B06000', r: '#FFE0B2' },
}

const gc = (k: string) => CC[k] ?? CC['Otra']
const ge = (k: string) => EC[k] ?? EC['Programado']

// ─── Feriados Perú 2025–2026 ──────────────────────────────────────
const FERIADOS: Record<string, string> = {
  '2025-01-01': 'Año Nuevo', '2025-04-17': 'Jueves Santo', '2025-04-18': 'Viernes Santo',
  '2025-05-01': 'Día del Trabajo', '2025-06-07': 'Batalla de Arica',
  '2025-06-29': 'San Pedro y San Pablo', '2025-07-23': 'Día de la FAP',
  '2025-07-28': 'Fiestas Patrias', '2025-07-29': 'Fiestas Patrias',
  '2025-08-06': 'Batalla de Junín', '2025-08-30': 'Santa Rosa de Lima',
  '2025-10-08': 'Combate de Angamos', '2025-11-01': 'Todos los Santos',
  '2025-12-08': 'Inmaculada Concepción', '2025-12-25': 'Navidad',
  '2026-01-01': 'Año Nuevo', '2026-04-02': 'Jueves Santo', '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajo', '2026-06-07': 'Batalla de Arica',
  '2026-06-29': 'San Pedro y San Pablo', '2026-07-23': 'Día de la FAP',
  '2026-07-28': 'Fiestas Patrias', '2026-07-29': 'Fiestas Patrias',
  '2026-08-06': 'Batalla de Junín', '2026-08-30': 'Santa Rosa de Lima',
  '2026-10-08': 'Combate de Angamos', '2026-11-01': 'Todos los Santos',
  '2026-12-08': 'Inmaculada Concepción', '2026-12-25': 'Navidad',
}

// ─── Helpers ──────────────────────────────────────────────────────
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const toKey = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const todayKey = () => { const t = new Date(); return toKey(t.getFullYear(), t.getMonth(), t.getDate()) }
const dimM = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
const fdow = (y: number, m: number) => new Date(y, m, 1).getDay()
const mesP = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`
const fmtD = (f: string) => { if (!f) return ''; const [y, mo, d] = f.split('-'); return `${d}/${mo}/${y}` }
const tMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

function downloadCSV(data: Reserva[]) {
  const h = ['Fecha', 'Título', 'Hora Inicio', 'Hora Fin', 'Categoría', 'Estado', 'Creado por', 'Descripción']
  const rows = data.map(r => [r.fecha, r.titulo, r.horaInicio, r.horaFin, r.categoria, r.estado, r.creadoPor ?? '', r.descripcion ?? ''])
  const csv = [h, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = 'reservas_sala.csv'; a.click()
}

// ─── Estilos base ─────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#FFFFFF',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: '#3C4043',
    WebkitFontSmoothing: 'antialiased',
  } as React.CSSProperties,
  card: {
    background: SURF,
    border: `1px solid ${BR}`,
    borderRadius: 8,
    boxShadow: 'none',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#5F6368',
    textTransform: 'uppercase' as const,
    letterSpacing: '.06em',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: `1px solid ${BR}`,
    borderRadius: 4,
    fontSize: 14,
    color: '#3C4043',
    background: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color .15s',
  },
}

// ═════════════════════════════════════════════════════════════════
export default function SalaReunionesPage() {
  const router = useRouter()
  const { me, loading: meLoading, hasAccess } = useMe()
  const TODAY = todayKey()

  // Guard de acceso: solo admins y usuarios con módulo 'sala-reuniones'
  useEffect(() => {
    if (!meLoading && me && !hasAccess('sala-reuniones')) {
      router.replace('/menu')
    }
  }, [me, meLoading, hasAccess, router])

  const [tab, setTab] = useState<Tab>('calendario')
  const [allR, setAllR] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())

  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [conflicto, setConflicto] = useState<string | null>(null)

  const fi: FormReserva = { fecha: TODAY, titulo: '', horaInicio: '09:00', horaFin: '10:00', categoria: 'Reunión interna', estado: 'Programado', descripcion: '' }
  const [form, setForm] = useState<FormReserva>(fi)

  const [bs, setBs] = useState('')
  const [bm, setBm] = useState('')
  const [be, setBe] = useState('')
  const [bc, setBc] = useState('')

  const [selDay, setSelDay] = useState<string | null>(null)

  // ── Estados Estilo Google Calendar ──────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [visibleCats, setVisibleCats] = useState<Record<string, boolean>>(() =>
    CATEGORIAS.reduce((acc, c) => ({ ...acc, [c]: true }), {})
  )

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/sala-reuniones')
      if (r.ok) setAllR(await r.json())
      else toast.error('Error al cargar reservas')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Reservas del mes actual filtradas en cliente
  const mesReservas = useMemo(() => {
    return allR.filter(r => r.fecha.startsWith(mesP(year, month)))
  }, [allR, year, month])

  // Filtro de categorías visibles (Estilo Google Calendar)
  const mesReservasFiltered = useMemo(() => {
    return mesReservas.filter(r => visibleCats[r.categoria] !== false)
  }, [mesReservas, visibleCats])

  // ── Navegación ─────────────────────────────────────────────────
  const prevM = () => {
    if (month === 0) {
      setYear(y => y - 1)
      setMonth(11)
    } else setMonth(m => m - 1)
  }
  const nextM = () => {
    if (month === 11) {
      setYear(y => y + 1)
      setMonth(0)
    } else setMonth(m => m + 1)
  }
  const goT = () => {
    const t = new Date()
    setYear(t.getFullYear())
    setMonth(t.getMonth())
    setSelDay(todayKey())
  }

  // ── Modal ──────────────────────────────────────────────────────
  const openNew = (fecha?: string) => {
    setEditId(null)
    setConflicto(null)
    setForm({ ...fi, fecha: fecha ?? TODAY })
    setShowModal(true)
  }
  const openEdit = (r: Reserva) => {
    setEditId(r.id)
    setConflicto(null)
    setForm({
      fecha: r.fecha,
      titulo: r.titulo,
      horaInicio: r.horaInicio,
      horaFin: r.horaFin,
      categoria: r.categoria,
      estado: r.estado,
      descripcion: r.descripcion ?? ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast.error('El responsable/evento es obligatorio')
      return
    }
    if (form.horaInicio >= form.horaFin) {
      toast.error('La hora de fin debe ser mayor a la hora de inicio')
      return
    }
    setSaving(true)
    setConflicto(null)
    try {
      const res = await fetch(editId ? `/api/sala-reuniones/${editId}` : '/api/sala-reuniones', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, creadoPor: me?.nombre }),
      })
      const d = await res.json()
      if (res.status === 409) {
        setConflicto(d.detail ?? 'Conflicto de horario: Ya existe otra reserva registrada en este rango.')
        return
      }
      if (!res.ok) {
        toast.error(d.detail ?? 'Error al guardar reserva')
        return
      }
      toast.success(editId ? 'Reserva actualizada' : 'Reserva registrada exitosamente')
      setShowModal(false)
      const p = form.fecha.split('-')
      setYear(parseInt(p[0]))
      setMonth(parseInt(p[1]) - 1)
      setSelDay(form.fecha)
      fetchAll()
    } catch {
      toast.error('Error inesperado de comunicación')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editId) return
    if (!confirm('¿Estás seguro de que deseas eliminar esta reserva?')) return
    try {
      const r = await fetch(`/api/sala-reuniones/${editId}`, { method: 'DELETE' })
      if (!r.ok) {
        toast.error('Error al eliminar reserva')
        return
      }
      toast.success('Reserva eliminada')
      setShowModal(false)
      fetchAll()
    } catch {
      toast.error('Error al conectar con el servidor')
    }
  }

  const quickEst = async (id: string, estado: string) => {
    try {
      const r = await fetch(`/api/sala-reuniones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado })
      })
      if (r.ok) {
        toast.success('Estado actualizado')
        fetchAll()
      } else {
        toast.error('No se pudo actualizar el estado')
      }
    } catch {
      toast.error('Error de conexión')
    }
  }

  // ── Cómputos ───────────────────────────────────────────────────
  const diasOc = useMemo(() => {
    return new Set(mesReservasFiltered.filter(r => r.estado !== 'Cancelado').map(r => r.fecha)).size
  }, [mesReservasFiltered])

  const disp = useMemo(() => {
    return Math.round(Math.max(0, (22 - diasOc) / 22) * 100)
  }, [diasOc])

  const evMap = useMemo(() => {
    const map: Record<string, Reserva[]> = {}
    mesReservasFiltered.forEach(r => {
      (map[r.fecha] ??= []).push(r)
    })
    return map
  }, [mesReservasFiltered])

  const selEvs = useMemo(() => {
    if (!selDay) return []
    return (evMap[selDay] ?? []).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
  }, [selDay, evMap])

  const bandeja = useMemo(() => {
    return allR.filter(r => {
      const q = bs.toLowerCase()
      if (q && !r.titulo.toLowerCase().includes(q) && !(r.creadoPor ?? '').toLowerCase().includes(q)) return false
      if (bm && !r.fecha.startsWith(bm)) return false
      if (be && r.estado !== be) return false
      if (bc && r.categoria !== bc) return false
      return true
    }).sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [allR, bs, bm, be, bc])

  const total = allR.length
  const porMes = useMemo(() => {
    return MESES.map((m, i) => {
      const p = `${year}-${String(i + 1).padStart(2, '0')}`
      return { m: m.slice(0, 3), n: allR.filter(r => r.fecha.startsWith(p)).length }
    })
  }, [allR, year])

  const maxMes = useMemo(() => {
    return Math.max(...porMes.map(p => p.n), 1)
  }, [porMes])

  const daysNum = dimM(year, month)
  const first = fdow(year, month)
  const prevDim = dimM(year, month === 0 ? 11 : month - 1)
  const totalCells = Math.ceil((first + daysNum) / 7) * 7

  const tabs = [
    { id: 'calendario' as Tab, label: 'Calendario', icon: <CalendarDays size={14} /> },
    { id: 'bandeja' as Tab, label: 'Bandeja', icon: <List size={14} /> },
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
  ]

  // Configuración de horas para la vista de cronograma diario
  const HOUR_START = 8
  const HOUR_END = 20
  const HOUR_H = 50
  const totalH = (HOUR_END - HOUR_START) * HOUR_H

  const getPos = (t: string) => {
    const min = tMin(t)
    const offsetMin = min - HOUR_START * 60
    return Math.max(0, (offsetMin / 60) * HOUR_H)
  }

  const getH = (s: string, e: string) => {
    const diff = (tMin(e) - tMin(s)) / 60
    return Math.max(22, diff * HOUR_H)
  }

  return (
    <div style={S.page}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideR{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .anim-r{animation:slideR .22s cubic-bezier(.2,.8,.4,1) both}
        .anim-u{animation:fadeUp .2s ease-out both}
        input, select, textarea { font-family: inherit; }
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#DADCE0;border-radius:99px}
        
        .hover-circle { transition: background .12s; }
        .hover-circle:hover { background: #F1F3F4 !important; }
        .hover-btn { transition: background .12s, border-color .12s; }
        .hover-btn:hover { background: #F8F9FA !important; border-color: #DADCE0 !important; }
        .tab-btn:hover { background: #F8F9FA !important; }
        
        .cat-item { transition: background .12s; padding: 6px 12px; border-radius: 4px; }
        .cat-item:hover { background: #F1F3F4; }
        
        .event-pill { transition: transform .12s, filter .12s; }
        .event-pill:hover { transform: translateY(-0.5px); filter: brightness(0.96); }
      `}} />

      {/* ── HEADER (Estilo Google Calendar) ───────────────────────── */}
      <header style={{ background: SURF, flexShrink: 0, borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', height: 64, padding: '0 16px', gap: 8, zIndex: 40 }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ border: 'none', background: 'transparent', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5F6368', cursor: 'pointer', outline: 'none' }} className="hover-circle">
          <Menu size={20} />
        </button>

        <Link href="/menu" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', marginLeft: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1A73E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarDays size={18} color="#fff" />
          </div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 500, color: '#3C4043', letterSpacing: '-0.02em', display: 'block', lineHeight: 1 }}>
              Sala de Reuniones
            </span>
            <span style={{ fontSize: 10, color: TX3, fontWeight: 500 }}>DGNNA · Gestión de reservas</span>
          </div>
        </Link>

        {/* Controles de Navegación del Mes (Google Calendar Style) */}
        {tab === 'calendario' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 32 }}>
            <button onClick={goT} style={{ padding: '6px 12px', borderRadius: 4, border: `1px solid ${BR}`, background: SURF, fontSize: 14, color: '#3C4043', fontWeight: 500, cursor: 'pointer' }} className="hover-btn">
              Hoy
            </button>
            <button onClick={prevM} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5F6368', cursor: 'pointer', outline: 'none' }} className="hover-circle">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextM} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5F6368', cursor: 'pointer', outline: 'none' }} className="hover-circle">
              <ChevronRight size={18} />
            </button>
            <div style={{ fontSize: 18, fontWeight: 500, color: '#3C4043', marginLeft: 8, minWidth: 160 }}>
              {MESES[month]} de {year}
            </div>
          </div>
        )}

        {/* View Switcher en formato Grupo de Botones de Google Calendar */}
        <div style={{ display: 'flex', border: `1px solid ${BR}`, borderRadius: 4, overflow: 'hidden', marginLeft: 'auto' }}>
          <Link href="/menu"
            style={{
              textDecoration: 'none',
              border: 'none',
              background: SURF,
              color: '#3C4043',
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            className="tab-btn">
            <LayoutGrid size={14} />
            Módulos
          </Link>
          {tabs.map((t) => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  border: 'none',
                  background: active ? '#EFF6FF' : SURF,
                  color: active ? '#1A73E8' : '#3C4043',
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                  borderLeft: `1px solid ${BR}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                className="tab-btn">
                {t.icon}
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Perfil o Inicial de Usuario */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1A73E8,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700, cursor: 'default' }} title={me?.nombre ?? 'Usuario'}>
            {me?.nombre?.charAt(0).toUpperCase() ?? 'U'}
          </div>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL (Con Sidebar estilo Google Calendar) ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Sidebar izquierdo (Estilo Google Calendar) */}
        {tab === 'calendario' && sidebarOpen && (
          <aside style={{ width: 256, flexShrink: 0, borderRight: `1px solid ${BR}`, background: SURF, padding: '16px 12px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            
            {/* "+ Crear" Pill Button con sombra flotante */}
            <button onClick={() => openNew()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 24px 12px 18px',
                borderRadius: 24,
                background: SURF,
                boxShadow: '0 1px 3px rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: '#3C4043',
                transition: 'box-shadow .15s',
                width: 'fit-content',
                marginBottom: 28,
                marginTop: 4,
              }}
              onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 6px rgba(60,64,67,0.3), 0 8px 12px 6px rgba(60,64,67,0.15)'}
              onMouseOut={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)'}>
              <div style={{ width: 24, height: 24, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ position: 'absolute', width: 14, height: 3, background: '#34A853', borderRadius: 9 }} />
                <span style={{ position: 'absolute', width: 3, height: 14, background: '#EA4335', borderRadius: 9 }} />
                <span style={{ position: 'absolute', width: 10, height: 3, background: '#4285F4', borderRadius: 9, transform: 'rotate(90deg)' }} />
                <span style={{ position: 'absolute', width: 3, height: 10, background: '#FBBC05', borderRadius: 9, transform: 'rotate(90deg)' }} />
              </div>
              <span>Crear</span>
            </button>

            {/* Panel de Checkboxes de "Mis Categorías" */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#5F6368', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10, paddingLeft: 8 }}>
                Categorías de reunión
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {CATEGORIAS.map(cat => {
                  const col = gc(cat)
                  const visible = visibleCats[cat] !== false
                  return (
                    <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} className="cat-item">
                      <input type="checkbox" checked={visible} onChange={() => setVisibleCats(prev => ({ ...prev, [cat]: !visible }))}
                        style={{ width: 16, height: 16, accentColor: col.s, cursor: 'pointer', borderRadius: 4 }} />
                      <span style={{ fontSize: 13, color: '#3C4043', fontWeight: 500 }}>{cat}</span>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.s, marginLeft: 'auto' }}></span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Divisor y Resumen de Estadísticas del Mes */}
            <div style={{ borderTop: `1px solid ${BR}`, marginTop: 24, paddingTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#5F6368', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12, paddingLeft: 8 }}>
                Resumen del mes
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#5F6368' }}>Total reservas:</span>
                  <span style={{ fontWeight: 700, color: '#1A73E8' }}>{mesReservas.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#5F6368' }}>Días ocupados:</span>
                  <span style={{ fontWeight: 700, color: '#7C3AED' }}>{diasOc}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#5F6368' }}>Disponibilidad:</span>
                  <span style={{ fontWeight: 700, color: '#0F9D58' }}>{disp}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#5F6368' }}>Canceladas:</span>
                  <span style={{ fontWeight: 700, color: '#D93025' }}>{mesReservas.filter(r => r.estado === 'Cancelado').length}</span>
                </div>
              </div>
            </div>

          </aside>
        )}

        {/* ══════════════════════════════════════════════════════════
            VISTA CALENDARIO PRINCIPAL (Grilla y Panel Lateral)
        ══════════════════════════════════════════════════════════ */}
        {tab === 'calendario' && (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Grilla Principal del Calendario */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                {/* Cabecera de días de la semana */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: `1px solid ${BR}` }}>
                  {DIAS.map((d, i) => (
                    <div key={d} style={{ textAlign: 'center', padding: '12px 0 8px', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: i === 0 || i === 6 ? '#D93025' : '#70757A' }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Grilla mensual de celdas */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: TX3, gap: 10 }}>
                      <div style={{ width: 22, height: 22, border: '2px solid #E2E8F0', borderTopColor: '#1A73E8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Cargando calendario...
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', minHeight: '100%', borderLeft: `1px solid ${BR}` }}>
                      {Array.from({ length: totalCells }, (_, i) => {
                        const dow = i % 7
                        let dn, cy = year, cm = month, isOther = false
                        if (i < first) {
                          cm = month === 0 ? 11 : month - 1
                          cy = month === 0 ? year - 1 : year
                          dn = prevDim - first + i + 1
                          isOther = true
                        } else if (i >= first + daysNum) {
                          dn = i - first - daysNum + 1
                          cm = month === 11 ? 0 : month + 1
                          cy = month === 11 ? year + 1 : year
                          isOther = true
                        } else dn = i - first + 1

                        const key = toKey(cy, cm, dn)
                        const isToday = key === TODAY
                        const isWknd = dow === 0 || dow === 6
                        const isFer = !isOther && !!FERIADOS[key]
                        const dayEvs = evMap[key] ?? []
                        const isSel = selDay === key
                        const colIdx = i % 7

                        let bg = isOther ? '#FAFAFA' : isFer ? '#FFF9F9' : '#FFFFFF'
                        if (isSel) bg = '#E8F0FE' // Azul suave de selección de Google

                        return (
                          <div key={i} onClick={() => { if (!isOther) setSelDay(isSel ? null : key) }}
                            style={{
                              minHeight: 118,
                              padding: '6px 4px 4px',
                              background: bg,
                              cursor: isOther ? 'default' : 'pointer',
                              borderRight: `1px solid ${BR}`,
                              borderBottom: `1px solid ${BR}`,
                              transition: 'background .1s',
                              outline: isSel ? `2px solid #1A73E8` : 'none',
                              outlineOffset: -2,
                              position: 'relative'
                            }}>
                            
                            {/* Número del día */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 6 }}>
                              <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: isToday ? 700 : 500,
                                background: isToday ? '#1A73E8' : 'transparent',
                                color: isToday ? '#fff' : isFer ? '#D93025' : isOther ? '#CBD5E1' : '#3C4043'
                              }}>
                                {dn}
                              </div>
                              {isFer && (
                                <span style={{ fontSize: 9, color: '#D93025', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%', marginTop: 1 }}>
                                  {FERIADOS[key]}
                                </span>
                              )}
                            </div>

                            {/* Píldoras de eventos estilo Google Calendar */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {dayEvs.slice(0, 3).map(ev => {
                                const col = gc(ev.categoria)
                                const canceled = ev.estado === 'Cancelado'
                                return (
                                  <div key={ev.id} onClick={e => { e.stopPropagation(); openEdit(ev) }}
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: 4,
                                      background: canceled ? `${col.l}cc` : col.l,
                                      borderLeft: `3px solid ${col.s}`,
                                      color: col.t,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      overflow: 'hidden',
                                      whiteSpace: 'nowrap',
                                      textOverflow: 'ellipsis',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      opacity: canceled ? .6 : 1,
                                      textDecoration: canceled ? 'line-through' : 'none',
                                    }}
                                    className="event-pill"
                                    title={`${ev.horaInicio} ${ev.titulo}`}>
                                    <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.8, flexShrink: 0 }}>{ev.horaInicio}</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.titulo}</span>
                                  </div>
                                )
                              })}
                              {dayEvs.length > 3 && (
                                <div style={{ fontSize: 10, color: '#1A73E8', paddingLeft: 6, fontWeight: 700 }}>
                                  +{dayEvs.length - 3} más
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Panel Lateral Deslizante (DayPanel) */}
              {selDay && (
                <div className="anim-r" style={{ width: 340, flexShrink: 0, background: SURF, borderLeft: `1px solid ${BR}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 30 }}>
                  {(() => {
                    const [dy, dm, dd] = selDay.split('-').map(Number)
                    const dowSel = new Date(dy, dm - 1, dd).getDay()
                    const dLabel = `${DIAS[dowSel]}, ${dd} de ${MESES[dm - 1]}`
                    const fer = FERIADOS[selDay]
                    return (
                      <>
                        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#3C4043' }}>{dLabel}</div>
                            {fer && <div style={{ fontSize: 11, color: '#D93025', fontWeight: 600, marginTop: 2 }}>★ {fer}</div>}
                            <div style={{ fontSize: 11, color: TX3, marginTop: 1 }}>{selEvs.length} reserva{selEvs.length !== 1 ? 's' : ''}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openNew(selDay)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: 'none', background: '#1A73E8', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              <Plus size={12} /> Añadir
                            </button>
                            <button onClick={() => setSelDay(null)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${BR}`, background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TX2, cursor: 'pointer' }}>
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                          {selEvs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px 0', color: TX3 }}>
                              <CalendarDays size={32} color={BR} style={{ margin: '0 auto' }} />
                              <div style={{ marginTop: 10, fontSize: 13 }}>Sin reservas este día</div>
                              <button onClick={() => openNew(selDay)} style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: `1.5px solid #1A73E8`, background: '#EFF6FF', color: '#1A73E8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                Nueva reserva
                              </button>
                            </div>
                          ) : (
                            <div style={{ position: 'relative', marginLeft: 40 }}>
                              {/* Marcas de horas */}
                              {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, idx) => {
                                const h = HOUR_START + idx
                                return (
                                  <div key={h} style={{ position: 'absolute', left: -36, right: 0, top: idx * HOUR_H, display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
                                    <span style={{ fontSize: 10, color: TX3, width: 28, textAlign: 'right', fontWeight: 500, letterSpacing: '.01em' }}>
                                      {String(h).padStart(2, '0')}:00
                                    </span>
                                    <div style={{ flex: 1, height: 1, background: idx === 0 ? BR : `${BR}88` }}></div>
                                  </div>
                                )
                              })}
                              {/* Bloques de reservas */}
                              <div style={{ position: 'relative', height: totalH }}>
                                {selEvs.map(ev => {
                                  const colState = ge(ev.estado)
                                  const catCol = gc(ev.categoria)
                                  const topPos = getPos(ev.horaInicio)
                                  const heightBlock = getH(ev.horaInicio, ev.horaFin)
                                  const canceled = ev.estado === 'Cancelado'
                                  return (
                                    <div key={ev.id} onClick={() => openEdit(ev)} title={`${ev.titulo} · ${ev.horaInicio}–${ev.horaFin}`}
                                      style={{ position: 'absolute', left: 0, right: 0, top: topPos, height: heightBlock, borderRadius: 6, background: canceled ? colState.l : catCol.l, borderLeft: `3px solid ${canceled ? colState.s : catCol.s}`, padding: '6px 10px', cursor: 'pointer', opacity: canceled ? .6 : 1, overflow: 'hidden', transition: 'all .1s', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: canceled ? colState.t : catCol.t, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textDecoration: canceled ? 'line-through' : 'none' }}>
                                        {ev.titulo}
                                      </div>
                                      <div style={{ fontSize: 10, color: TX3, marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                                        <Clock size={9} />{ev.horaInicio}–{ev.horaFin}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            BANDEJA DE RESERVAS
        ══════════════════════════════════════════════════════════ */}
        {tab === 'bandeja' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8F9FA', padding: '20px' }}>
            <div style={{ background: SURF, borderRadius: 8, border: `1px solid ${BR}`, display: 'flex', gap: 10, padding: '14px 20px', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0, marginBottom: 16 }}>
              <div style={{ position: 'relative', flex: '1 1 220px' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <Search size={14} color={TX3} />
                </span>
                <input value={bs} onChange={e => setBs(e.target.value)} placeholder="Buscar por título o responsable…" style={{ ...S.input, paddingLeft: 32, width: '100%' }} />
              </div>
              <input type="month" value={bm} onChange={e => setBm(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${BR}`, borderRadius: 4, fontSize: 13, color: '#3C4043', background: '#FFFFFF', outline: 'none' }} />
              <select value={be} onChange={e => setBe(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${BR}`, borderRadius: 4, fontSize: 13, color: '#3C4043', background: '#FFFFFF', outline: 'none', minWidth: 150 }}>
                <option value="">Todos los estados</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <select value={bc} onChange={e => setBc(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${BR}`, borderRadius: 4, fontSize: 13, color: '#3C4043', background: '#FFFFFF', outline: 'none', minWidth: 150 }}>
                <option value="">Todas las categorías</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {(bs || bm || be || bc) && (
                <button onClick={() => { setBs(''); setBm(''); setBe(''); setBc('') }} style={{ padding: '8px 12px', borderRadius: 4, border: `1px solid ${BR}`, background: '#FFFFFF', color: TX2, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} className="hover-btn">
                  <X size={12} /> Limpiar
                </button>
              )}
              <button onClick={() => downloadCSV(bandeja)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 4, border: `1px solid ${BR}`, background: '#FFFFFF', color: TX2, fontSize: 12, fontWeight: 600, cursor: 'pointer' }} className="hover-btn">
                <Download size={13} /> Exportar CSV
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 11, color: TX3, fontWeight: 600, marginBottom: 10 }}>
                {bandeja.length} reserva{bandeja.length !== 1 ? 's' : ''}
              </div>
              <div style={{ background: SURF, borderRadius: 8, border: `1px solid ${BR}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Fecha', 'Evento / Responsable', 'Horario', 'Categoría', 'Estado', 'Registrado por', ''].map((h, i) => (
                        <th key={i} style={{ padding: '12px 14px', textAlign: i === 6 ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: TX2, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap', borderBottom: `2px solid ${BR}` }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bandeja.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: TX3, fontSize: 13 }}>
                          Sin resultados
                        </td>
                      </tr>
                    )}
                    {bandeja.map((r, idx) => {
                      const cat = gc(r.categoria)
                      const est = ge(r.estado)
                      const canceled = r.estado === 'Cancelado'
                      return (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${BR}`, background: idx % 2 === 0 ? SURF : '#FAFBFC', opacity: canceled ? .65 : 1 }}>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 700, color: '#3C4043', fontSize: 12 }}>{fmtD(r.fecha)}</div>
                            {FERIADOS[r.fecha] && <div style={{ fontSize: 10, color: '#D93025', fontWeight: 600, marginTop: 2 }}>★ {FERIADOS[r.fecha]}</div>}
                          </td>
                          <td style={{ padding: '12px 14px', maxWidth: 220 }}>
                            <div style={{ fontWeight: 600, color: '#3C4043', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: canceled ? 'line-through' : 'none' }}>
                              {r.titulo}
                            </div>
                            {r.descripcion && (
                              <div style={{ fontSize: 11, color: TX3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                                {r.descripcion}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F1F3F4', borderRadius: 4, padding: '4px 9px', fontSize: 11, color: TX2, fontWeight: 600 }}>
                              <Clock size={11} />{r.horaInicio} – {r.horaFin}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 4, background: cat.l, color: cat.t }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: cat.s, flexShrink: 0 }}></span>{r.categoria}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <select value={r.estado} onChange={e => quickEst(r.id, e.target.value)} style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 4, border: `1px solid ${est.r}`, background: est.l, color: est.t, outline: 'none', cursor: 'pointer' }}>
                              {ESTADOS.map(es => <option key={es} value={es}>{es}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: TX2, whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <User size={12} color={TX3} />
                              {r.creadoPor ?? '—'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <button onClick={() => openEdit(r)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 4, border: `1px solid ${BR}`, background: SURF, color: TX2, fontSize: 12, fontWeight: 600, cursor: 'pointer' }} className="hover-btn">
                              <Edit size={12} /> Editar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            DASHBOARD DE RESERVAS
        ══════════════════════════════════════════════════════════ */}
        {tab === 'dashboard' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#F8F9FA' }}>
            
            {/* Tarjetas KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total reservas', value: total, color: '#1A73E8', bg: '#EFF6FF' },
                { label: 'Programadas', value: allR.filter(r => r.estado === 'Programado').length, color: '#1A73E8', bg: '#EFF6FF' },
                { label: 'Realizadas', value: allR.filter(r => r.estado === 'Realizado').length, color: '#0F9D58', bg: '#E6F4EA' },
                { label: 'Canceladas', value: allR.filter(r => r.estado === 'Cancelado').length, color: '#D93025', bg: '#FCE8E6' },
              ].map(s => (
                <div key={s.label} style={{ ...S.card, padding: '18px 20px', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 34, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Gráficos y Top Responsibles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
              
              {/* Gráfico Reservas por Mes */}
              <div style={{ ...S.card, padding: '18px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3C4043', marginBottom: 16 }}>Reservas por mes — {year}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {porMes.map(p => (
                    <div key={p.m} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: TX3, fontWeight: 600, width: 28, flexShrink: 0 }}>{p.m}</span>
                      <div style={{ flex: 1, background: '#F1F3F4', borderRadius: 99, height: 20, overflow: 'hidden' }}>
                        {p.n > 0 && (
                          <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg,#1A73E8,#7C3AED)`, width: `${Math.round((p.n / maxMes) * 100)}%`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
                            <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{p.n}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distribución por Categoría */}
              <div style={{ ...S.card, padding: '18px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3C4043', marginBottom: 16 }}>Por categoría</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {CATEGORIAS.map(cat => {
                    const n = allR.filter(r => r.categoria === cat).length
                    const c = gc(cat)
                    const pct = total > 0 ? Math.round((n / total) * 100) : 0
                    if (!n) return null
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: TX2 }}>
                            <span style={{ width: 9, height: 9, borderRadius: 3, background: c.s, display: 'inline-block' }}></span>
                            {cat}
                          </span>
                          <span style={{ fontSize: 11, color: TX3, fontWeight: 600 }}>{n} · {pct}%</span>
                        </div>
                        <div style={{ height: 6, background: '#F1F3F4', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 99, background: c.s, width: `${pct}%`, transition: 'width .4s ease-out' }}></div>
                        </div>
                      </div>
                    )
                  })}
                  {total === 0 && <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: TX3 }}>Sin registros</div>}
                </div>
              </div>

              {/* Top Responsables */}
              <div style={{ ...S.card, padding: '18px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3C4043', marginBottom: 16 }}>Top responsables</div>
                {(() => {
                  const map: Record<string, number> = {}
                  allR.forEach(r => { const k = r.titulo; map[k] = (map[k] ?? 0) + 1 })
                  const top = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
                  const mx = Math.max(...top.map(t => t[1]), 1)
                  if (!top.length) return <p style={{ fontSize: 12, color: TX3, textAlign: 'center', padding: '24px 0' }}>Sin datos registrados</p>
                  return top.map(([nombre, n]) => (
                    <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1A73E8,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                        {nombre.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: TX2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{nombre}</span>
                          <span style={{ fontSize: 11, color: TX3, fontWeight: 700 }}>{n}</span>
                        </div>
                        <div style={{ height: 5, background: '#F1F3F4', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#1A73E8,#7C3AED)', width: `${Math.round((n / mx) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))
                })()}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ── MODAL DE RESERVA (Google Calendar Popover Theme) ──────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(32,33,36,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(1px)' }} onClick={() => setShowModal(false)}>
          <div className="anim-u" style={{ background: SURF, borderRadius: 8, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12), 0 11px 15px -7px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#3C4043' }}>{editId ? 'Editar reserva de sala' : 'Nueva reserva de sala'}</div>
                <div style={{ fontSize: 12, color: TX3, marginTop: 1 }}>Sala de Reuniones · DGNNA</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TX2, cursor: 'pointer', outline: 'none' }} className="hover-circle">
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {conflicto && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#FCE8E6', border: '1px solid #FAD2CF', borderRadius: 4, padding: '10px 12px', fontSize: 13, color: '#C5221F' }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{conflicto}</span>
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={S.label}>Responsable / Evento</label>
                  <input autoFocus value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Nombre de la reunión o responsable" style={S.input} />
                </div>
                <div>
                  <label style={S.label}>Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={S.input} />
                  {FERIADOS[form.fecha] && <div style={{ fontSize: 11, color: '#D93025', marginTop: 3, fontWeight: 600 }}>★ {FERIADOS[form.fecha]}</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={S.label}>Inicio</label>
                    <input type="time" value={form.horaInicio} onChange={e => { setConflicto(null); setForm({ ...form, horaInicio: e.target.value }) }} style={{ ...S.input, padding: '9px 8px' }} />
                  </div>
                  <div>
                    <label style={S.label}>Fin</label>
                    <input type="time" value={form.horaFin} onChange={e => { setConflicto(null); setForm({ ...form, horaFin: e.target.value }) }} style={{ ...S.input, padding: '9px 8px' }} />
                  </div>
                </div>
              </div>
              
              <div>
                <label style={{ ...S.label, marginBottom: 8 }}>Tipo de reunión</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {CATEGORIAS.map(c => {
                    const col = gc(c)
                    const sel = form.categoria === c
                    return (
                      <button key={c} type="button" onClick={() => setForm({ ...form, categoria: c })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 6, border: `1.5px solid ${sel ? col.s : BR}`, background: sel ? col.l : '#F8F9FA', color: sel ? col.t : TX2, fontSize: 12, fontWeight: sel ? 700 : 500, textAlign: 'left', transition: 'all .12s', cursor: 'pointer', outline: 'none' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.s, flexShrink: 0 }}></span>{c}
                      </button>
                    )
                  })}
                </div>
              </div>
              
              <div>
                <label style={{ ...S.label, marginBottom: 8 }}>Estado de reserva</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ESTADOS.map(e => {
                    const col = ge(e)
                    const sel = form.estado === e
                    return (
                      <button key={e} type="button" onClick={() => setForm({ ...form, estado: e })} style={{ padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${sel ? col.s : col.r}`, background: sel ? col.s : col.l, color: sel ? '#fff' : col.t, fontSize: 12, fontWeight: 700, transition: 'all .12s', cursor: 'pointer', outline: 'none' }}>
                        {e}
                      </button>
                    )
                  })}
                </div>
              </div>
              
              <div>
                <label style={S.label}>Notas <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></label>
                <textarea rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Agenda, participantes u observaciones..." style={{ ...S.input, resize: 'none' }} />
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ padding: '12px 20px 20px', display: 'flex', gap: 8, borderTop: `1px solid ${BR}`, background: '#F8F9FA', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
              {editId && (
                <button onClick={handleDelete} style={{ padding: '10px 14px', borderRadius: 4, border: '1px solid #FAD2CF', background: '#FCE8E6', color: '#C5221F', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }} className="hover-btn">
                  <Trash2 size={13} /> Eliminar
                </button>
              )}
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 4, border: `1px solid ${BR}`, background: '#FFFFFF', color: TX2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }} className="hover-btn">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: 4, border: 'none', background: saving ? '#A8C7FA' : '#1A73E8', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Guardar reserva'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
