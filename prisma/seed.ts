// Script para crear el primer usuario administrador
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Creando usuario administrador...");

  const hashedPassword = await bcrypt.hash("Admin1234!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@municipalidadcoyhaique.cl" },
    update: {},
    create: {
      email: "admin@municipalidadcoyhaique.cl",
      password: hashedPassword,
      name: "Administrador Sistema",
      rut: "00.000.000-0",
      role: "SUPER_ADMIN",
    },
  });

  console.log("✅ Administrador creado:");
  console.log(`   Email: ${admin.email}`);
  console.log(`   Contraseña: Admin1234!`);
  console.log("");
  console.log("⚠️  IMPORTANTE: Cambia la contraseña del administrador después del primer acceso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
