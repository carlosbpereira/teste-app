"use client";

import { useActionState, useState } from "react";
import { createUser, type AuthState } from "@/app/actions/auth";
import {
  UserPlus,
  Users,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useEffect } from "react";

interface SupabaseUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export default function GestaoUsuariosPage() {
  const [state, action, isPending] = useActionState<AuthState, FormData>(
    createUser,
    null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [users, setUsers] = useState<SupabaseUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const fetchUsers = () => {
    setLoadingUsers(true);
    fetch("/api/admin/usuarios")
      .then((r) => r.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(console.error)
      .finally(() => setLoadingUsers(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Recarrega a lista após criar usuário com sucesso
  useEffect(() => {
    if (state?.success) {
      fetchUsers();
    }
  }, [state?.success]);

  const roleLabel = (role: string) =>
    role === "administrador" ? "Administrador" : "Revendedor";

  const roleColors = (role: string) =>
    role === "administrador"
      ? "bg-gold-500/15 text-gold-600 border border-gold-500/30"
      : "bg-stone-100 text-stone-600 border border-stone-200";

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl gold-gradient flex items-center justify-center shadow-gold">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-800">
            Gestão de Usuários
          </h1>
          <p className="text-sm text-stone-400">
            Apenas administradores têm acesso a esta tela
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Criar novo usuário ─── */}
        <section className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <UserPlus className="w-5 h-5 text-gold-600" />
            <h2 className="font-semibold text-stone-800">Criar Novo Usuário</h2>
          </div>

          {/* Success */}
          {state?.success && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {state.success}
            </div>
          )}

          {/* Error */}
          {state?.error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {state.error}
            </div>
          )}

          <form action={action} className="space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="text-xs font-semibold text-stone-500 uppercase tracking-wider"
              >
                Nome completo
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Nome do usuário"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-stone-800 placeholder-stone-400
                    bg-stone-50 border border-stone-200
                    focus:outline-none focus:border-gold-400 focus:bg-white
                    transition-all duration-200"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-semibold text-stone-500 uppercase tracking-wider"
              >
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="usuario@email.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-stone-800 placeholder-stone-400
                    bg-stone-50 border border-stone-200
                    focus:outline-none focus:border-gold-400 focus:bg-white
                    transition-all duration-200"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-stone-500 uppercase tracking-wider"
              >
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm text-stone-800 placeholder-stone-400
                    bg-stone-50 border border-stone-200
                    focus:outline-none focus:border-gold-400 focus:bg-white
                    transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Perfil */}
            <div className="space-y-1.5">
              <label
                htmlFor="role"
                className="text-xs font-semibold text-stone-500 uppercase tracking-wider"
              >
                Perfil de acesso
              </label>
              <select
                id="role"
                name="role"
                required
                defaultValue="revendedor"
                className="w-full px-4 py-3 rounded-xl text-sm text-stone-800
                  bg-stone-50 border border-stone-200
                  focus:outline-none focus:border-gold-400 focus:bg-white
                  transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="revendedor">Revendedor — acesso operacional</option>
                <option value="administrador">Administrador — acesso total</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isPending}
              id="btn-criar-usuario"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 mt-2 rounded-xl
                font-semibold text-sm text-stone-900
                transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                hover:shadow-gold-lg active:scale-[0.98]"
              style={{
                background:
                  "linear-gradient(135deg, #c9a84c 0%, #e8d5a3 50%, #c9a84c 100%)",
                boxShadow: isPending ? "none" : "0 4px 24px rgba(201,168,76,0.35)",
              }}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {isPending ? "Criando usuário..." : "Criar usuário"}
            </button>
          </form>
        </section>

        {/* ─── Lista de usuários ─── */}
        <section className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-stone-500" />
              <h2 className="font-semibold text-stone-800">
                Usuários Cadastrados
              </h2>
            </div>
            <button
              onClick={fetchUsers}
              title="Recarregar lista"
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gold-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-sm">
              Nenhum usuário encontrado.
            </div>
          ) : (
            <ul className="space-y-2">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-stone-100 hover:border-stone-200 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                    {user.role === "administrador" ? (
                      <ShieldCheck className="w-4 h-4 text-gold-600" />
                    ) : (
                      <Shield className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">
                      {user.full_name || "—"}
                    </p>
                    <p className="text-xs text-stone-400 truncate">{user.email}</p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${roleColors(user.role)}`}
                  >
                    {roleLabel(user.role)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
