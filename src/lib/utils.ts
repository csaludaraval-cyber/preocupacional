
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Cleans a RUT by removing all formatting (dots and hyphen).
 * @param rut The RUT string to clean.
 * @returns A cleaned RUT string (e.g., "123456789").
 */
export const cleanRut = (rut: string): string => {
  return typeof rut === 'string'
    ? rut.replace(/[^0-9kK]+/g, '').toUpperCase()
    : '';
};

/**
 * Formats a RUT string with dots and a hyphen.
 * @param rut The raw or cleaned RUT string.
 * @returns A formatted RUT string (e.g., "12.345.678-9").
 */
export const formatRut = (rut: string): string => {
  const cleaned = cleanRut(rut);
  if (!cleaned) return '';

  let rutBody = cleaned.slice(0, -1);
  let dv = cleaned.slice(-1);

  // Add dots for thousands separators
  rutBody = rutBody.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');

  return `${rutBody}-${dv}`;
};
