import { FirebaseOptions, initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuración de Firebase
export const firebaseConfig: FirebaseOptions = {
  apiKey: 'AIzaSyDSx_gjlw5TJgUDgvnowJDyWtid44TgrzE',
  authDomain: 'studio-4288557503-eb161.firebaseapp.com',
  projectId: 'studio-4288557503-eb161',
  storageBucket: 'studio-4288557503-eb161.firebasestorage.app',
  messagingSenderId: '848859591437',
  appId: '1:848859591437:web:d30ccd9d0461c3db2bf644',
};

// Singleton robusto para Client y Server
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export { app, firestore };