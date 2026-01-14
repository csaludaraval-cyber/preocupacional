import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import maestroLocalidades from "./localidades.json";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const cleanRut = (rut: string): string => {
  return typeof rut === 'string' ? rut.replace(/[^0-9kK]+/g, '').toUpperCase() : '';
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
 * NORMALIZADOR LIOREN (SOLUCIÓN NUCLEAR CIUDADES)
 * Devuelve IDs separados para Comuna y Ciudad.
 */
export async function normalizarUbicacionLioren(nombreComuna: string | undefined) {
  const busca = (nombreComuna || "TALTAL").toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // --- REGLA DE ORO TALTAL ---
  if (busca.includes("TALTAL")) {
    return { id: 15, ciudadId: 8, comuna: "TALTAL" };
  }

  try {
    const listaComunas = (maestroLocalidades as any).comunas || [];
    const listaCiudades = (maestroLocalidades as any).ciudades || [];
    
    const comunaEncontrada = listaComunas.find((l: any) => 
      l.nombre && l.nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(busca)
    );

    if (comunaEncontrada) {
      // Buscamos la ciudad que se llame igual
      const ciudadEncontrada = listaCiudades.find((c: any) => 
        c.nombre && c.nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === comunaEncontrada.nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      );

      return {
        id: parseInt(comunaEncontrada.id, 10),
        comuna: comunaEncontrada.nombre.toUpperCase(),
        ciudadId: ciudadEncontrada ? parseInt(ciudadEncontrada.id, 10) : parseInt(comunaEncontrada.id, 10)
      };
    }
  } catch (error) {
    console.error("Error en mapeo localidades:", error);
  }
  
  return { id: 15, ciudadId: 8, comuna: "TALTAL" }; 
}