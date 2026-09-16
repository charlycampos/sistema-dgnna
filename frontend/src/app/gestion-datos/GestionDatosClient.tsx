'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Database,
  Search,
  Plus,
  Filter,
  Download,
  Table as TableIcon,
  LayoutGrid,
  Edit2,
  Trash2,
  Eye,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  X,
  FileText,
  User,
  ArrowUpDown,
  RefreshCw,
  Info,
  ChevronRight,
  ShieldCheck,
  PlusCircle,
  Trash,
} from 'lucide-react'
import * as XLSX from 'xlsx'

interface Campo {
  id?: string
  nombreCampo: string
  tipoDato: string
  longitudMax?: number | string | null
  esObligatorio: number
  descripcion?: string
  ejemplo?: string
}

interface Dataset {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  direccionLinea: string
  tipoFuente: string
  frecuenciaAct: string
  formatoSalida: string
  responsable?: string
  estado: string
  creadoPor?: string
  createdAt: string
  updatedAt: string
  totalCampos: number
  campos?: Campo[]
}

interface StatsData {
  totalDatasets: number
  activos: number
  inactivos: number
  totalCampos: number
  porDireccion: Record<string, number>
}

const DIRECCIONES = [
  { id: 'TODAS', label: 'Todas las Direcciones', color: 'bg-slate-100 text-slate-700' },
  { id: 'DPE', label: 'DPE (Políticas de Estado)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'DA', label: 'DA (Adopciones)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'DSLD', label: 'DSLD (Sustracción Internacional)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'DPNNA', label: 'DPNNA (Protección de NNA)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'DGNNA', label: 'DGNNA (Dirección General)', color: 'bg-purple-50 text-purple-700 border-purple-200' },
]

const TIPOS_DATO = ['VARCHAR2', 'NUMBER', 'DATE', 'TIMESTAMP', 'CLOB', 'BOOLEAN']
const FRECUENCIAS = ['Diaria', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Semestral', 'Anual', 'A Demanda']
const FORMATOS = ['Excel', 'CSV', 'JSON', 'API REST', 'Base de Datos Oracle', 'Shapefile / GeoJSON']
const FUENTES = ['Sistema Interno', 'SGD MIMP', 'RENIEC', 'MININTER', 'Poder Judicial', 'Plataforma Web', 'Base de Datos Externa']

export default function GestionDatosClient() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDireccion, setSelectedDireccion] = useState('TODAS')
  const [selectedEstado, setSelectedEstado] = useState('TODOS')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Modales
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [viewingDataset, setViewingDataset] = useState<Dataset | null>(null)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    direccionLinea: 'DGNNA',
    tipoFuente: 'Sistema Interno',
    frecuenciaAct: 'Mensual',
    formatoSalida: 'Excel',
    responsable: '',
    estado: 'activo',
  })
  const [camposList, setCamposList] = useState<Campo[]>([])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [resData, resStats] = await Promise.all([
        fetch('/api/gestion-datos'),
        fetch('/api/gestion-datos/stats')
      ])

      if (resData.ok) {
        const data = await resData.json()
        setDatasets(data)
      }
      if (resStats.ok) {
        const dataStats = await resStats.json()
        setStats(dataStats)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      showToast('Error al cargar datos del servidor', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Open Modal Create
  const handleOpenCreate = () => {
    setEditingDataset(null)
    setFormData({
      codigo: `DS-${new Date().getFullYear()}-${String(datasets.length + 1).padStart(3, '0')}`,
      nombre: '',
      descripcion: '',
      direccionLinea: 'DGNNA',
      tipoFuente: 'Sistema Interno',
      frecuenciaAct: 'Mensual',
      formatoSalida: 'Excel',
      responsable: '',
      estado: 'activo',
    })
    setCamposList([
      { nombreCampo: 'ID', tipoDato: 'VARCHAR2', longitudMax: 36, esObligatorio: 1, descripcion: 'Identificador único' },
      { nombreCampo: 'FECHA_REGISTRO', tipoDato: 'DATE', longitudMax: undefined, esObligatorio: 1, descripcion: 'Fecha de ingreso del registro' },
    ])
    setModalOpen(true)
  }

  // Open Modal Edit
  const handleOpenEdit = (ds: Dataset) => {
    setEditingDataset(ds)
    setFormData({
      codigo: ds.codigo,
      nombre: ds.nombre,
      descripcion: ds.descripcion || '',
      direccionLinea: ds.direccionLinea || 'DGNNA',
      tipoFuente: ds.tipoFuente || 'Sistema Interno',
      frecuenciaAct: ds.frecuenciaAct || 'Mensual',
      formatoSalida: ds.formatoSalida || 'Excel',
      responsable: ds.responsable || '',
      estado: ds.estado || 'activo',
    })
    setCamposList(ds.campos ? [...ds.campos] : [])
    setModalOpen(true)
  }

  // Open Modal View
  const handleOpenView = async (ds: Dataset) => {
    setViewingDataset(ds)
    setDetailModalOpen(true)
  }

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim() || !formData.codigo.trim()) {
      showToast('Por favor ingrese código y nombre del dataset', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        campos: camposList.map(c => ({
          nombreCampo: c.nombreCampo.trim().toUpperCase(),
          tipoDato: c.tipoDato,
          longitudMax: c.longitudMax ? Number(c.longitudMax) : null,
          esObligatorio: Number(c.esObligatorio) ? 1 : 0,
          descripcion: c.descripcion || null,
          ejemplo: c.ejemplo || null,
        }))
      }

      let res
      if (editingDataset) {
        res = await fetch(`/api/gestion-datos/${editingDataset.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/gestion-datos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        showToast(editingDataset ? 'Dataset actualizado correctamente' : 'Dataset creado exitosamente')
        setModalOpen(false)
        loadData()
      } else {
        const err = await res.json()
        showToast(err.detail || 'Error al guardar el dataset', 'error')
      }
    } catch (err) {
      console.error(err)
      showToast('Error de conexión al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Handle Delete
  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Está seguro de eliminar el dataset "${nombre}" y su diccionario de datos?`)) {
      return
    }

    try {
      const res = await fetch(`/api/gestion-datos/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showToast('Dataset eliminado con éxito')
        loadData()
      } else {
        showToast('Error al eliminar el dataset', 'error')
      }
    } catch {
      showToast('Error de conexión al eliminar', 'error')
    }
  }

  // Add Campo Row
  const handleAddCampo = () => {
    setCamposList([
      ...camposList,
      { nombreCampo: '', tipoDato: 'VARCHAR2', longitudMax: 100, esObligatorio: 0, descripcion: '', ejemplo: '' }
    ])
  }

  const handleRemoveCampo = (index: number) => {
    setCamposList(camposList.filter((_, i) => i !== index))
  }

  const handleUpdateCampo = (index: number, key: keyof Campo, val: any) => {
    const updated = [...camposList]
    updated[index] = { ...updated[index], [key]: val }
    setCamposList(updated)
  }

  // Export List to Excel
  const handleExportExcel = () => {
    if (datasets.length === 0) {
      showToast('No hay datos para exportar', 'error')
      return
    }

    const dataExcel = datasets.map(d => ({
      'Código': d.codigo,
      'Nombre del Dataset': d.nombre,
      'Dirección / Línea': d.direccionLinea,
      'Tipo de Fuente': d.tipoFuente,
      'Frecuencia de Actualización': d.frecuenciaAct,
      'Formato de Salida': d.formatoSalida,
      'Total de Variables': d.totalCampos || (d.campos ? d.campos.length : 0),
      'Responsable Técnico': d.responsable || '-',
      'Estado': d.estado.toUpperCase(),
      'Descripción': d.descripcion || '',
      'Fecha Creación': new Date(d.createdAt).toLocaleDateString(),
    }))

    const ws = XLSX.utils.json_to_sheet(dataExcel)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Catálogo Datasets')
    XLSX.writeFile(wb, `Catalogo_Datasets_DGNNA_${new Date().toISOString().slice(0, 10)}.xlsx`)
    showToast('Catálogo descargado en Excel')
  }

  // Export Dictionary of a single dataset
  const handleExportDiccionario = (ds: Dataset) => {
    if (!ds.campos || ds.campos.length === 0) {
      showToast('Este dataset no cuenta con variables registradas', 'error')
      return
    }

    const dataCampos = ds.campos.map((c, i) => ({
      'N°': i + 1,
      'Nombre de Variable': c.nombreCampo,
      'Tipo de Dato': c.tipoDato,
      'Longitud Máx': c.longitudMax || '-',
      '¿Es Obligatorio?': c.esObligatorio === 1 ? 'SÍ' : 'NO',
      'Descripción': c.descripcion || '',
      'Ejemplo': c.ejemplo || '',
    }))

    const ws = XLSX.utils.json_to_sheet(dataCampos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Diccionario - ${ds.codigo}`)
    XLSX.writeFile(wb, `Diccionario_Datos_${ds.codigo}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    showToast('Diccionario descargado')
  }

  // Filtered Datasets
  const filteredDatasets = useMemo(() => {
    return datasets.filter(ds => {
      const matchSearch =
        ds.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ds.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ds.descripcion && ds.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ds.responsable && ds.responsable.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchDir = selectedDireccion === 'TODAS' || ds.direccionLinea === selectedDireccion
      const matchEst = selectedEstado === 'TODOS' || ds.estado.toLowerCase() === selectedEstado.toLowerCase()

      return matchSearch && matchDir && matchEst
    })
  }, [datasets, searchTerm, selectedDireccion, selectedEstado])

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all transform animate-in fade-in slide-in-from-bottom-5 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Database className="w-3.5 h-3.5" />
              Módulo Centralizado
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Gestión de Datos y Catálogos DGNNA
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Administración de datasets, inventario de variables, trazabilidad de fuentes y diccionario de datos de todas las direcciones de línea.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Exportar Catálogo
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              Nuevo Dataset
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Datasets Totales</p>
            <p className="text-2xl font-extrabold text-slate-900">{stats?.totalDatasets ?? datasets.length}</p>
            <p className="text-xs text-indigo-600 flex items-center gap-1 font-medium">
              <Database className="w-3 h-3" /> Registros catalogados
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Datasets Activos</p>
            <p className="text-2xl font-extrabold text-emerald-600">{stats?.activos ?? datasets.filter(d => d.estado === 'activo').length}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> En operación continua
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Variables / Campos</p>
            <p className="text-2xl font-extrabold text-slate-900">
              {stats?.totalCampos ?? datasets.reduce((acc, d) => acc + (d.totalCampos || (d.campos ? d.campos.length : 0)), 0)}
            </p>
            <p className="text-xs text-blue-600 flex items-center gap-1 font-medium">
              <Layers className="w-3 h-3" /> Metadatos normalizados
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Direcciones Integradas</p>
            <p className="text-2xl font-extrabold text-slate-900">
              {stats?.porDireccion ? Object.keys(stats.porDireccion).length : 5}
            </p>
            <p className="text-xs text-purple-600 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3 h-3" /> Cobertura DGNNA
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, nombre, responsable o palabra clave..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          {/* Quick Filters & Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Estado:</span>
              <select
                value={selectedEstado}
                onChange={e => setSelectedEstado(e.target.value)}
                className="text-xs font-medium rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="TODOS">Todos</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>

            <button
              onClick={loadData}
              title="Recargar datos"
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                  viewMode === 'table' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista de Tabla"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                  viewMode === 'grid' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista en Tarjetas"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Direction Tag Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filtrar:
          </span>
          {DIRECCIONES.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDireccion(d.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition border ${
                selectedDireccion === d.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {d.id === 'TODAS' ? 'Todas' : d.id}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-medium text-sm">Cargando catálogo de gestión de datos...</p>
        </div>
      ) : filteredDatasets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm space-y-3">
          <Database className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-700">No se encontraron datasets</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            No hay registros que coincidan con los filtros seleccionados o aún no se ha creado ningún dataset.
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition mt-2"
          >
            <Plus className="w-3.5 h-3.5" /> Registrar Primer Dataset
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Código</th>
                  <th className="py-3.5 px-4">Nombre del Dataset</th>
                  <th className="py-3.5 px-4">Dirección</th>
                  <th className="py-3.5 px-4">Fuente / Formato</th>
                  <th className="py-3.5 px-4">Frecuencia</th>
                  <th className="py-3.5 px-4 text-center">Variables</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDatasets.map(ds => (
                  <tr key={ds.id} className="hover:bg-slate-50/60 transition group">
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600">
                      {ds.codigo}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{ds.nombre}</div>
                      {ds.descripcion && (
                        <div className="text-xs text-slate-500 truncate max-w-xs">{ds.descripcion}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {ds.direccionLinea}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-slate-800">{ds.tipoFuente}</div>
                      <div className="text-xs text-slate-400">{ds.formatoSalida}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {ds.frecuenciaAct}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        {ds.totalCampos || (ds.campos ? ds.campos.length : 0)} vars
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ds.estado === 'activo'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${ds.estado === 'activo' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {ds.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenView(ds)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          title="Ver Diccionario y Detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExportDiccionario(ds)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                          title="Exportar Diccionario Excel"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(ds)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Editar Dataset"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ds.id, ds.nombre)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                          title="Eliminar Dataset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDatasets.map(ds => (
            <div
              key={ds.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group relative"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    {ds.codigo}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      ds.estado === 'activo'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${ds.estado === 'activo' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {ds.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {ds.nombre}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {ds.descripcion || 'Sin descripción detallada.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Dirección</span>
                    <span className="font-semibold text-slate-700">{ds.direccionLinea}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Variables</span>
                    <span className="font-semibold text-indigo-600">
                      {ds.totalCampos || (ds.campos ? ds.campos.length : 0)} campos
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Fuente</span>
                    <span className="font-medium text-slate-700 truncate block">{ds.tipoFuente}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Frecuencia</span>
                    <span className="font-medium text-slate-700">{ds.frecuenciaAct}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleOpenView(ds)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  Ver Diccionario <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleExportDiccionario(ds)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                    title="Exportar Diccionario"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(ds)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ds.id, ds.nombre)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR / EDITAR DATASET */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                  <Database className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {editingDataset ? 'Editar Dataset y Variables' : 'Registrar Nuevo Dataset'}
                  </h2>
                  <p className="text-xs text-slate-300">
                    Define la ficha técnica del conjunto de datos y sus especificaciones.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Sección 1: Ficha Técnica */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-2 border-b border-indigo-100 pb-2">
                  <Info className="w-4 h-4" /> 1. Datos Generales del Dataset
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Código Dataset <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.codigo}
                      onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="DS-2026-001"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nombre del Dataset / Registro <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="Ej. Registro Nacional de Casos de Sustracción Internacional"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Descripción del Contenido / Objetivo
                    </label>
                    <textarea
                      rows={2}
                      value={formData.descripcion}
                      onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="Detalle la naturaleza de los registros, periodicidad y cobertura..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Dirección de Línea
                    </label>
                    <select
                      value={formData.direccionLinea}
                      onChange={e => setFormData({ ...formData, direccionLinea: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {DIRECCIONES.filter(d => d.id !== 'TODAS').map(d => (
                        <option key={d.id} value={d.id}>{d.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tipo de Fuente
                    </label>
                    <select
                      value={formData.tipoFuente}
                      onChange={e => setFormData({ ...formData, tipoFuente: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {FUENTES.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Frecuencia de Actualización
                    </label>
                    <select
                      value={formData.frecuenciaAct}
                      onChange={e => setFormData({ ...formData, frecuenciaAct: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {FRECUENCIAS.map(fr => (
                        <option key={fr} value={fr}>{fr}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Formato de Salida / Entrega
                    </label>
                    <select
                      value={formData.formatoSalida}
                      onChange={e => setFormData({ ...formData, formatoSalida: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {FORMATOS.map(fo => (
                        <option key={fo} value={fo}>{fo}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Responsable Técnico / Analista
                    </label>
                    <input
                      type="text"
                      value={formData.responsable}
                      onChange={e => setFormData({ ...formData, responsable: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="Nombre del especialista"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Estado Operativo
                    </label>
                    <select
                      value={formData.estado}
                      onChange={e => setFormData({ ...formData, estado: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección 2: Diccionario de Variables */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> 2. Diccionario de Variables ({camposList.length} registradas)
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddCampo}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 text-xs font-semibold transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Agregar Campo
                  </button>
                </div>

                {camposList.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    No has añadido variables aún. Haz clic en "Agregar Campo" para definir el diccionario.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {camposList.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-xs"
                      >
                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Nombre Campo</label>
                          <input
                            type="text"
                            required
                            placeholder="EJ. CODIGO_CASO"
                            value={c.nombreCampo}
                            onChange={e => handleUpdateCampo(idx, 'nombreCampo', e.target.value.toUpperCase())}
                            className="w-full px-2 py-1.5 font-mono text-xs rounded-lg border border-slate-200 bg-white"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Tipo</label>
                          <select
                            value={c.tipoDato}
                            onChange={e => handleUpdateCampo(idx, 'tipoDato', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                          >
                            {TIPOS_DATO.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-1">
                          <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Long.</label>
                          <input
                            type="number"
                            placeholder="100"
                            value={c.longitudMax || ''}
                            onChange={e => handleUpdateCampo(idx, 'longitudMax', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-medium text-slate-500 mb-0.5">¿Obligatorio?</label>
                          <select
                            value={c.esObligatorio}
                            onChange={e => handleUpdateCampo(idx, 'esObligatorio', Number(e.target.value))}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                          >
                            <option value={1}>Sí (1)</option>
                            <option value={0}>No (0)</option>
                          </select>
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Descripción</label>
                          <input
                            type="text"
                            placeholder="Significado del dato..."
                            value={c.descripcion || ''}
                            onChange={e => handleUpdateCampo(idx, 'descripcion', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                          />
                        </div>

                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveCampo(idx)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
                            title="Eliminar fila"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {editingDataset ? 'Guardar Cambios' : 'Crear Dataset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE Y DICCIONARIO */}
      {detailModalOpen && viewingDataset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/30">
                    {viewingDataset.codigo}
                  </span>
                  <span className="text-xs text-slate-300">| {viewingDataset.direccionLinea}</span>
                </div>
                <h2 className="text-lg font-bold mt-1">{viewingDataset.nombre}</h2>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Fuente</span>
                  <span className="font-semibold text-slate-800">{viewingDataset.tipoFuente}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Formato</span>
                  <span className="font-semibold text-slate-800">{viewingDataset.formatoSalida}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Frecuencia</span>
                  <span className="font-semibold text-slate-800">{viewingDataset.frecuenciaAct}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Responsable</span>
                  <span className="font-semibold text-slate-800">{viewingDataset.responsable || 'No asignado'}</span>
                </div>
              </div>

              {viewingDataset.descripcion && (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-slate-700">
                  <strong className="text-indigo-900 block mb-0.5">Descripción:</strong>
                  {viewingDataset.descripcion}
                </div>
              )}

              {/* Variables Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Diccionario de Variables ({viewingDataset.campos ? viewingDataset.campos.length : 0})
                  </h3>
                  <button
                    onClick={() => handleExportDiccionario(viewingDataset)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar Excel
                  </button>
                </div>

                {!viewingDataset.campos || viewingDataset.campos.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    No se han registrado variables para este dataset.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Nombre Variable</th>
                          <th className="py-2.5 px-3">Tipo de Dato</th>
                          <th className="py-2.5 px-3">Longitud</th>
                          <th className="py-2.5 px-3 text-center">¿Obligatorio?</th>
                          <th className="py-2.5 px-3">Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingDataset.campos.map((c, i) => (
                          <tr key={c.id || i} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 text-slate-400 font-medium">{i + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">{c.nombreCampo}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700">
                                {c.tipoDato}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600">{c.longitudMax || '-'}</td>
                            <td className="py-2 px-3 text-center">
                              {c.esObligatorio === 1 ? (
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Obligatorio" />
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{c.descripcion || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

