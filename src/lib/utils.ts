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
 * NORMALIZADOR LIOREN (SISTEMA DE DOBLE LLAVE)
 * Busca Comuna en la tabla de comunas y Ciudad en la tabla de ciudades.
 */
export async function normalizarUbicacionLioren(comunaStr: string | undefined, ciudadStr: string | undefined) {
  // Limpieza de textos
  const cBusca = (comunaStr || "TALTAL").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const ciBusca = (ciudadStr || comunaStr || "TALTAL").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // --- EXCEPCIÓN NUCLEAR: TALTAL ---
  if (cBusca.includes("TALTAL")) {
    return { comunaId: 15, ciudadId: 8, comunaNombre: "TALTAL" };
  }

  try {
    const maestro = maestroLocalidades as any;
    const listaComunas = maestro.comunas || [];
    const listaCiudades = maestro.ciudades || [];

    // 1. BUSCAR ID DE COMUNA (Tabla Comunas)
    const comunaMatch = listaComunas.find((l: any) => 
      l.nombre && l.nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(cBusca)
    );

    // 2. BUSCAR ID DE CIUDAD (Tabla Ciudades)
    // Intentamos buscar el texto de ciudad, si no viene, usamos el de la comuna en la tabla de ciudades
    const ciudadMatch = listaCiudades.find((c: any) => 
      c.nombre && c.nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(ciBusca)
    );

    const finalComunaId = comunaMatch ? parseInt(comunaMatch.id, 10) : 15;
    // IMPORTANTE: Si no hallamos la ciudad, usamos el ID de Comuna PERO solo si es Taltal, 
    // de lo contrario usamos un fallback seguro para evitar TelAviv.
    const finalCiudadId = ciudadMatch ? parseInt(ciudadMatch.id, 10) : (comunaMatch ? finalComunaId : 8);

    console.log(`📍 MAPEO: [${comunaStr}/${ciudadStr}] -> C:${finalComunaId} CI:${finalCiudadId}`);

    return {
      comunaId: finalComunaId,
      ciudadId: finalCiudadId,
      comunaNombre: comunaMatch ? comunaMatch.nombre.toUpperCase() : "TALTAL"
    };

  } catch (error) {
    console.error("Error en normalización doble:", error);
    return { comunaId: 15, ciudadId: 8, comunaNombre: "TALTAL" };
  }
}