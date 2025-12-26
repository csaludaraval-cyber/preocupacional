
// src/lib/firestore-admin.ts
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Esta sección asegura que la app de Admin se inicialice una sola vez en el entorno del servidor.
// En Firebase App Hosting, initializeApp() sin argumentos utiliza automáticamente
// las credenciales del entorno de ejecución.
if (!getApps().length) {
    try {
        initializeApp();
        console.log("Firebase Admin SDK inicializado correctamente en el servidor.");
    } catch (e: any) {
        console.error("Error CRÍTICO al inicializar Firebase Admin SDK:", e.message);
    }
}

// Exporta una única instancia de la base de datos para ser usada en Server Actions.
export const db = getFirestore();
