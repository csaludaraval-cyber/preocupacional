import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: "studio-4288557503-eb161"
    });
  }
  return getFirestore();
}