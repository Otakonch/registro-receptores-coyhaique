"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { signOutWithClaveUnica } from "@/lib/claveunica-client";
import { ClaveUnicaButton } from "@/components/claveunica-button";
import { isPendingRegistration } from "@/lib/post-login-path";
import {
  LogOut,
  User,
  LayoutDashboard,
  List,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const pendingRegistration = isPendingRegistration(session?.user);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="shadow-md relative z-50">
      {/* Navbar principal */}
      <div className="bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo y nombre */}
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
            <img
              src="https://coyhaique.cl/images/logos/logomuni.png"
              alt="Municipalidad de Coyhaique"
              className="h-10 w-auto object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="border-l border-white/30 pl-2.5">
              <p className="font-bold text-xs leading-tight tracking-wide uppercase">
                Municipalidad de Coyhaique
              </p>
              <p className="text-[10px] text-white/75 leading-tight hidden sm:block">
                Registro de Receptores de Fondos Públicos
              </p>
            </div>
          </Link>

          {/* Navegación desktop */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
            <Link href="/organizaciones">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 text-xs">
                <List className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Organizaciones
              </Button>
            </Link>
            <Link href="/verificar">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 text-xs">
                <ShieldCheck className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Verificar certificado
              </Button>
            </Link>

            {session ? (
              <>
                {!pendingRegistration && (
                <Link href={isAdmin ? "/admin" : "/dashboard"}>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 text-xs">
                    <LayoutDashboard className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                    {isAdmin ? "Panel Admin" : "Mi Inscripción"}
                  </Button>
                </Link>
                )}
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/30">
                  <User className="h-3.5 w-3.5 text-white/60" aria-hidden="true" />
                  <span className="text-xs text-white/80 max-w-[120px] truncate">
                    {session.user?.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/20 h-7 w-7 p-0"
                    title="Cerrar sesión"
                    aria-label="Cerrar sesión"
                    onClick={() => signOutWithClaveUnica()}
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </>
            ) : (
              <div onClick={() => setMenuOpen(false)}>
                <ClaveUnicaButton size="s" />
              </div>
            )}
          </nav>

          {/* Botón hamburguesa móvil */}
          <button
            className="md:hidden text-white p-1.5 rounded-md hover:bg-white/20 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="menu-movil"
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {menuOpen && (
        <div id="menu-movil" className="md:hidden bg-[#0f3d1a] border-t border-white/10 shadow-lg">
          <nav className="flex flex-col px-4 py-3 gap-1" aria-label="Menú de navegación móvil">
            <Link href="/organizaciones" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/15 text-sm">
                <List className="h-4 w-4 mr-2" aria-hidden="true" />
                Organizaciones Inscritas
              </Button>
            </Link>
            <Link href="/verificar" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/15 text-sm">
                <ShieldCheck className="h-4 w-4 mr-2" aria-hidden="true" />
                Verificar certificado
              </Button>
            </Link>

            {session ? (
              <>
                {!pendingRegistration && (
                <Link href={isAdmin ? "/admin" : "/dashboard"} onClick={() => setMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/15 text-sm">
                    <LayoutDashboard className="h-4 w-4 mr-2" aria-hidden="true" />
                    {isAdmin ? "Panel Administrador" : "Mi Inscripción"}
                  </Button>
                </Link>
                )}
                <div className="border-t border-white/10 pt-2 mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-white/50" aria-hidden="true" />
                    <span className="text-xs text-white/70 truncate max-w-[180px]">
                      {session.user?.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/15 text-xs"
                    aria-label="Cerrar sesión"
                    onClick={() => {
                      setMenuOpen(false);
                      signOutWithClaveUnica();
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                    Salir
                  </Button>
                </div>
              </>
            ) : (
              <div className="pt-1" onClick={() => setMenuOpen(false)}>
                <ClaveUnicaButton size="s" fullWidth />
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
