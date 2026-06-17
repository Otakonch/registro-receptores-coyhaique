"use client";

interface LogoMunicipalidadProps {
  className?: string;
  variant?: "header" | "footer" | "hero";
}

const LOGO_URLS: Record<string, string> = {
  header: "https://coyhaique.cl/images/logos/logomuni.png",
  hero: "https://coyhaique.cl/images/logos/logomuni.png",
  footer: "https://coyhaique.cl/images/2021/10/25/logofooter.png",
};

const SIZE_CLASSES: Record<string, string> = {
  header: "h-12 w-auto object-contain",
  hero: "h-28 w-auto object-contain drop-shadow-lg",
  footer: "h-16 w-auto object-contain mb-3",
};

export function LogoMunicipalidad({ variant = "header", className }: LogoMunicipalidadProps) {
  return (
    <img
      src={LOGO_URLS[variant]}
      alt="Municipalidad de Coyhaique"
      className={className ?? SIZE_CLASSES[variant]}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
