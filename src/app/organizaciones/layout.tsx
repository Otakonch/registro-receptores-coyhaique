import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organizaciones Inscritas — Registro de Receptores de Fondos Públicos",
  description:
    "Listado público de organizaciones privadas sin fines de lucro certificadas por la Municipalidad de Coyhaique según la Ley N°19.862.",
};

export default function OrganizacionesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
