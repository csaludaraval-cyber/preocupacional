import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getLocalidades } from "@/server/lioren";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const cleanRut = (rut: string): string => {
  return typeof rut === 'string'
    ? rut.replace(/[^0-9kK]+/g, '').toUpperCase()
    : '';
};

export const formatRut = (rut: string): string => {
  const cleaned = cleanRut(rut);
  if (!cleaned) return '';
  let rutBody = cleaned.slice(0, -1);
  let dv = cleaned.slice(-1);
  rutBody = rutBody.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  return `${rutBody}-${dv}`;
};

/**
 * NORMALIZADOR LIOREN (NUCLEAR)
 * Busca el ID oficial en la API de Lioren.
 */
export async function normalizarUbicacionLioren(nombreComuna: string | undefined) {
  try {
    const localidades = await getLocalidades();
    const busca = (nombreComuna || "TALTAL").toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    // Buscamos coincidencia en la lista oficial de Lioren
    const encontrada = localidades.find((l: any) => 
      l.nombre && l.nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(busca)
    );

    if (encontrada) {
      console.log(`LOG: Match Lioren -> ${encontrada.nombre} ID: ${encontrada.id}`);
      return {
        id: parseInt(encontrada.id, 10), // FORZAMOS ENTERO PURO
        comuna: encontrada.nombre.toUpperCase()
      };
    }
  } catch (error) {
    console.error("Error consultando API localidades:", error);
  }
  
  // FALLBACK: Si no lo encuentra, usamos el código 21 que sugeriste (Taltal real)
  return { id: 21, comuna: "TALTAL" }; 
}