import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatea un RUT chileno: 12345678-9 → 12.345.678-9
export function formatRut(rut: string): string {
  const clean = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formatted}-${dv}`;
}

// Valida RUT chileno (Módulo 11)
// Reglas: cuerpo entre 6 y 9 dígitos, dígito verificador calculado por Módulo 11
export function validateRut(rut: string): boolean {
  const clean = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  // El cuerpo debe tener entre 6 y 9 dígitos (rango válido de RUT chilenos)
  if (body.length < 6 || body.length > 9) return false;
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const expectedDv = 11 - (sum % 11);
  const expectedDvStr =
    expectedDv === 11 ? "0" : expectedDv === 10 ? "K" : String(expectedDv);
  return dv === expectedDvStr;
}

// Valida solo el cuerpo del RUT (sin DV): longitud entre 6 y 9 dígitos
export function validateRutBody(body: string): boolean {
  const digits = body.replace(/[^0-9]/g, "");
  return digits.length >= 6 && digits.length <= 9;
}

// Calcula el dígito verificador de un RUT dado solo el cuerpo numérico
export function calculateDv(rutBody: string): string {
  const clean = rutBody.replace(/[^0-9]/g, "");
  if (!clean) return "";
  let sum = 0;
  let multiplier = 2;
  for (let i = clean.length - 1; i >= 0; i--) {
    sum += parseInt(clean[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const dv = 11 - (sum % 11);
  return dv === 11 ? "0" : dv === 10 ? "K" : String(dv);
}

// Valida formato de correo electrónico
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

// Formatea tamaño de archivo
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Formatea fecha en español
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Etiquetas para los estados de inscripción
export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING: "En Revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

// Etiquetas para tipos de documentos
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  RUT_ORGANIZACION: "Fotocopia RUT de la Organización",
  CERTIFICADO_DIRECTORIO: "Certificado de Directorio de Persona Jurídica",
  CERTIFICADO_LEY_19862: "Certificado Ley 19.862 con Directiva Actualizada",
  CERTIFICADO_VIGENCIA: "Certificado de Vigencia de Persona Jurídica",
  CEDULAS_DIRECTIVOS: "Fotocopias Cédulas de Identidad del Directorio",
  ESTATUTOS: "Fotocopia de Estatutos Firmados/Timbrados",
  CERTIFICADO_BANCARIO: "Certificado o Documento Bancario",
};

// Tipos de organización reconocidos por la Municipalidad (Ley N°19.862).
// IMPORTANTE: estos valores son los que se almacenan en la BD.
// Si se modifican, actualizar también el filtro en /organizaciones/page.tsx.
export const ORGANIZATION_TYPES = [
  "Club Deportivo",
  "Club Social y Deportivo",
  "Junta de Vecinos",
  "Corporación",
  "Fundación",
  "Asociación Gremial",
  "Agrupación Cultural",
  "Centro de Padres y Apoderados",
  "Organización Comunitaria",
  "Centro de Madres",
  "Otra",
];

// Cargos en el directorio
export const DIRECTORY_ROLES = [
  "Presidente/a",
  "Vicepresidente/a",
  "Secretario/a",
  "Tesorero/a",
  "Director/a",
  "Representante Legal",
];
