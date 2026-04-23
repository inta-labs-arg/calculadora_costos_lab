import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 px-5 text-center">
      <div className="w-12 h-12 rounded-xl bg-inta-gray-100 flex items-center justify-center mb-1">
        {icon}
      </div>
      <p className="font-semibold text-sm text-inta-gray-700">{title}</p>
      {subtitle && <p className="text-[13px] text-inta-gray-400 max-w-[240px]">{subtitle}</p>}
    </div>
  );
}
