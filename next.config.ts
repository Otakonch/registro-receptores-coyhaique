import type { NextConfig } from "next";

const securityHeaders = [
  // Evitar que la página sea embebida en iframes de otros dominios (clickjacking)
  { key: "X-Frame-Options",        value: "SAMEORIGIN" },
  // El navegador no debe intentar inferir el Content-Type
  { key: "X-Content-Type-Options", value: "nosniff"    },
  // No enviar el referrer completo a sitios externos
  { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
  // Limitar acceso a APIs sensibles del navegador
  { key: "Permissions-Policy",     value: "camera=(), microphone=(), geolocation=()" },
  // Forzar HTTPS una vez que el sitio esté en producción (1 año)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Política de contenido: solo recursos del mismo origen + CDNs necesarios
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Scripts propios + Next.js inline
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Estilos propios + inline (necesario para Tailwind)
      "style-src 'self' 'unsafe-inline'",
      // Imágenes: mismo origen + data URIs + API externa de QR
      "img-src 'self' data: https://api.qrserver.com https://coyhaique.cl",
      // Fuentes: solo mismo origen
      "font-src 'self'",
      // Conexiones: mismo origen
      "connect-src 'self'",
      // Sin frames externos
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],

  async headers() {
    return [
      {
        // Aplicar headers a todas las rutas
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
