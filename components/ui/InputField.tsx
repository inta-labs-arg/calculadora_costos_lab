import type { InputHTMLAttributes } from "react";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  suffix?: string;
}

export function InputField({ label, hint, error, suffix, className = "", ...props }: InputFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[13px] font-medium text-inta-gray-700">{label}</span>
      <div className="relative flex items-center">
        <input
          {...props}
          className={`
            w-full min-h-[44px] px-3 py-2.5 border rounded-md text-sm text-inta-gray-800 bg-white
            outline-none transition-colors
            focus:border-inta-blue focus:ring-2 focus:ring-inta-blue/20
            disabled:bg-inta-gray-50
            ${error ? "border-inta-red" : "border-inta-gray-300"}
            ${suffix ? "pr-10" : ""}
            ${className}
          `}
        />
        {suffix && (
          <span className="absolute right-2.5 text-[12px] font-medium text-inta-gray-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <span className="text-xs text-inta-red">{error}</span>}
      {!error && hint && <span className="text-xs text-inta-gray-400">{hint}</span>}
    </label>
  );
}
