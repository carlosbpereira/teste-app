"use client";

import { useActionState, useState } from "react";
import { login, type AuthState } from "@/app/actions/auth";
import { Crown, Mail, Lock, LogIn, Eye, EyeOff, Loader2 } from "lucide-react";
import { Suspense } from "react";

function LoginForm() {
  const [state, action, isPending] = useActionState<AuthState, FormData>(
    login,
    null
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-dvh flex items-center justify-center relative overflow-hidden bg-stone-950">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gold-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gold-500/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold-500/3 blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#c9a84c 1px, transparent 1px), linear-gradient(90deg, #c9a84c 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md mx-4 animate-fade-in">
        <div
          className="rounded-3xl p-8 border border-stone-800"
          style={{
            background:
              "linear-gradient(145deg, rgba(28,25,23,0.95) 0%, rgba(21,18,16,0.98) 100%)",
            boxShadow:
              "0 0 0 1px rgba(201,168,76,0.08), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(201,168,76,0.05)",
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-gold"
              style={{
                background:
                  "linear-gradient(135deg, #c9a84c 0%, #e8d5a3 50%, #c9a84c 100%)",
              }}
            >
              <Crown className="w-7 h-7 text-stone-900" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Labela Semijoias
            </h1>
            <p className="text-stone-400 text-sm mt-1">
              Sistema de Gestão · ERP & PDV
            </p>
          </div>



          {/* Error */}
          {state?.error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {state.error}
            </div>
          )}

          {/* Form */}
          <form action={action} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-semibold text-stone-400 uppercase tracking-wider"
              >
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-stone-600
                    bg-stone-900/80 border border-stone-700/50
                    focus:outline-none focus:border-gold-500/60 focus:bg-stone-900
                    transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-stone-400 uppercase tracking-wider"
              >
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm text-white placeholder-stone-600
                    bg-stone-900/80 border border-stone-700/50
                    focus:outline-none focus:border-gold-500/60 focus:bg-stone-900
                    transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
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

            {/* Submit button */}
            <button
              type="submit"
              disabled={isPending}
              id="btn-login"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 mt-2 rounded-xl
                font-semibold text-sm text-stone-900
                transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                hover:shadow-gold-lg active:scale-[0.98]"
              style={{
                background:
                  "linear-gradient(135deg, #c9a84c 0%, #e8d5a3 50%, #c9a84c 100%)",
                boxShadow: isPending
                  ? "none"
                  : "0 4px 24px rgba(201,168,76,0.35)",
              }}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isPending ? "Entrando..." : "Entrar"}
            </button>
          </form>


        </div>

        {/* Footer */}
        <p className="text-center text-stone-700 text-xs mt-6">
          © {new Date().getFullYear()} Labela Semijoias · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
