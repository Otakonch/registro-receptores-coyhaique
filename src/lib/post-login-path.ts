import { hasAdminAccess } from "./roles";

type SessionLike = {
  needsRegistration?: boolean;
  id?: string;
  rut?: string;
  role?: string | null;
} | null | undefined;

/** RUN autenticado en ClaveÚnica que aún no tiene usuario en la BD */
export function isPendingRegistration(user: SessionLike): boolean {
  if (!user) return false;
  if (user.needsRegistration) return true;
  if (user.rut && !user.id) return true;
  if (user.rut && user.id === user.rut) return true;
  return false;
}

/** Destino tras login según rol y estado de registro */
export function getPostLoginPath(options: {
  needsRegistration?: boolean;
  role?: string | null;
  id?: string;
  rut?: string;
}): string {
  if (isPendingRegistration(options)) return "/registro";
  if (hasAdminAccess(options.role ?? undefined)) return "/admin";
  return "/dashboard";
}
