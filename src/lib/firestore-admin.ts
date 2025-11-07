
// src/lib/firestore-admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Esta sección asegura que la app de Admin se inicialice una sola vez en el entorno del servidor.
if (!getApps().length) {
    try {
        // Intenta inicializar con credenciales de servicio desde variables de entorno.
        // Esto es crucial para que el entorno de servidor tenga los permisos correctos.
        initializeApp({
            credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!))
        });
        console.log("Firebase Admin SDK inicializado correctamente.");
    } catch (e: any) {
        console.error("Error CRÍTICO al inicializar Firebase Admin SDK:", e);
        // En un entorno de producción, la app no funcionaría sin esto.
    }
}

// Exporta una única instancia de la base de datos para ser usada en Server Actions.
export const db = getFirestore();
