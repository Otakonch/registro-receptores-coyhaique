import { hasAdminAccess } from "./roles";

/** Destino tras login según rol y estado de registro */
export function getPostLoginPath(options: {
  needsRegistration?: boolean;
  role?: string | null;
}): string {
  if (options.needsRegistration) return "/registro";
  if (hasAdminAccess(options.role ?? undefined)) return "/admin";
  return "/dashboard";
}
