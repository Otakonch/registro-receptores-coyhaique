import { PDFDocument } from "pdf-lib";

const PDF_MAGIC = Buffer.from("%PDF-");
const MAX_SCAN_BYTES = 1024;

export type PdfValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export async function validatePdfBuffer(buffer: Buffer): Promise<PdfValidationResult> {
  if (buffer.length < 5) {
    return { valid: false, error: "El archivo está vacío o es demasiado pequeño." };
  }

  if (!buffer.subarray(0, 5).equals(PDF_MAGIC)) {
    return { valid: false, error: "El archivo no tiene formato PDF válido." };
  }

  const head = buffer.subarray(0, Math.min(buffer.length, MAX_SCAN_BYTES)).toString("latin1");
  if (/%PDF-1\.[0-7]/.test(head) === false && !head.startsWith("%PDF-")) {
    return { valid: false, error: "Versión de PDF no reconocida." };
  }

  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
    const pageCount = doc.getPageCount();
    if (pageCount < 1) {
      return { valid: false, error: "El PDF no contiene páginas." };
    }
    if (pageCount > 200) {
      return { valid: false, error: "El PDF supera el máximo de 200 páginas permitidas." };
    }
  } catch {
    return {
      valid: false,
      error: "No se pudo leer el PDF. Puede estar dañado, protegido con contraseña o no ser un PDF real.",
    };
  }

  return { valid: true };
}

export async function validatePdfFile(file: File): Promise<PdfValidationResult> {
  const bytes = await file.arrayBuffer();
  return validatePdfBuffer(Buffer.from(bytes));
}
