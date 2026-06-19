import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSuperAdmin } from "@/lib/roles";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isSuperAdmin((session.user as any).role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const orgs = await db.organization.findMany({
    select: { id: true, name: true, rut: true, legalRepId: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ orgs });
}
