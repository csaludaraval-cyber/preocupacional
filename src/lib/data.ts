import { collection, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Examen } from '@/lib/types';

// This function is for one-time seeding, you might not need it if you manage data via an admin UI
export async function seedInitialExams() {
  const catalogoExamenes: Omit<Examen, 'id'>[] = [
    {
      nombre: 'Psicosensométrico Riguroso',
      categoria: 'Psicosensométricos',
      valor: 55000,
      unidad: 'CLP',
      descripcion: 'Evaluación rigurosa de aptitud para trabajos de alto riesgo.',
      esBateria: false,
    },
    {
      nombre: 'Psicosensométrico Básico',
      categoria: 'Psicosensométricos',
      valor: 45000,
      unidad: 'CLP',
      descripcion: 'Evaluación de aptitudes psicomotoras básicas.',
      esBateria: false,
    },
    {
      nombre: 'Test de Altura',
      categoria: 'Específicos',
      valor: 25000,
      unidad: 'CLP',
      descripcion: 'Examen para trabajos en altura física.',
      esBateria: false,
    },
    {
      nombre: 'Audiometría',
      categoria: 'Específicos',
      valor: 30000,
      unidad: 'CLP',
      descripcion: 'Evaluación de la capacidad auditiva.',
      esBateria: false,
    },
    {
      nombre: 'Visión Profunda',
      categoria: 'Específicos',
      valor: 20000,
      unidad: 'CLP',
      descripcion: 'Test de estereopsis para visión en profundidad.',
      esBateria: false,
    },
    {
      nombre: 'Batería Minería',
      categoria: 'Baterías',
      valor: 120000,
      unidad: 'CLP',
      descripcion: 'Conjunto de exámenes para el sector minero.',
      esBateria: true,
    },
    {
      nombre: 'Batería Construcción',
      categoria: 'Baterías',
      valor: 95000,
      unidad: 'CLP',
      descripcion: 'Exámenes requeridos para el rubro de la construcción.',
      esBateria: true,
    },
    {
      nombre: 'Panel 5 Drogas',
      categoria: 'Drogas y Alcohol',
      valor: 40000,
      unidad: 'CLP',
      descripcion: 'Detección de 5 tipos de drogas en orina.',
      esBateria: false,
    },
    {
      nombre: 'Alcoholemia',
      categoria: 'Drogas y Alcohol',
      valor: 15000,
      unidad: 'CLP',
      descripcion: 'Medición de nivel de alcohol en sangre.',
      esBateria: false,
    },
    {
      nombre: 'Radiografía de Tórax',
      categoria: 'Imágenes y RX',
      valor: 35000,
      unidad: 'CLP',
      descripcion: 'Placa de rayos X de la zona torácica.',
      esBateria: false,
    },
    {
      nombre: 'Ecografía Abdominal',
      categoria: 'Imágenes y RX',
      valor: 60000,
      unidad: 'CLP',
      descripcion: 'Imagen de órganos abdominales mediante ultrasonido.',
      esBateria: false,
    },
    {
      nombre: 'Consulta Médica',
      categoria: 'Otros',
      valor: 25000,
      unidad: 'CLP',
      descripcion: 'Evaluación médica general.',
      esBateria: false,
    },
  ];
  
  const examsCollection = collection(firestore, 'examenes');
  const snapshot = await getDocs(examsCollection);
  if (snapshot.empty) {
    const batch = writeBatch(firestore);
    catalogoExamenes.forEach(examen => {
      const docRef = doc(examsCollection); // Firestore generates ID
      batch.set(docRef, examen);
    });
    await batch.commit();
    console.log('Initial exams have been seeded.');
  }
}


export async function getExams(): Promise<Examen[]> {
  await seedInitialExams(); // Seed data if collection is empty
  const examsCollection = collection(firestore, 'examenes');
  const snapshot = await getDocs(examsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Examen));
}


export async function updateExamPrice(id: string, newPrice: number): Promise<void> {
  const examRef = doc(firestore, 'examenes', id);
  await updateDoc(examRef, { valor: newPrice });
}

export const examCategories = [
  'Psicosensométricos',
  'Específicos',
  'Baterías',
  'Drogas y Alcohol',
  'Imágenes y RX',
  'Otros',
];
