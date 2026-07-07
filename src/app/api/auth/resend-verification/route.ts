import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { createVerificationToken, buildAuthUrl } from "@/lib/verification";
import { enviarCorreoVerificacion } from "@/lib/email";

const schema = z.object({
  email: z.string().email("Correo inválido"),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`resend-verify:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados intentos." }, { status: 429 });
  }

  try {
    const { email } = schema.parse(await req.json());
    const normalized = email.toLowerCase().trim();

    const ok = NextResponse.json({
      message: "Si el correo está registrado y pendiente de verificación, enviamos un nuevo enlace.",
    });

    const user = await db.user.findUnique({ where: { email: normalized } });
    if (!user || user.emailVerified) return ok;

    const { token } = await createVerificationToken("email-verify", normalized);
    const verifyUrl = buildAuthUrl("/verificar-correo", token);
    enviarCorreoVerificacion(user.name, user.email, verifyUrl).catch(console.error);

    return ok;
  } catch {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }
}
