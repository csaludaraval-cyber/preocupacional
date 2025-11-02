import type { Examen } from '@/lib/types';

let catalogoExamenes: Examen[] = [
  {
    id: 'psicosensometrico_riguroso_001',
    nombre: 'Psicosensométrico Riguroso',
    categoria: 'Psicosensométricos',
    valor: 55000,
    unidad: 'CLP',
    descripcion: 'Evaluación rigurosa de aptitud para trabajos de alto riesgo.',
    esBateria: false,
  },
  {
    id: 'psicosensometrico_basico_002',
    nombre: 'Psicosensométrico Básico',
    categoria: 'Psicosensométricos',
    valor: 45000,
    unidad: 'CLP',
    descripcion: 'Evaluación de aptitudes psicomotoras básicas.',
    esBateria: false,
  },
  {
    id: 'test_de_altura_003',
    nombre: 'Test de Altura',
    categoria: 'Específicos',
    valor: 25000,
    unidad: 'CLP',
    descripcion: 'Examen para trabajos en altura física.',
    esBateria: false,
  },
  {
    id: 'audiometria_004',
    nombre: 'Audiometría',
    categoria: 'Específicos',
    valor: 30000,
    unidad: 'CLP',
    descripcion: 'Evaluación de la capacidad auditiva.',
    esBateria: false,
  },
  {
    id: 'vision_profunda_005',
    nombre: 'Visión Profunda',
    categoria: 'Específicos',
    valor: 20000,
    unidad: 'CLP',
    descripcion: 'Test de estereopsis para visión en profundidad.',
    esBateria: false,
  },
  {
    id: 'bateria_mineria_006',
    nombre: 'Batería Minería',
    categoria: 'Baterías',
    valor: 120000,
    unidad: 'CLP',
    descripcion: 'Conjunto de exámenes para el sector minero.',
    esBateria: true,
  },
  {
    id: 'bateria_construccion_007',
    nombre: 'Batería Construcción',
    categoria: 'Baterías',
    valor: 95000,
    unidad: 'CLP',
    descripcion: 'Exámenes requeridos para el rubro de la construcción.',
    esBateria: true,
  },
  {
    id: 'panel_5_drogas_008',
    nombre: 'Panel 5 Drogas',
    categoria: 'Drogas y Alcohol',
    valor: 40000,
    unidad: 'CLP',
    descripcion: 'Detección de 5 tipos de drogas en orina.',
    esBateria: false,
  },
  {
    id: 'alcoholemia_009',
    nombre: 'Alcoholemia',
    categoria: 'Drogas y Alcohol',
    valor: 15000,
    unidad: 'CLP',
    descripcion: 'Medición de nivel de alcohol en sangre.',
    esBateria: false,
  },
  {
    id: 'radiografia_torax_010',
    nombre: 'Radiografía de Tórax',
    categoria: 'Imágenes y RX',
    valor: 35000,
    unidad: 'CLP',
    descripcion: 'Placa de rayos X de la zona torácica.',
    esBateria: false,
  },
  {
    id: 'ecografia_abdominal_011',
    nombre: 'Ecografía Abdominal',
    categoria: 'Imágenes y RX',
    valor: 60000,
    unidad: 'CLP',
    descripcion: 'Imagen de órganos abdominales mediante ultrasonido.',
    esBateria: false,
  },
  {
    id: 'consulta_medica_012',
    nombre: 'Consulta Médica',
    categoria: 'Otros',
    valor: 25000,
    unidad: 'CLP',
    descripcion: 'Evaluación médica general.',
    esBateria: false,
  },
];

// Simulate API delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function getExams(): Promise<Examen[]> {
  await delay(500);
  return [...catalogoExamenes];
}

export async function updateExamPrice(id: string, newPrice: number): Promise<Examen> {
  await delay(300);
  const examIndex = catalogoExamenes.findIndex(ex => ex.id === id);
  if (examIndex === -1) {
    throw new Error('Examen no encontrado');
  }
  catalogoExamenes[examIndex] = { ...catalogoExamenes[examIndex], valor: newPrice };
  return catalogoExamenes[examIndex];
}

export const examCategories = [
  'Psicosensométricos',
  'Específicos',
  'Baterías',
  'Drogas y Alcohol',
  'Imágenes y RX',
  'Otros',
];
