import { getApps, initializeApp, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { initializeFirebase } from '@/firebase';

// This file is now a bridge to the central initialization
// ensuring we don't re-initialize.
const { app, auth, firestore } = initializeFirebase();

export { app, auth, firestore };
