'use client'

import React, { useState, useMemo } from 'react'
import {
  Building2,
  Award,
  AlertTriangle,
  Users,
  Home,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  X,
  Layers,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ShieldAlert,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import * as XLSX from 'xlsx'

export interface CarItem {
  id: string
  codigo: string
  centroAcogida: string
  tipoCar: 'Público' | 'Privado'
  perfilAtencion: 'Básico' | 'Especializado' | 'Discapacidad Severa' | 'Madres Adolescentes'
  departamento: string
  provincia: string
  distrito: string
  direccion: string
  institucionAdmin1: string
  institucionAdmin2: string
  modalidad: 'Residencial' | 'Familiar' | 'Urgencias'
  responsable: string
  capacidadMaxima: number
  poblacionActual: number
  correoCar: string
  celular: string
  telefono: string
  fechaEnvio: string
  tieneInfractores: 'Sí' | 'No'
  fechaRespuesta: string
  documentoRespuesta: string
  contenidoInfractores: string
  expediente: string
  correo: string
}

// Mock Data de Centros de Acogida Residencial (CAR)
const CAR_MOCK_DATA: CarItem[] = [
  {
    id: '1',
    codigo: 'CAR-LIM-001',
    centroAcogida: 'CAR San Miguel Arcángel',
    tipoCar: 'Público',
    perfilAtencion: 'Básico',
    departamento: 'LIMA',
    provincia: 'LIMA',
    distrito: 'SAN MIGUEL',
    direccion: 'Av. Costanera 1420, San Miguel',
    institucionAdmin1: 'INABIF',
    institucionAdmin2: 'MIMP - Dirección de Protección Integral',
    modalidad: 'Residencial',
    responsable: 'Lic. Mónica Vega Alvarado',
    capacidadMaxima: 45,
    poblacionActual: 38,
    correoCar: 'car.sanmiguel@inabif.gob.pe',
    celular: '987654321',
    telefono: '01 263-4510',
    fechaEnvio: '2026-01-15',
    tieneInfractores: 'No',
    fechaRespuesta: '2026-01-22',
    documentoRespuesta: 'Oficio N° 045-2026-MIMP/DPNNA',
    contenidoInfractores: 'Sin antecedentes ni sanciones de NNA infractores.',
    expediente: 'EXP-2026-DPNNA-00412',
    correo: 'notificaciones.dpnna@mimp.gob.pe',
  },
  {
    id: '2',
    codigo: 'CAR-LIM-002',
    centroAcogida: 'CAR Hogar Santa Rosa',
    tipoCar: 'Privado',
    perfilAtencion: 'Discapacidad Severa',
    departamento: 'LIMA',
    provincia: 'LIMA',
    distrito: 'CHORRILLOS',
    direccion: 'Calle Los Cedros 340, Urb. La Campiña',
    institucionAdmin1: 'Congregación Religiosa Hermanas Dominicas',
    institucionAdmin2: 'Obispado de Lurín',
    modalidad: 'Residencial',
    responsable: 'Hna. Teresa Morales Silva',
    capacidadMaxima: 25,
    poblacionActual: 22,
    correoCar: 'hogarsantarosa@dominicas.org.pe',
    celular: '991234567',
    telefono: '01 254-8890',
    fechaEnvio: '2026-02-01',
    tieneInfractores: 'No',
    fechaRespuesta: '2026-02-08',
    documentoRespuesta: 'Oficio N° 088-2026-MIMP/DPNNA',
    contenidoInfractores: 'Atención exclusiva a NNA con multidiscapacidad cognitiva y motora.',
    expediente: 'EXP-2026-DPNNA-00891',
    correo: 'direccion.santarosa@dominicas.org.pe',
  },
  {
    id: '3',
    codigo: 'CAR-AQP-003',
    centroAcogida: 'CAR Esperanza Juvenil Paucarpata',
    tipoCar: 'Público',
    perfilAtencion: 'Especializado',
    departamento: 'AREQUIPA',
    provincia: 'AREQUIPA',
    distrito: 'PAUCARPATA',
    direccion: 'Av. Las Gardenias 512, Paucarpata',
    institucionAdmin1: 'Sociedad de Beneficencia de Arequipa',
    institucionAdmin2: 'Gobierno Regional de Arequipa',
    modalidad: 'Urgencias',
    responsable: 'Psic. Carlos Tejada Mendoza',
    capacidadMaxima: 30,
    poblacionActual: 30,
    correoCar: 'esperanzajuvenil@beneficenciaarequipa.org',
    celular: '958112233',
    telefono: '054 402010',
    fechaEnvio: '2026-02-14',
    tieneInfractores: 'Sí',
    fechaRespuesta: '2026-02-20',
    documentoRespuesta: 'Oficio N° 182-2026-PJ/SLA-AQP',
    contenidoInfractores: '2 NNA con medidas socioeducativas no privativas de libertad remitidos por Juzgado de Familia.',
    expediente: 'EXP-2026-DPNNA-01205',
    correo: 'legal.beneficenciaaqp@gmail.com',
  },
  {
    id: '4',
    codigo: 'CAR-CUS-004',
    centroAcogida: 'CAR Aldea Infantil SOS Cusco',
    tipoCar: 'Privado',
    perfilAtencion: 'Básico',
    departamento: 'CUSCO',
    provincia: 'CUSCO',
    distrito: 'SAN SEBASTIAN',
    direccion: 'Vía Expresa s/n Km 4.5, San Sebastián',
    institucionAdmin1: 'Aldeas Infantiles SOS Perú',
    institucionAdmin2: 'SOS Kinderdorf International',
    modalidad: 'Familiar',
    responsable: 'Lic. Raúl Quispe Huamán',
    capacidadMaxima: 60,
    poblacionActual: 48,
    correoCar: 'aldea.cusco@aldeasinfantiles.org.pe',
    celular: '984556677',
    telefono: '084 271290',
    fechaEnvio: '2026-01-20',
    tieneInfractores: 'No',
    fechaRespuesta: '2026-01-28',
    documentoRespuesta: 'Oficio N° 062-2026-MIMP/DPNNA',
    contenidoInfractores: 'Modelo de familias SOS para acogimiento de hermanos.',
    expediente: 'EXP-2026-DPNNA-00514',
    correo: 'contacto.cusco@aldeasinfantiles.org.pe',
  },
  {
    id: '5',
    codigo: 'CAR-LAL-005',
    centroAcogida: 'CAR Hogar de la Niña Trujillo',
    tipoCar: 'Público',
    perfilAtencion: 'Básico',
    departamento: 'LA LIBERTAD',
    provincia: 'TRUJILLO',
    distrito: 'TRUJILLO',
    direccion: 'Jr. San Martín 680, Centro Histórico',
    institucionAdmin1: 'Sociedad de Beneficencia de Trujillo',
    institucionAdmin2: 'MIMP - INABIF',
    modalidad: 'Residencial',
    responsable: 'Dra. Patricia Benites Luján',
    capacidadMaxima: 50,
    poblacionActual: 42,
    correoCar: 'hogarnina@beneficenciatrujillo.gob.pe',
    celular: '944889900',
    telefono: '044 241515',
    fechaEnvio: '2026-02-10',
    tieneInfractores: 'No',
    fechaRespuesta: '2026-02-18',
    documentoRespuesta: 'Oficio N° 145-2026-MIMP/DPNNA',
    contenidoInfractores: 'Sin incidencias. Acogimiento regular de niñas de 6 a 17 años.',
    expediente: 'EXP-2026-DPNNA-00994',
    correo: 'mesadepartes@beneficenciatrujillo.gob.pe',
  },
  {
    id: '6',
    codigo: 'CAR-JUN-006',
    centroAcogida: 'CAR Jesús Salvador Huancayo',
    tipoCar: 'Privado',
    perfilAtencion: 'Madres Adolescentes',
    departamento: 'JUNIN',
    provincia: 'HUANCAYO',
    distrito: 'EL TAMBO',
    direccion: 'Av. Huancavelica 1890, El Tambo',
    institucionAdmin1: 'Asociación Civil Pro Infancia y Familia',
    institucionAdmin2: 'Arzobispado de Huancayo',
    modalidad: 'Residencial',
    responsable: 'Obst. Maritza Flores Castillo',
    capacidadMaxima: 35,
    poblacionActual: 29,
    correoCar: 'jesussalvador@proinfancia.org.pe',
    celular: '964332211',
    telefono: '064 251090',
    fechaEnvio: '2026-01-30',
    tieneInfractores: 'No',
    fechaRespuesta: '2026-02-05',
    documentoRespuesta: 'Oficio N° 092-2026-MIMP/DPNNA',
    contenidoInfractores: 'Atención integral prenatal y cuidado a adolescentes gestantes y sus bebés.',
    expediente: 'EXP-2026-DPNNA-00780',
    correo: 'direccionejecutiva@proinfancia.org.pe',
  },
  {
    id: '7',
    codigo: 'CAR-PIU-007',
    centroAcogida: 'CAR San Antonio de Piura',
    tipoCar: 'Público',
    perfilAtencion: 'Especializado',
    departamento: 'PIURA',
    provincia: 'PIURA',
    distrito: 'CASTILLA',
    direccion: 'Calle El Bosque Mz. B Lote 14, Castilla',
    institucionAdmin1: 'INABIF',
    institucionAdmin2: 'MIMP DPNNA',
    modalidad: 'Residencial',
    responsable: 'Lic. Fernando Prado Ruiz',
    capacidadMaxima: 40,
    poblacionActual: 36,
    correoCar: 'car.sanantonio@inabif.gob.pe',
    celular: '969778899',
    telefono: '073 342080',
    fechaEnvio: '2026-02-05',
    tieneInfractores: 'Sí',
    fechaRespuesta: '2026-02-12',
    documentoRespuesta: 'Oficio N° 130-2026-MIMP/DPNNA',
    contenidoInfractores: '1 adolescente acogido con mandato judicial de protección especial con falta leve archivada.',
    expediente: 'EXP-2026-DPNNA-01140',
    correo: 'piura.inabif@mimp.gob.pe',
  },
  {
    id: '8',
    codigo: 'CAR-LAM-008',
    centroAcogida: 'CAR Hogar Belén Chiclayo',
    tipoCar: 'Privado',
    perfilAtencion: 'Básico',
    departamento: 'LAMBAYEQUE',
    provincia: 'CHICLAYO',
    distrito: 'LA VICTORIA',
    direccion: 'Av. Los Incas 740, La Victoria',
    institucionAdmin1: 'Fundación Niños del Perú',
    institucionAdmin2: 'Cooperación Internacional Suiza',
    modalidad: 'Familiar',
    responsable: 'Lic. Soledad Vargas Díaz',
    capacidadMaxima: 30,
    poblacionActual: 24,
    correoCar: 'hogarbelen@ninosdelperu.org',
    celular: '979445566',
    telefono: '074 223040',
    fechaEnvio: '2026-01-25',
    tieneInfractores: 'No',
    fechaRespuesta: '2026-02-02',
    documentoRespuesta: 'Oficio N° 081-2026-MIMP/DPNNA',
    contenidoInfractores: 'Protección residencial básica y reinserción educativa.',
    expediente: 'EXP-2026-DPNNA-00632',
    correo: 'informes@ninosdelperu.org',
  },
  {
    id: '9',
    codigo: 'CAR-LOR-009',
    centroAcogida: 'CAR Santa Lorena de Iquitos',
    tipoCar: 'Público',
    perfilAtencion: 'Básico',
    departamento: 'LORETO',
    provincia: 'MAYNAS',
    distrito: 'IQUITOS',
    direccion: 'Calle Putumayo 1120, Iquitos',
    institucionAdmin1: 'Sociedad de Beneficencia de Iquitos',
    institucionAdmin2: 'Gobierno Regional de Loreto',
    modalidad: 'Residencial',
    responsable: 'Abg. Javier Panduro Pinedo',
    capacidadMaxima: 45,
    poblacionActual: 39,
    correoCar: 'santalorena@beneficenciaiquitos.gob.pe',
    celular: '965123489',
    telefono: '065 231010',
    fechaEnvio: '2026-02-12',
    tieneInfractores: 'No',
    fechaRespuesta: '2026-02-19',
    documentoRespuesta: 'Oficio N° 165-2026-MIMP/DPNNA',
    contenidoInfractores: 'Acogimiento de NNA en situación de desprotección de cuencas amazónicas.',
    expediente: 'EXP-2026-DPNNA-01050',
    correo: 'beneficencia.iquitos@gmail.com',
  },
  {
    id: '10',
    codigo: 'CAR-AYA-010',
    centroAcogida: 'CAR Urpichallay Ayacucho',
    tipoCar: 'Privado',
    perfilAtencion: 'Especializado',
    departamento: 'AYACUCHO',
    provincia: 'HUAMANGA',
    distrito: 'SAN JUAN BAUTISTA',
    direccion: 'Jr. Los Ángeles 280, San Juan Bautista',
    institucionAdmin1: 'Asociación Solidaria Wari',
    institucionAdmin2: 'Cáritas Ayacucho',
    modalidad: 'Residencial',
    responsable: 'Psic. Gladys Cárdenas Pariona',
    capacidadMaxima: 28,
    poblacionActual: 25,
    correoCar: 'urpichallay@wari.org.pe',
    celular: '966887744',
    telefono: '066 321890',
    fechaEnvio: '2026-01-18',
    tieneInfractores: 'Sí',
    fechaRespuesta: '2026-01-26',
    documentoRespuesta: 'Oficio N° 058-2026-MIMP/DPNNA',
    contenidoInfractores: 'Atención especializada en trauma complejo y conducta de riesgo.',
    expediente: 'EXP-2026-DPNNA-00488',
    correo: 'contacto@wari.org.pe',
  },
  {
    id: '11',
    codigo: 'CAR-PUN-011',
    centroAcogida: 'CAR Virgen de Fátima Puno',
    tipoCar: 'Público',
    perfilAtencion: 'Básico',
    departamento: 'PUNO',
    provincia: 'PUNO',
    distrito: 'PUNO',
    direccion: 'Av. Floral 850, Barrio Bellavista',
    institucionAdmin1: 'INABIF',
    institucionAdmin2: 'MIMP DPNNA',
    modalidad: 'Residencial',
    responsable: 'Lic. Néstor Condori Mamani',
    capacidadMaxima: 35,
    poblacionActual: 27,
    correoCar: 'car.virgenfatima@inabif.gob.pe',
    celular: '951223344',
    telefono: '051 364020',
    fechaEnvio: '2026-02-08',
    tieneInfractores: 'No',
    fechaRespuesta: '2026-02-15',
    documentoRespuesta: 'Oficio N° 139-2026-MIMP/DPNNA',
    contenidoInfractores: 'Atención integral a NNA en situación de vulnerabilidad extrema por heladas.',
    expediente: 'EXP-2026-DPNNA-00912',
    correo: 'puno.inabif@mimp.gob.pe',
  },
  {
    id: '12',
    codigo: 'CAR-ANC-012',
    centroAcogida: 'CAR Hogar San Pedrito Chimbote',
    tipoCar: 'Público',
    perfilAtencion: 'Básico',
    departamento: 'ANCASH',
    provincia: 'SANTA',
    distrito: 'CHIMBOTE',
    direccion: 'Av. Pardo 1600, Chimbote',
    institucionAdmin1: 'Sociedad de Beneficencia del Santa',
    institucionAdmin2: 'Municipalidad Provincial del Santa',
    modalidad: 'Residencial',
    responsable: 'Lic. Rocío Valera Méndez',
    capacidadMaxima: 40,
    poblacionActual: 33,
    correoCar: 'sanpedrito@beneficenciasanta.gob.pe',
    celular: '943556677',
    telefono: '043 321550',
    fechaEnvio: '2026-01-28',
    tieneInfractores: 'No',
    fechaRespuesta: '2026-02-04',
    documentoRespuesta: 'Oficio N° 085-2026-MIMP/DPNNA',
    contenidoInfractores: 'Acreditación vigente y sin registro de infractores.',
    expediente: 'EXP-2026-DPNNA-00715',
    correo: 'mesadepartes@beneficenciasanta.gob.pe',
  },
]

// Estadísticas de Departamentos para el Gráfico
const DEPTOS_STATS_DATA = [
  { depto: 'LIMA', publico: 54, privado: 88, total: 142 },
  { depto: 'AREQUIPA', publico: 16, privado: 22, total: 38 },
  { depto: 'CUSCO', publico: 14, privado: 18, total: 32 },
  { depto: 'LA LIBERTAD', publico: 11, privado: 18, total: 29 },
  { depto: 'JUNIN', publico: 12, privado: 14, total: 26 },
  { depto: 'PIURA', publico: 8, privado: 14, total: 22 },
  { depto: 'LAMBAYEQUE', publico: 7, privado: 11, total: 18 },
  { depto: 'LORETO', publico: 8, privado: 9, total: 17 },
  { depto: 'AYACUCHO', publico: 6, privado: 10, total: 16 },
  { depto: 'PUNO', publico: 7, privado: 8, total: 15 },
  { depto: 'ANCASH', publico: 6, privado: 8, total: 14 },
  { depto: 'HUANUCO', publico: 5, privado: 7, total: 12 },
  { depto: 'SAN MARTIN', publico: 4, privado: 7, total: 11 },
]

export default function DpnnaDashboardClient() {
  // Filtros
  const [tipoCarFilter, setTipoCarFilter] = useState('Todos')
  const [perfilFilter, setPerfilFilter] = useState('Todos')
  const [infractoresFilter, setInfractoresFilter] = useState('Todos')
  const [selectedDepto, setSelectedDepto] = useState('Todos')
  const [selectedProv, setSelectedProv] = useState('Todas')
  const [selectedDist, setSelectedDist] = useState('Todos')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal Ficha Completa
  const [selectedCar, setSelectedCar] = useState<CarItem | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Lista de Departamentos
  const deptosList = useMemo(() => {
    return ['Todos', ...Array.from(new Set(CAR_MOCK_DATA.map(c => c.departamento)))]
  }, [])

  // Lista de Provincias
  const provList = useMemo(() => {
    if (selectedDepto === 'Todos') {
      return ['Todas', ...Array.from(new Set(CAR_MOCK_DATA.map(c => c.provincia)))]
    }
    const filtered = CAR_MOCK_DATA.filter(c => c.departamento === selectedDepto)
    return ['Todas', ...Array.from(new Set(filtered.map(c => c.provincia)))]
  }, [selectedDepto])

  // Filtrado de la tabla y datos
  const filteredCars = useMemo(() => {
    return CAR_MOCK_DATA.filter(c => {
      const matchTipo = tipoCarFilter === 'Todos' || c.tipoCar === tipoCarFilter
      const matchPerfil = perfilFilter === 'Todos' || c.perfilAtencion === perfilFilter
      const matchInfractores =
        infractoresFilter === 'Todos' ||
        (infractoresFilter === 'Con Infractores' && c.tieneInfractores === 'Sí') ||
        (infractoresFilter === 'Sin Infractores' && c.tieneInfractores === 'No')
      const matchDepto = selectedDepto === 'Todos' || c.departamento === selectedDepto
      const matchProv = selectedProv === 'Todas' || c.provincia === selectedProv

      const matchSearch =
        c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.centroAcogida.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.responsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.institucionAdmin1.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.expediente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.distrito.toLowerCase().includes(searchTerm.toLowerCase())

      return matchTipo && matchPerfil && matchInfractores && matchDepto && matchProv && matchSearch
    })
  }, [tipoCarFilter, perfilFilter, infractoresFilter, selectedDepto, selectedProv, searchTerm])

  // Totales calculados dinámicamente o basados en universo nacional
  const totalCarNacional = 412
  const totalCarPublicos = 158
  const totalCarPrivados = 254
  const capacidadTotal = 6850
  const poblacionTotal = 5210
  const totalInfractoresCar = 28

  const pctPublicos = ((totalCarPublicos / totalCarNacional) * 100).toFixed(1)
  const pctPrivados = ((totalCarPrivados / totalCarNacional) * 100).toFixed(1)
  const pctOcupacion = ((poblacionTotal / capacidadTotal) * 100).toFixed(1)
  const pctInfractores = ((totalInfractoresCar / totalCarNacional) * 100).toFixed(1)

  // Data para gráfico por departamento
  const chartDeptosData = useMemo(() => {
    let list = [...DEPTOS_STATS_DATA]
    if (selectedDepto !== 'Todos') {
      list = list.filter(d => d.depto === selectedDepto)
    }
    if (tipoCarFilter === 'Públicos') {
      list = list.map(d => ({ ...d, privado: 0 }))
    } else if (tipoCarFilter === 'Privados') {
      list = list.map(d => ({ ...d, publico: 0 }))
    }
    return list
  }, [selectedDepto, tipoCarFilter])

  // Exportar todas las 24 variables a Excel
  const handleExportExcel = () => {
    const dataExcel = filteredCars.map(c => ({
      'Código': c.codigo,
      'Centro de Acogida Residencial': c.centroAcogida,
      'Tipo de CAR': c.tipoCar,
      'Perfil de Atención': c.perfilAtencion,
      'Departamento': c.departamento,
      'Provincia': c.provincia,
      'Distrito': c.distrito,
      'Dirección': c.direccion,
      'Institución que administra al CAR': c.institucionAdmin1,
      'Institución que administra al CAR 2': c.institucionAdmin2,
      'Modalidad': c.modalidad,
      'Responsable del CAR': c.responsable,
      'Capacidad Máxima': c.capacidadMaxima,
      'Población actual': c.poblacionActual,
      '% Ocupación': `${Math.round((c.poblacionActual / c.capacidadMaxima) * 100)} %`,
      'Correo del CAR': c.correoCar,
      'Número de Celular': c.celular,
      'Teléfono del CAR': c.telefono,
      'Fecha de Envío': c.fechaEnvio,
      'Tiene infractores acogid@s en CAR': c.tieneInfractores,
      'Fecha de respuesta de la solicitud': c.fechaRespuesta,
      'Documento de respuesta': c.documentoRespuesta,
      'Contenido de documento Infractores a la LEY': c.contenidoInfractores,
      'EXPEDIENTE': c.expediente,
      'CORREO': c.correo,
    }))

    const ws = XLSX.utils.json_to_sheet(dataExcel)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Directorio CAR DPNNA')
    XLSX.writeFile(wb, `Reporte_CAR_DPNNA_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const handleOpenFicha = (car: CarItem) => {
    setSelectedCar(car)
    setModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-slate-100/60 p-4 md:p-6 space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          1. CABECERA INSTITUCIONAL Y FILTROS RÁPIDOS
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Logo MIMP & Título */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
            <div className="bg-[#D91B24] text-white font-bold px-2.5 py-1 rounded text-xs tracking-wider shadow-sm">
              PERÚ
            </div>
            <div className="text-[11px] leading-tight font-medium text-slate-700 max-w-[140px]">
              Ministerio de la Mujer y Poblaciones Vulnerables
            </div>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              Situación <span className="text-[#2563EB]">DPNNA</span> — <span className="text-[#D91B24]">CAR</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Supervisión de Centros de Acogida Residencial (Públicos y Privados) a nivel nacional
            </p>
          </div>
        </div>

        {/* Filtros Superiores */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end text-xs">
          {/* Tipo de CAR */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-700">Tipo de CAR</label>
            <select
              value={tipoCarFilter}
              onChange={e => setTipoCarFilter(e.target.value)}
              className="font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm min-w-[140px]"
            >
              <option value="Todos">Todos (Públicos/Privados)</option>
              <option value="Público">Públicos (INABIF/Benef)</option>
              <option value="Privado">Privados (ONG/Iglesias)</option>
            </select>
          </div>

          {/* Perfil de Atención */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-700">Perfil de Atención</label>
            <select
              value={perfilFilter}
              onChange={e => setPerfilFilter(e.target.value)}
              className="font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm min-w-[140px]"
            >
              <option value="Todos">Todos los Perfiles</option>
              <option value="Básico">Básico</option>
              <option value="Especializado">Especializado</option>
              <option value="Discapacidad Severa">Discapacidad Severa</option>
              <option value="Madres Adolescentes">Madres Adolescentes</option>
            </select>
          </div>

          {/* Alerta de Infractores */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-700">Alerta Infractores</label>
            <select
              value={infractoresFilter}
              onChange={e => setInfractoresFilter(e.target.value)}
              className="font-semibold text-red-700 bg-red-50 border border-red-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 shadow-sm min-w-[130px]"
            >
              <option value="Todos">Todos</option>
              <option value="Con Infractores">Con Infractores (28)</option>
              <option value="Sin Infractores">Sin Infractores (384)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FILA DE 5 TARJETAS KPI PRINCIPALES
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* KPI 1: Total CAR */}
        <div className="bg-white rounded-xl border-2 border-blue-600 p-3.5 shadow-sm flex items-center justify-between">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">Total CAR</p>
            <p className="text-2xl font-black text-blue-700">{totalCarNacional}</p>
            <p className="text-[11px] font-semibold text-slate-500">100 % Cobertura</p>
          </div>
        </div>

        {/* KPI 2: CAR Públicos */}
        <div className="bg-white rounded-xl border-2 border-emerald-500 p-3.5 shadow-sm flex items-center justify-between">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800">CAR Públicos</p>
            <p className="text-2xl font-black text-emerald-600">{totalCarPublicos}</p>
            <p className="text-xs font-bold text-emerald-700">{pctPublicos} %</p>
          </div>
        </div>

        {/* KPI 3: CAR Privados */}
        <div className="bg-white rounded-xl border-2 border-purple-600 p-3.5 shadow-sm flex items-center justify-between">
          <div className="w-12 h-12 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
            <Home className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800">CAR Privados</p>
            <p className="text-2xl font-black text-purple-700">{totalCarPrivados}</p>
            <p className="text-xs font-bold text-purple-800">{pctPrivados} %</p>
          </div>
        </div>

        {/* KPI 4: Capacidad vs Ocupación */}
        <div className="bg-white rounded-xl border-2 border-amber-500 p-3.5 shadow-sm flex items-center justify-between">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800">Población / Cap.</p>
            <p className="text-xl font-black text-amber-700">
              {poblacionTotal.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ {capacidadTotal.toLocaleString()}</span>
            </p>
            <p className="text-xs font-bold text-amber-800">{pctOcupacion} % Ocupación</p>
          </div>
        </div>

        {/* KPI 5: Con Alerta de Infractores */}
        <div className="bg-white rounded-xl border-2 border-red-600 p-3.5 shadow-sm flex items-center justify-between">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800">Con Infractores</p>
            <p className="text-2xl font-black text-red-600">{totalInfractoresCar}</p>
            <p className="text-xs font-bold text-red-700">{pctInfractores} % de CARs</p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SECCIÓN ANALÍTICA: FILTROS TERRITORIALES + GRÁFICOS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Columna Izquierda: Filtros y Modalidades (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Filtro Territorial */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b pb-2">
              <MapPin className="w-4 h-4 text-slate-500" />
              Filtro Geográfico Territorial
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">DEPARTAMENTO</label>
                <select
                  value={selectedDepto}
                  onChange={e => {
                    setSelectedDepto(e.target.value)
                    setSelectedProv('Todas')
                  }}
                  className="w-full font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  {deptosList.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">PROVINCIA</label>
                <select
                  value={selectedProv}
                  onChange={e => setSelectedProv(e.target.value)}
                  className="w-full font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  {provList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">DISTRITO</label>
                <select
                  value={selectedDist}
                  onChange={e => setSelectedDist(e.target.value)}
                  className="w-full font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Todos">Todos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modalidades de Atención */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 text-center">
              Modalidad de Atención del CAR
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                <p className="text-xl font-extrabold text-blue-900">360</p>
                <span className="text-[10px] font-bold text-slate-600 block mt-0.5">Residencial</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                <p className="text-xl font-extrabold text-emerald-900">32</p>
                <span className="text-[10px] font-bold text-slate-600 block mt-0.5">Familiar</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                <p className="text-xl font-extrabold text-orange-900">20</p>
                <span className="text-[10px] font-bold text-slate-600 block mt-0.5">Urgencias</span>
              </div>
            </div>
          </div>

          {/* Principales Administradores */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b pb-1.5">
              Instituciones Administradoras
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-700">INABIF (Público)</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">84 CAR</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-700">Sociedades de Beneficencia</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">74 CAR</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-700">ONGs y Fundaciones</span>
                <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">162 CAR</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-slate-700">Asociaciones Religiosas</span>
                <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">92 CAR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Gráficos Comparativos (8 cols) */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gráfico 1: Público vs Privado por Departamento */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">
                  CAR PÚBLICOS VS PRIVADOS POR DEPARTAMENTO
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold pb-2">
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> PÚBLICO
                </span>
                <span className="inline-flex items-center gap-1 text-purple-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> PRIVADO
                </span>
              </div>

              <div className="h-[360px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={chartDeptosData}
                    margin={{ top: 5, right: 10, left: 35, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" fontSize={10} stroke="#94a3b8" />
                    <YAxis
                      type="category"
                      dataKey="depto"
                      fontSize={9}
                      fontWeight="bold"
                      stroke="#475569"
                      tickLine={false}
                      width={75}
                    />
                    <Tooltip
                      formatter={(val, name) => [val, name === 'publico' ? 'CAR Público' : 'CAR Privado']}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                    />
                    <Bar dataKey="publico" stackId="car" fill="#10b981" />
                    <Bar dataKey="privado" stackId="car" fill="#a855f7" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Gráfico 2: Distribución por Perfil de Atención */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  DISTRIBUCIÓN POR PERFIL DE ATENCIÓN
                </h3>
              </div>

              <div className="space-y-4 pt-2 text-xs">
                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Básico (Protección Integral)</span>
                    <span className="font-bold text-blue-700">238 CAR (57.8 %)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: '57.8%' }} className="bg-blue-600 h-full rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Especializado (Conductual / Salud)</span>
                    <span className="font-bold text-indigo-700">76 CAR (18.4 %)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: '18.4%' }} className="bg-indigo-600 h-full rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Discapacidad Severa / Multi-discapacidad</span>
                    <span className="font-bold text-amber-700">54 CAR (13.1 %)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: '13.1%' }} className="bg-amber-500 h-full rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Madres Adolescentes y Gestantes</span>
                    <span className="font-bold text-pink-700">44 CAR (10.7 %)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: '10.7%' }} className="bg-pink-500 h-full rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Alerta Especial */}
            <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
              <div className="text-xs">
                <span className="font-bold text-red-800 flex items-center gap-1">
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                  Reporte de Acogidos Infractores a la Ley:
                </span>
                <span className="text-red-700 text-[11px] block mt-0.5">
                  28 CAR a nivel nacional reportan NNA con medidas socioeducativas o antecedentes.
                </span>
              </div>
              <button
                onClick={() => setInfractoresFilter('Con Infractores')}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shrink-0 ml-2"
              >
                Filtrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. DIRECTORIO MAESTRO DE CAR (TABLA CON 24 VARIABLES)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Directorio Maestro de Centros de Acogida Residencial (CAR)
              </h3>
              <p className="text-[11px] text-slate-500">
                Mostrando {filteredCars.length} registros según los filtros seleccionados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar código, nombre, responsable, expediente..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" /> Exportar 24 Variables
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-3">Centro de Acogida (CAR)</th>
                <th className="py-3 px-3">Tipo / Modalidad</th>
                <th className="py-3 px-3">Perfil de Atención</th>
                <th className="py-3 px-3">Ubicación</th>
                <th className="py-3 px-3">Institución Administradora</th>
                <th className="py-3 px-3 text-center">Capacidad / Ocup.</th>
                <th className="py-3 px-3 text-center">Infractores</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCars.map(car => {
                const pct = Math.round((car.poblacionActual / car.capacidadMaxima) * 100)
                const isOver = pct >= 90
                return (
                  <tr key={car.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">
                      {car.codigo}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{car.centroAcogida}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {car.expediente} | Resp: {car.responsable}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          car.tipoCar === 'Público'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {car.tipoCar.toUpperCase()}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">{car.modalidad}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-800">{car.perfilAtencion}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800">{car.departamento}</span>
                      <div className="text-[10px] text-slate-400">{car.provincia} - {car.distrito}</div>
                    </td>
                    <td className="py-3 px-3 max-w-[180px] truncate" title={car.institucionAdmin1}>
                      <span className="font-medium text-slate-700">{car.institucionAdmin1}</span>
                      {car.institucionAdmin2 && (
                        <div className="text-[10px] text-slate-400 truncate">{car.institucionAdmin2}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="font-bold text-slate-800">
                        {car.poblacionActual} / {car.capacidadMaxima}
                      </div>
                      <div className="w-16 mx-auto h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full ${isOver ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400">{pct}%</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {car.tieneInfractores === 'Sí' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200">
                          ⚠️ SÍ
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                          NO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenFicha(car)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ficha
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. BANNER INFERIOR OFICIAL DPNNA
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#2563EB] rounded-xl px-6 py-2.5 text-white flex items-center justify-between shadow-md">
        <div className="text-xs font-semibold tracking-wide flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-200" />
          <span>Sistema Integrado DGNNA</span>
        </div>
        <div className="text-sm font-bold tracking-tight">
          Dirección de Políticas de Niñas, Niños y Adolescentes (DPNNA)
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: FICHA TÉCNICA COMPLETA DE CAR (TODAS LAS VARIABLES)
      ───────────────────────────────────────────────────────────── */}
      {modalOpen && selectedCar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30">
                    {selectedCar.codigo}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold ${
                      selectedCar.tipoCar === 'Público' ? 'bg-emerald-500 text-white' : 'bg-purple-500 text-white'
                    }`}
                  >
                    CAR {selectedCar.tipoCar.toUpperCase()}
                  </span>
                </div>
                <h2 className="text-lg font-bold mt-1">{selectedCar.centroAcogida}</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido en Bloques */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Bloque 1: Ubicación y Contacto */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-blue-700 border-b pb-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> 1. Identificación, Ubicación y Contacto
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 font-medium block">Departamento / Provincia</span>
                    <span className="font-bold text-slate-800">{selectedCar.departamento} - {selectedCar.provincia}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Distrito</span>
                    <span className="font-bold text-slate-800">{selectedCar.distrito}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Dirección</span>
                    <span className="font-semibold text-slate-800">{selectedCar.direccion}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Responsable del CAR</span>
                    <span className="font-bold text-slate-800">{selectedCar.responsable}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Teléfono / Celular</span>
                    <span className="font-semibold text-slate-800">{selectedCar.telefono} / {selectedCar.celular}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Correo Institucional</span>
                    <span className="font-semibold text-blue-700">{selectedCar.correoCar}</span>
                  </div>
                </div>
              </div>

              {/* Bloque 2: Administración y Capacidad */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-blue-700 border-b pb-1 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" /> 2. Administración, Modalidad y Capacidad Operativa
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 font-medium block">Institución que administra al CAR</span>
                    <span className="font-bold text-slate-800">{selectedCar.institucionAdmin1}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 font-medium block">Institución que administra al CAR 2</span>
                    <span className="font-semibold text-slate-700">{selectedCar.institucionAdmin2 || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Modalidad</span>
                    <span className="font-bold text-slate-800">{selectedCar.modalidad}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Perfil de Atención</span>
                    <span className="font-bold text-slate-800">{selectedCar.perfilAtencion}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Capacidad Máxima</span>
                    <span className="font-bold text-slate-800">{selectedCar.capacidadMaxima} plazas</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Población Actual</span>
                    <span className="font-extrabold text-blue-700">{selectedCar.poblacionActual} NNA</span>
                  </div>
                </div>
              </div>

              {/* Bloque 3: Reporte de Infractores y Aspectos Legales */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-red-700 border-b border-red-200 pb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> 3. Situación Legal y Reporte de NNA Infractores a la Ley
                </h4>
                <div className={`p-4 rounded-xl border ${selectedCar.tieneInfractores === 'Sí' ? 'bg-red-50/70 border-red-200' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 font-medium block">¿Tiene infractores acogid@s en CAR?</span>
                      <span
                        className={`inline-block mt-0.5 px-3 py-1 rounded-lg text-xs font-black ${
                          selectedCar.tieneInfractores === 'Sí'
                            ? 'bg-red-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {selectedCar.tieneInfractores.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Expediente Oficial</span>
                      <span className="font-mono font-bold text-slate-900">{selectedCar.expediente}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block">Contenido de documento Infractores a la LEY:</span>
                    <p className="text-slate-800 font-medium mt-0.5 bg-white p-2.5 rounded-lg border border-slate-200">
                      {selectedCar.contenidoInfractores}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-slate-400 block">Fecha de Envío:</span>
                      <span className="font-semibold text-slate-700">{selectedCar.fechaEnvio}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Fecha de Respuesta:</span>
                      <span className="font-semibold text-slate-700">{selectedCar.fechaRespuesta}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Documento de Respuesta:</span>
                      <span className="font-semibold text-slate-700">{selectedCar.documentoRespuesta}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-slate-400 text-xs font-mono">{selectedCar.correo}</span>
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

