/**
 * adminLog.ts
 * Utilidad para registrar acciones de administradores en la tabla AdminLog.
 * Se llama desde las rutas API cada vez que un admin aprueba, rechaza,
 * modifica o elimina una inscripción.
 */
import { db } from "@/lib/db";

export type AdminAction = "APROBADA" | "RECHAZADA" | "ELIMINADA" | "MODIFICADA";

interface AdminLogInput {
  adminId:        string;
  adminName:      string;
  adminEmail:     string;
  action:         AdminAction;
  orgName:        string;
  orgRut?:        string | null;
  registrationId?: string | null;
  details?:       string | null;   // e.g. observaciones al rechazar
}

/**
 * Crea un registro en AdminLog.
 * Nunca lanza excepción — si falla el log, no se interrumpe la acción principal.
 */
export async function createAdminLog(input: AdminLogInput): Promise<void> {
  try {
    await db.adminLog.create({
      data: {
        adminId:        input.adminId,
        adminName:      input.adminName,
        adminEmail:     input.adminEmail,
        action:         input.action,
        orgName:        input.orgName,
        orgRut:         input.orgRut  ?? null,
        registrationId: input.registrationId ?? null,
        details:        input.details ?? null,
      },
    });
  } catch (err) {
    // Log de respaldo en consola para no perder la información
    console.error("[AdminLog] Error al guardar log:", err, input);
  }
}
