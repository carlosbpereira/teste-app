import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getSessionUser } from "@/lib/session";

/**
 * GET /api/me
 * Retorna role, userId, name e phone da sessão atual.
 * Usado pelo frontend para scoping visual e pré-preenchimento de formulários.
 */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const { name, phone } = await getSessionUser();
  return NextResponse.json({
    role: ctx.role,
    userId: ctx.userId,
    name: name ?? "",
    phone: phone ?? "",
  });
}
