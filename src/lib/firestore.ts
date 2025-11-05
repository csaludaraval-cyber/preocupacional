
"use client";

import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

/**
 * Updates the status of a specific quote in Firestore.
 * @param quoteId The ID of the quote document to update.
 * @param newStatus The new status string.
 */
export async function updateQuoteStatus(quoteId: string, newStatus: string): Promise<void> {
  if (!quoteId) {
    throw new Error("quoteId cannot be empty or undefined.");
  }
  const quoteRef = doc(firestore, 'cotizaciones', quoteId);
  await updateDoc(quoteRef, { status: newStatus });
}


/**
 * Deletes a specific quote from Firestore.
 * @param quoteId The ID of the quote document to delete.
 */
export async function deleteQuote(quoteId: string): Promise<void> {
    if (!quoteId) {
        throw new Error("quoteId cannot be empty or undefined.");
    }
    const quoteRef = doc(firestore, 'cotizaciones', quoteId);
    await deleteDoc(quoteRef);
}
