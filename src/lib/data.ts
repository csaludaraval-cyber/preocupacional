
import { collection, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Examen } from '@/lib/types';

// This function is for one-time seeding, you might not need it if you manage data via an admin UI
export async function seedInitialExams() {
  const catalogoExamenes: Omit<Examen, 'id'>[] = [
    // I. Baterías y Exámenes Ocupacionales
    { "nombre": "BATERIA BASICA CAT A", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías Básicas", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA BASICA CAT B", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías Básicas", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA GEOGRAFICA HASTA 3.000 MSNM", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías Geográficas", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "ALTURA FISICA HASTA 10 MTS", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías Geográficas", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "BATERIA CONDUCTOR (A NIVEL DEL MAR)", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Batería de Conducción", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA AGENTE NEUMOCONEOGENOS O SILICE CRISTALIZADA", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías por Agente", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA AGENTES PRODUCTORES DE ASMA", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías por Agente", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA RUIDO", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías por Agente", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA ANHIDRIDO SULFUROSO/ NEBLINAS ACIDAS", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías por Agente", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA EXPOSICION A FRIO", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías por Agente", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA PLOMO", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías por Agente", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA AMSA", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías de Faena", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA MEL CAT A", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías de Faena", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA MEL CAT B", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías de Faena", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATETIA MANTOS BLANCOS", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías de Faena", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA LOMAS BAYAS", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías de Faena", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA LAS CENIZAS", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías de Faena", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA PUERTO PATACHE", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías de Faena", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA MICHILLA", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías de Faena", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "BATERIA MINERA EL ABRA", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Baterías de Faena", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
    { "nombre": "MAN DE ALIMENTOS COMPLETO", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Exámenes Específicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "MOVIMIENTOS REPETITIVOS", "categoria": "Baterías y Exámenes Ocupacionales", "subcategoria": "Exámenes Específicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },

    // II. Exámenes Psicológicos y Psicosensométricos
    { "nombre": "PSICOSENSOMETRICO RIGUROSO", "categoria": "Psicológicos y Psicosensométricos", "subcategoria": "Evaluaciones Sensoriales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "PSICOSENMETRICO SIMPLE", "categoria": "Psicológicos y Psicosensométricos", "subcategoria": "Evaluaciones Sensoriales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "PSICOSENSOTECNICO RIGUROSO", "categoria": "Psicológicos y Psicosensométricos", "subcategoria": "Evaluaciones Sensoriales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "PSICOLABORAL", "categoria": "Psicológicos y Psicosensométricos", "subcategoria": "Evaluaciones Psicológicas", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "PSICOLABORAL GUARDIA-OPERARIOS", "categoria": "Psicológicos y Psicosensométricos", "subcategoria": "Evaluaciones Psicológicas", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "CONTROL DE IMPULSO", "categoria": "Psicológicos y Psicosensométricos", "subcategoria": "Evaluaciones Psicológicas", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "AVERSION AL RIESGO", "categoria": "Psicológicos y Psicosensométricos", "subcategoria": "Evaluaciones Psicológicas", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },

    // III. Exámenes Médicos y Clínicos
    { "nombre": "ESPIROMETRIA BASAL Y POST BRONCODILATADOR", "categoria": "Médicos y Clínicos", "subcategoria": "Función Respiratoria", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "EXAMEN AUDITIVO SCREENING", "categoria": "Médicos y Clínicos", "subcategoria": "Función Auditiva", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "AUDIOMETRIA", "categoria": "Médicos y Clínicos", "subcategoria": "Función Auditiva", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "PERFIL LIPIDICO", "categoria": "Médicos y Clínicos", "subcategoria": "Biometría/Metabólico", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "CREATININA", "categoria": "Médicos y Clínicos", "subcategoria": "Biometría/Metabólico", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "INDICE FRAMIGHAM", "categoria": "Médicos y Clínicos", "subcategoria": "Biometría/Metabólico", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "HEMOGRAMA", "categoria": "Médicos y Clínicos", "subcategoria": "Hematología/Metales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "PLOMO", "categoria": "Médicos y Clínicos", "subcategoria": "Hematología/Metales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "ARSENICO", "categoria": "Médicos y Clínicos", "subcategoria": "Hematología/Metales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "ELECTROCARDIOGRAMA DE REPOSO", "categoria": "Médicos y Clínicos", "subcategoria": "Cardiología", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "RX TORAX PA", "categoria": "Médicos y Clínicos", "subcategoria": "Radiología", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "RADIOGRAFIA TORAX LECTURA OIT", "categoria": "Médicos y Clínicos", "subcategoria": "Radiología", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "LAVADO OTICO", "categoria": "Médicos y Clínicos", "subcategoria": "Otros", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "MEDICINA GENERAL", "categoria": "Médicos y Clínicos", "subcategoria": "Otros", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "ALCOHOL (OH) SANGRE", "categoria": "Médicos y Clínicos", "subcategoria": "Toxicología", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },

    // IV. Exámenes de Drogas
    { "nombre": "ANFETAMINA (ANF)", "categoria": "Exámenes de Drogas", "subcategoria": "Drogas Individuales", "valor": 0, "unidad": "CLP", "descripcion": "Solo: THC, COC, BAR", "esBateria": false },
    { "nombre": "BENZODIACEPINA (BZO)", "categoria": "Exámenes de Drogas", "subcategoria": "Drogas Individuales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "COCAINA (COC)", "categoria": "Exámenes de Drogas", "subcategoria": "Drogas Individuales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "MARIHUANA (THC)", "categoria": "Exámenes de Drogas", "subcategoria": "Drogas Individuales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "OPIOIDES (OPI)", "categoria": "Exámenes de Drogas", "subcategoria": "Drogas Individuales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
    { "nombre": "4 DROGAS+OH", "categoria": "Exámenes de Drogas", "subcategoria": "Paneles de Drogas", "valor": 0, "unidad": "CLP", "descripcion": "ANF, BZO, COC, THC + OH", "esBateria": true },
    { "nombre": "5 DROGAS+OH", "categoria": "Exámenes de Drogas", "subcategoria": "Paneles de Drogas", "valor": 0, "unidad": "CLP", "descripcion": "ANF, BZO, COC, THC, OPI + OH", "esBateria": true },
    { "nombre": "6 DROGAS+OH", "categoria": "Exámenes de Drogas", "subcategoria": "Paneles de Drogas", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true }
  ];
  
  const examsCollection = collection(firestore, 'examenes');
  const snapshot = await getDocs(examsCollection);
  
  // We'll overwrite existing data to ensure the new catalog is applied
  const batch = writeBatch(firestore);
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  const newBatch = writeBatch(firestore);
  catalogoExamenes.forEach(examen => {
      const docRef = doc(examsCollection); // Firestore generates ID
      newBatch.set(docRef, examen);
  });
  await newBatch.commit();
  console.log('New exams catalog has been seeded.');
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
  'Baterías y Exámenes Ocupacionales',
  'Psicológicos y Psicosensométricos',
  'Médicos y Clínicos',
  'Exámenes de Drogas',
];

    