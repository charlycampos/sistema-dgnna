'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMe } from '@/lib/use-me'
import {
  Search, Plus, Trash2, Globe, FileText,
  Scale, CheckCircle, Clock, Archive, Download,
  ArrowLeft, ClipboardList, MessageSquare,
  Save, AlertCircle, Eye, User, Edit3, X,
  Check, ChevronRight, BarChart2,
  TrendingUp, LayoutGrid, ChevronDown, LogOut,
  Calendar, AlertTriangle, UserCheck, Info, Lock, Plane, Users, MinusCircle
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

type RequisitoProceso = { id: string; nombre: string; estado: 'Pendiente' | 'Completo' | 'Observado' | 'No aplica' }

type ProcesoOperativo = {
  casoId?: string; faseOperativa: string; evaluacionResultado?: string
  fechaEntrevista?: string; resultadoEntrevista?: string
  requisitos: RequisitoProceso[]; fechaObservacion?: string; fechaNotificacion?: string
  fechaLimiteSubsanacion?: string; ampliacionSubsanacion?: string; fechaRespuestaSubsanacion?: string
  resultadoSubsanacion?: string; detalleSubsanacion?: string
  destinatarioGestion?: string; tipoComunicacion?: string; fechaEnvio?: string
  referenciaSgd?: string; respuestaEsperada?: string; proximaAccion?: string; fechaLimite?: string
  respuestaRecibida?: string; estadoCooperacion?: string
  estadoRetornoVoluntario?: string; propuestaRetorno?: string; fechaPrevistaRetorno?: string
  compromisosRetorno?: string; fechaAcuerdo?: string; fechaLimitePasajes?: string
  pasajesRecibidos?: string; fechaRetornoEfectivo?: string; updatedAt?: string
}

type ExpedienteTab = 'resumen' | 'datos' | 'personas' | 'evaluacion' | 'subsanacion' | 'internacional' | 'retorno' | 'bitacora' | 'judicial' | 'cierre'

type Nna = {
  id: string; casoId?: string
  nombres: string; primerApellido: string; segundoApellido?: string
  sexo?: string; fechaNacimiento?: string; edad?: string; tipoEdad?: string
}

type Caso = {
  id: string; codigo: string
  nnaNombre: string; nnaSexo?: string; nnaEdad?: string; nnaTipoEdad?: string; nnaFechaNac?: string
  nna?: Nna[]
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
  procesoOperativo?: ProcesoOperativo | null
}

type NnaForm = {
  nombres: string; primerApellido: string; segundoApellido?: string
  sexo: string; fechaNacimiento: string; edad: string; tipoEdad: string
}

// ── TOKENS DE DISEÑO ───────────────────────────────────────────────────
const NK = '#111827', N2 = '#1E3A5F', BL = '#2563EB', BLH = '#1D4ED8';
const SURF = '#FFFFFF', BG = '#F9FAFB', BR = '#E2E8F0';
const TX = '#0F172A', TX2 = '#475569', TX3 = '#94A3B8';

const PAISES = ['Alemania','Argentina','Australia','Bolivia','Brasil','Canadá','Chile','Colombia','Ecuador','España','Estados Unidos','Francia','Italia','México','Países Bajos','Paraguay','Perú','Portugal','Reino Unido','Uruguay','Venezuela','Otro'];
const PROFESIONALES = ['EMMA','JANNY','CECILIA'];
const SEXOS = ['Hombre','Mujer'];
const TIPO_EDAD = ['Años','Meses','Días'];
const ETAPAS = ['Administrativo','Judicial'];
const TIPO_SOL = ['Restitución','Régimen de Visitas'];
const AC_PERU = ['Requirente','Requerida'];
const RESULTADO_ENT = ['Pendiente','Acepta retorno voluntario','Rechaza retorno','No asiste','Reprogramada'];
const RETORNO = ['SI','NO','Pendiente','No aplica'];
const MOTIVOS_CIERRE = [
  'Retorno voluntario','Retorno por sentencia judicial','Acuerdo entre las partes','Sentencia infundada',
  'AC rechaza solicitud - Violencia familiar','AC rechaza solicitud - Art. 12',
  'No cumple requisitos del Convenio','Transcurrió plazo sin ubicar al NNA',
  'Desistimiento del solicitante','Sentencia infundada - Art. 13 A','Sentencia infundada - Art. 13 B',
  'Sentencia infundada - Art. 20','AC rechaza solicitud - Art. 27','Otro',
];
const ETAPAS_JUD = ['Sin demanda','Demanda presentada','En audiencia','Sentencia 1ra instancia','Sentencia 2da instancia','Casación','Ejecución de sentencia','Archivado'];
const REQ_BASE: RequisitoProceso[] = [
  { id: 'r1', nombre: '1. Solicitud formal de restitución o régimen de visitas identificada', estado: 'Pendiente' },
  { id: 'r2', nombre: '2. Identidad y datos del NNA acreditados', estado: 'Pendiente' },
  { id: 'r3', nombre: '3. Residencia habitual acreditada', estado: 'Pendiente' },
  { id: 'r4', nombre: '4. Derecho de custodia o visitas legalmente ejercido', estado: 'Pendiente' },
  { id: 'r5', nombre: '5. Traslado o retención ilícita identificado', estado: 'Pendiente' },
  { id: 'r6', nombre: '6. Documentación sustentatoria y partidas de nacimiento', estado: 'Pendiente' },
  { id: 'r7', nombre: '7. Traducciones oficiales al español, cuando corresponda', estado: 'Pendiente' },
  { id: 'r8', nombre: '8. Información para ubicación del NNA y del presunto sustractor', estado: 'Pendiente' },
];

function estadoBadge(e: string) {
  if (e === 'Tramite') return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'En trámite', accent: BL };
  if (e === 'Pendiente') return { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', label: 'Pendiente', accent: '#D97706' };
  return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: 'Archivado', accent: '#64748B' };
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

function fmtFecha(f?: string): string {
  if (!f) return '—';
  try {
    const [y, m, d] = f.split('-');
    const mes = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${parseInt(d, 10)} ${mes[parseInt(m, 10) - 1]} ${y}`;
  } catch { return f; }
}

function nombreNna(n: { nombres?: string; primerApellido?: string; segundoApellido?: string }) {
  return [n.nombres, n.primerApellido, n.segundoApellido].filter(Boolean).join(' ');
}

function nombreCaso(c: Caso): string {
  if (c.nna && c.nna.length > 0) {
    return c.nna.map(nombreNna).join(' / ');
  }
  return c.nnaNombre || (c as any).nnanombre || 'Sin NNA';
}

function vencido(f?: string): boolean {
  return Boolean(f && f < todayStr());
}

function diasDesde(f?: string): number {
  if (!f) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(`${f}T00:00:00`).getTime()) / 86400000));
}

function sumarDiasHabiles(fechaIso: string, diasHabiles: number): string {
  if (!fechaIso) return '';
  const [y, m, d] = fechaIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  let count = 0;
  while (count < diasHabiles) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    const feriados = new Set(['1-1','5-1','6-7','6-29','7-23','7-28','7-29','8-6','8-30','10-8','11-1','12-8','12-9','12-25']);
    const esFeriado = feriados.has(`${date.getMonth() + 1}-${date.getDate()}`);
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !esFeriado) count++;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function edadDesdeNacimiento(nacimientoIso: string, corteIso: string = todayStr()) {
  if (!nacimientoIso) return { edad: '', tipoEdad: 'Años' };
  const nac = new Date(nacimientoIso);
  const corte = new Date(corteIso);
  let años = corte.getFullYear() - nac.getFullYear();
  const m = corte.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && corte.getDate() < nac.getDate())) años--;
  if (años > 0) return { edad: String(años), tipoEdad: 'Años' };
  const meses = (corte.getFullYear() - nac.getFullYear()) * 12 + corte.getMonth() - nac.getMonth();
  if (meses > 0) return { edad: String(meses), tipoEdad: 'Meses' };
  const dias = Math.floor((corte.getTime() - nac.getTime()) / (1000 * 60 * 60 * 24));
  return { edad: String(Math.max(0, dias)), tipoEdad: 'Días' };
}

function emptyNnaForm(): NnaForm {
  return { nombres: '', primerApellido: '', segundoApellido: '', sexo: '', fechaNacimiento: '', edad: '', tipoEdad: 'Años' };
}

function emptyForm(): Partial<Caso> {
  return {
    codigo: '', nnaNombre: '', nnaSexo: '', nnaEdad: '', nnaTipoEdad: 'Años', nnaFechaNac: '',
    pais: '', etapa: 'Administrativo', tipoSolicitud: 'Restitución', acPeru: 'Requerida',
    fechaIngreso: todayStr(), fechaSalida: '',
    solicitanteNombre: '', solicitanteSexo: '', solicitanteTelefono: '', solicitanteCorreo: '', solicitanteDomicilio: '',
    requeridoNombre: '', requeridoSexo: '', requeridoTelefono: '', requeridoCorreo: '', requeridoDomicilio: '',
    profesional: '', estado: 'Tramite', fechaEntrevista: '', resultadoEntrevista: 'Pendiente',
    estadoJudicial: 'Sin demanda', fechaDemanda: '', numExpedienteJudicial: '', juzgado: '',
    sentencia1ra: '', sentencia2da: '', casacion: '', motivoCierre: '', retorno: 'Pendiente', observaciones: '',
  };
}

type FlowStage = {
  id: ExpedienteTab
  number: number
  label: string
  note: string
  status: 'complete' | 'active' | 'locked' | 'skipped'
}

type CaseFlow = {
  stages: FlowStage[]
  current: FlowStage
  nextAction: string
  alerts: { tone: 'error' | 'warning' | 'info'; message: string }[]
  progress: number
  closed: boolean
}

function deriveCaseFlow(caso: Caso): CaseFlow {
  if (!caso) {
    return {
      stages: [],
      current: { id: 'resumen', number: 1, label: '', note: '', status: 'locked' },
      nextAction: '',
      alerts: [],
      progress: 0,
      closed: false,
    }
  }
  const proceso = caso.procesoOperativo
  const rawPhase = proceso?.faseOperativa || (caso.etapa === 'Judicial' ? 'Judicial' : 'Evaluación')
  const phase = rawPhase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const atClosure = phase.includes('cierre')
  const closed = caso.estado === 'Archivado'
  const evaluacion = proceso?.evaluacionResultado || 'Pendiente'
  const subsanacion = proceso?.resultadoSubsanacion || 'Pendiente'
  const evaluacionTerminada = evaluacion !== 'Pendiente'
  const requiereSubsanacion = evaluacion === 'Observada'
  const subsanacionTerminada = subsanacion === 'Subsanó' || subsanacion === 'No subsanó'
  const llegaGestion = evaluacion === 'Completa' || (requiereSubsanacion && subsanacion === 'Subsanó')
  const enGestion = phase.includes('gestion') || phase.includes('retorno')
  const enJudicial = phase.includes('judicial') || phase.includes('ejecucion')
  const retornoEfectivo = Boolean(proceso?.fechaRetornoEfectivo)
  const llegaJudicial = enJudicial || Boolean(caso.fechaDemanda || caso.numExpedienteJudicial || proceso?.resultadoEntrevista === 'Desfavorable' || proceso?.estadoRetornoVoluntario === 'Sin acuerdo');

  const statuses: FlowStage['status'][] = [
    evaluacionTerminada ? 'complete' : 'active',
    !requiereSubsanacion ? 'skipped' : subsanacionTerminada ? 'complete' : 'active',
    !llegaGestion ? (requiereSubsanacion && !subsanacionTerminada ? 'locked' : 'skipped') : (llegaJudicial || atClosure) ? 'complete' : 'active',
    !llegaGestion || retornoEfectivo ? 'skipped' : llegaJudicial ? 'active' : atClosure ? 'complete' : 'locked',
    atClosure ? (closed ? 'complete' : 'active') : 'locked',
  ];
  const labels = [
    'Evaluación inicial',
    'Subsanación',
    caso.acPeru === 'Requirente' ? 'Cooperación internacional' : 'Retorno voluntario',
    caso.acPeru === 'Requirente' ? 'Seguimiento judicial exterior' : 'Proceso judicial',
    'Cierre',
  ]
  const ids: ExpedienteTab[] = ['evaluacion', 'subsanacion', caso.acPeru === 'Requirente' ? 'internacional' : 'retorno', 'judicial', 'cierre']
  const stages = ids.map((id, index): FlowStage => ({
    id,
    number: index + 1,
    label: labels[index],
    status: statuses[index],
    note: statuses[index] === 'complete' ? 'Etapa completada' : statuses[index] === 'active' ? rawPhase : statuses[index] === 'skipped' ? 'No aplica a esta ruta' : 'Pendiente de habilitar',
  }))
  const current = stages.find(stage => stage.status === 'active') || stages[4]
  const currentIndex = stages.indexOf(current)

  const alerts: CaseFlow['alerts'] = []
  const deadline = proceso?.fechaLimiteSubsanacion || proceso?.fechaLimite
  if (deadline && vencido(deadline)) alerts.push({ tone: 'error', message: `Plazo vencido el ${fmtFecha(deadline)}.` })
  if (!caso.acPeru) alerts.push({ tone: 'warning', message: 'Falta definir el rol de la AC Peru.' })
  const olderNna = (caso.nna || []).find(n => {
    if (!n.fechaNacimiento) return false
    const birth = new Date(`${n.fechaNacimiento}T00:00:00`)
    const entry = new Date(`${caso.fechaIngreso}T00:00:00`)
    let age = entry.getFullYear() - birth.getFullYear()
    const month = entry.getMonth() - birth.getMonth()
    if (month < 0 || (month === 0 && entry.getDate() < birth.getDate())) age--
    return age >= 16
  })
  if (olderNna) alerts.push({ tone: 'error', message: 'Un NNA tiene 16 anos o mas a la fecha de ingreso.' })

  const defaults = [
    'Completar la matriz de requisitos y emitir el resultado de la evaluación inicial.',
    'Registrar la notificación y controlar el plazo de subsanación.',
    caso.acPeru === 'Requirente' ? 'Continuar la coordinación con la Autoridad Central extranjera.' : 'Registrar la entrevista y el resultado de la propuesta de retorno.',
    'Actualizar la actuación judicial pendiente del expediente.',
    'Registrar el resultado final y completar el cierre del expediente.',
  ]

  return {
    stages,
    current,
    nextAction: closed ? 'Expediente cerrado. No requiere una actuación pendiente.' : proceso?.proximaAccion || defaults[currentIndex],
    alerts,
    progress: closed ? 100 : Math.round((stages.filter(stage => stage.status === 'complete').length / stages.filter(stage => stage.status !== 'skipped').length) * 100),
    closed,
  }
}

// ── NAVEGACIÓN Y SECCIONES DEL EXPEDIENTE ───────────────────────────────
const SECCIONES = [
  { label: 'Vista general', items: [['resumen', 'Resumen del caso']] },
  { label: 'Registro', items: [['datos', 'Datos del caso'], ['personas', 'Personas involucradas']] },
  { label: 'Evaluación', items: [['evaluacion', 'Evaluación inicial'], ['subsanacion', 'Requisitos y subsanación']] },
  { label: 'Gestión', items: [['internacional', 'Gestión internacional'], ['retorno', 'Retorno voluntario'], ['bitacora', 'Historial de gestión']] },
  { label: 'Resultado', items: [['judicial', 'Proceso judicial'], ['cierre', 'Cierre del caso']] },
];

const TITULOS: Record<string, [string, string]> = {
  resumen: ['Resumen del caso', 'Información vigente y situación general del expediente.'],
  datos: ['Datos del caso', 'Identificación, clasificación y datos del trámite.'],
  personas: ['Personas involucradas', 'NNA, solicitante y persona requerida vinculados al caso.'],
  evaluacion: ['Evaluación inicial', 'Verificación de requisitos y resultado de la revisión inicial.'],
  subsanacion: ['Requisitos y subsanación', 'Control de observaciones, respuesta y fechas aplicables.'],
  internacional: ['Gestión internacional', 'Comunicaciones, referencia SGD y próxima actuación.'],
  retorno: ['Retorno voluntario', 'Entrevista, propuesta, compromisos y resultado del retorno.'],
  bitacora: ['Historial de gestión', 'Registro cronológico de las actuaciones realizadas.'],
  judicial: ['Proceso judicial', 'Datos e historial de la intervención judicial.'],
  cierre: ['Cierre del caso', 'Resultado final, retorno y motivo de cierre.'],
};

// ══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════

export default function SustracionPage() {
  const router = useRouter();
  const { me, loading: meLoading, hasAccess } = useMe();
  const [casos, setCasos] = useState<Caso[]>([]);
  const [selected, setSelected] = useState<Caso | null>(null);
  const [view, setView] = useState<'casos' | 'nuevo'>('casos');
  const [tab, setTab] = useState<ExpedienteTab>('resumen');
  const [drawer, setDrawer] = useState<'ficha' | 'actividad' | null>(null);
  const [fichaTab, setFichaTab] = useState<'datos' | 'personas'>('datos');
  const [subBandeja, setSubBandeja] = useState<string>('todos');
  const [loading, setLoading] = useState(true);

  // Guard de permisos
  useEffect(() => {
    if (!meLoading && me && !hasAccess('sustraccion') && !hasAccess('sustracion') && me.rol !== 'admin') {
      router.replace('/menu');
    }
  }, [me, meLoading, hasAccess, router]);

  // Filtros de Bandeja
  const [search, setSearch] = useState('');
  const [fEstado, setFEstado] = useState('');
  const [fProfesional, setFProfesional] = useState('');
  const [fPais, setFPais] = useState('');

  // Edición
  const [pending, setPending] = useState<Partial<Caso>>({});
  const [saving, setSaving] = useState(false);
  const hasPending = Object.keys(pending).length > 0;

  // Nuevo caso
  const [formNew, setFormNew] = useState<Partial<Caso>>(emptyForm());
  const [nnaNew, setNnaNew] = useState<NnaForm[]>([]);
  const [modalNnaIndex, setModalNnaIndex] = useState<number | null>(null);
  const [modalNnaForm, setModalNnaForm] = useState<NnaForm>(emptyNnaForm());
  const [savingNew, setSavingNew] = useState(false);
  const [errorNew, setErrorNew] = useState('');

  // Bitácora
  const [bitTexto, setBitTexto] = useState('');
  const [savingBit, setSavingBit] = useState(false);

  // Cargar casos desde el backend
  const fetchCasos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sustracion');
      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : [];
        setCasos(lista);
        if (selected) {
          const upd = lista.find((c: Caso) => c && c.id === selected.id);
          if (upd) setSelected(upd);
        }
      } else {
        setCasos([]);
      }
    } catch {
      setCasos([]);
    } finally { setLoading(false); }
  }, [selected]);

  useEffect(() => { fetchCasos(); }, []);

  useEffect(() => {
    if (!drawer) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawer(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [drawer]);

  // Borrador automático en LocalStorage
  const DRAFT_KEY = 'sustracion_nuevo_draft_v2';
  useEffect(() => {
    if (view === 'nuevo') {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: formNew, nna: nnaNew })); } catch {}
    }
  }, [view, formNew, nnaNew]);

  const cargarBorrador = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.form) setFormNew(parsed.form);
        if (parsed.nna && parsed.nna.length) setNnaNew(parsed.nna);
        toast.info('Borrador restaurado correctamente');
      }
    } catch {}
  };

  // Filtrado de la bandeja
  const visibles = useMemo(() => {
    const list = Array.isArray(casos) ? casos : [];
    return list.filter(c => {
      if (!c) return false;
      const p = c.procesoOperativo;
      const fase = p?.faseOperativa || (c.etapa === 'Judicial' ? 'Judicial' : 'Recepción');

      if (subBandeja === 'revision') return !p || fase === 'Recepción' || fase === 'Evaluación' || fase === 'Evaluacion';
      if (subBandeja === 'subsanacion') return fase === 'Subsanación' || fase === 'Subsanacion';
      if (subBandeja === 'retorno') return fase === 'Retorno voluntario' || fase === 'Retorno';
      if (subBandeja === 'judicial') return fase === 'Judicial' || c.etapa === 'Judicial';
      if (subBandeja === 'vencidos') return vencido(p?.fechaLimite) || vencido(p?.fechaLimiteSubsanacion);
      if (subBandeja === 'activos') return !deriveCaseFlow(c).closed;
      if (subBandeja === 'alerta') return deriveCaseFlow(c).alerts.some(a => a.tone === 'error');
      if (subBandeja === 'cerrados') return c.estado === 'Archivado';
      return true;
    }).filter(c => {
      if (!c) return false;
      const q = search.toLowerCase();
      if (q && !nombreCaso(c).toLowerCase().includes(q) && !(c.codigo || '').toLowerCase().includes(q) && !(c.solicitanteNombre || '').toLowerCase().includes(q)) return false;
      if (fEstado && c.estado !== fEstado) return false;
      if (fProfesional && c.profesional !== fProfesional) return false;
      if (fPais && c.pais !== fPais) return false;
      return true;
    });
  }, [casos, search, fEstado, fProfesional, fPais, subBandeja]);

  const flows = useMemo(() => new Map((Array.isArray(casos) ? casos : []).filter(Boolean).map(c => [c.id, deriveCaseFlow(c)])), [casos]);
  const counters = useMemo(() => {
    const list = (Array.isArray(casos) ? casos : []).filter(Boolean);
    return [
      { label: 'Expedientes', value: list.length, color: N2 },
      { label: 'Activos', value: list.filter(c => !flows.get(c.id)?.closed).length, color: BL },
      { label: 'Con alerta crítica', value: list.filter(c => flows.get(c.id)?.alerts.some(a => a.tone === 'error')).length, color: '#DC2626' },
      { label: 'Cerrados', value: list.filter(c => flows.get(c.id)?.closed).length, color: '#16A34A' },
    ];
  }, [casos, flows]);

  const tabsSubBandeja = [
    ['todos', 'Todos'],
    ['revision', 'Por revisar'],
    ['subsanacion', 'Subsanación'],
    ['retorno', 'Retorno voluntario'],
    ['judicial', 'Judiciales'],
    ['vencidos', 'Plazos vencidos'],
    ['cerrados', 'Cerrados'],
  ];

  const onChange = (field: keyof Caso, val: any) => {
    setPending(p => ({ ...p, [field]: val }));
  };

  const getVal = (field: keyof Caso) => {
    if (field in pending) return (pending as any)[field];
    if (selected) return (selected as any)[field];
    return '';
  };

  const guardar = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload = { ...selected, ...pending };
      const res = await fetch(`/api/sustracion/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.detail || 'Error al actualizar');
      }
      const updated = await res.json();
      setSelected(updated);
      setPending({});
      setCasos(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      toast.success('Expediente actualizado correctamente');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo guardar los cambios');
    } finally { setSaving(false); }
  };

  const guardarProceso = async (proc: ProcesoOperativo, notaBitacora?: string, targetTab?: ExpedienteTab) => {
    if (!selected) return;
    try {
      // 1. Intentar actualizar por endpoint de proceso operativo o endpoint principal
      let res = await fetch(`/api/sustracion/${selected.id}/proceso-operativo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proc),
      });

      let updated: Caso;
      if (res.ok) {
        updated = await res.json();
      } else {
        // Fallback al endpoint principal PUT /api/sustracion/{id}
        const fallbackBody: Partial<Caso> = {
          etapa: proc.faseOperativa?.toLowerCase().includes('judicial') ? 'Judicial' : proc.faseOperativa?.toLowerCase().includes('cierre') ? 'Cierre' : 'Administrativo',
          resultadoEntrevista: proc.resultadoEntrevista,
          fechaEntrevista: proc.fechaEntrevista,
        };
        const resFallback = await fetch(`/api/sustracion/${selected.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackBody),
        });
        if (resFallback.ok) {
          const fallbackData = await resFallback.json();
          updated = { ...fallbackData, procesoOperativo: proc };
        } else {
          updated = { ...selected, procesoOperativo: proc };
        }
      }

      // Asegurar proceso operativo en el estado
      updated = { ...updated, procesoOperativo: proc };

      // Registro automático en Bitácora si se proporciona nota
      if (notaBitacora) {
        try {
          const bitRes = await fetch(`/api/sustracion/${selected.id}/bitacora`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha: todayStr(), texto: notaBitacora, creadoPor: me?.nombre || me?.username || 'Sistema' }),
          });
          if (bitRes.ok) {
            const nueva = await bitRes.json();
            updated = { ...updated, bitacora: [...(updated.bitacora || []), nueva] };
          }
        } catch {}
      }

      setSelected(updated);
      setCasos(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      setPending(current => {
        const rest = { ...current };
        delete rest.fechaEntrevista;
        delete rest.resultadoEntrevista;
        return rest;
      });

      const nextId = targetTab || deriveCaseFlow(updated).current.id;
      setTab(nextId);
      toast.success('Flujo operativo actualizado');
    } catch (error: any) {
      toast.error(error?.message || 'Error al actualizar el flujo de la directiva');
    }
  };

  const crearCasoDesdePagina = async () => {
    if (!formNew.codigo || !formNew.pais || !formNew.fechaIngreso) {
      setErrorNew('Hoja de Trámite, País y Fecha de Ingreso son obligatorios.');
      return;
    }
    const menoresValidos = nnaNew.filter(n => n && (Boolean(n.nombres?.trim()) || Boolean(n.primerApellido?.trim())));
    if (menoresValidos.length === 0) {
      setErrorNew('Debes agregar al menos un menor involucrado (NNA) usando el botón "+ Agregar NNA".');
      return;
    }
    const primerNna = menoresValidos[0];
    const nombreMenor = menoresValidos
      .map(n => [n.nombres, n.primerApellido, n.segundoApellido].filter(Boolean).join(' ').trim())
      .filter(Boolean)
      .join(' / ');

    if (!nombreMenor.trim()) {
      setErrorNew('El nombre y apellido del menor son obligatorios.');
      return;
    }

    setSavingNew(true);
    setErrorNew('');
    try {
      const payload = {
        ...formNew,
        profesional: me?.nombre || me?.username || 'Usuario en sesión',
        nnaNombre: nombreMenor,
        nnaSexo: primerNna.sexo || '',
        nnaEdad: primerNna.edad ? String(primerNna.edad) : '',
        nnaTipoEdad: primerNna.tipoEdad || 'Años',
        nnaFechaNac: primerNna.fechaNacimiento || '',
        creadoPor: me?.nombre || me?.username || 'Usuario',
        bitacora: [],
        nna: menoresValidos,
      };
      const res = await fetch('/api/sustracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Error al registrar expediente');
      }
      const nuevo = await res.json();
      setCasos(prev => [nuevo, ...prev]);
      setSelected(nuevo);
      setView('casos');
      setTab('resumen');
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      toast.success('Caso registrado correctamente');
    } catch (e: any) {
      setErrorNew(e.message || 'Error al guardar');
    } finally { setSavingNew(false); }
  };

  const eliminarCaso = async () => {
    if (!selected || !confirm(`¿Seguro que deseas eliminar el caso ${selected.codigo}?`)) return;
    try {
      const res = await fetch(`/api/sustracion/${selected.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.detail || 'No se pudo eliminar el caso');
      }
      setCasos(prev => prev.filter(c => c.id !== selected.id));
      setSelected(null);
      setPending({});
      toast.success('Caso eliminado');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo eliminar el caso');
    }
  };

  const agregarBitacora = async () => {
    if (!selected || !bitTexto.trim()) return;
    setSavingBit(true);
    try {
      const res = await fetch(`/api/sustracion/${selected.id}/bitacora`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: todayStr(), texto: bitTexto.trim(), creadoPor: me?.nombre || 'Usuario' }),
      });
      if (!res.ok) throw new Error();
      const nueva = await res.json();
      const upd = { ...selected, bitacora: [...(selected.bitacora || []), nueva] };
      setSelected(upd);
      setCasos(prev => prev.map(c => (c.id === upd.id ? upd : c)));
      setBitTexto('');
      toast.success('Entrada de bitácora registrada');
    } catch {
      toast.error('No se pudo agregar a la bitácora');
    } finally { setSavingBit(false); }
  };

  const fieldInputStyle: React.CSSProperties = {
    padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11, color: TX, background: SURF, outline: 'none', width: '100%', boxSizing: 'border-box',
  };
  const fieldLabelStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '.04em',
  };

  const selectedFlow = selected ? deriveCaseFlow({ ...selected, ...pending }) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: BG, color: TX, fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif" }}>
      <style jsx global>{`
        .si-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .si-filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .si-exp-header { display: flex; align-items: center; justify-content: space-between; }
        .si-exp-body { display: flex; }
        .si-rail { width: 250px; }
        .si-drawer { width: min(760px, calc(100vw - 24px)); }
        @media (max-width: 900px) {
          .si-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .si-exp-header { align-items: flex-start; flex-direction: column; }
          .si-exp-body { flex-direction: column; overflow: auto !important; }
          .si-rail { width: 100%; border-right: 0 !important; border-bottom: 1px solid ${BR}; display: flex; overflow-x: auto; }
          .si-rail-label { display: none; }
          .si-rail-summary { min-width: 170px; }
          .si-rail-progress { min-width: 180px; margin: 7px 8px 0 !important; }
          .si-rail-item { min-width: 210px; }
          .si-drawer { width: min(680px, calc(100vw - 12px)); }
        }
        @media (max-width: 620px) {
          .si-kpis { grid-template-columns: 1fr; }
          .si-page { padding: 18px 14px !important; }
          .si-filters > * { width: 100% !important; flex-basis: 100% !important; }
          .si-content > .main-scroll > div { grid-template-columns: 1fr !important; }
          .si-content > .main-scroll > div > * { grid-column: 1 / -1 !important; border-right: 0 !important; }
          .si-drawer .main-scroll > div { grid-template-columns: 1fr !important; }
          .si-drawer .main-scroll > div > * { grid-column: 1 / -1 !important; border-right: 0 !important; }
        }
        .si-input {
          transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }
        .si-input:focus {
          border-color: #2563EB !important;
          background: #FFFFFF !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
        }
      `}</style>

      {/* Header Institucional */}
      <header style={{ background: SURF, borderBottom: `1px solid ${BR}`, padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: N2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Globe size={16} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.5px' }}>DGNNA · MIMP</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: TX }}>Sustracción Internacional</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => router.push('/menu')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: `1px solid ${BR}`, background: SURF, color: TX2, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            <LayoutGrid size={13} /> Módulos
          </button>
          {me && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F1F5F9', padding: '4px 10px 4px 6px', borderRadius: 99, border: `1px solid ${BR}`, marginLeft: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: BL, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {me.nombre?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: TX }}>{me.nombre}</span>
            </div>
          )}
        </div>
      </header>

      {/* Vistas Principales */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {view === 'nuevo' ? (
          /* FICHA DE NUEVO REGISTRO EN PANTALLA COMPLETA */
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }} className="main-scroll">
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>

              {/* ENCABEZADO SUPERIOR */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setView('casos')} style={{ width: 34, height: 34, borderRadius: 7, border: `1px solid ${BR}`, background: SURF, color: TX2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Volver a la bandeja">
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: TX }}>Nuevo Expediente de Sustracción</div>
                    <div style={{ fontSize: 11, color: TX3 }}>Registro inicial según Directiva N.° 006-2021-MIMP.</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={cargarBorrador} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: `1px solid ${BR}`, background: SURF, color: TX2, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    <Save size={13} /> Cargar Borrador
                  </button>
                  <button onClick={crearCasoDesdePagina} disabled={savingNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 7, border: 'none', background: BL, color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                    <Plus size={14} /> {savingNew ? 'Registrando...' : 'Registrar Caso'}
                  </button>
                </div>
              </div>

              {errorNew && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '10px 14px', borderRadius: 7, color: '#991B1B', fontSize: 12, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={15} /> {errorNew}
                </div>
              )}

              {/* ALERTA PREVENTIVA: MAYORÍA DE EDAD (ART. 4 CONVENIO DE LA HAYA) */}
              {(() => {
                const hayMayor16 = nnaNew.some(n => {
                  if (!n.fechaNacimiento) return false;
                  const ed = edadDesdeNacimiento(n.fechaNacimiento, formNew.fechaIngreso || todayStr());
                  return ed.tipoEdad === 'Años' && parseInt(ed.edad || '0', 10) >= 16;
                });
                if (!hayMayor16) return null;
                return (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 14px', borderRadius: 7, color: '#92400E', fontSize: 11.5, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={15} color="#D97706" />
                    <span><b>Advertencia:</b> Un NNA tiene 16 años o más al ingreso. Según el Art. 4 del Convenio de La Haya de 1980, el procedimiento de restitución internacional no resulta aplicable.</span>
                  </div>
                );
              })()}

              {/* BLOQUE 1: DATOS DEL TRÁMITE */}
              <section style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, padding: 18, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${BR}` }}>
                  1. Datos del Trámite Institucional
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
                  <label style={fieldLabelStyle}>
                    Hoja de Trámite / Código *
                    <input className="si-input" value={formNew.codigo || ''} onChange={e => setFormNew(p => ({ ...p, codigo: e.target.value }))} placeholder="Ej. HT-2026-0045" style={fieldInputStyle} />
                  </label>
                  <label style={fieldLabelStyle}>
                    Fecha de Ingreso *
                    <input className="si-input" type="date" value={formNew.fechaIngreso || ''} onChange={e => setFormNew(p => ({ ...p, fechaIngreso: e.target.value }))} style={fieldInputStyle} />
                  </label>
                  <label style={fieldLabelStyle}>
                    País Contraparte *
                    <select className="si-input" value={formNew.pais || ''} onChange={e => setFormNew(p => ({ ...p, pais: e.target.value }))} style={fieldInputStyle}>
                      <option value="">Seleccionar país</option>
                      {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label style={fieldLabelStyle}>
                    Tipo de Solicitud
                    <select className="si-input" value={formNew.tipoSolicitud || 'Restitución'} onChange={e => setFormNew(p => ({ ...p, tipoSolicitud: e.target.value }))} style={fieldInputStyle}>
                      {TIPO_SOL.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label style={fieldLabelStyle}>
                    Rol AC Perú
                    <select className="si-input" value={formNew.acPeru || 'Requerida'} onChange={e => setFormNew(p => ({ ...p, acPeru: e.target.value }))} style={fieldInputStyle}>
                      {AC_PERU.map(a => <option key={a} value={a}>{a} {a === 'Requerida' ? '(Menor en Perú)' : '(Menor en Exterior)'}</option>)}
                    </select>
                  </label>
                  <label style={fieldLabelStyle}>
                    Profesional que Registra
                    <div style={{ ...fieldInputStyle, background: '#F8FAFC', color: TX, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, cursor: 'default', border: `1.5px solid ${BR}` }}>
                      <User size={13} color={BL} />
                      <span style={{ color: TX }}>{me?.nombre || me?.username || 'Usuario en sesión'}</span>
                      <span style={{ fontSize: 9.5, color: TX3, fontWeight: 600, marginLeft: 'auto', background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>
                        Sesión activa
                      </span>
                    </div>
                  </label>
                </div>
              </section>

              {/* BLOQUE 2: MENORES INVOLUCRADOS (TABLA + MODAL) */}
              <section style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, padding: 18, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                      2. Menores Involucrados (NNA) *
                    </div>
                    <div style={{ fontSize: 10.5, color: TX3, marginTop: 2 }}>
                      {nnaNew.filter(n => n.nombres.trim()).length} menor(es) registrado(s) en el caso
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalNnaForm(emptyNnaForm());
                      setModalNnaIndex(-1);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 6,
                      border: '1px solid #BFDBFE', background: '#EFF6FF',
                      color: BL, fontSize: 11, fontWeight: 800, cursor: 'pointer'
                    }}
                  >
                    <Plus size={13} /> Agregar NNA
                  </button>
                </div>

                {nnaNew.filter(n => n.nombres.trim() || n.primerApellido.trim()).length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', border: `1.5px dashed ${BR}`, borderRadius: 8, background: '#FAFBFD', color: TX3 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: TX2, marginBottom: 4 }}>No hay menores agregados</div>
                    <div style={{ fontSize: 11, marginBottom: 12 }}>Haz clic en el botón para ingresar los datos del menor involucrado.</div>
                    <button
                      type="button"
                      onClick={() => {
                        setModalNnaForm(emptyNnaForm());
                        setModalNnaIndex(-1);
                      }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 6,
                        border: 'none', background: BL, color: '#fff',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      <Plus size={12} /> Agregar primer NNA
                    </button>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: `1px solid ${BR}`, borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, background: '#fff' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: TX3, textTransform: 'uppercase', fontSize: 10, background: '#F8FAFC', borderBottom: `1px solid ${BR}` }}>
                          <th style={{ padding: '9px 12px', width: 44 }}>N.°</th>
                          <th style={{ padding: '9px 12px' }}>Nombres y Apellidos</th>
                          <th style={{ padding: '9px 12px' }}>Sexo</th>
                          <th style={{ padding: '9px 12px' }}>Fecha de Nacimiento</th>
                          <th style={{ padding: '9px 12px' }}>Edad Calculada</th>
                          <th style={{ padding: '9px 12px', textAlign: 'right', width: 80 }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nnaNew.filter(n => n.nombres.trim() || n.primerApellido.trim()).map((n, idx) => {
                          const esMayor16 = n.tipoEdad === 'Años' && parseInt(n.edad || '0', 10) >= 16;
                          return (
                            <tr key={idx} style={{ borderTop: idx ? `1px solid ${BR}` : 'none' }}>
                              <td style={{ padding: '10px 12px', color: TX3, fontWeight: 700 }}>{String(idx + 1).padStart(2, '0')}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#EFF6FF', color: BL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                                    {n.nombres?.[0]?.toUpperCase() || 'N'}
                                  </div>
                                  <span style={{ fontWeight: 700, color: TX }}>{[n.nombres, n.primerApellido, n.segundoApellido].filter(Boolean).join(' ')}</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px', color: TX2 }}>{n.sexo || '—'}</td>
                              <td style={{ padding: '10px 12px', color: TX2 }}>{fmtFecha(n.fechaNacimiento)}</td>
                              <td style={{ padding: '10px 12px' }}>
                                {n.edad ? (
                                  <span style={{ padding: '2px 8px', borderRadius: 99, background: esMayor16 ? '#FEE2E2' : '#DCFCE7', color: esMayor16 ? '#991B1B' : '#15803D', fontSize: 10.5, fontWeight: 800 }}>
                                    {n.edad} {n.tipoEdad}
                                  </span>
                                ) : '—'}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setModalNnaForm({ ...n });
                                      setModalNnaIndex(idx);
                                    }}
                                    title="Editar datos del menor"
                                    style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BR}`, background: '#F8FAFC', color: TX2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setNnaNew(prev => prev.filter((_, i) => i !== idx))}
                                    title="Quitar menor"
                                    style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* BLOQUE 3: SUJETOS DEL PROCEDIMIENTO */}
              <section style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, padding: 18, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${BR}` }}>
                  3. Sujetos del Procedimiento
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={{ border: `1px solid ${BR}`, borderRadius: 8, padding: 14, background: '#F8FAFC' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: BL, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={13} /> Parte Solicitante (Requirente)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <label style={fieldLabelStyle}>
                        Nombres y Apellidos *
                        <input className="si-input" value={formNew.solicitanteNombre || ''} onChange={e => setFormNew(p => ({ ...p, solicitanteNombre: e.target.value }))} placeholder="Nombres completos" style={fieldInputStyle} />
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <label style={fieldLabelStyle}>
                          Sexo
                          <select className="si-input" value={formNew.solicitanteSexo || ''} onChange={e => setFormNew(p => ({ ...p, solicitanteSexo: e.target.value }))} style={fieldInputStyle}>
                            <option value="">Seleccionar</option>
                            {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </label>
                        <label style={fieldLabelStyle}>
                          Teléfono
                          <input className="si-input" value={formNew.solicitanteTelefono || ''} onChange={e => setFormNew(p => ({ ...p, solicitanteTelefono: e.target.value }))} placeholder="Teléfono de contacto" style={fieldInputStyle} />
                        </label>
                      </div>
                      <label style={fieldLabelStyle}>
                        Correo Electrónico
                        <input className="si-input" value={formNew.solicitanteCorreo || ''} onChange={e => setFormNew(p => ({ ...p, solicitanteCorreo: e.target.value }))} placeholder="correo@ejemplo.com" style={fieldInputStyle} />
                      </label>
                      <label style={fieldLabelStyle}>
                        Domicilio en el Extranjero
                        <input className="si-input" value={formNew.solicitanteDomicilio || ''} onChange={e => setFormNew(p => ({ ...p, solicitanteDomicilio: e.target.value }))} placeholder="Dirección en el país requirente" style={fieldInputStyle} />
                      </label>
                    </div>
                  </div>

                  <div style={{ border: `1px solid ${BR}`, borderRadius: 8, padding: 14, background: '#F8FAFC' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#D97706', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={13} /> Parte Requerida (Sustractor / Retenedor)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <label style={fieldLabelStyle}>
                        Nombres y Apellidos
                        <input className="si-input" value={formNew.requeridoNombre || ''} onChange={e => setFormNew(p => ({ ...p, requeridoNombre: e.target.value }))} placeholder="Nombres completos" style={fieldInputStyle} />
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <label style={fieldLabelStyle}>
                          Sexo
                          <select className="si-input" value={formNew.requeridoSexo || ''} onChange={e => setFormNew(p => ({ ...p, requeridoSexo: e.target.value }))} style={fieldInputStyle}>
                            <option value="">Seleccionar</option>
                            {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </label>
                        <label style={fieldLabelStyle}>
                          Teléfono
                          <input className="si-input" value={formNew.requeridoTelefono || ''} onChange={e => setFormNew(p => ({ ...p, requeridoTelefono: e.target.value }))} placeholder="Teléfono de contacto" style={fieldInputStyle} />
                        </label>
                      </div>
                      <label style={fieldLabelStyle}>
                        Correo Electrónico
                        <input className="si-input" value={formNew.requeridoCorreo || ''} onChange={e => setFormNew(p => ({ ...p, requeridoCorreo: e.target.value }))} placeholder="correo@ejemplo.com" style={fieldInputStyle} />
                      </label>
                      <label style={fieldLabelStyle}>
                        Domicilio / Ubicación en el Perú
                        <input className="si-input" value={formNew.requeridoDomicilio || ''} onChange={e => setFormNew(p => ({ ...p, requeridoDomicilio: e.target.value }))} placeholder="Dirección o referencia en Perú" style={fieldInputStyle} />
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              {/* BLOQUE 4: ESTADO Y OBSERVACIONES */}
              <section style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, padding: 18, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${BR}` }}>
                  4. Estado y Observaciones Iniciales
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <label style={fieldLabelStyle}>
                    Estado Inicial
                    <select className="si-input" value={formNew.estado || 'Tramite'} onChange={e => setFormNew(p => ({ ...p, estado: e.target.value }))} style={fieldInputStyle}>
                      <option value="Tramite">En trámite</option>
                      <option value="Pendiente">Pendiente</option>
                    </select>
                  </label>
                  <label style={fieldLabelStyle}>
                    Etapa Inicial
                    <select className="si-input" value={formNew.etapa || 'Administrativo'} onChange={e => setFormNew(p => ({ ...p, etapa: e.target.value }))} style={fieldInputStyle}>
                      <option value="Administrativo">Administrativo</option>
                      <option value="Judicial">Judicial</option>
                    </select>
                  </label>
                </div>
                <label style={fieldLabelStyle}>
                  Observaciones / Resumen de Hechos Iniciales
                  <textarea className="si-input" value={formNew.observaciones || ''} onChange={e => setFormNew(p => ({ ...p, observaciones: e.target.value }))} rows={3} placeholder="Ingrese un resumen de los hechos o antecedentes del caso..." style={{ ...fieldInputStyle, resize: 'vertical' }} />
                </label>
              </section>

              {/* BOTONES DE ACCIÓN AL PIE */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, paddingBottom: 40 }}>
                <button onClick={() => setView('casos')} style={{ padding: '9px 18px', borderRadius: 7, border: `1px solid ${BR}`, background: SURF, color: TX2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={cargarBorrador} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 7, border: `1px solid ${BR}`, background: SURF, color: TX2, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  <Save size={13} /> Guardar Borrador
                </button>
                <button onClick={crearCasoDesdePagina} disabled={savingNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 24px', borderRadius: 7, border: 'none', background: BL, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                  <Plus size={14} /> {savingNew ? 'Registrando expediente...' : 'Registrar y Abrir Expediente'}
                </button>
              </div>

              {/* MODAL EMERGENTE PARA AGREGAR / EDITAR MENOR (NNA) */}
              {modalNnaIndex !== null && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(3px)' }} onClick={() => setModalNnaIndex(null)}>
                  <div style={{ background: SURF, borderRadius: 12, width: '100%', maxWidth: 520, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', overflow: 'hidden', border: `1px solid ${BR}` }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: TX }}>
                          {modalNnaIndex >= 0 ? 'Editar Menor Involucrado (NNA)' : 'Agregar Menor Involucrado (NNA)'}
                        </div>
                        <div style={{ fontSize: 10.5, color: TX3, marginTop: 2 }}>
                          Ingrese los datos personales y de nacimiento del menor.
                        </div>
                      </div>
                      <button type="button" onClick={() => setModalNnaIndex(null)} style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${BR}`, background: SURF, color: TX2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={14} />
                      </button>
                    </div>

                    <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <label style={fieldLabelStyle}>
                        Nombres del Menor *
                        <input
                          className="si-input"
                          value={modalNnaForm.nombres || ''}
                          onChange={e => setModalNnaForm(p => ({ ...p, nombres: e.target.value }))}
                          placeholder="Ej. Mateo Alejandro"
                          autoFocus
                          style={fieldInputStyle}
                        />
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <label style={fieldLabelStyle}>
                          Primer Apellido *
                          <input
                            className="si-input"
                            value={modalNnaForm.primerApellido || ''}
                            onChange={e => setModalNnaForm(p => ({ ...p, primerApellido: e.target.value }))}
                            placeholder="Primer apellido"
                            style={fieldInputStyle}
                          />
                        </label>
                        <label style={fieldLabelStyle}>
                          Segundo Apellido
                          <input
                            className="si-input"
                            value={modalNnaForm.segundoApellido || ''}
                            onChange={e => setModalNnaForm(p => ({ ...p, segundoApellido: e.target.value }))}
                            placeholder="Segundo apellido"
                            style={fieldInputStyle}
                          />
                        </label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <label style={fieldLabelStyle}>
                          Sexo
                          <select
                            className="si-input"
                            value={modalNnaForm.sexo || ''}
                            onChange={e => setModalNnaForm(p => ({ ...p, sexo: e.target.value }))}
                            style={fieldInputStyle}
                          >
                            <option value="">Seleccionar</option>
                            {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </label>
                        <label style={fieldLabelStyle}>
                          Fecha de Nacimiento
                          <input
                            className="si-input"
                            type="date"
                            value={modalNnaForm.fechaNacimiento || ''}
                            onChange={e => {
                              const val = e.target.value;
                              const ed = edadDesdeNacimiento(val, formNew.fechaIngreso || todayStr());
                              setModalNnaForm(p => ({ ...p, fechaNacimiento: val, edad: ed.edad, tipoEdad: ed.tipoEdad }));
                            }}
                            style={fieldInputStyle}
                          />
                        </label>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <label style={fieldLabelStyle}>
                          Edad al Ingreso *
                          <input
                            className="si-input"
                            type="number"
                            min="0"
                            max="18"
                            value={modalNnaForm.edad || ''}
                            onChange={e => setModalNnaForm(p => ({ ...p, edad: e.target.value }))}
                            placeholder="Ej. 8"
                            style={fieldInputStyle}
                          />
                        </label>
                        <label style={fieldLabelStyle}>
                          Unidad de Tiempo
                          <select
                            className="si-input"
                            value={modalNnaForm.tipoEdad || 'Años'}
                            onChange={e => setModalNnaForm(p => ({ ...p, tipoEdad: e.target.value }))}
                            style={fieldInputStyle}
                          >
                            <option value="Años">Años</option>
                            <option value="Meses">Meses</option>
                            <option value="Días">Días</option>
                          </select>
                        </label>
                      </div>

                      {/* ALERTA PREVENTIVA SI ES MAYOR O IGUAL A 16 AÑOS */}
                      {modalNnaForm.tipoEdad === 'Años' && parseInt(modalNnaForm.edad || '0', 10) >= 16 && (
                        <div style={{ padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 7, color: '#92400E', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AlertTriangle size={13} color="#D97706" />
                          <span>Atención: El NNA tiene 16 años o más al ingreso (Art. 4 Convenio de La Haya).</span>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '14px 20px', borderTop: `1px solid ${BR}`, background: '#FAFAFA', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setModalNnaIndex(null)}
                        style={{ padding: '8px 16px', borderRadius: 6, border: `1px solid ${BR}`, background: SURF, color: TX2, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!modalNnaForm.nombres?.trim() || !modalNnaForm.primerApellido?.trim()) {
                            toast.error('Debe ingresar al menos Nombres y Primer Apellido del menor');
                            return;
                          }
                          if (modalNnaIndex >= 0) {
                            setNnaNew(prev => prev.map((item, idx) => idx === modalNnaIndex ? { ...modalNnaForm } : item));
                          } else {
                            setNnaNew(prev => [...prev.filter(x => x && ((x.nombres && x.nombres.trim()) || (x.primerApellido && x.primerApellido.trim()))), { ...modalNnaForm }]);
                          }
                          setModalNnaIndex(null);
                        }}
                        style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: BL, color: '#fff', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}
                      >
                        {modalNnaIndex >= 0 ? 'Guardar Cambios' : 'Agregar Menor'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : !selected ? (
          <main className="main-scroll si-page" style={{ flex: 1, overflowY: 'auto', background: BG, padding: '22px 24px' }}>
            <div style={{ maxWidth: 1240, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 800, color: TX, margin: 0 }}>Bandeja de expedientes</h1>
                  <p style={{ fontSize: 11.5, color: TX3, margin: '4px 0 0' }}>Seguimiento del flujo operativo de Sustracción Internacional.</p>
                </div>
                <button onClick={() => { setFormNew(emptyForm()); setNnaNew([]); setErrorNew(''); setView('nuevo') }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: N2, color: '#fff', border: 0, borderRadius: 8, padding: '9px 15px', fontSize: 12, fontWeight: 700 }}>
                  <Plus size={13} /> Nuevo expediente
                </button>
              </div>

              <div className="si-kpis" style={{ marginBottom: 14 }}>
                {counters.map(item => (
                  <div key={item.label} style={{ background: SURF, border: `1px solid ${BR}`, borderLeft: `3px solid ${item.color}`, borderRadius: 8, padding: '13px 15px' }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.05em' }}>{item.label}</div>
                    <div style={{ fontSize: 23, fontWeight: 800, color: item.color, marginTop: 3 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 10, overflow: 'hidden' }}>
                <div className="si-filters" style={{ padding: 12, borderBottom: `1px solid ${BR}` }}>
                  <div style={{ position: 'relative', flex: '1 1 260px' }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: TX3 }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por NNA u hoja de trámite" style={{ width: '100%', padding: '8px 10px 8px 30px', border: `1px solid ${BR}`, borderRadius: 7, fontSize: 12, outline: 'none' }} />
                  </div>
                  <select value={fProfesional} onChange={e => setFProfesional(e.target.value)} style={{ width: 175, padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 7, color: TX2, fontSize: 11, background: SURF }}>
                    <option value="">Todos los profesionales</option>{PROFESIONALES.map(p => <option key={p}>{p}</option>)}
                  </select>
                  {[['todos', 'Todos'], ['activos', 'Activos'], ['alerta', 'Con alerta'], ['cerrados', 'Cerrados']].map(([id, label]) => {
                    const active = subBandeja === id
                    return <button key={id} onClick={() => setSubBandeja(id)} style={{ padding: '7px 12px', borderRadius: 7, border: `1px solid ${active ? BL : BR}`, background: active ? '#EFF6FF' : SURF, color: active ? BL : TX2, fontSize: 11, fontWeight: 700 }}>{label}</button>
                  })}
                  <button title="Exportar reporte Excel" onClick={() => descargarExcelSustracion(visibles)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', border: `1px solid ${BR}`, borderRadius: 7, background: SURF, color: TX2, fontSize: 11, fontWeight: 600, marginLeft: 'auto' }}><Download size={13} /> Exportar</button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${BR}`, textAlign: 'left' }}>
                      {['NNA', 'Hoja de trámite', 'Rol / País', 'Etapa actual', 'Próxima acción', 'Avance', ''].map(label => <th key={label} style={{ padding: '10px 12px', fontSize: 9, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</th>)}
                    </tr></thead>
                    <tbody>
                      {loading && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: TX3, fontSize: 12 }}>Cargando expedientes...</td></tr>}
                      {!loading && visibles.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: TX3, fontSize: 12 }}>Sin resultados.</td></tr>}
                      {!loading && visibles.map(caso => {
                        const flow = flows.get(caso.id) || deriveCaseFlow(caso)
                        const critical = flow.alerts.some(a => a.tone === 'error')
                        const nnaCount = caso.nna?.length || 1
                        return (
                          <tr key={caso.id} onClick={() => { setSelected(caso); setPending({}); setDrawer(null); setTab(flow.current.id) }} style={{ borderBottom: `1px solid ${BR}`, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = SURF}>
                            <td style={{ padding: '11px 12px', minWidth: 220 }}><div style={{ fontSize: 12, fontWeight: 700 }}>{nombreCaso(caso)}</div><div style={{ fontSize: 10, color: TX3, marginTop: 2 }}>{nnaCount} NNA · ingreso {fmtFecha(caso.fechaIngreso)}</div></td>
                            <td style={{ padding: '11px 12px', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: N2 }}>{caso.codigo}</td>
                            <td style={{ padding: '11px 12px', color: TX2 }}><div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>{caso.acPeru === 'Requirente' ? <Plane size={11} /> : <Users size={11} />}{caso.acPeru || 'Sin rol'}</div><div style={{ fontSize: 10, color: TX3, marginTop: 2 }}>{caso.pais}</div></td>
                            <td style={{ padding: '11px 12px' }}><span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', padding: '3px 9px', borderRadius: 99, color: flow.closed ? '#15803D' : BL, background: flow.closed ? '#F0FDF4' : '#EFF6FF', border: `1px solid ${flow.closed ? '#BBF7D0' : '#BFDBFE'}`, fontSize: 10, fontWeight: 700 }}>{flow.closed ? 'Cerrado' : `${flow.current.number}. ${flow.current.label}`}</span>{critical && <div style={{ marginTop: 4, color: '#DC2626', fontSize: 10, fontWeight: 700, display: 'flex', gap: 4, alignItems: 'center' }}><AlertTriangle size={10} /> Alerta</div>}</td>
                            <td style={{ padding: '11px 12px', maxWidth: 270, fontSize: 11, lineHeight: 1.45, color: TX2 }}>{flow.nextAction}</td>
                            <td style={{ padding: '11px 12px', width: 115 }}><div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><div style={{ flex: 1, height: 5, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${flow.progress}%`, height: '100%', background: flow.closed ? '#16A34A' : BL }} /></div><span style={{ fontSize: 10, fontWeight: 700, color: TX3 }}>{flow.progress}%</span></div></td>
                            <td style={{ padding: '11px 12px', textAlign: 'right' }}><ChevronRight size={14} color={TX3} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        ) : selectedFlow ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="si-exp-header" style={{ background: SURF, borderBottom: `1px solid ${BR}`, padding: '12px 20px', gap: 14, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <button onClick={() => { setSelected(null); setPending({}); setDrawer(null) }} title="Volver a la bandeja" style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${BR}`, background: SURF, color: TX2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ArrowLeft size={16} /></button>
                <div style={{ minWidth: 0 }}><div style={{ fontSize: 9.5, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.04em' }}>Expediente · <span style={{ fontFamily: 'monospace' }}>{selected.codigo}</span></div><div style={{ fontSize: 17, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreCaso(selected)}</div></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <button onClick={() => { setFichaTab('datos'); setDrawer('ficha') }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: `1px solid ${BR}`, background: SURF, color: TX2, fontSize: 11, fontWeight: 700 }}><FileText size={13} /> Ficha</button>
                <button onClick={() => setDrawer('actividad')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: `1px solid ${BR}`, background: SURF, color: TX2, fontSize: 11, fontWeight: 700 }}><MessageSquare size={13} /> Actividad</button>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, background: '#F1F5F9', border: `1px solid ${BR}`, color: TX2, fontSize: 10, fontWeight: 700 }}>{selected.acPeru === 'Requirente' ? <Plane size={10} /> : <Users size={10} />} AC {selected.acPeru || 'sin rol'}</span>
                <span style={{ padding: '3px 9px', borderRadius: 99, background: '#F1F5F9', border: `1px solid ${BR}`, color: TX2, fontSize: 10, fontWeight: 700 }}>{selected.pais}</span>
                <select value={getVal('estado') || 'Tramite'} onChange={e => onChange('estado', e.target.value)} style={{ padding: '4px 9px', borderRadius: 99, background: estadoBadge(getVal('estado') || 'Tramite').bg, color: estadoBadge(getVal('estado') || 'Tramite').color, border: `1px solid ${estadoBadge(getVal('estado') || 'Tramite').border}`, fontSize: 10, fontWeight: 700 }}><option value="Tramite">En trámite</option><option value="Pendiente">Pendiente</option><option value="Archivado">Archivado</option></select>
                {hasPending && <button onClick={guardar} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, border: 0, background: '#16A34A', color: '#fff', fontSize: 11, fontWeight: 700 }}><Save size={13} /> {saving ? 'Guardando...' : 'Guardar'}</button>}
                <button onClick={eliminarCaso} title="Eliminar expediente" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
              </div>
            </div>

            <div style={{ background: selectedFlow.alerts.some(a => a.tone === 'error') ? '#FEF2F2' : '#EFF6FF', borderBottom: `1px solid ${selectedFlow.alerts.some(a => a.tone === 'error') ? '#FECACA' : '#BFDBFE'}`, padding: '10px 20px', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><span style={{ width: 26, height: 26, borderRadius: 7, background: SURF, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{selectedFlow.alerts.some(a => a.tone === 'error') ? <AlertTriangle size={13} color="#DC2626" /> : <Info size={13} color={BL} />}</span><div><div style={{ fontSize: 9.5, fontWeight: 800, color: selectedFlow.alerts.some(a => a.tone === 'error') ? '#991B1B' : BL, textTransform: 'uppercase', letterSpacing: '.05em' }}>Próxima acción</div><div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 2 }}>{selectedFlow.nextAction}</div>{selectedFlow.alerts.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>{selectedFlow.alerts.map((alert, index) => <span key={index} style={{ padding: '3px 8px', borderRadius: 99, background: SURF, border: `1px solid ${alert.tone === 'error' ? '#FECACA' : '#FDE68A'}`, color: alert.tone === 'error' ? '#B91C1C' : '#92400E', fontSize: 10, fontWeight: 700 }}>{alert.message}</span>)}</div>}</div></div>
            </div>

            <div className="si-exp-body" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <aside className="main-scroll si-rail" style={{ flexShrink: 0, background: SURF, borderRight: `1px solid ${BR}`, padding: '16px 14px', overflowY: 'auto' }}>
                <div className="si-rail-label" style={{ padding: '0 10px 6px', fontSize: 9, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.08em' }}>Vista general</div>
                <button className="si-rail-summary" onClick={() => setTab('resumen')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 11px', marginBottom: 14, borderRadius: 8, border: `1px solid ${tab === 'resumen' ? '#BFDBFE' : 'transparent'}`, background: tab === 'resumen' ? '#EFF6FF' : 'transparent', color: tab === 'resumen' ? BL : TX2, textAlign: 'left', fontSize: 12, fontWeight: tab === 'resumen' ? 800 : 700 }}><LayoutGrid size={15} /> Resumen del caso</button>
                <div className="si-rail-label" style={{ padding: '0 10px 8px', fontSize: 9, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.08em' }}>Proceso</div>
                <div className="si-rail-progress" style={{ marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 9.5, fontWeight: 800, color: TX3, textTransform: 'uppercase' }}><span>Avance</span><span style={{ color: BL }}>{selectedFlow.progress}%</span></div><div style={{ height: 5, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: `${selectedFlow.progress}%`, height: '100%', background: selectedFlow.closed ? '#16A34A' : BL }} /></div></div>
                {selectedFlow.stages.map((stage, index) => {
                  const active = tab === stage.id
                  const complete = stage.status === 'complete'
                  const locked = stage.status === 'locked'
                  const skipped = stage.status === 'skipped'
                  const disabled = locked || skipped
                  return <div className="si-rail-item" key={stage.id}><button disabled={disabled} title={disabled ? stage.note : stage.label} onClick={() => setTab(stage.id)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 11px', borderRadius: 8, border: `1px solid ${active ? '#BFDBFE' : 'transparent'}`, background: active ? '#EFF6FF' : 'transparent', textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer', opacity: skipped ? .65 : 1 }}><span style={{ width: 22, height: 22, borderRadius: '50%', background: complete ? '#16A34A' : disabled ? '#F1F5F9' : BL, color: disabled ? TX3 : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{complete ? <Check size={11} /> : locked ? <Lock size={10} /> : skipped ? '—' : stage.number}</span><span style={{ minWidth: 0 }}><span style={{ display: 'block', color: disabled ? TX3 : active ? BL : TX, fontSize: 12, fontWeight: active ? 800 : 700 }}>{stage.label}</span><span style={{ display: 'block', color: TX3, fontSize: 10, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stage.note}</span></span></button>{index < selectedFlow.stages.length - 1 && <div style={{ width: 2, height: 8, background: BR, marginLeft: 22 }} />}</div>
                })}
              </aside>

              <div className="si-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                <div style={{ padding: '11px 20px', background: SURF, borderBottom: `1px solid ${BR}`, flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: TX }}>{TITULOS[tab]?.[0]}</div>
                  <div style={{ fontSize: 10.5, color: TX3, marginTop: 2 }}>{TITULOS[tab]?.[1]}</div>
                </div>
                {tab === 'resumen' && <TabResumen caso={selected} onSelectTab={setTab} />}
                {tab === 'evaluacion' && <TabEvaluacion caso={selected} onGuardarProceso={guardarProceso} />}
                {tab === 'subsanacion' && <TabSubsanacion caso={selected} onGuardarProceso={guardarProceso} />}
                {tab === 'internacional' && <TabInternacional caso={selected} onGuardarProceso={guardarProceso} />}
                {tab === 'retorno' && <TabRetorno caso={selected} getVal={getVal} onChange={onChange} onGuardarProceso={guardarProceso} />}
                {tab === 'judicial' && <TabJudicial caso={selected} getVal={getVal} onChange={onChange} onRefresh={fetchCasos} />}
                {tab === 'cierre' && <TabCierre caso={selected} getVal={getVal} onChange={onChange} />}
              </div>
            </div>

            {drawer && (
              <div onMouseDown={() => setDrawer(null)} style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15, 23, 42, .28)' }}>
                <section className="si-drawer" role="dialog" aria-modal="true" aria-label={drawer === 'ficha' ? 'Ficha del expediente' : 'Actividad del expediente'} onMouseDown={event => event.stopPropagation()} style={{ height: '100%', display: 'flex', flexDirection: 'column', background: SURF, boxShadow: '-12px 0 36px rgba(15, 23, 42, .16)' }}>
                  <div style={{ minHeight: 58, padding: '12px 16px', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: TX }}>{drawer === 'ficha' ? 'Ficha del expediente' : 'Actividad'}</div>
                      <div style={{ fontSize: 10.5, color: TX3, marginTop: 2 }}>{selected.codigo} · {nombreCaso(selected)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {drawer === 'ficha' && hasPending && <button onClick={guardar} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, border: 0, background: '#16A34A', color: '#fff', fontSize: 11, fontWeight: 700 }}><Save size={13} /> {saving ? 'Guardando...' : 'Guardar cambios'}</button>}
                      <button onClick={() => setDrawer(null)} title="Cerrar panel" style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${BR}`, background: '#F8FAFC', color: TX2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
                    </div>
                  </div>

                  {drawer === 'ficha' ? (
                    <>
                      <div style={{ display: 'flex', gap: 4, padding: '10px 14px 0', borderBottom: `1px solid ${BR}`, flexShrink: 0 }}>
                        {([['datos', 'Datos del caso'], ['personas', 'Personas involucradas']] as const).map(([id, label]) => <button key={id} onClick={() => setFichaTab(id)} style={{ padding: '8px 12px', border: 0, borderBottom: `2px solid ${fichaTab === id ? BL : 'transparent'}`, background: 'transparent', color: fichaTab === id ? BL : TX2, fontSize: 11.5, fontWeight: fichaTab === id ? 800 : 600 }}>{label}</button>)}
                      </div>
                      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                        {fichaTab === 'datos' ? <TabDatos caso={selected} getVal={getVal} onChange={onChange} /> : <TabPersonas caso={selected} getVal={getVal} onChange={onChange} onRefresh={fetchCasos} />}
                      </div>
                    </>
                  ) : (
                    <TabBitacora caso={selected} bitTexto={bitTexto} setBitTexto={setBitTexto} savingBit={savingBit} onAgregarBitacora={agregarBitacora} />
                  )}
                </section>
              </div>
            )}
          </div>
        ) : null}

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// COMPONENTES DE APOYO Y PESTAÑAS
// ══════════════════════════════════════════════════════════════════════

function SummaryValue({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div style={{ gridColumn: wide ? 'span 2' : 'span 1', padding: '13px 14px', borderBottom: `1px solid ${BR}` }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: value ? TX : TX3, lineHeight: 1.45 }}>{value || 'Sin registrar'}</div>
    </div>
  );
}

function Row({ label, value, type = 'text', opts = [], span = 1, onChange }: { label: string; value?: string | null; type?: string; opts?: string[]; span?: number; onChange: (v: string) => void }) {
  const inpS: React.CSSProperties = { width: '100%', padding: '7px 10px', border: `1.5px solid ${BR}`, borderRadius: 7, fontSize: 12, color: TX, background: '#FAFBFD', outline: 'none' };
  return (
    <div style={{ gridColumn: `span ${span}`, padding: '12px 14px', borderRight: `1px solid ${BR}`, borderBottom: `1px solid ${BR}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>{label}</div>
      {type === 'select' ? (
        <select value={value || ''} onChange={e => onChange(e.target.value)} style={{ ...inpS, cursor: 'pointer' }}>
          <option value="">—</option>{opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea rows={2} value={value || ''} onChange={e => onChange(e.target.value)} style={{ ...inpS, resize: 'none' }} />
      ) : (
        <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} style={inpS} />
      )}
    </div>
  );
}

function Sec({ title }: { title: string }) {
  return <div style={{ gridColumn: 'span 4', background: '#F1F5F9', padding: '8px 14px', borderBottom: `1px solid ${BR}`, fontSize: 10, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.06em' }}>{title}</div>;
}

// ── PESTAÑA: RESUMEN DEL CASO (IDÉNTICO A IMAGEN 2) ───────────────────
function TabResumen({ caso, onSelectTab }: { caso: Caso; onSelectTab: (t: ExpedienteTab) => void }) {
  const b = estadoBadge(caso.estado);
  const proceso = caso.procesoOperativo || {
    faseOperativa: caso.etapa === 'Judicial' ? 'Judicial' : 'Evaluación',
    proximaAccion: '',
    fechaLimite: '',
    requisitos: REQ_BASE,
  };
  const reqPend = (proceso.requisitos || []).filter(r => r.estado === 'Pendiente' || r.estado === 'Observado').length;
  const fechaLimite = proceso.fechaLimiteSubsanacion || proceso.fechaLimite || proceso.fechaLimitePasajes;
  const plazoVencido = vencido(fechaLimite);
  const ultima = [...(caso.bitacora || [])].sort((a, b2) => b2.fecha.localeCompare(a.fecha))[0];
  const flow = deriveCaseFlow(caso);

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, .65fr)', gap: 16 }}>

        {/* BANNER DE PRÓXIMA ACCIÓN */}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', background: plazoVencido ? '#FEF2F2' : '#EFF6FF', border: `1px solid ${plazoVencido ? '#FECACA' : '#BFDBFE'}`, borderRadius: 8, padding: '14px 18px' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: plazoVencido ? '#B91C1C' : BL, textTransform: 'uppercase', letterSpacing: '.04em' }}>Próxima acción · {proceso.faseOperativa || (caso.etapa === 'Judicial' ? 'Judicial' : 'Recepción')}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: TX, marginTop: 5 }}>{flow.nextAction}</div>
            <div style={{ fontSize: 10, color: TX3, marginTop: 5 }}>{reqPend} requisito{reqPend === 1 ? '' : 's'} pendiente{reqPend === 1 ? '' : 's'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '.04em' }}>Fecha límite</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: plazoVencido ? '#B91C1C' : N2, marginTop: 5 }}>{fechaLimite ? fmtFecha(fechaLimite) : 'Sin fecha'}</div>
            <button onClick={() => onSelectTab(flow.current.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '7px 10px', borderRadius: 7, border: 0, background: BL, color: '#fff', fontSize: 10.5, fontWeight: 800 }}>{flow.closed ? 'Ver cierre' : 'Continuar etapa'} <ChevronRight size={12} /></button>
          </div>
        </div>

        {/* DATOS VIGENTES DEL EXPEDIENTE */}
        <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '13px 14px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, fontSize: 10, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.04em' }}>Datos vigentes del expediente</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <SummaryValue label="Hoja de Trámite" value={caso.codigo} />
            <SummaryValue label="Estado" value={b.label} />
            <SummaryValue label="Tipo de solicitud" value={caso.tipoSolicitud || 'Restitución'} />
            <SummaryValue label="AC Perú" value={caso.acPeru || 'Requerida'} />
            <SummaryValue label="País" value={caso.pais} />
            <SummaryValue label="Etapa" value={caso.etapa || 'Administrativo'} />
            <SummaryValue label="Profesional" value={caso.profesional || 'Sin asignar'} />
            <SummaryValue label="Fecha de ingreso" value={fmtFecha(caso.fechaIngreso)} />
          </div>
        </div>

        {/* NNA INVOLUCRADOS + ÚLTIMA GESTIÓN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: TX3, textTransform: 'uppercase', marginBottom: 10 }}>NNA involucrados</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: N2, lineHeight: 1 }}>{caso.nna?.length || 1}</div>
            <div style={{ fontSize: 11, color: TX3, marginTop: 6 }}>{nombreCaso(caso)}</div>
          </div>
          <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: TX3, textTransform: 'uppercase', marginBottom: 10 }}>Última gestión</div>
            <div style={{ fontSize: 12, color: ultima ? TX : TX3, lineHeight: 1.55 }}>{ultima?.texto || 'Sin gestiones registradas'}</div>
            {ultima && <div style={{ fontSize: 10, color: TX3, marginTop: 8 }}>{fmtFecha(ultima.fecha)}{ultima.creadoPor ? ` · ${ultima.creadoPor}` : ''}</div>}
          </div>
        </div>

        {/* SITUACIÓN DEL CASO */}
        <div style={{ gridColumn: '1 / -1', background: SURF, border: `1px solid ${BR}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '13px 14px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, fontSize: 10, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.04em' }}>Situación del caso</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <SummaryValue label="Resultado de entrevista" value={caso.resultadoEntrevista || 'Pendiente'} />
            <SummaryValue label="Retorno" value={caso.retorno || 'Pendiente'} />
            <SummaryValue label="Proceso judicial" value={caso.estadoJudicial || 'Sin demanda'} />
          </div>
        </div>

        {/* LÍNEA DE TIEMPO DEL EXPEDIENTE */}
        <div style={{ gridColumn: '1 / -1', background: SURF, border: `1px solid ${BR}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '13px 14px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, fontSize: 10, fontWeight: 800, color: N2, textTransform: 'uppercase', letterSpacing: '.04em' }}>Línea de tiempo del expediente</div>
          <div style={{ padding: '16px 18px' }}>
            {(() => {
              const eventos = [
                ...(caso.bitacora || []).map(b2 => ({ fecha: b2.fecha, tipo: 'gestión', texto: b2.texto, autor: b2.creadoPor })),
                ...(caso.historialJudicial || []).map(h => ({ fecha: h.fecha, tipo: 'judicial', texto: `${h.etapa}${h.descripcion ? ': ' + h.descripcion : ''}`, autor: h.creadoPor })),
              ].sort((a, b2) => b2.fecha.localeCompare(a.fecha)).slice(0, 5);
              if (!eventos.length) return <div style={{ fontSize: 12, color: TX3, textAlign: 'center', padding: '12px 0' }}>Sin eventos registrados en la línea de tiempo.</div>;
              return eventos.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i === eventos.length - 1 ? 0 : 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: e.tipo === 'judicial' ? BL : '#EEF2FF', color: e.tipo === 'judicial' ? '#fff' : '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{e.tipo === 'judicial' ? <Scale size={10} color="#fff" /> : <Clock size={10} />}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: TX, lineHeight: 1.5 }}>{e.texto}</div>
                    <div style={{ fontSize: 9, color: TX3, marginTop: 2 }}>{fmtFecha(e.fecha)}{e.autor ? ` · ${e.autor}` : ''} · <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{e.tipo}</span></div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── PESTAÑA: DATOS DEL CASO (v2) ──────────────────────────────────────
function TabDatos({ caso, getVal, onChange }: { caso: Caso; getVal: (f: keyof Caso) => string; onChange: (f: keyof Caso, v: any) => void }) {
  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Sec title="Identificación del trámite" />
        <Row label="Hoja de trámite / Código" value={getVal('codigo')} onChange={v => onChange('codigo', v)} />
        <Row label="País contraparte" value={getVal('pais')} type="select" opts={PAISES} onChange={v => onChange('pais', v)} />
        <Row label="Etapa" value={getVal('etapa')} type="select" opts={ETAPAS} onChange={v => onChange('etapa', v)} />
        <Row label="Tipo de solicitud" value={getVal('tipoSolicitud')} type="select" opts={TIPO_SOL} onChange={v => onChange('tipoSolicitud', v)} />
        <Row label="AC Perú" value={getVal('acPeru')} type="select" opts={AC_PERU} onChange={v => onChange('acPeru', v)} />
        <Row label="Profesional" value={getVal('profesional')} type="select" opts={PROFESIONALES} onChange={v => onChange('profesional', v)} />
        <Row label="Fecha de ingreso" value={getVal('fechaIngreso')} type="date" onChange={v => onChange('fechaIngreso', v)} />
        <Row label="Fecha de salida / cierre" value={getVal('fechaSalida')} type="date" onChange={v => onChange('fechaSalida', v)} />
        <Sec title="Observaciones" />
        <Row label="Observaciones generales" value={getVal('observaciones')} type="textarea" span={4} onChange={v => onChange('observaciones', v)} />
      </div>
    </div>
  );
}

// ── PESTAÑA: PERSONAS INVOLUCRADAS (v2) ───────────────────────────────
function TabPersonas({ caso, getVal, onChange, onRefresh }: { caso: Caso; getVal: (f: keyof Caso) => string; onChange: (f: keyof Caso, v: any) => void; onRefresh: () => void }) {
  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: 14, borderBottom: `1px solid ${BR}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <b style={{ fontSize: 11, color: N2, display: 'block' }}>NNA INVOLUCRADOS</b>
            <span style={{ fontSize: 11, color: TX3 }}>{(caso.nna?.length || 1)} registrado{(caso.nna?.length || 1) === 1 ? '' : 's'} en el expediente</span>
          </div>
        </div>
        <div style={{ overflowX: 'auto', border: `1px solid ${BR}`, borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, background: '#fff' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: TX3, textTransform: 'uppercase', fontSize: 10, background: '#F8FAFC', borderBottom: `1px solid ${BR}` }}>
                <th style={{ padding: '9px 12px', width: 54 }}>N.°</th>
                <th style={{ padding: '9px 12px' }}>NNA</th>
                <th style={{ padding: '9px 12px' }}>Sexo</th>
                <th style={{ padding: '9px 12px' }}>Nacimiento</th>
                <th style={{ padding: '9px 12px' }}>Edad</th>
              </tr>
            </thead>
            <tbody>
              {caso.nna && caso.nna.length > 0 ? (
                caso.nna.map((n, i) => (
                  <tr key={n.id || i} style={{ borderTop: i ? `1px solid ${BR}` : 'none' }}>
                    <td style={{ padding: '10px 12px', color: TX3, fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EFF6FF', color: BL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700 }}>{n.nombres?.[0]}</div>
                        <div><div style={{ fontWeight: 700, color: TX, fontSize: 12 }}>{nombreNna(n)}</div></div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: TX2 }}>{n.sexo || '—'}</td>
                    <td style={{ padding: '10px 12px', color: TX2 }}>{n.fechaNacimiento || '—'}</td>
                    <td style={{ padding: '10px 12px', color: TX2 }}>{n.edad ? `${n.edad} ${n.tipoEdad || 'Años'}` : '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ padding: '10px 12px', color: TX3, fontWeight: 700 }}>01</td>
                  <td style={{ padding: '10px 12px' }}><div style={{ fontWeight: 700, color: TX, fontSize: 12 }}>{caso.nnaNombre || (caso as any).nnanombre || '—'}</div></td>
                  <td style={{ padding: '10px 12px', color: TX2 }}>{caso.nnaSexo || '—'}</td>
                  <td style={{ padding: '10px 12px', color: TX2 }}>{caso.nnaFechaNac || '—'}</td>
                  <td style={{ padding: '10px 12px', color: TX2 }}>{caso.nnaEdad ? `${caso.nnaEdad} ${caso.nnaTipoEdad || 'Años'}` : '—'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Sec title="Solicitante" />
        <Row label="Nombre" value={getVal('solicitanteNombre')} span={2} onChange={v => onChange('solicitanteNombre', v)} />
        <Row label="Sexo" value={getVal('solicitanteSexo')} type="select" opts={SEXOS} onChange={v => onChange('solicitanteSexo', v)} />
        <Row label="Teléfono" value={getVal('solicitanteTelefono')} onChange={v => onChange('solicitanteTelefono', v)} />
        <Row label="Correo electrónico" value={getVal('solicitanteCorreo')} span={2} onChange={v => onChange('solicitanteCorreo', v)} />
        <Row label="Domicilio" value={getVal('solicitanteDomicilio')} span={2} onChange={v => onChange('solicitanteDomicilio', v)} />
        <Sec title="Requerido / presunto sustractor" />
        <Row label="Nombre" value={getVal('requeridoNombre')} span={2} onChange={v => onChange('requeridoNombre', v)} />
        <Row label="Sexo" value={getVal('requeridoSexo')} type="select" opts={SEXOS} onChange={v => onChange('requeridoSexo', v)} />
        <Row label="Teléfono" value={getVal('requeridoTelefono')} onChange={v => onChange('requeridoTelefono', v)} />
        <Row label="Correo electrónico" value={getVal('requeridoCorreo')} span={2} onChange={v => onChange('requeridoCorreo', v)} />
        <Row label="Domicilio en el exterior" value={getVal('requeridoDomicilio')} span={2} onChange={v => onChange('requeridoDomicilio', v)} />
      </div>
    </div>
  );
}

// ── PESTAÑA: EVALUACIÓN INICIAL (v2 AUTOMATIZADA) ────────────────────
function TabEvaluacion({ caso, onGuardarProceso }: { caso: Caso; onGuardarProceso: (p: ProcesoOperativo, nota?: string, targetTab?: ExpedienteTab) => void }) {
  const isSpanishCountry = useMemo(() => {
    const hispanoHablantes = ['Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador', 'España', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'República Dominicana', 'Uruguay', 'Venezuela'];
    return hispanoHablantes.includes(caso.pais);
  }, [caso.pais]);

  const [proc, setProc] = useState<ProcesoOperativo>(() => {
    const base = caso.procesoOperativo || {
      casoId: caso.id, faseOperativa: 'Evaluación', evaluacionResultado: 'Pendiente', requisitos: REQ_BASE,
    };
    if (isSpanishCountry && base.requisitos) {
      base.requisitos = base.requisitos.map(r => (r.id === 'r7' && r.estado === 'Pendiente' ? { ...r, estado: 'No aplica' } : r));
    }
    return base;
  });

  useEffect(() => {
    if (caso.procesoOperativo) setProc(caso.procesoOperativo);
  }, [caso.id, caso.procesoOperativo?.updatedAt]);

  const calcularResultadoAuto = (reqs: RequisitoProceso[]) => {
    const hayObservado = reqs.some(r => r.estado === 'Observado');
    if (hayObservado) return 'Observada';
    const hayPendiente = reqs.some(r => r.estado === 'Pendiente');
    if (!hayPendiente) {
      const todosNoAplica = reqs.every(r => r.estado === 'No aplica');
      return todosNoAplica ? 'No corresponde' : 'Completa';
    }
    return 'Pendiente';
  };

  const actualizarRequisito = (id: string, nuevoEstado: RequisitoProceso['estado']) => {
    const nuevosReqs = proc.requisitos.map(x => (x.id === id ? { ...x, estado: nuevoEstado } : x));
    const autoRes = calcularResultadoAuto(nuevosReqs);
    setProc(prev => ({
      ...prev,
      requisitos: nuevosReqs,
      evaluacionResultado: autoRes,
    }));
  };

  const ejecutarGuardado = (customProc?: ProcesoOperativo) => {
    const p = customProc || proc;
    const autoRes = calcularResultadoAuto(p.requisitos);
    const obsCount = p.requisitos.filter(r => r.estado === 'Observado').length;

    let fase: string = 'Evaluación';
    let accion: string = '';
    let targetTab: ExpedienteTab = 'evaluacion';
    let nota: string = '';

    if (autoRes === 'Completa') {
      fase = caso.acPeru === 'Requirente' ? 'Gestión internacional' : 'Retorno voluntario';
      accion = caso.acPeru === 'Requirente'
        ? 'Remitir solicitud formal y oficios vía SGD a la Autoridad Central extranjera.'
        : 'Citar al presunto sustractor a entrevista amigable de retorno voluntario.';
      targetTab = caso.acPeru === 'Requirente' ? 'internacional' : 'retorno';
      nota = `Evaluación inicial COMPLETADA CONFORME. Expediente derivado a ${caso.acPeru === 'Requirente' ? 'Cooperación Internacional' : 'Retorno Voluntario'}.`;
    } else if (autoRes === 'Observada') {
      fase = 'Subsanación';
      accion = 'Notificar observaciones al solicitante (plazo legal 5 días hábiles).';
      targetTab = 'subsanacion';
      nota = `Evaluación inicial OBSERVADA (${obsCount} requisito(s) con observación). Plazo de subsanación habilitado.`;
    } else if (autoRes === 'No corresponde') {
      fase = 'Cierre';
      accion = 'Emitir comunicación formal de no admisibilidad y archivar expediente.';
      targetTab = 'cierre';
      nota = 'Evaluación inicial NO CORRESPONDE: La solicitud no cumple los presupuestos del Convenio de La Haya.';
    } else {
      fase = 'Evaluación';
      accion = 'Completar la matriz de 8 requisitos normativos de admisibilidad.';
      targetTab = 'evaluacion';
      nota = 'Revisión parcial de requisitos de evaluación inicial guardada en borrador.';
    }

    const payload: ProcesoOperativo = {
      ...p,
      evaluacionResultado: autoRes,
      faseOperativa: fase,
      proximaAccion: accion,
      fechaObservacion: autoRes === 'Observada' ? (p.fechaObservacion || todayStr()) : p.fechaObservacion,
    };

    onGuardarProceso(payload, nota, targetTab);
  };

  const marcarTodosConformes = () => {
    const nuevosReqs = proc.requisitos.map(r => ({
      ...r,
      estado: (isSpanishCountry && r.id === 'r7') ? 'No aplica' : ('Completo' as const),
    }));
    const updatedProc: ProcesoOperativo = {
      ...proc,
      requisitos: nuevosReqs,
      evaluacionResultado: 'Completa',
    };
    setProc(updatedProc);
    ejecutarGuardado(updatedProc);
  };

  const completos = proc.requisitos.filter(r => r.estado === 'Completo').length;
  const observados = proc.requisitos.filter(r => r.estado === 'Observado').length;

  const resBadge = useMemo(() => {
    if (proc.evaluacionResultado === 'Completa') {
      return {
        label: 'Evaluación Completa',
        bg: '#DCFCE7', border: '#16A34A', text: '#15803D',
        icon: <Check size={13} strokeWidth={3} />
      };
    }
    if (proc.evaluacionResultado === 'Observada') {
      return {
        label: 'Con Observaciones',
        bg: '#FEE2E2', border: '#DC2626', text: '#B91C1C',
        icon: <AlertTriangle size={13} strokeWidth={2.6} />
      };
    }
    if (proc.evaluacionResultado === 'No corresponde') {
      return {
        label: 'No Corresponde',
        bg: '#EEF2FF', border: '#6366F1', text: '#4338CA',
        icon: <MinusCircle size={13} strokeWidth={2.4} />
      };
    }
    return {
      label: 'Pendiente de Evaluación',
      bg: '#FEF3C7', border: '#D97706', text: '#B45309',
      icon: <Clock size={13} strokeWidth={2.4} />
    };
  }, [proc.evaluacionResultado]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="main-scroll">
      <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12, color: TX, flexWrap: 'wrap' }}>
          <div>
            <b>Matriz de 8 Requisitos Normativos</b>
            <span style={{ display: 'block', fontSize: 10, color: TX3, marginTop: 2 }}>
              {completos} de {proc.requisitos.length} conformes{observados > 0 ? ` · ${observados} observado${observados > 1 ? 's' : ''}` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={marcarTodosConformes}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 12px', borderRadius: 6,
                border: '1px solid #BBF7D0', background: '#F0FDF4',
                color: '#15803D', fontSize: 11, fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Marcar todos los requisitos conformes y avanzar de inmediato"
            >
              <Check size={13} strokeWidth={2.8} /> Todo conforme (1-Clic)
            </button>
            {/* Badge Dinámico de Estado */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 99,
                border: `1.5px solid ${resBadge.border}`,
                background: resBadge.bg,
                color: resBadge.text,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '.02em'
              }}
            >
              {resBadge.icon}
              <span>{resBadge.label}</span>
            </div>
            {/* Botón Principal de Acción Inteligente */}
            <button
              type="button"
              onClick={() => ejecutarGuardado()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', border: 'none', borderRadius: 6,
                background: proc.evaluacionResultado === 'Completa' ? '#16A34A' : proc.evaluacionResultado === 'Observada' ? '#DC2626' : proc.evaluacionResultado === 'No corresponde' ? '#4F46E5' : BL,
                color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              {proc.evaluacionResultado === 'Completa' ? (
                <><span>Guardar y Pasar a Gestión</span> <ChevronRight size={13} /></>
              ) : proc.evaluacionResultado === 'Observada' ? (
                <><span>Guardar e Ir a Subsanación</span> <ChevronRight size={13} /></>
              ) : proc.evaluacionResultado === 'No corresponde' ? (
                <><span>Guardar y Derivar a Cierre</span> <ChevronRight size={13} /></>
              ) : (
                <span>Guardar Evaluación</span>
              )}
            </button>
          </div>
        </div>
        <div>
          {proc.requisitos.map((r, i) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '36px minmax(0, 1fr) 150px', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: i ? `1px solid ${BR}` : 'none' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: r.estado === 'Completo' ? '#DCFCE7' : r.estado === 'Observado' ? '#FEE2E2' : r.estado === 'Pendiente' ? '#FEF3C7' : '#EEF2FF',
                color: r.estado === 'Completo' ? '#15803D' : r.estado === 'Observado' ? '#B91C1C' : r.estado === 'Pendiente' ? '#B45309' : '#4338CA',
                fontSize: 11, fontWeight: 700
              }}>
                {r.estado === 'Completo' ? <Check size={12} strokeWidth={3} /> : i + 1}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: TX }}>{r.nombre}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                {/* Conforme (Verde) */}
                <button
                  type="button"
                  title="Conforme"
                  onClick={() => actualizarRequisito(r.id, 'Completo')}
                  style={{
                    width: 30, height: 30, borderRadius: 6,
                    border: `1.5px solid ${r.estado === 'Completo' ? '#16A34A' : '#E2E8F0'}`,
                    background: r.estado === 'Completo' ? '#DCFCE7' : '#FFFFFF',
                    color: r.estado === 'Completo' ? '#15803D' : '#94A3B8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Check size={14} strokeWidth={2.8} />
                </button>

                {/* Observado (Rojo) */}
                <button
                  type="button"
                  title="Observado"
                  onClick={() => actualizarRequisito(r.id, 'Observado')}
                  style={{
                    width: 30, height: 30, borderRadius: 6,
                    border: `1.5px solid ${r.estado === 'Observado' ? '#DC2626' : '#E2E8F0'}`,
                    background: r.estado === 'Observado' ? '#FEE2E2' : '#FFFFFF',
                    color: r.estado === 'Observado' ? '#B91C1C' : '#94A3B8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <AlertTriangle size={13} strokeWidth={2.6} />
                </button>

                {/* Pendiente (Ámbar / Naranja) */}
                <button
                  type="button"
                  title="Pendiente"
                  onClick={() => actualizarRequisito(r.id, 'Pendiente')}
                  style={{
                    width: 30, height: 30, borderRadius: 6,
                    border: `1.5px solid ${r.estado === 'Pendiente' ? '#D97706' : '#E2E8F0'}`,
                    background: r.estado === 'Pendiente' ? '#FEF3C7' : '#FFFFFF',
                    color: r.estado === 'Pendiente' ? '#B45309' : '#94A3B8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Clock size={13} strokeWidth={2.4} />
                </button>

                {/* No aplica (Azul Índigo) */}
                <button
                  type="button"
                  title="No aplica"
                  onClick={() => actualizarRequisito(r.id, 'No aplica')}
                  style={{
                    width: 30, height: 30, borderRadius: 6,
                    border: `1.5px solid ${r.estado === 'No aplica' ? '#6366F1' : '#E2E8F0'}`,
                    background: r.estado === 'No aplica' ? '#EEF2FF' : '#FFFFFF',
                    color: r.estado === 'No aplica' ? '#4338CA' : '#94A3B8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <MinusCircle size={13} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PESTAÑA: SUBSANACIÓN (v2) ─────────────────────────────────────────
function TabSubsanacion({ caso, onGuardarProceso }: { caso: Caso; onGuardarProceso: (p: ProcesoOperativo) => void }) {
  const [proc, setProc] = useState<ProcesoOperativo>(() => caso.procesoOperativo || {
    casoId: caso.id, faseOperativa: 'Subsanación', requisitos: REQ_BASE, fechaObservacion: '', fechaNotificacion: '', fechaLimiteSubsanacion: '', ampliacionSubsanacion: 'No', fechaRespuestaSubsanacion: '',
  });
  useEffect(() => {
    if (caso.procesoOperativo) setProc(caso.procesoOperativo)
  }, [caso.id, caso.procesoOperativo?.updatedAt])
  const set = (k: keyof ProcesoOperativo) => (v: any) => setProc(current => ({ ...current, [k]: v }));

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="main-scroll">
      <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><b>Control de subsanación</b><span style={{ display: 'block', fontSize: 10, color: TX3, marginTop: 2 }}>Fechas y resultado de las observaciones comunicadas.</span></div>
          <button onClick={() => onGuardarProceso(proc)} style={{ padding: '6px 12px', border: 'none', borderRadius: 6, background: BL, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            Guardar
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, padding: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>FECHA DE OBSERVACIÓN<input type="date" value={proc.fechaObservacion || ''} onChange={e => set('fechaObservacion')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>FECHA DE NOTIFICACIÓN<input type="date" value={proc.fechaNotificacion || ''} onChange={e => { const val = e.target.value; setProc(current => ({ ...current, fechaNotificacion: val, fechaLimiteSubsanacion: sumarDiasHabiles(val, current.ampliacionSubsanacion === 'Sí' ? 10 : 5) })); }} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>AMPLIACIÓN (10 DÍAS)<select value={proc.ampliacionSubsanacion || 'No'} onChange={e => { const val = e.target.value; setProc(current => ({ ...current, ampliacionSubsanacion: val, fechaLimiteSubsanacion: current.fechaNotificacion ? sumarDiasHabiles(current.fechaNotificacion, val === 'Sí' ? 10 : 5) : '' })); }} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }}><option value="No">No</option><option value="Sí">Sí</option></select></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>FECHA LÍMITE LEGAL<input type="date" value={proc.fechaLimiteSubsanacion || ''} readOnly style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11, background: '#FEE2E2', fontWeight: 800, color: '#991B1B' }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>FECHA DE RESPUESTA<input type="date" value={proc.fechaRespuestaSubsanacion || ''} onChange={e => set('fechaRespuestaSubsanacion')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>RESULTADO<select value={proc.resultadoSubsanacion || 'Pendiente'} onChange={e => set('resultadoSubsanacion')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }}><option>Pendiente</option><option>Subsanó</option><option>Subsanó parcialmente</option><option>No subsanó</option></select></label>
          <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>DETALLE DE LA SUBSANACIÓN<textarea value={proc.detalleSubsanacion || ''} onChange={e => set('detalleSubsanacion')(e.target.value)} rows={3} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11, resize: 'vertical' }} /></label>
        </div>
      </div>
    </div>
  );
}

// ── PESTAÑA: GESTIÓN INTERNACIONAL (v2) ───────────────────────────────
function TabInternacional({ caso, onGuardarProceso }: { caso: Caso; onGuardarProceso: (p: ProcesoOperativo) => void }) {
  const [proc, setProc] = useState<ProcesoOperativo>(() => caso.procesoOperativo || {
    casoId: caso.id, faseOperativa: 'Gestión internacional', requisitos: REQ_BASE, destinatarioGestion: '', tipoComunicacion: '', fechaEnvio: '', referenciaSgd: '', respuestaEsperada: '', proximaAccion: '', fechaLimite: '',
  });
  useEffect(() => {
    if (caso.procesoOperativo) setProc(caso.procesoOperativo)
  }, [caso.id, caso.procesoOperativo?.updatedAt])
  const set = (k: keyof ProcesoOperativo) => (v: any) => setProc(current => ({ ...current, [k]: v }));

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="main-scroll">
      <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><b>Comunicación y seguimiento internacional</b><span style={{ display: 'block', fontSize: 10, color: TX3, marginTop: 2 }}>AC Perú {caso.acPeru || 'Requerida'} · {caso.pais}</span></div>
          <button onClick={() => onGuardarProceso(proc)} style={{ padding: '6px 12px', border: 'none', borderRadius: 6, background: BL, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            Guardar
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, padding: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>DESTINATARIO<input value={proc.destinatarioGestion || ''} onChange={e => set('destinatarioGestion')(e.target.value)} placeholder="Ej. Ministerio de Justicia" style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>TIPO DE COMUNICACIÓN<select value={proc.tipoComunicacion || ''} onChange={e => set('tipoComunicacion')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }}><option value="">—</option>{['Solicitud de información', 'Remisión de solicitud', 'Respuesta a observación', 'Coordinación', 'Seguimiento'].map(x => <option key={x}>{x}</option>)}</select></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>FECHA DE ENVÍO<input type="date" value={proc.fechaEnvio || ''} onChange={e => set('fechaEnvio')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>REFERENCIA SGD<input value={proc.referenciaSgd || ''} onChange={e => set('referenciaSgd')(e.target.value)} placeholder="Ej. OFICIO-0021-2026-MIMP" style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>RESPUESTA ESPERADA<input type="date" value={proc.respuestaEsperada || ''} onChange={e => set('respuestaEsperada')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>FECHA LÍMITE DE GESTIÓN<input type="date" value={proc.fechaLimite || ''} onChange={e => set('fechaLimite')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>RESPUESTA RECIBIDA<select value={proc.respuestaRecibida || 'No'} onChange={e => set('respuestaRecibida')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }}><option>No</option><option>Sí</option></select></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>ESTADO DE COOPERACIÓN<select value={proc.estadoCooperacion || 'En seguimiento'} onChange={e => set('estadoCooperacion')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }}><option>En seguimiento</option><option>Proceso judicial exterior</option><option>Concluido</option></select></label>
          <label style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>PRÓXIMA ACCIÓN<input value={proc.proximaAccion || ''} onChange={e => set('proximaAccion')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }} /></label>
        </div>
      </div>
    </div>
  );
}

// ── PESTAÑA: RETORNO VOLUNTARIO (v2) ──────────────────────────────────
function TabRetorno({ caso, getVal, onChange, onGuardarProceso }: { caso: Caso; getVal: (f: keyof Caso) => string; onChange: (f: keyof Caso, v: any) => void; onGuardarProceso: (p: ProcesoOperativo) => void }) {
  const [proc, setProc] = useState<ProcesoOperativo>(() => caso.procesoOperativo || {
    casoId: caso.id, faseOperativa: 'Retorno voluntario', requisitos: REQ_BASE, estadoRetornoVoluntario: 'Pendiente', propuestaRetorno: '', fechaPrevistaRetorno: '', compromisosRetorno: '',
  });
  useEffect(() => {
    if (caso.procesoOperativo) setProc(caso.procesoOperativo)
  }, [caso.id, caso.procesoOperativo?.updatedAt])
  const set = (k: keyof ProcesoOperativo) => (v: any) => setProc(current => ({ ...current, [k]: v }));

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="main-scroll">
      <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', background: '#F8FAFC', borderBottom: `1px solid ${BR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><b>Entrevista amigable y acuerdo de retorno</b><span style={{ display: 'block', fontSize: 10, color: TX3, marginTop: 2 }}>Seguimiento al procedimiento no contencioso administrativo.</span></div>
          <button onClick={() => onGuardarProceso({ ...proc, fechaEntrevista: getVal('fechaEntrevista'), resultadoEntrevista: getVal('resultadoEntrevista') })} style={{ padding: '6px 12px', border: 'none', borderRadius: 6, background: BL, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            Guardar
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, padding: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>FECHA DE ENTREVISTA<input type="date" value={getVal('fechaEntrevista')} onChange={e => onChange('fechaEntrevista', e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>RESULTADO DE ENTREVISTA<select value={getVal('resultadoEntrevista')} onChange={e => onChange('resultadoEntrevista', e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }}><option value="">—</option>{RESULTADO_ENT.map(x => <option key={x}>{x}</option>)}</select></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>ESTADO DE NEGOCIACIÓN<select value={proc.estadoRetornoVoluntario || 'Pendiente'} onChange={e => set('estadoRetornoVoluntario')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }}><option value="Pendiente">Pendiente</option><option value="En negociación">En negociación</option><option value="Acuerdo alcanzado">Acuerdo alcanzado</option><option value="Sin acuerdo">Sin acuerdo</option></select></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>FECHA PREVISTA DE RETORNO<input type="date" value={proc.fechaPrevistaRetorno || ''} onChange={e => set('fechaPrevistaRetorno')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }} /></label>
          <label style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>PROPUESTA DE RETORNO<input value={proc.propuestaRetorno || ''} onChange={e => set('propuestaRetorno')(e.target.value)} placeholder="Términos del acuerdo o compromisos" style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }} /></label>
          <label style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>COMPROMISOS DEL ACUERDO<textarea value={proc.compromisosRetorno || ''} onChange={e => set('compromisosRetorno')(e.target.value)} rows={2} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11, resize: 'vertical' }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>FECHA DEL ACUERDO<input type="date" value={proc.fechaAcuerdo || ''} onChange={e => set('fechaAcuerdo')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>LÍMITE PARA PASAJES<input type="date" value={proc.fechaLimitePasajes || ''} readOnly style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11, background: '#F8FAFC' }} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>PASAJES RECIBIDOS<select value={proc.pasajesRecibidos || 'No'} onChange={e => set('pasajesRecibidos')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }}><option>No</option><option>Sí</option></select></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 700, color: TX3 }}>RETORNO EFECTIVO<input type="date" value={proc.fechaRetornoEfectivo || ''} onChange={e => set('fechaRetornoEfectivo')(e.target.value)} style={{ padding: '8px 10px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 11 }} /></label>
        </div>
      </div>
    </div>
  );
}

// ── PESTAÑA: HISTORIAL DE GESTIÓN / BITÁCORA (v2) ─────────────────────
function TabBitacora({ caso, bitTexto, setBitTexto, savingBit, onAgregarBitacora }: { caso: Caso; bitTexto: string; setBitTexto: (v: string) => void; savingBit: boolean; onAgregarBitacora: () => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="main-scroll">
      <div style={{ background: SURF, border: `1px solid ${BR}`, borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: N2, textTransform: 'uppercase', marginBottom: 12 }}>Historial de Diligencias y Actuaciones</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input value={bitTexto} onChange={e => setBitTexto(e.target.value)} placeholder="Escribe una actuación, oficio SGD o llamada..." style={{ flex: 1, padding: '8px 12px', border: `1px solid ${BR}`, borderRadius: 6, fontSize: 12, outline: 'none' }} onKeyDown={e => { if (e.key === 'Enter') onAgregarBitacora(); }} />
          <button onClick={onAgregarBitacora} disabled={savingBit} style={{ padding: '8px 16px', border: 'none', borderRadius: 6, background: BL, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {savingBit ? 'Guardando...' : 'Agregar Nota'}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(!caso.bitacora || !caso.bitacora.length) && (
            <div style={{ padding: 24, textAlign: 'center', color: TX3, fontSize: 12 }}>No hay actuaciones registradas en el historial.</div>
          )}
          {caso.bitacora?.map((b, i) => (
            <div key={b.id || i} style={{ padding: 12, border: `1px solid ${BR}`, borderRadius: 6, background: '#F8FAFC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TX3, fontWeight: 700, marginBottom: 4 }}>
                <span>{fmtFecha(b.fecha)} · {b.creadoPor || 'Usuario'}</span>
              </div>
              <div style={{ fontSize: 12, color: TX }}>{b.texto}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PESTAÑA: PROCESO JUDICIAL (v2) ────────────────────────────────────
function TabJudicial({ caso, getVal, onChange, onRefresh }: { caso: Caso; getVal: (f: keyof Caso) => string; onChange: (f: keyof Caso, v: any) => void; onRefresh: () => void }) {
  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Sec title="Datos del proceso judicial" />
        <Row label="N.° Expediente Judicial" value={getVal('numExpedienteJudicial')} onChange={v => onChange('numExpedienteJudicial', v)} />
        <Row label="Juzgado Competente" value={getVal('juzgado')} onChange={v => onChange('juzgado', v)} />
        <Row label="Etapa Procesal" value={getVal('estadoJudicial')} type="select" opts={ETAPAS_JUD} onChange={v => onChange('estadoJudicial', v)} />
        <Row label="Fecha de Demanda" value={getVal('fechaDemanda')} type="date" onChange={v => onChange('fechaDemanda', v)} />
        <Row label="Sentencia 1ra Instancia" value={getVal('sentencia1ra')} onChange={v => onChange('sentencia1ra', v)} />
        <Row label="Sentencia 2da Instancia" value={getVal('sentencia2da')} onChange={v => onChange('sentencia2da', v)} />
        <Row label="Recurso de Casación" value={getVal('casacion')} span={2} onChange={v => onChange('casacion', v)} />
      </div>
    </div>
  );
}

// ── PESTAÑA: CIERRE DEL CASO (v2) ─────────────────────────────────────
function TabCierre({ caso, getVal, onChange }: { caso: Caso; getVal: (f: keyof Caso) => string; onChange: (f: keyof Caso, v: any) => void }) {
  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Sec title="Cierre y conclusión del expediente" />
        <Row label="Estado del Expediente" value={getVal('estado')} type="select" opts={['Tramite', 'Pendiente', 'Archivado']} onChange={v => onChange('estado', v)} />
        <Row label="¿Se Concretó el Retorno?" value={getVal('retorno')} type="select" opts={RETORNO} onChange={v => onChange('retorno', v)} />
        <Row label="Fecha de Salida / Conclusión" value={getVal('fechaSalida')} type="date" onChange={v => onChange('fechaSalida', v)} />
        <Row label="Motivo de Cierre Normativo" value={getVal('motivoCierre')} type="select" opts={MOTIVOS_CIERRE} span={4} onChange={v => onChange('motivoCierre', v)} />
        <Row label="Observaciones Finales" value={getVal('observaciones')} type="textarea" span={4} onChange={v => onChange('observaciones', v)} />
      </div>
    </div>
  );
}
