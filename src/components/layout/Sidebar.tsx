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
  ChevronLeft,
  ChevronRight,
  Crown,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/actions/auth";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Visão geral",
  },
  {
    href: "/catalogo",
    label: "Catálogo",
    icon: Gem,
    description: "Estoque e produtos",
  },
  {
    href: "/pdv",
    label: "PDV",
    icon: ShoppingBag,
    description: "Nova venda",
  },
  {
    href: "/consignacao",
    label: "Consignação",
    icon: Briefcase,
    description: "Maleta revendedora",
  },
  {
    href: "/cobrancas",
    label: "Cobranças",
    icon: CreditCard,
    description: "Promissórias",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen sticky top-0",
        "bg-stone-900 border-r border-stone-800",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center p-4 border-b border-stone-800", collapsed ? "justify-center" : "gap-3 px-5")}>
        <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center flex-shrink-0 shadow-gold">
          <Crown className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-white text-sm leading-tight">Labela</p>
            <p className="text-gold-400 text-xs font-medium">Semijoias</p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
                "group relative",
                isActive
                  ? "bg-gold-500/15 text-gold-400 border border-gold-500/25"
                  : "text-stone-400 hover:text-white hover:bg-stone-800",
                collapsed ? "justify-center" : ""
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  isActive ? "text-gold-400" : "text-stone-400 group-hover:text-white"
                )}
              />
              {!collapsed && (
                <div>
                  <p className="text-sm font-medium leading-tight">{item.label}</p>
                  <p
                    className={cn(
                      "text-[10px] leading-tight",
                      isActive ? "text-gold-500/70" : "text-stone-500"
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              )}
              {isActive && (
                <div className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-gold-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout + Collapse */}
      <div className="p-3 border-t border-stone-800 space-y-1">
        {/* Logout button */}
        <form action={logout}>
          <button
            type="submit"
            title={collapsed ? "Sair" : undefined}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-xl",
              "text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition-colors",
              collapsed ? "justify-center" : ""
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="text-xs font-medium">Sair</span>}
          </button>
        </form>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-stone-400",
            "hover:text-white hover:bg-stone-800 transition-colors",
            collapsed ? "justify-center" : ""
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-medium">Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
