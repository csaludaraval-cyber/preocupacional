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
 * NORMALIZADOR LIOREN (CEREBRO DE UBICACIÓN)
 * Estrategia Híbrida:
 * 1. Intenta buscar la ciudad exacta en la API (para clientes de otras regiones).
 * 2. Si falla o no encuentra, usa el ID 15 (Casa Matriz Taltal).
 */
export async function normalizarUbicacionLioren(nombreComuna: string | undefined) {
  // Limpieza del nombre (Ej: " Viña del Mar " -> "VINA DEL MAR")
  const busca = (nombreComuna || "TALTAL").toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  try {
    // 1. Consultamos la API de Lioren (Búsqueda en Vivo)
    const localidades = await getLocalidades();
    
    // Buscamos coincidencia (ignorando tildes y mayúsculas)
    // Buscamos que el nombre en Lioren CONTENGA lo que escribimos (ej: "SANTIAGO" halla "SANTIAGO CENTRO")
    const encontrada = localidades.find((l: any) => 
      l.nombre && l.nombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(busca)
    );

    if (encontrada) {
      // ÉXITO: Encontramos la ciudad específica del cliente
      return {
        id: parseInt(encontrada.id, 10), 
        comuna: encontrada.nombre.toUpperCase()
      };
    }
  } catch (error) {
    console.error("Error API Localidades (Usando Fallback):", error);
  }
  
  // 2. FALLBACK DE SEGURIDAD (PLAN B)
  // Si no encontramos la ciudad o la API falló, usamos TALTAL.
  // IMPORTANTE: ID 15 (Dato confirmado por Soporte). Antes era 21.
  
  return { id: 15, comuna: "TALTAL" }; 
}