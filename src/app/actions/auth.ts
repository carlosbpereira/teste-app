"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createSession, deleteSession } from "@/lib/session";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Variáveis de ambiente do Supabase não configuradas.");
  }
  return createClient(url, key);
}

export type AuthState = {
  error?: string;
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

  const supabase = getAdminSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.session) {
    return { error: "E-mail ou senha inválidos." };
  }

  await createSession(data.session.access_token, data.session.refresh_token);
  redirect("/");
}

// ─────────────────────────────────────────────
// SIGNUP
// ─────────────────────────────────────────────
export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!name || !email || !password || !confirmPassword) {
    return { error: "Preencha todos os campos." };
  }

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  if (password.length < 6) {
    return { error: "A senha deve ter ao menos 6 caracteres." };
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { full_name: name.trim() },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Este e-mail já está cadastrado." };
    }
    return { error: "Erro ao criar conta. Tente novamente." };
  }

  // If email confirmation is enabled on Supabase, session may not exist yet
  if (data.session) {
    await createSession(data.session.access_token, data.session.refresh_token);
    redirect("/");
  }

  // Email confirmation required — redirect to login with a message
  redirect("/login?registered=1");
}

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
