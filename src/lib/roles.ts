/**
 * Jerarquía de roles:
 *   USER        → usuario normal (representante legal)
 *   ADMIN       → funcionario municipal (panel admin, sin gestión de usuarios)
 *   SUPER_ADMIN → administrador de sistema (panel completo + gestión de usuarios)
 */

/** Devuelve true si el rol tiene acceso al panel de administración */
export function hasAdminAccess(role?: string | null): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Devuelve true solo para el administrador de sistema */
export function isSuperAdmin(role?: string | null): boolean {
  return role === "SUPER_ADMIN";
}
