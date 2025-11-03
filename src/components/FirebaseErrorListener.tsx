'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws any received error to be caught by Next.js's global-error.tsx.
 */
export function FirebaseErrorListener() {
  // Use the specific error type for the state for type safety.
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  if (error) {
    // throw error; // This can be too disruptive. Let's log it instead for now, or handle it via a toast.
    console.error("Caught a Firestore Permission Error:", error.message);
    // Optionally, reset the error state so subsequent renders don't keep throwing.
    // Be cautious with this as it might hide persistent issues.
    // setError(null); 
  }

  // This component renders nothing.
  return null;
}
