"use client";

import { usePathname } from "next/navigation";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/catalogo": "Catálogo & Estoque",
  "/pdv": "Nova Venda",
  "/consignacao": "Consignação",
  "/cobrancas": "Cobranças",
};

export function Header() {
  const pathname = usePathname();

  const title = Object.entries(pageTitles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => pathname === key || pathname.startsWith(key + "/"))?.[1] || "Labela";

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-stone-100">
      <div className="flex items-center gap-3 px-4 h-14">
        {/* Logo mark */}
        <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center shadow-sm flex-shrink-0">
          <Crown className="w-4 h-4 text-white" />
        </div>

        <div>
          <p className="text-[10px] font-medium text-gold-600 uppercase tracking-wider leading-none">
            Labela Semijoias
          </p>
          <p className="text-sm font-bold text-stone-800 leading-tight">{title}</p>
        </div>
      </div>
    </header>
  );
}
