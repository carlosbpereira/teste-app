import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "gold" | "dark";
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = "default",
  className,
}: KpiCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
      ? "text-red-500"
      : "text-stone-400";

  const cardClasses = {
    default:
      "bg-white border border-stone-100 shadow-sm hover:shadow-md hover:border-gold-200",
    gold: "gold-gradient text-white shadow-gold hover:shadow-gold-lg",
    dark: "bg-stone-900 text-white border border-stone-700 hover:border-gold-600",
  };

  const iconBgClasses = {
    default: "bg-gold-50 text-gold-600",
    gold: "bg-white/20 text-white",
    dark: "bg-stone-800 text-gold-400",
  };

  const titleClasses = {
    default: "text-stone-500",
    gold: "text-white/80",
    dark: "text-stone-400",
  };

  const valueClasses = {
    default: "text-stone-900",
    gold: "text-white",
    dark: "text-white",
  };

  return (
    <div
      className={cn(
        "rounded-2xl p-5 transition-all duration-200 cursor-default",
        cardClasses[variant],
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            iconBgClasses[variant]
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        {trend && trendValue && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", variant === "default" ? trendColor : "text-white/80")}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      <p className={cn("text-xs font-medium uppercase tracking-wide mb-1", titleClasses[variant])}>
        {title}
      </p>
      <p className={cn("text-2xl font-bold leading-tight", valueClasses[variant])}>{value}</p>
      {subtitle && (
        <p className={cn("text-xs mt-1", titleClasses[variant])}>{subtitle}</p>
      )}
    </div>
  );
}
