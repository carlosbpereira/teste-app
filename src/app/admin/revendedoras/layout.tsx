import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";

/**
 * Layout server-side para /admin/revendedoras.
 * Redireciona para "/" se o usuário não for administrador.
 */
export default async function AdminRevendedorasLayout({
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
