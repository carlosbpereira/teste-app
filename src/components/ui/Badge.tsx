import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type BadgeVariant =
  | "gold"
  | "green"
  | "red"
  | "yellow"
  | "blue"
  | "stone"
  | "purple";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  gold: "bg-gold-100 text-gold-700 border border-gold-200",
  green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  red: "bg-red-50 text-red-700 border border-red-200",
  yellow: "bg-amber-50 text-amber-700 border border-amber-200",
  blue: "bg-blue-50 text-blue-700 border border-blue-200",
  stone: "bg-stone-100 text-stone-600 border border-stone-200",
  purple: "bg-purple-50 text-purple-700 border border-purple-200",
};

const sizeClasses = {
  sm: "text-[10px] px-2 py-0.5 font-medium",
  md: "text-xs px-2.5 py-1 font-medium",
};

export function Badge({
  children,
  variant = "stone",
  size = "md",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
}

// Status-specific badge helpers
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    DISPONIVEL: { label: "Disponível", variant: "green" },
    RESERVADO: { label: "Reservado", variant: "yellow" },
    VENDIDO: { label: "Vendido", variant: "stone" },
  };
  const config = map[status] || { label: status, variant: "stone" as BadgeVariant };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function LocalizacaoBadge({ localizacao }: { localizacao: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    DONA: { label: "Com a Dona", variant: "gold" },
    REVENDEDORA: { label: "Com a Revendedora", variant: "purple" },
  };
  const config = map[localizacao] || { label: localizacao, variant: "stone" as BadgeVariant };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function PagamentoBadge({ forma }: { forma: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    PIX: { label: "Pix", variant: "green" },
    DEBITO: { label: "Débito", variant: "blue" },
    CREDITO: { label: "Crédito", variant: "blue" },
    PROMISSORIA: { label: "Promissória", variant: "yellow" },
  };
  const config = map[forma] || { label: forma, variant: "stone" as BadgeVariant };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ParcelaBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    PENDENTE: { label: "Pendente", variant: "yellow" },
    PAGO: { label: "Pago", variant: "green" },
    ATRASADO: { label: "Atrasado", variant: "red" },
  };
  const config = map[status] || { label: status, variant: "stone" as BadgeVariant };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
