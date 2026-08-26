import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-stone-700 mb-2">{title}</h3>
      {description && <p className="text-sm text-stone-400 max-w-xs mb-6">{description}</p>}
      {action && action}
    </div>
  );
}
