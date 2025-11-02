'use client';
import { FirebaseOptions, initializeApp, getApps, getApp } from 'firebase/app';

// Your web app's Firebase configuration
export const firebaseConfig: FirebaseOptions = {
  apiKey: 'AIzaSyDSx_gjlw5TJgUDgvnowJDyWtid4eTgrzE',
  authDomain: 'studio-4288557503-eb161.firebaseapp.com',
  projectId: 'studio-4288557503-eb161',
  storageBucket: 'studio-4288557503-eb161.appspot.com',
  messagingSenderId: '848859591437',
  appId: '1:848859591437:web:d30ccd9d0461c3db2bf644',
};

// Initialize Firebase
function initializeFirebase() {
  if (getApps().length) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

export const app = initializeFirebase();
