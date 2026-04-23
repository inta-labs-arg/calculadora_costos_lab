import type { ButtonHTMLAttributes, ReactNode } from "react";

type BtnVariant = "primary" | "outline" | "ghost" | "danger" | "success";
type BtnSize = "sm" | "md";

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  children: ReactNode;
}

const variantClasses: Record<BtnVariant, string> = {
  primary: "bg-inta-blue text-white border-inta-blue hover:bg-inta-blue-dark",
  outline: "bg-white text-inta-blue border-inta-blue-mid hover:bg-inta-blue-light",
  ghost:   "bg-transparent text-inta-gray-600 border-transparent hover:bg-inta-gray-100",
  danger:  "bg-inta-red-light text-inta-red border-inta-red-light hover:opacity-90",
  success: "bg-inta-green-light text-inta-green border-inta-green-light hover:opacity-90",
};

const sizeClasses: Record<BtnSize, string> = {
  sm: "px-3.5 py-2 text-[13px]",
  md: "px-5 py-3 text-sm",
};

export function Btn({ variant = "primary", size = "md", className = "", disabled, children, ...props }: BtnProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
