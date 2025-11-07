
// This file is a central export point for client-side Firebase services.
// It ensures that Firebase is initialized only once using the 'use client' context.

'use client';

import { initializeFirebase } from '@/firebase';

// The initializeFirebase function is marked as 'use client' and handles client-side initialization.
// We call it here and then export the returned instances.
// This file itself is marked 'use client' to ensure it's never bundled in server-side code by mistake.
const { firebaseApp: app, auth, firestore } = initializeFirebase();

// Export the initialized client-side services.
// Any server-side logic must use a separate initialization (e.g., Firebase Admin SDK).
export { app, auth, firestore };
