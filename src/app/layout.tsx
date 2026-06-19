import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";
import { Navbar } from "@/components/navbar";
import { LogoMunicipalidad } from "@/components/logo-municipalidad";

export const metadata: Metadata = {
  title: "Registro de Receptores de Fondos Públicos — Municipalidad de Coyhaique",
  description:
    "Plataforma de inscripción para organizaciones privadas sin fines de lucro que reciben o pretenden recibir fondos de la Municipalidad de Coyhaique, según Ley N°19.862.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>
          {/* 2.4.1 WCAG — Saltar al contenido principal */}
          <a href="#contenido-principal" className="skip-link">
            Saltar al contenido principal
          </a>
          <Navbar />
          <main id="contenido-principal" className="min-h-screen bg-gray-50">
            {children}
          </main>

          {/* Footer institucional */}
          <footer className="bg-[#0f3d1a] text-white mt-12">
            <div className="max-w-7xl mx-auto px-4 py-10">
              <div className="grid md:grid-cols-3 gap-8">
                {/* Columna 1: Logo e identidad */}
                <div>
                  <LogoMunicipalidad variant="footer" />
                  <p className="text-sm text-white/80 leading-relaxed">
                    Municipalidad de Coyhaique<br />
                    Alcalde Carlos Gatica Villegas
                  </p>
                </div>

                {/* Columna 2: Contacto */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">
                    Contacto
                  </h3>
                  <ul className="space-y-1.5 text-sm text-white/80">
                    <li>Francisco Bilbao 357, Coyhaique</li>
                    <li>+56 67 2675114 / +56 67 2675100</li>
                    <li>Atención OIRS: 09:00 a 14:00 hrs</li>
                    <li>
                      <a
                        href="mailto:partes@coyhaique.cl"
                        className="hover:text-white underline transition-colors"
                      >
                        partes@coyhaique.cl
                      </a>
                    </li>
                  </ul>
                </div>

                {/* Columna 3: Sistema */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60 mb-3">
                    Este Sistema
                  </h3>
                  <ul className="space-y-1.5 text-sm text-white/80">
                    <li>Registro Ley N°19.862</li>
                    <li>Organizaciones privadas sin fines de lucro</li>
                    <li className="pt-1">
                      <a
                        href="https://coyhaique.cl"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white underline transition-colors"
                      >
                        www.coyhaique.cl
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Sub-footer */}
            <div className="border-t border-white/10 py-4">
              <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-1 text-center md:text-left">
                <p className="text-xs text-white/50">
                  © {new Date().getFullYear()} Municipalidad de Coyhaique — Región de Aysén, Chile
                </p>
                <p className="text-xs text-white/50">
                  Registro de Receptores de Fondos Públicos — Ley N°19.862
                </p>
              </div>
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
