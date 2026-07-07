import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { response } = await requireSuperAdmin(req);
  if (response) return response;

  const orgs = await db.organization.findMany({
    select: { id: true, name: true, rut: true, legalRepId: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ orgs });
}
