import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-[3px]",
};

export function LoadingSpinner({ size = "md", className, label }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "rounded-full border-stone-200 border-t-gold-500 animate-spin",
          sizeClasses[size]
        )}
        role="status"
        aria-label={label || "Carregando..."}
      />
      {label && <p className="text-sm text-stone-500">{label}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-champagne-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full border-4 border-gold-100 border-t-gold-500 animate-spin" />
        <div className="flex flex-col items-center">
          <span className="font-semibold text-stone-700">Labela Semijoias</span>
          <span className="text-sm text-stone-400">Carregando...</span>
        </div>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-stone-100 animate-pulse">
      <div className="aspect-square bg-stone-100" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-stone-100 rounded w-3/4" />
        <div className="h-3 bg-stone-100 rounded w-1/2" />
        <div className="h-4 bg-stone-100 rounded w-1/3 mt-2" />
      </div>
    </div>
  );
}
