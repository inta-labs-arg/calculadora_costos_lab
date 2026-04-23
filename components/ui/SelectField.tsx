import type { SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  options: SelectOption[];
}

export function SelectField({ label, hint, options, className = "", ...props }: SelectFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[13px] font-medium text-inta-gray-700">{label}</span>
      <select
        {...props}
        className={`
          min-h-[44px] px-3 py-2.5 border border-inta-gray-300 rounded-md text-sm
          text-inta-gray-800 bg-white appearance-none
          focus:border-inta-blue focus:ring-2 focus:ring-inta-blue/20 outline-none
          bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23868E96' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")]
          bg-no-repeat bg-[right_12px_center] pr-8
          ${className}
        `}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <span className="text-xs text-inta-gray-400">{hint}</span>}
    </label>
  );
}
