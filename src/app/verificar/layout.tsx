import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verificar Certificado — Registro de Receptores de Fondos Públicos",
  description:
    "Comprueba la autenticidad de un certificado de registro emitido por la Municipalidad de Coyhaique. Ingresa el código de verificación o escanea el código QR del documento.",
};

export default function VerificarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
