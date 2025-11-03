

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
    const catalogoExamenes: Omit<Examen, 'id' | 'subcategoria'>[] = [
      // I. Baterías y Exámenes Ocupacionales
      { "nombre": "BATERIA BASICA CAT A", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA BASICA CAT B", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA GEOGRAFICA HASTA 3.000 MSNM", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "ALTURA FISICA HASTA 10 MTS", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "BATERIA CONDUCTOR (A NIVEL DEL MAR)", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA AGENTE NEUMOCONEOGENOS O SILICE CRISTALIZADA", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA AGENTES PRODUCTORES DE ASMA", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA RUIDO", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA ANHIDRIDO SULFUROSO/ NEBLINAS ACIDAS", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA EXPOSICION A FRIO", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA PLOMO", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA AMSA", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA MEL CAT A", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA MEL CAT B", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATETIA MANTOS BLANCOS", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA LOMAS BAYAS", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA LAS CENIZAS", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA PUERTO PATACHE", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA MICHILLA", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "BATERIA MINERA EL ABRA", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true },
      { "nombre": "MAN DE ALIMENTOS COMPLETO", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "MOVIMIENTOS REPETITIVOS", "categoria": "Baterías y Exámenes Ocupacionales", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "PSICOSENSOMETRICO RIGUROSO", "categoria": "Psicológicos y Psicosensométricos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "PSICOSENMETRICO SIMPLE", "categoria": "Psicológicos y Psicosensométricos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "PSICOSENSOTECNICO RIGUROSO", "categoria": "Psicológicos y Psicosensométricos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "PSICOLABORAL", "categoria": "Psicológicos y Psicosensométricos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "PSICOLABORAL GUARDIA-OPERARIOS", "categoria": "Psicológicos y Psicosensométricos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "CONTROL DE IMPULSO", "categoria": "Psicológicos y Psicosensométricos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "AVERSION AL RIESGO", "categoria": "Psicológicos y Psicosensométricos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "ESPIROMETRIA BASAL Y POST BRONCODILATADOR", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "EXAMEN AUDITIVO SCREENING", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "AUDIOMETRIA", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "PERFIL LIPIDICO", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "CREATININA", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "INDICE FRAMIGHAM", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "HEMOGRAMA", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "PLOMO", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "ARSENICO", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "ELECTROCARDIOGRAMA DE REPOSO", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "RX TORAX PA", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "RADIOGRAFIA TORAX LECTURA OIT", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "LAVADO OTICO", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "MEDICINA GENERAL", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "ALCOHOL (OH) SANGRE", "categoria": "Médicos y Clínicos", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "ANFETAMINA (ANF)", "categoria": "Exámenes de Drogas", "valor": 0, "unidad": "CLP", "descripcion": "Solo: THC, COC, BAR", "esBateria": false },
      { "nombre": "BENZODIACEPINA (BZO)", "categoria": "Exámenes de Drogas", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "COCAINA (COC)", "categoria": "Exámenes de Drogas", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "MARIHUANA (THC)", "categoria": "Exámenes de Drogas", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "OPIOIDES (OPI)", "categoria": "Exámenes de Drogas", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": false },
      { "nombre": "4 DROGAS+OH", "categoria": "Exámenes de Drogas", "valor": 0, "unidad": "CLP", "descripcion": "ANF, BZO, COC, THC + OH", "esBateria": true },
      { "nombre": "5 DROGAS+OH", "categoria": "Exámenes de Drogas", "valor": 0, "unidad": "CLP", "descripcion": "ANF, BZO, COC, THC, OPI + OH", "esBateria": true },
      { "nombre": "6 DROGAS+OH", "categoria": "Exámenes de Drogas", "valor": 0, "unidad": "CLP", "descripcion": "", "esBateria": true }
    ];
    
    const subcategories: Record<string, string> = {
        "BATERIA BASICA CAT A": "Baterías Básicas",
        "BATERIA BASICA CAT B": "Baterías Básicas",
        "BATERIA GEOGRAFICA HASTA 3.000 MSNM": "Baterías Geográficas",
        "ALTURA FISICA HASTA 10 MTS": "Baterías Geográficas",
        "BATERIA CONDUCTOR (A NIVEL DEL MAR)": "Batería de Conducción",
        "BATERIA AGENTE NEUMOCONEOGENOS O SILICE CRISTALIZADA": "Baterías por Agente",
        "BATERIA AGENTES PRODUCTORES DE ASMA": "Baterías por Agente",
        "BATERIA RUIDO": "Baterías por Agente",
        "BATERIA ANHIDRIDO SULFUROSO/ NEBLINAS ACIDAS": "Baterías por Agente",
        "BATERIA EXPOSICION A FRIO": "Baterías por Agente",
        "BATERIA PLOMO": "Baterías por Agente",
        "BATERIA AMSA": "Baterías de Faena",
        "BATERIA MEL CAT A": "Baterías de Faena",
        "BATERIA MEL CAT B": "Baterías de Faena",
        "BATETIA MANTOS BLANCOS": "Baterías de Faena",
        "BATERIA LOMAS BAYAS": "Baterías de Faena",
        "BATERIA LAS CENIZAS": "Baterías de Faena",
        "BATERIA PUERTO PATACHE": "Baterías de Faena",
        "BATERIA MICHILLA": "Baterías de Faena",
        "BATERIA MINERA EL ABRA": "Baterías de Faena",
        "MAN DE ALIMENTOS COMPLETO": "Exámenes Específicos",
        "MOVIMIENTOS REPETITIVOS": "Exámenes Específicos",
        "PSICOSENSOMETRICO RIGUROSO": "Evaluaciones Sensoriales",
        "PSICOSENMETRICO SIMPLE": "Evaluaciones Sensoriales",
        "PSICOSENSOTECNICO RIGUROSO": "Evaluaciones Sensoriales",
        "PSICOLABORAL": "Evaluaciones Psicológicas",
        "PSICOLABORAL GUARDIA-OPERARIOS": "Evaluaciones Psicológicas",
        "CONTROL DE IMPULSO": "Evaluaciones Psicológicas",
        "AVERSION AL RIESGO": "Evaluaciones Psicológicas",
        "ESPIROMETRIA BASAL Y POST BRONCODILATADOR": "Función Respiratoria",
        "EXAMEN AUDITIVO SCREENING": "Función Auditiva",
        "AUDIOMETRIA": "Función Auditiva",
        "PERFIL LIPIDICO": "Biometría/Metabólico",
        "CREATININA": "Biometría/Metabólico",
        "INDICE FRAMIGHAM": "Biometría/Metabólico",
        "HEMOGRAMA": "Hematología/Metales",
        "PLOMO": "Hematología/Metales",
        "ARSENICO": "Hematología/Metales",
        "ELECTROCARDIOGRAMA DE REPOSO": "Cardiología",
        "RX TORAX PA": "Radiología",
        "RADIOGRAFIA TORAX LECTURA OIT": "Radiología",
        "LAVADO OTICO": "Otros",
        "MEDICINA GENERAL": "Otros",
        "ALCOHOL (OH) SANGRE": "Toxicología",
        "ANFETAMINA (ANF)": "Drogas Individuales",
        "BENZODIACEPINA (BZO)": "Drogas Individuales",
        "COCAINA (COC)": "Drogas Individuales",
        "MARIHUANA (THC)": "Drogas Individuales",
        "OPIOIDES (OPI)": "Drogas Individuales",
        "4 DROGAS+OH": "Paneles de Drogas",
        "5 DROGAS+OH": "Paneles de Drogas",
        "6 DROGAS+OH": "Paneles de Drogas"
    };

    const examsToSeed = catalogoExamenes.map(e => ({...e, subcategoria: subcategories[e.nombre] || "General"}));

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

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Examen));
}


export async function updateExamPrice(id: string, newPrice: number): Promise<void> {
  const examRef = doc(firestore, 'examenes', id);
  await updateDoc(examRef, { valor: newPrice });
}
