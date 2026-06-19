import nodemailer from "nodemailer";

// Configura estas variables en .env.local
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT ?? "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = `"Municipalidad de Coyhaique" <${process.env.SMTP_USER ?? "noreply@coyhaique.cl"}>`;

// Estilos comunes del correo
function htmlWrapper(title: string, content: string) {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0f3d1a;padding:24px 32px;text-align:center;">
              <p style="color:#fff;font-size:11px;margin:0 0 4px;letter-spacing:2px;text-transform:uppercase;opacity:0.7;">Municipalidad de Coyhaique</p>
              <h1 style="color:#fff;margin:0;font-size:18px;font-weight:700;">${title}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
              <p style="color:#6b7280;font-size:11px;margin:0;">Francisco Bilbao 357, Coyhaique · Región de Aysén, Chile</p>
              <p style="color:#6b7280;font-size:11px;margin:4px 0 0;">Registro de Receptores de Fondos Públicos · Ley N°19.862</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;
}

// 1. Correo al registrarse
export async function enviarCorreoBienvenida(nombre: string, email: string) {
  const content = `
    <p style="color:#374151;font-size:15px;">Estimado/a <strong>${nombre}</strong>,</p>
    <p style="color:#374151;font-size:14px;line-height:1.6;">
      Tu cuenta ha sido creada exitosamente en el sistema de Registro de Receptores de Fondos Públicos
      de la Municipalidad de Coyhaique.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="color:#166534;font-size:13px;margin:0;font-weight:600;">Próximos pasos:</p>
      <ol style="color:#15803d;font-size:13px;margin:8px 0 0;padding-left:20px;line-height:1.8;">
        <li>Inicia sesión con tu correo y contraseña.</li>
        <li>Completa los datos de tu organización.</li>
        <li>Sube los 7 documentos requeridos.</li>
        <li>Envía tu solicitud a revisión.</li>
      </ol>
    </div>
    <p style="text-align:center;margin:28px 0 0;">
      <a href="${process.env.NEXTAUTH_URL}/login"
         style="background:#1d6b33;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:700;display:inline-block;">
        Acceder a la plataforma
      </a>
    </p>`;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Cuenta creada — Registro de Receptores · Municipalidad de Coyhaique",
    html: htmlWrapper("¡Bienvenido/a al Registro!", content),
  });
}

// 2. Correo cuando envía a revisión
export async function enviarCorreoEnviado(nombre: string, email: string, orgNombre: string) {
  const content = `
    <p style="color:#374151;font-size:15px;">Estimado/a <strong>${nombre}</strong>,</p>
    <p style="color:#374151;font-size:14px;line-height:1.6;">
      Tu inscripción para la organización <strong>${orgNombre}</strong> ha sido enviada a revisión
      y será evaluada por el equipo municipal.
    </p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
      <p style="color:#1e40af;font-size:24px;margin:0;">⏳</p>
      <p style="color:#1d4ed8;font-size:13px;font-weight:600;margin:4px 0 0;">En revisión</p>
      <p style="color:#3b82f6;font-size:12px;margin:4px 0 0;">Te notificaremos el resultado a este correo.</p>
    </div>`;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Solicitud recibida — ${orgNombre} · Municipalidad de Coyhaique`,
    html: htmlWrapper("Solicitud en Revisión", content),
  });
}

// 3. Correo de aprobación
export async function enviarCorreoAprobado(nombre: string, email: string, orgNombre: string, registrationId: string) {
  const certUrl = `${process.env.NEXTAUTH_URL}/api/certificado/${registrationId}`;
  const content = `
    <p style="color:#374151;font-size:15px;">Estimado/a <strong>${nombre}</strong>,</p>
    <div style="background:#f0fdf4;border:2px solid #4ade80;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
      <p style="color:#166534;font-size:28px;margin:0;">✅</p>
      <p style="color:#15803d;font-size:16px;font-weight:700;margin:8px 0 4px;">¡Inscripción Aprobada!</p>
      <p style="color:#166534;font-size:13px;margin:0;"><strong>${orgNombre}</strong></p>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.6;">
      Tu organización ha sido certificada y puede postular a fondos concursables de la
      Municipalidad de Coyhaique. Puedes descargar tu certificado oficial a continuación.
    </p>
    <p style="text-align:center;margin:24px 0 0;">
      <a href="${certUrl}"
         style="background:#0f3d1a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:700;display:inline-block;">
        Descargar Certificado PDF
      </a>
    </p>`;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `✅ Inscripción aprobada — ${orgNombre}`,
    html: htmlWrapper("Inscripción Aprobada", content),
  });
}

// 4. Correo de rechazo
export async function enviarCorreoRechazado(
  nombre: string,
  email: string,
  orgNombre: string,
  observaciones?: string
) {
  const content = `
    <p style="color:#374151;font-size:15px;">Estimado/a <strong>${nombre}</strong>,</p>
    <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
      <p style="color:#991b1b;font-size:28px;margin:0;">❌</p>
      <p style="color:#b91c1c;font-size:16px;font-weight:700;margin:8px 0 4px;">Inscripción No Aprobada</p>
      <p style="color:#991b1b;font-size:13px;margin:0;"><strong>${orgNombre}</strong></p>
    </div>
    ${observaciones ? `
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#9a3412;font-size:13px;font-weight:600;margin:0 0 6px;">Observaciones del evaluador:</p>
      <p style="color:#c2410c;font-size:13px;margin:0;line-height:1.5;">${observaciones}</p>
    </div>` : ""}
    <p style="color:#374151;font-size:14px;line-height:1.6;">
      Puedes corregir los problemas indicados y volver a enviar tu solicitud desde la plataforma.
    </p>
    <p style="text-align:center;margin:24px 0 0;">
      <a href="${process.env.NEXTAUTH_URL}/dashboard"
         style="background:#1d6b33;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:700;display:inline-block;">
        Ir a mi inscripción
      </a>
    </p>`;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Resultado de inscripción — ${orgNombre}`,
    html: htmlWrapper("Resultado de Inscripción", content),
  });
}
