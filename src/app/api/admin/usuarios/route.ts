import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin, isGuardError } from "@/lib/auth-guard";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// GET /api/admin/usuarios — lista todos os usuários
// Protegido: exige role=administrador (HTTP 403 caso contrário)
export async function GET() {
  // ── Guard ──────────────────────────────────────────────
  const guard = await requireAdmin();
  if (isGuardError(guard)) return guard;
  // ──────────────────────────────────────────────────────

  try {
    const adminSupabase = getAdminSupabase();

    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });

    if (error) {
      return NextResponse.json(
        { error: "Erro ao listar usuários." },
        { status: 500 }
      );
    }

    const users = data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      full_name: u.user_metadata?.full_name ?? "",
      role: u.user_metadata?.role ?? "revendedor",
      phone: u.user_metadata?.phone ?? "",
      created_at: u.created_at,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Erro na API de usuários:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
