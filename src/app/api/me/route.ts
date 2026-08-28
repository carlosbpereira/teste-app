import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";

/**
 * GET /api/me
 * Retorna role e userId da sessão atual.
 * Usado pelo frontend para scoping visual (ocultar botões, seções, etc.)
 */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  return NextResponse.json({ role: ctx.role, userId: ctx.userId });
}
