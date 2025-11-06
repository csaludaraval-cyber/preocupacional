
import { collection, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Examen } from '@/lib/types';


export const examCategories = [
  'Baterías y Exámenes Ocupacionales',
  'Psicológicos y Psicosensométricos',
  'Médicos y Clínicos',
  'Exámenes de Drogas',
];


export async function getExams(): Promise<Examen[]> {
  const examsCollection = collection(firestore, 'examenes');
  const snapshot = await getDocs(examsCollection);

  if (snapshot.empty) {
    const catalogoExamenes: Omit<Examen, 'id'>[] = [
        {
            codigo: '303001',
            nombre: 'ANTROPOMETRÍA - GLICEMIA - CREATININA - PERFIL LIPIDICO - INF MÉDICO',
            categoria: 'Baterías y Exámenes Ocupacionales',
            subcategoria: 'Bateria Básica Preocupacional',
            unidad: 'CLP',
            valor: 28000,
        },
        {
            codigo: '303002',
            nombre: 'ELECTROCARDIOGRAMA - ANTROPOMETRÍA - GLICEMIA - CREATININA - PERFIL LIPIDICO - INF MEDICO',
            categoria: 'Baterías y Exámenes Ocupacionales',
            subcategoria: 'Bateria Basica Altura Geografica (3000 MSNM)',
            unidad: 'CLP',
            valor: 32000,
        },
        {
            codigo: '303003',
            nombre: 'GLICEMIA - OPTOMETRÍA - ELECTROCARDIOGRAMA - PRUEBAS DE EQUILIBRIO - INF MEDICO',
            categoria: 'Baterías y Exámenes Ocupacionales',
            subcategoria: 'Bateria Altura Física',
            unidad: 'CLP',
            valor: 38000,
        },
        {
            codigo: '303004',
            nombre: 'RADIOGRAFIA TORAX - INFORME RADIOLOGICO',
            categoria: 'Baterías y Exámenes Ocupacionales',
            subcategoria: 'Bateria Silice',
            unidad: 'CLP',
            valor: 40000,
        },
        {
            codigo: '303005',
            nombre: 'TEST DE AVERSION AL RIESGO',
            categoria: 'Psicológicos y Psicosensométricos',
            subcategoria: 'Aversion al riesgo',
            unidad: 'CLP',
            valor: 25000,
        },
        {
            codigo: '303006',
            nombre: 'AUDIOMETRÍA',
            categoria: 'Médicos y Clínicos',
            subcategoria: 'Ruido',
            unidad: 'CLP',
            valor: 15000,
        },
        {
            codigo: '303007',
            nombre: 'OPTOMETRÍA',
            categoria: 'Médicos y Clínicos',
            subcategoria: 'Optometría',
            unidad: 'CLP',
            valor: 15000,
        },
        {
            codigo: '303008',
            nombre: 'BASICO O RIGUROSO (INCLUYE EV SOMNOLENCIA)',
            categoria: 'Psicológicos y Psicosensométricos',
            subcategoria: 'Psicosensometría o tecnico',
            unidad: 'CLP',
            valor: 55000,
        },
        {
            codigo: '303009',
            nombre: 'TEST IMPULSIVIDAD',
            categoria: 'Psicológicos y Psicosensométricos',
            subcategoria: 'Psicologicos',
            unidad: 'CLP',
            valor: 30000,
        },
        {
            codigo: '0302035-18',
            nombre: 'ALCOHOL - MARIHUANA - COCAINA - BENZODIAZEPINAS - OPIOIDES Y ANFETAMINAS',
            categoria: 'Exámenes de Drogas',
            subcategoria: 'Test alcohol y drogas',
            unidad: 'CLP',
            valor: 42000,
        },
        {
            codigo: '0302035-20',
            nombre: 'ALCOHOL - MARIHUANA - COCAINA - BENZODIAZEPINAS - OPIOIDES - ANFETAMINAS - KETAMINA',
            categoria: 'Exámenes de Drogas',
            subcategoria: 'Alcohol y drogas',
            unidad: 'CLP',
            valor: 52000,
        },
        {
            codigo: '309022',
            nombre: 'ORINA COMPLETA',
            categoria: 'Médicos y Clínicos',
            subcategoria: 'Orina Completa',
            unidad: 'CLP',
            valor: 4440,
        },
        {
            codigo: '301034',
            nombre: 'GRUPO SANGUINEO',
            categoria: 'Médicos y Clínicos',
            subcategoria: 'Grupo Sanguineo',
            unidad: 'CLP',
            valor: 6360,
        },
        {
            codigo: '301045',
            nombre: 'HEMOGRAMA',
            categoria: 'Médicos y Clínicos',
            subcategoria: 'Hemograma',
            unidad: 'CLP',
            valor: 7155,
        },
    ];

    if (catalogoExamenes.length > 0) {
      const batch = writeBatch(firestore);
      const seededExams: Examen[] = [];

      catalogoExamenes.forEach(examen => {
        const docRef = doc(examsCollection); // Firestore generates ID
        batch.set(docRef, examen);
        seededExams.push({ ...examen, id: docRef.id });
      });
      
      await batch.commit();
      return seededExams;
    }
  }

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Examen));
}


export async function updateExamPrice(id: string, newPrice: number): Promise<void> {
  const examRef = doc(firestore, 'examenes', id);
  await updateDoc(examRef, { valor: newPrice });
}
