import "server-only";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import type { UserRole } from "@/lib/session";

export interface AuthContext {
  role: UserRole;
  userId: string;
}

/**
 * Lê o contexto de autenticação (role + userId) a partir dos cookies de sessão.
 * Retorna null se o usuário não estiver autenticado.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const { role, userId } = await getSessionUser();
  if (!role || !userId) return null;
  return { role, userId };
}

/**
 * Guard que exige role = "administrador".
 * Retorna um NextResponse 403 se não for admin — use assim:
 *
 * const guard = await requireAdmin();
 * if (guard instanceof NextResponse) return guard;
 * // guard é AuthContext aqui
 */
export async function requireAdmin(): Promise<AuthContext | NextResponse> {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (ctx.role !== "administrador") {
    return NextResponse.json(
      { error: "Acesso negado. Apenas administradores podem realizar esta ação." },
      { status: 403 }
    );
  }
  return ctx;
}

/**
 * Guard que exige qualquer sessão válida.
 * Retorna 401 se não autenticado.
 */
export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  return ctx;
}

/** Verifica se o contexto é um NextResponse (resposta de erro do guard) */
export function isGuardError(
  result: AuthContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
