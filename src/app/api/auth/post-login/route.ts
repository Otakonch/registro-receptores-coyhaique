import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, getPostLoginPath } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    redirect("/login");
  }

  redirect(
    getPostLoginPath({
      needsRegistration: user.needsRegistration,
      role: user.role,
      id: user.id,
      rut: user.rut,
    })
  );
}
