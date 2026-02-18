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
  rutBody = rutBody.replace(/(\d)(?=(\d{})+(?!\d))/g, '$1.');
  return rutBody + "-" + dv;
};

export async function normalizarUbicacionLioren(comunaStr: string | undefined, ciudadStr: string | undefined) {
  const normalizar = (t: string) => (t || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  
  const cBusca = normalizar(comunaStr || "TALTAL");
  const ciBusca = normalizar(ciudadStr || comunaStr || "TALTAL");

  if (cBusca.includes("TALTAL")) {
    return { comunaId: 15, ciudadId: 8, comunaNombre: "TALTAL" };
  }

  const listaComunas = (maestroLocalidades as any).comunas || [];
  const listaCiudades = (maestroLocalidades as any).ciudades || [];

  const comunaMatch = listaComunas.find((l: any) => normalizar(l.nombre).includes(cBusca));
  const ciudadMatch = listaCiudades.find((c: any) => normalizar(c.nombre).includes(ciBusca));

  const finalComunaId = comunaMatch ? parseInt(comunaMatch.id, 10) : 15;
  const finalCiudadId = ciudadMatch ? parseInt(ciudadMatch.id, 10) : (comunaMatch ? finalComunaId : 8);

  return {
    comunaId: finalComunaId,
    ciudadId: finalCiudadId,
    comunaNombre: comunaMatch ? comunaMatch.nombre.toUpperCase() : "TALTAL"
  };
}