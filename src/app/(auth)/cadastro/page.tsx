"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Crown, Lock } from "lucide-react";

/**
 * A rota /cadastro é bloqueada pelo middleware para todos os usuários:
 * - Não autenticados → redirect para /login (middleware)
 * - Autenticados sem role admin → redirect para / (middleware)
 * - Autenticados com role admin → redirect para /admin/usuarios (middleware)
 *
 * Esta página serve apenas como fallback visual por segurança.
 */
export default function CadastroPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-stone-950">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #c9a84c 0%, #e8d5a3 50%, #c9a84c 100%)",
          }}
        >
          <Crown className="w-7 h-7 text-stone-900" />
        </div>
        <Lock className="w-8 h-8 text-stone-500" />
        <div>
          <h1 className="text-white font-bold text-lg">Acesso Restrito</h1>
          <p className="text-stone-400 text-sm mt-1">
            O cadastro de novos usuários é realizado internamente pelos administradores.
          </p>
        </div>
      </div>
    </div>
  );
}
