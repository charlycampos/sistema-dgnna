'use client'

import React, { useState, useEffect } from 'react'
import {
  Settings, Key, Sparkles, Check, AlertCircle, Eye, EyeOff,
  RefreshCw, X, ShieldCheck, Zap, Server, Lock, BarChart3, Users, Clock, DollarSign
} from 'lucide-react'

interface ConfiguracionItem {
  proveedor: string
  nombreDisplay: string
  apiKeyEnmascarada: string
  tieneKey: boolean
  modeloDefecto: string
  activo: number
  updatedAt?: string
}

interface MetricasConsumo {
  totalConsultasHoy: number
  totalConsultasMes: number
  totalTokensMes: number
  costoEstimadoUSD: number
  limiteDiarioPorUsuario: number
  topUsuarios: { nombre: string; totalConsultas: number }[]
  consultasRecientes: {
    id: number
    usuarioNombre: string
    pregunta: string
    proveedor: string
    modelo: string
    tokens: number
    latenciaMs: number
    createdAt: string
  }[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfigActualizada?: () => void
}

export default function ModalConfiguracionIA({ isOpen, onClose, onConfigActualizada }: Props) {
  const [tabActiva, setTabActiva] = useState<'claves' | 'metricas'>('claves')
  const [configs, setConfigs] = useState<ConfiguracionItem[]>([])
  const [metricas, setMetricas] = useState<MetricasConsumo | null>(null)
  const [cargando, setCargando] = useState(false)
  const [cargandoMetricas, setCargandoMetricas] = useState(false)
  
  // Estados de edición por proveedor
  const [keysInput, setKeysInput] = useState<Record<string, string>>({
    deepseek: '',
    gemini: '',
    openai: '',
    claude: ''
  })
  const [modelosInput, setModelosInput] = useState<Record<string, string>>({
    deepseek: 'deepseek-chat',
    gemini: 'gemini-2.5-flash',
    openai: 'gpt-4o-mini',
    claude: 'claude-3-5-haiku-20241022'
  })
  const [mostrarKey, setMostrarKey] = useState<Record<string, boolean>>({
    deepseek: false,
    gemini: false,
    openai: false,
    claude: false
  })
  
  // Control de cuota
  const [limiteDiarioInput, setLimiteDiarioInput] = useState<number>(20)
  const [guardandoLimite, setGuardandoLimite] = useState(false)
  
  // Estado de pruebas de conexión
  const [probando, setProbando] = useState<Record<string, boolean>>({})
  const [resultadoPrueba, setResultadoPrueba] = useState<Record<string, { exito: boolean; mensaje: string; latenciaMs?: number }>>({})
  const [guardando, setGuardando] = useState<Record<string, boolean>>({})
  const [mensajeGlobal, setMensajeGlobal] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      cargarConfiguraciones()
      cargarMetricas()
    }
  }, [isOpen])

  const cargarConfiguraciones = async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/normativa/admin/config-ia')
      if (res.ok) {
        const data: ConfiguracionItem[] = await res.json()
        setConfigs(data)
        
        const nuevosModelos: Record<string, string> = {}
        data.forEach(item => {
          nuevosModelos[item.proveedor] = item.modeloDefecto
        })
        setModelosInput(prev => ({ ...prev, ...nuevosModelos }))
      }
    } catch (e) {
      console.error('Error cargando configuraciones de IA:', e)
    } finally {
      setCargando(false)
    }
  }

  const cargarMetricas = async () => {
    setCargandoMetricas(true)
    try {
      const res = await fetch('/api/normativa/admin/metricas-consumo')
      if (res.ok) {
        const data: MetricasConsumo = await res.json()
        setMetricas(data)
        setLimiteDiarioInput(data.limiteDiarioPorUsuario || 20)
      }
    } catch (e) {
      console.error('Error cargando métricas:', e)
    } finally {
      setCargandoMetricas(false)
    }
  }

  const handleGuardarLimite = async () => {
    setGuardandoLimite(true)
    try {
      const res = await fetch('/api/normativa/admin/parametros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clave: 'LIMITE_CONSULTAS_DIARIAS',
          valor: String(limiteDiarioInput)
        })
      })
      if (res.ok) {
        setMensajeGlobal({ tipo: 'exito', texto: `Límite diario establecido en ${limiteDiarioInput} consultas por especialista.` })
        cargarMetricas()
        setTimeout(() => setMensajeGlobal(null), 4000)
      }
    } catch (e) {
      setMensajeGlobal({ tipo: 'error', texto: 'No se pudo guardar el límite diario.' })
    } finally {
      setGuardandoLimite(false)
    }
  }

  // Probar conexión con la clave escrita
  const handleProbarConexion = async (proveedor: string) => {
    const key = keysInput[proveedor]?.trim()
    const cfg = configs.find(c => c.proveedor === proveedor)
    
    if (!key && !cfg?.tieneKey) {
      setResultadoPrueba(prev => ({
        ...prev,
        [proveedor]: { exito: false, mensaje: 'Debes ingresar una clave API para probar.' }
      }))
      return
    }

    setProbando(prev => ({ ...prev, [proveedor]: true }))
    try {
      const res = await fetch('/api/normativa/admin/probar-conexion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedor,
          apiKey: key || 'dummy-usar-guardada',
          modelo: modelosInput[proveedor]
        })
      })

      const data = await res.json()
      setResultadoPrueba(prev => ({
        ...prev,
        [proveedor]: {
          exito: data.exito,
          mensaje: data.mensaje,
          latenciaMs: data.latenciaMs
        }
      }))
    } catch (e: any) {
      setResultadoPrueba(prev => ({
        ...prev,
        [proveedor]: {
          exito: false,
          mensaje: 'Error de red o servidor no disponible al probar la clave.'
        }
      }))
    } finally {
      setProbando(prev => ({ ...prev, [proveedor]: false }))
    }
  }

  // Guardar clave y modelo en base de datos
  const handleGuardarConfig = async (proveedor: string) => {
    setGuardando(prev => ({ ...prev, [proveedor]: true }))
    setMensajeGlobal(null)

    try {
      const key = keysInput[proveedor]?.trim()
      const modelo = modelosInput[proveedor]

      const payload: any = {
        proveedor,
        modeloDefecto: modelo,
        activo: 1
      }
      if (key) {
        payload.apiKey = key
      }

      const res = await fetch('/api/normativa/admin/config-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setMensajeGlobal({
          tipo: 'exito',
          texto: `Configuración de ${proveedor.toUpperCase()} guardada exitosamente.`
        })
        setKeysInput(prev => ({ ...prev, [proveedor]: '' }))
        cargarConfiguraciones()
        if (onConfigActualizada) onConfigActualizada()
      } else {
        const err = await res.json()
        setMensajeGlobal({
          tipo: 'error',
          texto: err.detail || 'Error al guardar la configuración.'
        })
      }
    } catch (e) {
      setMensajeGlobal({
        tipo: 'error',
        texto: 'Error de conexión al guardar la configuración.'
      })
    } finally {
      setGuardando(prev => ({ ...prev, [proveedor]: false }))
      setTimeout(() => setMensajeGlobal(null), 5000)
    }
  }

  if (!isOpen) return null

  const renderTarjetaProveedor = ({
    id,
    titulo,
    colorBadge,
    colorDot,
    placeholderKey,
    modelos,
    config,
    badgePrioridad
  }: {
    id: string
    titulo: string
    colorBadge: string
    colorDot: string
    placeholderKey: string
    modelos: { id: string; label: string }[]
    config?: ConfiguracionItem
    badgePrioridad?: string
  }) => {
    const tieneClaveGuardada = Boolean(config?.tieneKey)
    const prueba = resultadoPrueba[id]
    const estaProbando = probando[id]
    const estaGuardando = guardando[id]

    return (
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        {/* ENCABEZADO DE LA TARJETA */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${colorDot}`}></span>
            <h3 className="text-xs font-bold text-slate-900">{titulo}</h3>
            {badgePrioridad && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {badgePrioridad}
              </span>
            )}
          </div>

          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
            tieneClaveGuardada ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {tieneClaveGuardada ? '🟢 Clave Activa' : '⚪ Sin Clave'}
          </span>
        </div>

        {/* INPUT DE API KEY */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            API Key {tieneClaveGuardada && <span className="text-slate-400 lowercase font-normal">(Guardada: {config?.apiKeyEnmascarada})</span>}
          </label>
          <div className="relative">
            <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type={mostrarKey[id] ? 'text' : 'password'}
              placeholder={tieneClaveGuardada ? '•••••••••••••••• (Escribe para reemplazar)' : placeholderKey}
              value={keysInput[id]}
              onChange={e => setKeysInput(prev => ({ ...prev, [id]: e.target.value }))}
              className="w-full pl-8 pr-10 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-mono shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setMostrarKey(prev => ({ ...prev, [id]: !prev[id] }))}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
            >
              {mostrarKey[id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* SELECTOR DE MODELO */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Modelo por defecto
          </label>
          <select
            value={modelosInput[id]}
            onChange={e => setModelosInput(prev => ({ ...prev, [id]: e.target.value }))}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
          >
            {modelos.map(m => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* MENSAJE DE RESULTADO DE PRUEBA */}
        {prueba && (
          <div className={`p-2.5 rounded-lg text-[11px] font-medium flex items-start gap-2 border ${
            prueba.exito ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-red-50 text-red-900 border-red-300'
          }`}>
            {prueba.exito ? <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p>{prueba.mensaje}</p>
              {prueba.latenciaMs !== undefined && prueba.latenciaMs > 0 && (
                <p className="text-[10px] text-slate-500 mt-0.5">⚡ Latencia de respuesta: {prueba.latenciaMs} ms</p>
              )}
            </div>
          </div>
        )}

        {/* BOTONES DE ACCIÓN: PROBAR Y GUARDAR */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => handleProbarConexion(id)}
            disabled={estaProbando || (!keysInput[id] && !tieneClaveGuardada)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition disabled:opacity-40 shadow-2xs cursor-pointer"
          >
            {estaProbando ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Zap className="w-3.5 h-3.5 text-amber-500" />}
            {estaProbando ? 'Probando...' : '⚡ Probar Conexión'}
          </button>

          <button
            type="button"
            onClick={() => handleGuardarConfig(id)}
            disabled={estaGuardando || (!keysInput[id] && modelosInput[id] === config?.modeloDefecto)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition disabled:opacity-40 shadow-2xs cursor-pointer"
          >
            {estaGuardando ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {estaGuardando ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans">
      <div className="bg-slate-50 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Panel de Administración de IA y Cuotas</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  🛡️ Solo Administrador
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Gestiona claves de DeepSeek, Gemini, OpenAI y Claude, control de límites y auditoría.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PESTAÑAS DEL PANEL ADMIN */}
        <div className="bg-white px-6 border-b border-slate-200 flex items-center gap-4">
          <button
            onClick={() => setTabActiva('claves')}
            className={`py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              tabActiva === 'claves'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" /> Proveedores y Claves API
          </button>
          <button
            onClick={() => { setTabActiva('metricas'); cargarMetricas(); }}
            className={`py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              tabActiva === 'metricas'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Monitoreo y Control de Cuotas
          </button>
        </div>

        {/* MENSAJE GLOBAL */}
        {mensajeGlobal && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            mensajeGlobal.tipo === 'exito' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            {mensajeGlobal.tipo === 'exito' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{mensajeGlobal.texto}</span>
          </div>
        )}

        {/* CUERPO DEL MODAL CON SCROLL */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cargando ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Cargando datos...
            </div>
          ) : tabActiva === 'claves' ? (
            <>
              {/* BANNER INFORMATIVO DE PRIORIDAD */}
              <div className="bg-indigo-50/80 border border-indigo-200 p-3.5 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Cascada Automática de Ejecución por Costo y Eficiencia:</p>
                  <p className="text-indigo-800 text-[11px] mt-0.5">
                    El sistema intenta primero <strong>1. DeepSeek (Ultra Económico)</strong> ➔ luego <strong>2. Google Gemini</strong> ➔ <strong>3. OpenAI (ChatGPT)</strong> ➔ <strong>4. Anthropic Claude</strong> ➔ y finalmente el <strong>Motor Offline Local</strong> si no hay conexión.
                  </p>
                </div>
              </div>

              {/* ── 1. DEEPSEEK (PRIORIDAD N.° 1) ───────────────────────── */}
              {renderTarjetaProveedor({
                id: 'deepseek',
                titulo: 'DeepSeek AI (V3 / R1)',
                colorBadge: 'bg-indigo-100 text-indigo-900 border-indigo-200',
                colorDot: 'bg-indigo-600',
                badgePrioridad: '🥇 Prioridad N.° 1 · Ultra Económico',
                placeholderKey: 'sk-... (DeepSeek API Key)',
                modelos: [
                  { id: 'deepseek-chat', label: 'deepseek-chat (DeepSeek-V3 · Rápido y Ultra Económico)' },
                  { id: 'deepseek-reasoner', label: 'deepseek-reasoner (DeepSeek-R1 · Razonamiento Profundo)' }
                ],
                config: configs.find(c => c.proveedor === 'deepseek')
              })}

              {/* ── 2. GOOGLE GEMINI ────────────────────────────────────── */}
              {renderTarjetaProveedor({
                id: 'gemini',
                titulo: 'Google Gemini',
                colorBadge: 'bg-blue-100 text-blue-900 border-blue-200',
                colorDot: 'bg-blue-500',
                badgePrioridad: '🥈 Respaldo N.° 2',
                placeholderKey: 'AIzaSy...',
                modelos: [
                  { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash (Recomendado · Rápido y Preciso)' },
                  { id: 'gemini-2.5-pro', label: 'gemini-2.5-pro (Máximo Razonamiento Jurídico)' },
                  { id: 'gemini-flash-latest', label: 'gemini-flash-latest (Última versión estable)' },
                  { id: 'gemini-pro-latest', label: 'gemini-pro-latest' }
                ],
                config: configs.find(c => c.proveedor === 'gemini')
              })}

              {/* ── 3. OPENAI (CHATGPT) ─────────────────────────────────── */}
              {renderTarjetaProveedor({
                id: 'openai',
                titulo: 'OpenAI (ChatGPT)',
                colorBadge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
                colorDot: 'bg-emerald-500',
                badgePrioridad: '🥉 Respaldo N.° 3',
                placeholderKey: 'sk-proj-...',
                modelos: [
                  { id: 'gpt-4o-mini', label: 'gpt-4o-mini (Rápido y Preciso)' },
                  { id: 'gpt-4o', label: 'gpt-4o (Máxima Capacidad)' }
                ],
                config: configs.find(c => c.proveedor === 'openai')
              })}

              {/* ── 4. ANTHROPIC CLAUDE ─────────────────────────────────── */}
              {renderTarjetaProveedor({
                id: 'claude',
                titulo: 'Anthropic Claude',
                colorBadge: 'bg-amber-100 text-amber-900 border-amber-200',
                colorDot: 'bg-amber-500',
                badgePrioridad: '🏅 Respaldo N.° 4',
                placeholderKey: 'sk-ant-api03-...',
                modelos: [
                  { id: 'claude-3-5-haiku-20241022', label: 'claude-3-5-haiku (Rápido y Preciso)' },
                  { id: 'claude-3-5-sonnet-20241022', label: 'claude-3-5-sonnet (Máximo Análisis Legal)' }
                ],
                config: configs.find(c => c.proveedor === 'claude')
              })}
            </>
          ) : (
            /* ── PESTAÑA: MONITOREO Y CONTROL DE CUOTAS ─────────────────── */
            <div className="space-y-4">
              
              {/* TARJETAS RESUMEN DE CONSUMO */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
                    <span>Consultas Hoy</span>
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 mt-1">
                    {metricas?.totalConsultasHoy || 0}
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
                    <span>Consultas Este Mes</span>
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 mt-1">
                    {metricas?.totalConsultasMes || 0}
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
                    <span>Tokens Consumidos</span>
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 mt-1">
                    {(metricas?.totalTokensMes || 0).toLocaleString()}
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase">
                    <span>Costo Est. USD</span>
                    <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <p className="text-xl font-extrabold text-emerald-600 mt-1">
                    ${metricas?.costoEstimadoUSD || 0}
                  </p>
                </div>
              </div>

              {/* BLOQUE CONFIGURAR LÍMITE DIARIO */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Control de Límite Diario por Especialista</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Número máximo de consultas asistidas por IA que puede realizar cada profesional al día.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    Actual: {metricas?.limiteDiarioPorUsuario || 20} consultas/día
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={limiteDiarioInput}
                    onChange={e => setLimiteDiarioInput(parseInt(e.target.value) || 20)}
                    className="w-32 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                  />
                  <span className="text-xs text-slate-600">consultas por día por especialista</span>

                  <button
                    type="button"
                    onClick={handleGuardarLimite}
                    disabled={guardandoLimite}
                    className="ml-auto px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                  >
                    {guardandoLimite ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {guardandoLimite ? 'Guardando...' : 'Aplicar Límite'}
                  </button>
                </div>
              </div>

              {/* TABLA DE USUARIOS Y CONSULTAS */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-500" /> Especialistas con mayor consumo este mes
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                        <th className="py-2">Especialista</th>
                        <th className="py-2 text-right">Consultas IA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {metricas?.topUsuarios && metricas.topUsuarios.length > 0 ? (
                        metricas.topUsuarios.map((u, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-2 font-medium">{u.nombre}</td>
                            <td className="py-2 text-right font-bold text-blue-600">{u.totalConsultas}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="py-3 text-center text-slate-400 text-[11px]">
                            No hay registros de consultas en el periodo actual.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* FOOTER DEL MODAL */}
        <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-600" /> Claves y cuotas protegidas en la base de datos oficial.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  )
}
