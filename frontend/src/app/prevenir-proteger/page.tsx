'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Building2, CalendarDays, MapPin, Pencil, Plus,
  Search, Shield, Trash2, Users, X,
} from 'lucide-react'
import { toast } from 'sonner'

import { useMe } from '@/lib/use-me'

interface Actividad {
  id: string
  codigo?: string | null
  nombreActividad: string
  tipoActividad: string
  fecha: string
  departamento: string
  provincia?: string | null
  distrito?: string | null
  entidadAliada?: string | null
  modalidad: string
  publicoObjetivo?: string | null
  participantesMujeres: number
  participantesHombres: number
  participantesOtros: number
  totalParticipantes: number
  responsable?: string | null
  estado: string
  observaciones?: string | null
}

type FormActividad = Omit<Actividad, 'id' | 'totalParticipantes'>

const TIPOS = ['Charla', 'Taller', 'Campaña', 'Asistencia técnica', 'Feria informativa', 'Otro']
const MODALIDADES = ['Presencial', 'Virtual', 'Mixta']
const ESTADOS = ['Planificada', 'En ejecución', 'Realizada', 'Cancelada']
const DEPARTAMENTOS = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao',
  'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque',
  'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno',
  'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
]

const emptyForm = (): FormActividad => ({
  codigo: '', nombreActividad: '', tipoActividad: 'Charla',
  fecha: new Date().toISOString().slice(0, 10), departamento: 'Lima',
  provincia: '', distrito: '', entidadAliada: '', modalidad: 'Presencial',
  publicoObjetivo: '', participantesMujeres: 0, participantesHombres: 0,
  participantesOtros: 0, responsable: '', estado: 'Planificada', observaciones: '',
})

const estadoStyle: Record<string, string> = {
  Planificada: 'bg-blue-50 text-blue-700 border-blue-200',
  'En ejecución': 'bg-amber-50 text-amber-700 border-amber-200',
  Realizada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelada: 'bg-red-50 text-red-700 border-red-200',
}

export default function PrevenirProtegerPage() {
  const router = useRouter()
  const { me, loading: meLoading, hasAccess, canWrite } = useMe()
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormActividad>(emptyForm)
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [tipo, setTipo] = useState('')

  useEffect(() => {
    if (!meLoading && me && !hasAccess('prevenir-proteger')) router.replace('/menu')
  }, [me, meLoading, hasAccess, router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/prevenir-proteger')
      if (!response.ok) throw new Error()
      setActividades(await response.json())
    } catch {
      toast.error('No se pudieron cargar las actividades')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtradas = useMemo(() => actividades.filter(a => {
    const needle = search.trim().toLowerCase()
    const coincide = !needle || [a.nombreActividad, a.entidadAliada, a.responsable, a.departamento]
      .some(value => value?.toLowerCase().includes(needle))
    return coincide && (!estado || a.estado === estado) && (!tipo || a.tipoActividad === tipo)
  }), [actividades, search, estado, tipo])

  const resumen = useMemo(() => ({
    total: actividades.length,
    realizadas: actividades.filter(a => a.estado === 'Realizada').length,
    participantes: actividades.reduce((sum, a) => sum + a.totalParticipantes, 0),
    regiones: new Set(actividades.map(a => a.departamento)).size,
  }), [actividades])

  const openNew = () => {
    setEditId(null)
    setForm(emptyForm())
    setModal(true)
  }

  const openEdit = (actividad: Actividad) => {
    const data = { ...actividad } as Partial<Actividad>
    delete data.id
    delete data.totalParticipantes
    setEditId(actividad.id)
    setForm(data as FormActividad)
    setModal(true)
  }

  const set = <K extends keyof FormActividad>(key: K, value: FormActividad[K]) => {
    setForm(previous => ({ ...previous, [key]: value }))
  }

  const save = async () => {
    if (!form.nombreActividad.trim()) {
      toast.error('Ingresa el nombre de la actividad')
      return
    }
    setSaving(true)
    try {
      const response = await fetch(
        editId ? `/api/prevenir-proteger/${editId}` : '/api/prevenir-proteger',
        {
          method: editId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail ?? 'No se pudo guardar')
      toast.success(editId ? 'Actividad actualizada' : 'Actividad registrada')
      setModal(false)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (actividad: Actividad) => {
    if (!confirm(`¿Eliminar la actividad "${actividad.nombreActividad}"?`)) return
    const response = await fetch(`/api/prevenir-proteger/${actividad.id}`, { method: 'DELETE' })
    if (response.ok) {
      toast.success('Actividad eliminada')
      load()
    } else toast.error('No se pudo eliminar')
  }

  if (meLoading || (!meLoading && !me)) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">Cargando módulo…</div>
  }

  const writeAllowed = canWrite('prevenir-proteger')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Link href="/menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Volver al menú">
              <ArrowLeft size={20} />
            </Link>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-600 text-white">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="font-bold leading-tight">Prevenir para Proteger</h1>
              <p className="text-sm text-slate-500">Actividades preventivas y cobertura territorial</p>
            </div>
          </div>
          {writeAllowed && (
            <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              <Plus size={18} /> Nueva actividad
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-7">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Actividades', value: resumen.total, icon: CalendarDays, color: 'text-blue-600 bg-blue-50' },
            { label: 'Realizadas', value: resumen.realizadas, icon: Shield, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Participantes', value: resumen.participantes, icon: Users, color: 'text-violet-600 bg-violet-50' },
            { label: 'Departamentos', value: resumen.regiones, icon: MapPin, color: 'text-orange-600 bg-orange-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>
                <div className={`rounded-xl p-3 ${color}`}><Icon size={22} /></div>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar actividad, entidad o responsable…" className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-emerald-500" />
            </label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Todos los tipos</option>{TIPOS.map(value => <option key={value}>{value}</option>)}
            </select>
            <select value={estado} onChange={e => setEstado(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Todos los estados</option>{ESTADOS.map(value => <option key={value}>{value}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>{['Fecha', 'Actividad', 'Tipo', 'Ubicación', 'Entidad aliada', 'Participantes', 'Estado', ''].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-14 text-center text-slate-500">Cargando actividades…</td></tr>
                ) : filtradas.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-14 text-center text-slate-500">No se encontraron actividades.</td></tr>
                ) : filtradas.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4">{a.fecha.split('-').reverse().join('/')}</td>
                    <td className="max-w-xs px-4 py-4"><p className="font-semibold">{a.nombreActividad}</p><p className="truncate text-xs text-slate-500">{a.publicoObjetivo || 'Sin público objetivo registrado'}</p></td>
                    <td className="px-4 py-4">{a.tipoActividad}<p className="text-xs text-slate-500">{a.modalidad}</p></td>
                    <td className="px-4 py-4">{a.departamento}<p className="text-xs text-slate-500">{[a.provincia, a.distrito].filter(Boolean).join(' · ')}</p></td>
                    <td className="max-w-48 px-4 py-4"><span className="flex items-center gap-1.5"><Building2 size={14} className="text-slate-400" />{a.entidadAliada || '—'}</span></td>
                    <td className="px-4 py-4 font-semibold">{a.totalParticipantes}</td>
                    <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${estadoStyle[a.estado] ?? 'bg-slate-50 text-slate-600'}`}>{a.estado}</span></td>
                    <td className="px-4 py-4">
                      {writeAllowed && <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(a)} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600" aria-label="Editar"><Pencil size={16} /></button>
                        <button onClick={() => remove(a)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar"><Trash2 size={16} /></button>
                      </div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={e => e.target === e.currentTarget && setModal(false)}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div><h2 className="text-lg font-bold">{editId ? 'Editar actividad' : 'Nueva actividad'}</h2><p className="text-sm text-slate-500">Registra la intervención y sus resultados.</p></div>
              <button onClick={() => setModal(false)} className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <div className="grid gap-5 p-6 md:grid-cols-2">
              <Field label="Nombre de la actividad *" wide><input value={form.nombreActividad} onChange={e => set('nombreActividad', e.target.value)} className="input" /></Field>
              <Field label="Código"><input value={form.codigo ?? ''} onChange={e => set('codigo', e.target.value)} className="input" /></Field>
              <Field label="Fecha *"><input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className="input" /></Field>
              <Field label="Tipo de actividad"><select value={form.tipoActividad} onChange={e => set('tipoActividad', e.target.value)} className="input">{TIPOS.map(v => <option key={v}>{v}</option>)}</select></Field>
              <Field label="Modalidad"><select value={form.modalidad} onChange={e => set('modalidad', e.target.value)} className="input">{MODALIDADES.map(v => <option key={v}>{v}</option>)}</select></Field>
              <Field label="Estado"><select value={form.estado} onChange={e => set('estado', e.target.value)} className="input">{ESTADOS.map(v => <option key={v}>{v}</option>)}</select></Field>
              <Field label="Departamento *"><select value={form.departamento} onChange={e => set('departamento', e.target.value)} className="input">{DEPARTAMENTOS.map(v => <option key={v}>{v}</option>)}</select></Field>
              <Field label="Provincia"><input value={form.provincia ?? ''} onChange={e => set('provincia', e.target.value)} className="input" /></Field>
              <Field label="Distrito"><input value={form.distrito ?? ''} onChange={e => set('distrito', e.target.value)} className="input" /></Field>
              <Field label="Entidad aliada"><input value={form.entidadAliada ?? ''} onChange={e => set('entidadAliada', e.target.value)} className="input" /></Field>
              <Field label="Público objetivo"><input value={form.publicoObjetivo ?? ''} onChange={e => set('publicoObjetivo', e.target.value)} className="input" /></Field>
              <Field label="Responsable"><input value={form.responsable ?? ''} onChange={e => set('responsable', e.target.value)} className="input" /></Field>
              <div className="md:col-span-2 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                <NumberField label="Mujeres" value={form.participantesMujeres} onChange={v => set('participantesMujeres', v)} />
                <NumberField label="Hombres" value={form.participantesHombres} onChange={v => set('participantesHombres', v)} />
                <NumberField label="Otros / no precisa" value={form.participantesOtros} onChange={v => set('participantesOtros', v)} />
              </div>
              <Field label="Observaciones" wide><textarea rows={3} value={form.observaciones ?? ''} onChange={e => set('observaciones', e.target.value)} className="input resize-none" /></Field>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button onClick={() => setModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancelar</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar actividad'}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:.5rem;padding:.625rem .75rem;font-size:.875rem;outline:none;background:white}.input:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.12)}`}</style>
    </div>
  )
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? 'md:col-span-2' : ''}><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span><input type="number" min={0} value={value} onChange={e => onChange(Math.max(0, Number(e.target.value)))} className="input" /></label>
}
