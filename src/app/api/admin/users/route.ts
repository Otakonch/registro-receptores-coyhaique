import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createAdminLog } from "@/lib/adminLog";

export async function GET(req: NextRequest) {
  const { response } = await requireSuperAdmin(req);
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const q     = searchParams.get("q") ?? "";
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

  const where: any = {};
  if (q) {
    where.OR = [
      { name:  { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { rut:   { contains: q, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id:        true,
        name:      true,
        email:     true,
        rut:       true,
        phone:     true,
        role:      true,
        createdAt: true,
        organizations: {
          select: { id: true, name: true },
          take: 1,
        },
      },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      skip:  (page - 1) * limit,
      take:  limit,
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
}

const createSchema = z.object({
  name:     z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email:    z.string().email("Correo inválido"),
  rut:      z.string().optional(),
  phone:    z.string().optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional(),
  role:     z.enum(["USER", "ADMIN"]).optional().default("USER"),
});

export async function POST(req: NextRequest) {
  const { user: admin, response } = await requireSuperAdmin(req);
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return NextResponse.json({ error: firstError || "Datos inválidos" }, { status: 400 });
  }

  const { name, email, rut, phone, password, role } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un usuario con ese correo" }, { status: 409 });
  }

  const hashed = password ? await bcrypt.hash(password, 12) : null;
  const user = await db.user.create({
    data: {
      name,
      email,
      rut:      rut?.trim() || `SIN-RUT-${Date.now()}`,
      phone:    phone?.trim() || null,
      ...(hashed ? { password: hashed } : {}),
      role,
      emailVerified: new Date(),
    },
    select: {
      id:        true,
      name:      true,
      email:     true,
      rut:       true,
      phone:     true,
      role:      true,
      createdAt: true,
    },
  });

  await createAdminLog({
    adminId:        admin!.id,
    adminName:      admin!.name ?? "Admin",
    adminEmail:     admin!.email,
    action:         "MODIFICADA",
    orgName:        name,
    orgRut:         null,
    registrationId: null,
    details:        `Usuario creado: ${email} con rol ${role}`,
  });

  return NextResponse.json({ user }, { status: 201 });
}
