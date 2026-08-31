'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  Scale, BookOpen, Search, Sparkles, Copy, Check, ShieldCheck,
  FileText, CornerDownLeft, AlertCircle, Bot, RefreshCw, ChevronRight,
  Bookmark, Info, ExternalLink, ArrowLeft, Layers, CheckCircle2,
  ListOrdered, X, Settings
} from 'lucide-react'
import type { SessionPayload } from '@/lib/auth'
import ModalConfiguracionIA from '@/components/ModalConfiguracionIA'

interface DocumentoNormativo {
  id: number
  codigo: string
  nombre: string
  tipo: string
  fechaPublicacion?: string
  versionCorpus: string
  totalArticulos: number
}

interface UnidadSimple {
  id: number
  referencia: string
  articulo?: string
  sumilla?: string
  vigente: number
  modificadoPor?: string
  orden: number
  documentoCodigo?: string
}

interface BusquedaItem {
  referencia: string
  documentoCodigo: string
  articulo?: string
  sumilla?: string
  fragmento: string
  score: number
  conteoCoincidencias?: number
  vigente: number
}

interface UnidadDetalle {
  id: number
  documentoCodigo?: string
  referencia: string
  libro?: string
  titulo?: string
  capitulo?: string
  articulo?: string
  numeral?: string
  literal?: string
  sumilla?: string
  texto: string
  vigente: number
  modificadoPor?: string
  paginaPdf?: number
  orden: number
}

interface CitaItem {
  referencia: string
  documentoCodigo: string
  articulo?: string
  sumilla?: string
  textoExtracto: string
}

interface MensajeChat {
  id: string
  remitente: 'usuario' | 'ia'
  texto: string
  citas?: CitaItem[]
  proveedor?: string
  modelo?: string
  latenciaMs?: number
  timestamp: string
}

interface Props {
  session: SessionPayload
}

export default function NormativaClient({ session }: Props) {
  // Estado de documentos y unidades
  const [documentos, setDocumentos] = useState<DocumentoNormativo[]>([])
  const [docSeleccionado, setDocSeleccionado] = useState<string>('TODOS')
  const [unidades, setUnidades] = useState<UnidadSimple[]>([])
  const [unidadActual, setUnidadActual] = useState<UnidadDetalle | null>(null)
  
  // Pestaña activa del panel izquierdo: 'indice' | 'busqueda'
  const [tabPanelIzquierdo, setTabPanelIzquierdo] = useState<'indice' | 'busqueda'>('indice')
  
  // Modal administrativo de configuración de IA
  const [modalAdminOpen, setModalAdminOpen] = useState(false)
  const esAdmin = Boolean(
    session?.rol?.toLowerCase().includes('admin') ||
    session?.email?.toLowerCase().includes('admin')
  )
  
  // Término de búsqueda de texto completo y resultados
  const [queryBusqueda, setQueryBusqueda] = useState('')
  const [terminoBuscadoActivo, setTerminoBuscadoActivo] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<BusquedaItem[]>([])
  const [buscandoTexto, setBuscandoTexto] = useState(false)
  
  // Filtro rápido de índice
  const [filtroIndice, setFiltroIndice] = useState('')
  
  // Proveedor de IA seleccionado (Multi-LLM)
  const [proveedorIA, setProveedorIA] = useState<'deepseek' | 'gemini' | 'openai' | 'claude'>('deepseek')
  
  // Estado del chat IA
  const [mensajes, setMensajes] = useState<MensajeChat[]>([
    {
      id: 'bienvenida',
      remitente: 'ia',
      texto: '¡Hola! Soy el **Asistente Normativo de la DGNNA** anclado al marco legal oficial del **Decreto Legislativo N.° 1297** y su **Reglamento**.\n\nPuedes hacerme cualquier consulta jurídica o procesal y te responderé citando con precisión los artículos oficiales.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputPregunta, setInputPregunta] = useState('')
  const [cargandoIA, setCargandoIA] = useState(false)
  const [copiadoCita, setCopiadoCita] = useState(false)
  const [cargandoUnidad, setCargandoUnidad] = useState(false)
  
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Cargar lista de documentos al montar
  useEffect(() => {
    fetch('/api/normativa/documentos')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDocumentos(data)
          cargarUnidadesDocumento('DL-1297')
        }
      })
      .catch(err => console.error('Error cargando documentos:', err))
  }, [])

  const cargarUnidadesDocumento = (docCod: string) => {
    fetch(`/api/normativa/documentos/${docCod}/unidades`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUnidades(data)
          if (data.length > 0 && !unidadActual) {
            cargarDetalleUnidad(data[0].referencia)
          }
        }
      })
      .catch(err => console.error('Error cargando unidades:', err))
  }

  // Scroll automático al final del chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargandoIA])

  const cargarDetalleUnidad = async (ref: string) => {
    setCargandoUnidad(true)
    try {
      const res = await fetch(`/api/normativa/unidades/${encodeURIComponent(ref)}`)
      if (res.ok) {
        const data = await res.json()
        setUnidadActual(data)
      }
    } catch (e) {
      console.error('Error cargando detalle:', e)
    } finally {
      setCargandoUnidad(false)
    }
  }

  // Ejecutar búsqueda literal exhaustiva en el texto completo (con auditoría)
  const ejecutarBusquedaTexto = async (textoApenas?: string) => {
    const q = (textoApenas !== undefined ? textoApenas : queryBusqueda).trim()
    if (!q || q.length < 2) return

    setBuscandoTexto(true)
    setTabPanelIzquierdo('busqueda')
    setTerminoBuscadoActivo(q)

    try {
      const docFiltro = docSeleccionado !== 'TODOS' ? `&documento=${encodeURIComponent(docSeleccionado)}` : ''
      const userParams = `&usuario_nombre=${encodeURIComponent(session?.nombre || '')}&usuario_rol=${encodeURIComponent(session?.rol || '')}`
      const res = await fetch(`/api/normativa/buscar?q=${encodeURIComponent(q)}${docFiltro}&top_k=50${userParams}`)
      if (res.ok) {
        const data = await res.json()
        const items = data.items || []
        setResultadosBusqueda(items)
        if (items.length > 0) {
          cargarDetalleUnidad(items[0].referencia)
        }
      }
    } catch (err) {
      console.error('Error ejecutando búsqueda de texto completo:', err)
    } finally {
      setBuscandoTexto(false)
    }
  }

  // Enviar pregunta al Asistente IA (RAG Multi-LLM con control de cuota y auditoría)
  const handleEnviarConsulta = async (preguntaTexto?: string) => {
    const q = (preguntaTexto || inputPregunta).trim()
    if (!q || cargandoIA) return

    const nuevoMsgUsuario: MensajeChat = {
      id: Date.now().toString(),
      remitente: 'usuario',
      texto: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMensajes(prev => [...prev, nuevoMsgUsuario])
    setInputPregunta('')
    setCargandoIA(true)

    try {
      const res = await fetch('/api/normativa/consultar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pregunta: q,
          proveedor: proveedorIA,
          topK: 4,
          usuarioId: session?.userId,
          usuarioNombre: session?.nombre,
          usuarioRol: session?.rol
        })
      })

      if (res.ok) {
        const data = await res.json()
        const nuevoMsgIA: MensajeChat = {
          id: (Date.now() + 1).toString(),
          remitente: 'ia',
          texto: data.respuesta,
          citas: data.citas || [],
          proveedor: data.proveedorUsado,
          modelo: data.modeloUsado,
          latenciaMs: data.latenciaMs,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        setMensajes(prev => [...prev, nuevoMsgIA])
      } else {
        setMensajes(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            remitente: 'ia',
            texto: '⚠️ Ocurrió un inconveniente al procesar la consulta. Por favor intente nuevamente.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ])
      }
    } catch (error) {
      console.error('Error en consulta RAG:', error)
    } finally {
      setCargandoIA(false)
    }
  }

  // Copiar cita oficial formateada al portapapeles
  const handleCopiarCita = () => {
    if (!unidadActual) return
    const docNombre = unidadActual.documentoCodigo === 'DL-1297' ? 'Decreto Legislativo N.° 1297' : 'Reglamento del D. Leg. N.° 1297'
    const textoCita = `«${unidadActual.texto.trim()}»\n— Fuente: ${docNombre}, ${unidadActual.articulo || 'Art.'} («${unidadActual.sumilla || ''}»).`
    navigator.clipboard.writeText(textoCita)
    setCopiadoCita(true)
    setTimeout(() => setCopiadoCita(false), 2000)
  }

  // Genera expresión regular tolerante a acentos para la FRASE EXACTA CONTINUA
  const crearRegexFraseExacta = (frase: string) => {
    const limpia = frase.trim()
    if (!limpia) return null
    
    // Convertir cada letra a clase con sus variantes con tilde
    const mapaVocales: Record<string, string> = {
      'a': '[aáàäâAÁÀÄÂ]',
      'e': '[eéèëêEÉÈËÊ]',
      'i': '[iíìïîIÍÌÏÎ]',
      'o': '[oóòöôOÓÒÖÔ]',
      'u': '[uúùüûUÚÙÜÛ]',
      'n': '[nñNÑ]'
    }

    const patron = limpia
      .split('')
      .map(char => {
        const c = char.toLowerCase()
        if (mapaVocales[c]) return mapaVocales[c]
        if (/\s/.test(c)) return '\\s+'
        return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      })
      .join('')

    return new RegExp(`(${patron})`, 'gi')
  }

  // Conteo de coincidencias de la FRASE EXACTA en el artículo actual
  const conteoEnArticuloActual = useMemo(() => {
    if (!unidadActual || !terminoBuscadoActivo.trim()) return 0
    try {
      const regex = crearRegexFraseExacta(terminoBuscadoActivo)
      if (!regex) return 0
      const matches = unidadActual.texto.match(regex)
      return matches ? matches.length : 0
    } catch {
      return 0
    }
  }, [unidadActual, terminoBuscadoActivo])

  // Auto-scroll suave a la primera coincidencia cuando se carga un artículo
  useEffect(() => {
    if (terminoBuscadoActivo && conteoEnArticuloActual > 0) {
      setTimeout(() => {
        const el = document.getElementById('primer-resultado-resaltado')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 150)
    }
  }, [unidadActual?.referencia, terminoBuscadoActivo, conteoEnArticuloActual])

  // Función para resaltar en amarillo fluorescente la FRASE EXACTA dentro del texto
  const renderTextoConResaltado = (texto: string, termino: string) => {
    if (!termino || !termino.trim()) return texto
    
    const regex = crearRegexFraseExacta(termino)
    if (!regex) return texto

    const partes = texto.split(regex)
    let primerMarcado = false

    return partes.map((parte, i) => {
      if (regex.test(parte)) {
        const esPrimero = !primerMarcado
        if (esPrimero) primerMarcado = true
        return (
          <mark
            key={i}
            id={esPrimero ? 'primer-resultado-resaltado' : undefined}
            className="bg-yellow-300 text-slate-950 font-black px-1.5 py-0.5 rounded shadow-xs border border-yellow-400 ring-2 ring-yellow-400/80 inline-block my-0.5"
          >
            {parte}
          </mark>
        )
      }
      return parte
    })
  }

  // Función para formatear texto legal justificado y limpio sin saltos rotos de PDF
  const renderParrafosLegales = (textoCompleto: string, termino: string) => {
    if (!textoCompleto) return null

    // Normalizar saltos de línea de PDF: unir oraciones quebradas y separar párrafos lógicos
    const lineas = textoCompleto.split('\n')
    const parrafos: string[] = []
    let buffer = ''

    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i].trim()
      if (!l) {
        if (buffer) {
          parrafos.push(buffer)
          buffer = ''
        }
        continue
      }

      // Si empieza con un patrón de nuevo párrafo (Art., numeral, literal, guion, viñeta, asterisco de modificación o comilla)
      const esNuevoParrafo = /^(?:art[íi]culo\s+\d+|disposici[óo]n|\d+[\.\)]|[a-z]\)|\*|\([a-z0-9\*]+\)|[“"«])/i.test(l)

      if (esNuevoParrafo && buffer) {
        parrafos.push(buffer)
        buffer = l
      } else {
        if (buffer) {
          buffer += ' ' + l
        } else {
          buffer = l
        }
      }
    }
    if (buffer) parrafos.push(buffer)

    return (
      <div className="space-y-4 font-serif text-[15px] text-slate-900 leading-relaxed">
        {parrafos.map((p, idx) => {
          const esTituloArticulo = /^(?:art[íi]culo\s+\d+)/i.test(p)
          const esNotaModificatoria = /^\(\*\)/.test(p) || p.toLowerCase().includes('modificado por')

          if (esTituloArticulo && idx === 0) {
            return (
              <h3 key={idx} className="font-bold font-sans text-slate-900 text-base mb-3 pb-1 border-b border-slate-200">
                {renderTextoConResaltado(p, termino)}
              </h3>
            )
          }

          if (esNotaModificatoria) {
            return (
              <div key={idx} className="bg-slate-100/90 p-3 rounded-lg border-l-4 border-slate-400 text-xs font-sans text-slate-700 italic my-2 text-justify [text-justify:inter-word] leading-normal">
                {renderTextoConResaltado(p, termino)}
              </div>
            )
          }

          return (
            <p key={idx} className="text-justify [text-justify:inter-word] leading-relaxed">
              {renderTextoConResaltado(p, termino)}
            </p>
          )
        })}
      </div>
    )
  }

  // Filtrado rápido del índice
  const unidadesIndiceFiltradas = unidades.filter(u => {
    if (!filtroIndice.trim()) return true
    const term = filtroIndice.toLowerCase()
    return (
      (u.articulo && u.articulo.toLowerCase().includes(term)) ||
      (u.sumilla && u.sumilla.toLowerCase().includes(term)) ||
      u.referencia.toLowerCase().includes(term)
    )
  })

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* ── TOPBAR ESTÁNDAR DGNNA (FONDO BLANCO INSTITUCIONAL) ───────────── */}
      <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/menu"
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
            title="Volver al Menú Principal"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-wider text-blue-600 uppercase">Módulo 13 · DGNNA</div>
            <h1 className="text-sm font-bold text-slate-900 leading-none">Consulta Normativa y Asistente RAG</h1>
          </div>
          <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Corpus Oficial (DL 1297 + Reglamento · 398 artículos)
          </span>
        </div>

        {/* SELECTOR DE PROVEEDOR MULTI-LLM Y BOTÓN ADMIN */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <span className="text-[10px] font-bold text-slate-500 px-2 uppercase">Motor IA:</span>
            
            <button
              onClick={() => setProveedorIA('deepseek')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                proveedorIA === 'deepseek'
                  ? 'bg-white text-indigo-900 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="DeepSeek AI (Principal · Ultra Rápido y Económico)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span> DeepSeek
            </button>

            <button
              onClick={() => setProveedorIA('gemini')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                proveedorIA === 'gemini'
                  ? 'bg-white text-blue-800 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Google Gemini 2.5 Flash / Pro"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Gemini
            </button>

            <button
              onClick={() => setProveedorIA('openai')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                proveedorIA === 'openai'
                  ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="OpenAI GPT-4o"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ChatGPT
            </button>

            <button
              onClick={() => setProveedorIA('claude')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                proveedorIA === 'claude'
                  ? 'bg-white text-amber-800 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Anthropic Claude 3.5 Sonnet / Haiku"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Claude
            </button>
          </div>

          {/* BOTÓN EXCLUSIVO PARA ADMINISTRADOR */}
          {esAdmin && (
            <button
              onClick={() => setModalAdminOpen(true)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-300 hover:border-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
              title="Configurar claves de API de IA (Solo Administrador)"
            >
              <Settings className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Configurar APIs</span>
            </button>
          )}
        </div>
      </header>

      {/* MODAL ADMINISTRATIVO DE CLAVES DE IA */}
      {esAdmin && (
        <ModalConfiguracionIA
          isOpen={modalAdminOpen}
          onClose={() => setModalAdminOpen(false)}
        />
      )}

      {/* ── CONTENEDOR PRINCIPAL DE 3 PANELES ERGONÓMICOS ─────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ── PANEL 1: NAVEGADOR Y BUSCADOR DE COINCIDENCIAS (IZQUIERDA) ── */}
        <aside className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
          
          {/* CAJA DE BÚSQUEDA GLOBAL DE TEXTO COMPLETO */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/80 space-y-2">
            
            {/* SELECTOR DE ALCANCE NORMATIVO */}
            <div className="flex items-center justify-between text-xs">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Ámbito de Búsqueda
              </label>
              <select
                value={docSeleccionado}
                onChange={e => {
                  setDocSeleccionado(e.target.value)
                  if (e.target.value !== 'TODOS') {
                    cargarUnidadesDocumento(e.target.value)
                  }
                }}
                className="text-[11px] font-semibold bg-white border border-slate-300 rounded-md px-2 py-0.5 focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-700 shadow-2xs"
              >
                <option value="TODOS">Todos los Documentos (398 arts.)</option>
                <option value="DL-1297">DL-1297 (167 arts.)</option>
                <option value="DS-001-2018-MIMP">Reglamento (231 arts.)</option>
              </select>
            </div>

            {/* INPUT DE BÚSQUEDA EXHAUSTIVA */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar palabra o frase (ej. 'no abrir', 'acogimiento')..."
                value={queryBusqueda}
                onChange={e => setQueryBusqueda(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    ejecutarBusquedaTexto()
                  }
                }}
                className="w-full pl-8 pr-16 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 shadow-2xs text-slate-900 font-medium"
              />
              <button
                onClick={() => ejecutarBusquedaTexto()}
                disabled={!queryBusqueda.trim() || buscandoTexto}
                className="absolute right-1 top-1 bottom-1 px-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-md text-[11px] font-semibold transition flex items-center gap-1 shadow-2xs"
              >
                {buscandoTexto ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Buscar'}
              </button>
            </div>

            {/* PESTAÑAS: ÍNDICE SECUENCIAL VS RESULTADOS DE BÚSQUEDA */}
            <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setTabPanelIzquierdo('indice')}
                className={`flex-1 py-1 px-2 rounded-md transition flex items-center justify-center gap-1.5 ${
                  tabPanelIzquierdo === 'indice'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Índice</span>
              </button>
              <button
                onClick={() => setTabPanelIzquierdo('busqueda')}
                className={`flex-1 py-1 px-2 rounded-md transition flex items-center justify-center gap-1.5 ${
                  tabPanelIzquierdo === 'busqueda'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Coincidencias {resultadosBusqueda.length > 0 && `(${resultadosBusqueda.length})`}</span>
              </button>
            </div>
          </div>

          {/* CONTENIDO DE LA PESTAÑA SELECCIONADA */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
            
            {/* VISTA 1: RESULTADOS DE LA BÚSQUEDA LITERAL EXHAUSTIVA */}
            {tabPanelIzquierdo === 'busqueda' && (
              <>
                {buscandoTexto ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600" />
                    <p>Buscando coincidencias en el texto de 398 artículos...</p>
                  </div>
                ) : resultadosBusqueda.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center bg-slate-100 rounded-md">
                      <span>Coincidencias para «{terminoBuscadoActivo}»</span>
                      <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {resultadosBusqueda.length} artículos
                      </span>
                    </div>

                    {resultadosBusqueda.map((r, idx) => {
                      const esActivo = unidadActual?.referencia === r.referencia
                      return (
                        <button
                          key={idx}
                          onClick={() => cargarDetalleUnidad(r.referencia)}
                          className={`w-full text-left p-2.5 rounded-lg transition border flex flex-col gap-1 ${
                            esActivo
                              ? 'bg-blue-50/90 border-blue-300 text-blue-900 shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                {r.documentoCodigo}
                              </span>
                              <span className="font-bold text-slate-900 text-xs">
                                {r.articulo || 'Art.'}
                              </span>
                            </div>
                            {r.conteoCoincidencias && r.conteoCoincidencias > 0 && (
                              <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-amber-200">
                                {r.conteoCoincidencias} {r.conteoCoincidencias === 1 ? 'coincidencia' : 'coincidencias'}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] font-semibold text-slate-700 truncate">
                            {r.sumilla || 'Sin sumilla específica'}
                          </div>

                          {/* EXTRACTO CON RESALTADO */}
                          <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 line-clamp-2 leading-relaxed">
                            {renderTextoConResaltado(r.fragmento, terminoBuscadoActivo)}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : terminoBuscadoActivo ? (
                  <div className="py-12 text-center text-xs text-slate-400 p-4">
                    <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No se encontraron coincidencias</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      No hay artículos que contengan el texto exacto «{terminoBuscadoActivo}».
                    </p>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 p-4">
                    <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">Búsqueda en todo el cuerpo legal</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Escribe cualquier frase (ej. <em>"no abrir"</em>, <em>"medida de urgencia"</em>) en la caja superior y presiona Buscar.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* VISTA 2: ÍNDICE SECUENCIAL DE ARTÍCULOS */}
            {tabPanelIzquierdo === 'indice' && (
              <>
                <div className="px-1 py-1">
                  <input
                    type="text"
                    placeholder="Filtrar índice (ej. Art. 45)..."
                    value={filtroIndice}
                    onChange={e => setFiltroIndice(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                  />
                </div>

                <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                  <span>Artículos del Documento</span>
                  <span className="text-slate-600 font-bold">{unidadesIndiceFiltradas.length}</span>
                </div>

                {unidadesIndiceFiltradas.map(u => {
                  const esActivo = unidadActual?.referencia === u.referencia
                  return (
                    <button
                      key={u.referencia}
                      onClick={() => cargarDetalleUnidad(u.referencia)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center justify-between gap-2 ${
                        esActivo
                          ? 'bg-blue-50 border border-blue-200 text-blue-900 font-semibold shadow-2xs'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="truncate">
                        <span className={`font-bold ${esActivo ? 'text-blue-700' : 'text-slate-900'}`}>
                          {u.articulo || 'Art.'}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-1.5 truncate block font-normal">
                          {u.sumilla || 'Sin sumilla'}
                        </span>
                      </div>
                      <span
                        className="w-2 h-2 rounded-full shrink-0 bg-emerald-500"
                        title="Texto Vigente"
                      />
                    </button>
                  )
                })}
              </>
            )}

          </div>

          <div className="p-2.5 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-600 flex justify-between items-center font-medium">
            <span>Base Oficial:</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 398 Artículos Indexados
            </span>
          </div>
        </aside>

        {/* ── PANEL 2: VISOR LEGAL OFICIAL DEL ARTÍCULO COMPLETO (CENTRO) ── */}
        <section className="flex-1 bg-white flex flex-col overflow-hidden border-r border-slate-200">
          {cargandoUnidad ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-600" />
              Cargando texto completo del artículo...
            </div>
          ) : unidadActual ? (
            <>
              {/* HEADER DEL ARTÍCULO COMPLETO */}
              <div className="px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-md">
                      {unidadActual.documentoCodigo}
                    </span>
                    <h2 className="text-sm font-bold text-slate-900">
                      {unidadActual.articulo}: {unidadActual.sumilla}
                    </h2>
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Vigente
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {unidadActual.titulo ? `${unidadActual.titulo} · ` : ''}
                    {unidadActual.capitulo || 'Disposiciones Generales'}
                    {unidadActual.paginaPdf ? ` (Página ${unidadActual.paginaPdf} del PDF oficial)` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopiarCita}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition shadow-2xs ${
                      copiadoCita
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                    title="Copiar texto con formato de cita legal oficial"
                  >
                    {copiadoCita ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-blue-600" />}
                    {copiadoCita ? '¡Cita Copiada!' : 'Copiar Cita Oficial'}
                  </button>
                </div>
              </div>

              {/* BANNER DE COINCIDENCIAS RESALTADAS EN ESTE ARTÍCULO */}
              {terminoBuscadoActivo && conteoEnArticuloActual > 0 && (
                <div className="bg-yellow-50 border-b border-yellow-300 px-6 py-2 flex items-center justify-between text-xs text-slate-900 font-medium shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 border border-yellow-600 animate-pulse"></span>
                    <span>
                      Se encontraron <strong className="text-amber-950 bg-yellow-200 px-1.5 py-0.5 rounded border border-yellow-300">{conteoEnArticuloActual} coincidencias</strong> del término <strong className="text-blue-900">«{terminoBuscadoActivo}»</strong> resaltadas en amarillo:
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const el = document.getElementById('primer-resultado-resaltado')
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }}
                      className="px-2 py-0.5 bg-yellow-200 hover:bg-yellow-300 text-yellow-950 font-bold rounded text-[11px] border border-yellow-400 transition shadow-2xs flex items-center gap-1"
                    >
                      🎯 Ir a coincidencia
                    </button>
                    <button
                      onClick={() => setTerminoBuscadoActivo('')}
                      className="text-[11px] text-slate-500 hover:text-slate-800 hover:underline flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Limpiar resaltado
                    </button>
                  </div>
                </div>
              )}

              {/* CUERPO DEL ARTÍCULO ÍNTEGRO FORMATEADO Y JUSTIFICADO */}
              <div className="flex-1 overflow-y-auto px-8 py-6 max-w-4xl space-y-4">
                <div className="bg-slate-50 p-7 rounded-xl border border-slate-200 shadow-2xs">
                  {renderParrafosLegales(unidadActual.texto, terminoBuscadoActivo)}
                </div>

                {/* NOTAS NORMATIVAS Y CONCORDANCIAS */}
                <div className="bg-amber-50/80 border-l-4 border-amber-500 p-3.5 rounded-r-xl text-xs text-amber-900 font-sans border border-amber-200">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-800">
                    <Info className="w-4 h-4 text-amber-600" />
                    Concordancia y Aplicación Operativa:
                  </div>
                  <p>
                    Para la aplicación de las medidas y plazos contenidos en este artículo en sede UPE/DEMUNA, revisar de forma concordada el <strong>D.S. N.° 001-2018-MIMP</strong> y las directivas de protección especial vigentes.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs p-6 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 mb-2" />
              Selecciona un artículo en el panel izquierdo para visualizar el texto completo.
            </div>
          )}
        </section>

        {/* ── PANEL 3: ASISTENTE IA Y CONSULTA RAG (DERECHA) ───────────── */}
        <aside className="w-80 md:w-96 bg-slate-50 flex flex-col shrink-0 border-l border-slate-200">
          
          {/* HEADER DEL ASISTENTE */}
          <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">Asistente Normativo DGNNA</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Anclado al Marco Legal Oficial</span>
              </div>
            </div>

            <button
              onClick={() => setMensajes([mensajes[0]])}
              className="text-slate-400 hover:text-slate-600 text-xs p-1.5 rounded-md hover:bg-slate-100 transition"
              title="Reiniciar conversación"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* HISTORIAL DEL CHAT */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
            {mensajes.map(m => (
              <div
                key={m.id}
                className={`flex flex-col ${m.remitente === 'usuario' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-xl max-w-[92%] shadow-2xs leading-relaxed ${
                    m.remitente === 'usuario'
                      ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs space-y-2'
                  }`}
                >
                  {m.remitente === 'ia' && (
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-[10px] text-blue-700 font-bold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Sustento Jurídico Oficial
                      </span>
                      {m.proveedor && (
                        <span className="text-slate-400 font-medium">{m.proveedor}</span>
                      )}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap text-[12.5px]">{m.texto}</div>

                  {/* CHIPS DE CITAS LEGALES INTERACTIVAS */}
                  {m.citas && m.citas.length > 0 && (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 mt-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                        Artículos Oficiales Citados:
                      </span>
                      {m.citas.map((c, idx) => (
                        <button
                          key={idx}
                          onClick={() => cargarDetalleUnidad(c.referencia)}
                          className="w-full text-left block text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-1.5 rounded-md border border-slate-200 hover:border-blue-300 transition shadow-2xs"
                        >
                          <Bookmark className="w-3 h-3 inline mr-1.5 text-blue-600" />
                          <span>{c.documentoCodigo}, {c.articulo || 'Art.'}</span>
                          {c.sumilla ? <span className="font-normal text-slate-600"> — {c.sumilla}</span> : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-1 px-1 font-medium">
                  <span>{m.timestamp}</span>
                  {m.latenciaMs && <span>· {m.latenciaMs}ms</span>}
                </div>
              </div>
            ))}

            {cargandoIA && (
              <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 p-2.5 rounded-xl border border-blue-100 w-fit font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Consultando artículos y procesando respuesta con {proveedorIA.toUpperCase()}...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* PREGUNTAS SUGERIDAS RÁPIDAS */}
          <div className="px-3 py-2 bg-slate-100/70 border-t border-slate-200 flex gap-1.5 overflow-x-auto text-[10px]">
            <button
              onClick={() => handleEnviarConsulta('¿Cuál es el plazo de convalidación judicial de las medidas de urgencia?')}
              className="whitespace-nowrap px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition shadow-2xs font-medium"
            >
              ⚖️ Plazo convalidación judicial
            </button>
            <button
              onClick={() => handleEnviarConsulta('¿Qué causales impiden el acogimiento en familia extensa?')}
              className="whitespace-nowrap px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition shadow-2xs font-medium"
            >
              👨‍👩‍👧 Acogimiento familiar
            </button>
          </div>

          {/* CAJA DE ENTRADA */}
          <div className="p-3 bg-white border-t border-slate-200">
            <div className="relative">
              <textarea
                rows={2}
                placeholder="Escribe tu consulta legal (ej. ¿Quién dispone el acogimiento residencial?)..."
                value={inputPregunta}
                onChange={e => setInputPregunta(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleEnviarConsulta()
                  }
                }}
                className="w-full p-2.5 pr-10 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none shadow-2xs text-slate-800"
              />
              <button
                onClick={() => handleEnviarConsulta()}
                disabled={!inputPregunta.trim() || cargandoIA}
                className="absolute right-2.5 bottom-2.5 w-7 h-7 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-md flex items-center justify-center transition shadow-xs"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[9px] text-slate-400 px-1">
              <span>Shift+Enter para salto de línea</span>
              <span className="font-semibold text-slate-500">RAG On-Premise DGNNA</span>
            </div>
          </div>

        </aside>

      </div>
    </div>
  )
}
