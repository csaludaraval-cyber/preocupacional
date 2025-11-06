

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
    // El catálogo de prueba ha sido eliminado.
    // Esta sección está lista para recibir el nuevo catálogo real.
    const catalogoExamenes: Omit<Examen, 'id' | 'subcategoria'>[] = [];
    
    const subcategories: Record<string, string> = {};

    const examsToSeed = catalogoExamenes.map(e => ({...e, subcategoria: subcategories[e.nombre] || "General"}));

    if (examsToSeed.length > 0) {
      const batch = writeBatch(firestore);
      const seededExams: Examen[] = [];

      examsToSeed.forEach(examen => {
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
