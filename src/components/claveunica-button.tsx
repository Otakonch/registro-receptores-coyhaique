"use client";

import { signIn } from "next-auth/react";

type ClaveUnicaButtonVariant = "iniciar-sesion" | "claveunica";
type ClaveUnicaButtonSize = "m" | "s";
type ClaveUnicaButtonRounded = "none" | "middle" | "full";

interface ClaveUnicaButtonProps {
  callbackUrl?: string;
  variant?: ClaveUnicaButtonVariant;
  fullWidth?: boolean;
  size?: ClaveUnicaButtonSize;
  rounded?: ClaveUnicaButtonRounded;
  className?: string;
}

const LABELS: Record<ClaveUnicaButtonVariant, { text: string; aria: string }> = {
  "iniciar-sesion": {
    text: "Iniciar sesión",
    aria: "Iniciar sesión con ClaveÚnica",
  },
  claveunica: {
    text: "ClaveÚnica",
    aria: "Continuar con ClaveÚnica",
  },
};

/**
 * Botón oficial ClaveÚnica (HTML/CSS v2.0 del manual SGD).
 * Abre el flujo a pantalla completa (sin iframe/popup).
 *
 * Markup oficial:
 * <button class="btn-cu btn-m btn-color-estandar" aria-label="Iniciar sesión con ClaveÚnica">
 *   <span class="cl-claveunica" aria-hidden="true"></span>
 *   <span class="texto" aria-hidden="true">Iniciar sesión</span>
 * </button>
 */
export function ClaveUnicaButton({
  callbackUrl = "/api/auth/post-login",
  variant = "iniciar-sesion",
  fullWidth = false,
  size = "m",
  rounded = "none",
  className = "",
}: ClaveUnicaButtonProps) {
  const { text, aria } = LABELS[variant];

  const classes = [
    "btn-cu",
    size === "s" ? "btn-s" : "btn-m",
    "btn-color-estandar",
    `rounded-${rounded}`,
    fullWidth ? "btn-fw" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-label={aria}
      onClick={() => signIn("claveunica", { callbackUrl })}
    >
      <span className="cl-claveunica" aria-hidden="true" />
      <span className="texto" aria-hidden="true">
        {text}
      </span>
    </button>
  );
}
