import { redirect } from "next/navigation";

/** NextAuth redirige aquí en errores OAuth; el ciudadano vuelve al inicio. */
export default function AuthErrorPage() {
  redirect("/");
}
