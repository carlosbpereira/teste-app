import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

/**
 * Layout server-side para /admin/usuarios.
 * Redireciona para "/" se o usuário não for administrador.
 */
export default async function AdminUsuariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await getSessionUser();

  if (role !== "administrador") {
    redirect("/");
  }

  return <>{children}</>;
}
