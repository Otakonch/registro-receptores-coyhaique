import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const CUID_REGEX = /^c[a-z0-9]{24}$/i;
const GENERIC_NOT_FOUND = {
  valid: false,
  message: "Certificado no encontrado o no vigente",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// GET /api/verificar?id=<registrationId>
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`verificar:${ip}`, 30, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Demasiadas consultas. Intenta nuevamente en unos minutos." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id")?.trim() ?? "";

  if (!id || id.length < 20 || !CUID_REGEX.test(id)) {
    await sleep(300);
    return NextResponse.json(GENERIC_NOT_FOUND, { status: 404 });
  }

  try {
    const registration = await db.registration.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            name: true,
            rut: true,
            type: true,
            commune: true,
          },
        },
      },
    });

    if (!registration || registration.status !== "APPROVED") {
      await sleep(300);
      return NextResponse.json(GENERIC_NOT_FOUND, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      organization: {
        name: registration.organization.name,
        rut: registration.organization.rut,
        type: registration.organization.type,
        commune: registration.organization.commune,
      },
      approvedAt: registration.approvedAt,
    });
  } catch (error) {
    console.error("Error al verificar certificado:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
