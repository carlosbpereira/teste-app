"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createSession, deleteSession, UserRole } from "@/lib/session";
import { getSession } from "@/lib/session";

// ─────────────────────────────────────────────
// Supabase — cliente anon (login público)
// ─────────────────────────────────────────────
function getAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Variáveis de ambiente do Supabase não configuradas.");
  }
  return createClient(url, key);
}

// ─────────────────────────────────────────────
// Supabase — cliente admin (service role)
// ─────────────────────────────────────────────
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione ao .env."
    );
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type AuthState = {
  error?: string;
  success?: string;
} | null;

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  const supabase = getAnonSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.session) {
    return { error: "E-mail ou senha inválidos." };
  }

  // Extrai o role dos metadados do usuário
  const rawRole = data.user?.user_metadata?.role as string | undefined;
  const role: UserRole =
    rawRole === "administrador" ? "administrador" : "revendedor";

  await createSession(
    data.session.access_token,
    data.session.refresh_token,
    role,
    data.user.id   // ← userId do Supabase Auth
  );
  redirect("/");
}

// ─────────────────────────────────────────────
// LOGOUT — invalida sessão no Supabase + limpa cookies
// ─────────────────────────────────────────────
export async function logout(): Promise<void> {
  const { accessToken } = await getSession();

  // Invalida a sessão no Supabase usando o token atual
  if (accessToken) {
    try {
      const supabase = getAnonSupabase();
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: "", // não necessário para signOut
      });
      await supabase.auth.signOut();
    } catch {
      // Mesmo com erro no Supabase, destruímos o cookie local
    }
  }

  await deleteSession();
  redirect("/login");
}

// ─────────────────────────────────────────────
// CREATE USER — apenas para administradores
// Usa service role key para criar sem e-mail de confirmação
// ─────────────────────────────────────────────
export async function createUser(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!name || !email || !password || !role) {
    return { error: "Preencha todos os campos." };
  }

  if (!["administrador", "revendedor"].includes(role)) {
    return { error: "Perfil inválido." };
  }

  if (password.length < 6) {
    return { error: "A senha deve ter ao menos 6 caracteres." };
  }

  const adminSupabase = getAdminSupabase();

  const { error } = await adminSupabase.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true, // sem necessidade de confirmação por e-mail
    user_metadata: {
      full_name: name.trim(),
      role,
    },
  });

  if (error) {
    if (error.message.includes("already registered") || error.message.includes("already exists")) {
      return { error: "Este e-mail já está cadastrado." };
    }
    return { error: `Erro ao criar usuário: ${error.message}` };
  }

  return { success: `Usuário "${name}" criado com sucesso!` };
}
