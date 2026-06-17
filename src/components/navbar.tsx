"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  User,
  LayoutDashboard,
  ChevronRight,
  List,
  Menu,
  X,
} from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="shadow-md relative z-50">
      {/* Franja superior — oculta en móvil */}
      <div className="bg-[#0f3d1a] text-white/80 text-xs py-1.5 hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <span>Región de Aysén del General Carlos Ibáñez del Campo — Chile</span>
          <a
            href="https://coyhaique.cl"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            www.coyhaique.cl
          </a>
        </div>
      </div>

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
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/organizaciones">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 text-xs">
                <List className="h-3.5 w-3.5 mr-1" />
                Organizaciones
              </Button>
            </Link>

            {session ? (
              <>
                <Link href={isAdmin ? "/admin" : "/dashboard"}>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 text-xs">
                    <LayoutDashboard className="h-3.5 w-3.5 mr-1" />
                    {isAdmin ? "Panel Admin" : "Mi Inscripción"}
                  </Button>
                </Link>
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/30">
                  <User className="h-3.5 w-3.5 text-white/60" />
                  <span className="text-xs text-white/80 max-w-[120px] truncate">
                    {session.user?.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/20 h-7 w-7 p-0"
                    title="Cerrar sesión"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 text-xs">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link href="/registro">
                  <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-semibold text-xs">
                    Inscribir Organización
                    <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Botón hamburguesa móvil */}
          <button
            className="md:hidden text-white p-1.5 rounded-md hover:bg-white/20 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {menuOpen && (
        <div className="md:hidden bg-[#0f3d1a] border-t border-white/10 shadow-lg">
          <nav className="flex flex-col px-4 py-3 gap-1">
            <Link href="/organizaciones" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/15 text-sm">
                <List className="h-4 w-4 mr-2" />
                Organizaciones Inscritas
              </Button>
            </Link>

            {session ? (
              <>
                <Link href={isAdmin ? "/admin" : "/dashboard"} onClick={() => setMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/15 text-sm">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    {isAdmin ? "Panel Administrador" : "Mi Inscripción"}
                  </Button>
                </Link>
                <div className="border-t border-white/10 pt-2 mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-white/50" />
                    <span className="text-xs text-white/70 truncate max-w-[180px]">
                      {session.user?.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/15 text-xs"
                    onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1" />
                    Salir
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/15 text-sm">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link href="/registro" onClick={() => setMenuOpen(false)}>
                  <Button className="w-full bg-white text-primary hover:bg-white/90 font-semibold text-sm mt-1">
                    Inscribir Organización
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
