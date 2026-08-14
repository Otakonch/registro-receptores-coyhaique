import { db } from "@/lib/db";

/** Correos de usuarios con rol ADMIN o SUPER_ADMIN para notificaciones */
export async function getAdminNotificationEmails(): Promise<string[]> {
  const admins = await db.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { email: true },
  });

  return admins.map((a) => a.email).filter(Boolean);
}
