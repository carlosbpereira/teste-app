"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Gem,
  ShoppingBag,
  Briefcase,
  CreditCard,
  LogOut,
  Users,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import type { UserRole } from "@/lib/session";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/catalogo", label: "Catálogo", icon: Gem, adminOnly: false },
  { href: "/pdv", label: "PDV", icon: ShoppingBag, adminOnly: false },
  { href: "/consignacao", label: "Maleta", icon: Briefcase, adminOnly: false },
  { href: "/cobrancas", label: "Cobranças", icon: CreditCard, adminOnly: false },
  { href: "/admin/usuarios", label: "Usuários", icon: Users, adminOnly: true },
];

interface BottomNavProps {
  role: UserRole;
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const isAdmin = role === "administrador";

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))]">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          // Destaque especial para PDV (botão central)
          const isPdv = item.href === "/pdv";

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`bottom-nav-${item.label.toLowerCase().replace(/[^a-z]/g, "-")}`}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200",
                "min-w-[56px] relative",
                isPdv && !isActive
                  ? "bg-stone-900 text-white -mt-4 shadow-lg"
                  : "",
                isPdv && isActive
                  ? "gold-gradient text-white -mt-4 shadow-gold"
                  : "",
                !isPdv && isActive
                  ? "text-gold-600"
                  : !isPdv
                  ? "text-stone-400"
                  : ""
              )}
            >
              <item.icon
                className={cn(
                  "transition-all duration-200",
                  isPdv ? "w-6 h-6" : "w-5 h-5",
                  isPdv && isActive ? "text-white" : "",
                  !isPdv && isActive ? "text-gold-500" : "",
                  !isPdv && !isActive ? "text-stone-400" : ""
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium leading-none",
                  isPdv
                    ? "text-white"
                    : isActive
                    ? "text-gold-600"
                    : "text-stone-400"
                )}
              >
                {item.label}
              </span>

              {/* Active dot indicator */}
              {isActive && !isPdv && (
                <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-gold-500" />
              )}
            </Link>
          );
        })}

        {/* Logout button */}
        <form action={logout}>
          <button
            type="submit"
            id="bottom-nav-sair"
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200",
              "min-w-[56px] text-stone-400 hover:text-red-400 active:scale-95"
            )}
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">Sair</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
