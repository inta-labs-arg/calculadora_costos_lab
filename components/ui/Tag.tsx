import type { ReactNode } from "react";

interface TagProps {
  children: ReactNode;
  color?: "green" | "blue" | "orange" | "gray";
}

const colorClasses = {
  green:  "bg-inta-green/10 text-inta-green",
  blue:   "bg-inta-blue/10 text-inta-blue",
  orange: "bg-inta-orange/10 text-inta-orange",
  gray:   "bg-inta-gray-400/10 text-inta-gray-400",
};

export function Tag({ children, color = "gray" }: TagProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${colorClasses[color]}`}>
      {children}
    </span>
  );
}
