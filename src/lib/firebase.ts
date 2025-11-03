import { getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

// This file is now a bridge to the central initialization
const { app, auth, firestore } = initializeFirebase();

export { app, auth, firestore };
