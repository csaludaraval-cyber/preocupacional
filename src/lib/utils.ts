import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
// IMPORTAMOS EL JSON QUE ACABAS DE CREAR (Al mismo nivel en /lib)
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
 * NORMALIZADOR LIOREN (VERSIÓN MAESTRO LOCAL OFICIAL)
 * Lee desde src/lib/localidades.json
 */
export async function normalizarUbicacionLioren(nombreComuna: string | undefined) {
  // 1. Limpieza del texto ingresado
  const busca = (nombreComuna || "TALTAL").toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  try {
    // 2. BUSCAMOS LA COMUNA (Dato Fiscal - ID 15 para Taltal)
    // Usamos 'as any' para que TypeScript lea el JSON sin problemas
    const listaComunas = (maestroLocalidades as any).comunas || [];
    
    const comunaEncontrada = listaComunas.find((l: any) => 
      l.nombre && l.nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(busca)
    );

    if (comunaEncontrada) {
      // 3. BUSCAMOS LA CIUDAD (Dato Físico - ID 8 para Taltal)
      // Lioren separa Comunas de Ciudades. Intentamos hallar la ciudad con el mismo nombre.
      const listaCiudades = (maestroLocalidades as any).ciudades || [];
      const ciudadEncontrada = listaCiudades.find((c: any) => 
        c.nombre && c.nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === comunaEncontrada.nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      );

      // ID de ciudad: Si encontramos la ciudad exacta, usamos su ID. Si no, usamos el mismo ID de la comuna como fallback.
      const ciudadIdFinal = ciudadEncontrada ? parseInt(ciudadEncontrada.id, 10) : parseInt(comunaEncontrada.id, 10);

      console.log(`✅ LOCALIDAD OFICIAL: ${comunaEncontrada.nombre} -> Comuna ID: ${comunaEncontrada.id}, Ciudad ID: ${ciudadIdFinal}`);

      return {
        id: parseInt(comunaEncontrada.id, 10), // ID para el SII (ej: 15)
        comuna: comunaEncontrada.nombre.toUpperCase(),
        ciudadId: ciudadIdFinal // ID para la dirección (ej: 8)
      };
    }
  } catch (error) {
    console.error("Error leyendo maestro local:", error);
  }
  
  // 4. FALLBACK DE SEGURIDAD (DATOS OFICIALES TALTAL)
  // Si todo falla, usamos los datos que viste en el JSON: Comuna 15, Ciudad 8.
  return { id: 15, comuna: "TALTAL", ciudadId: 8 }; 
}