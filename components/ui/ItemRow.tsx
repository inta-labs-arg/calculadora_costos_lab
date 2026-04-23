import type { ReactNode } from "react";

interface ItemRowProps {
  children: ReactNode;
  striped?: boolean;
  index?: number;
}

export function ItemRow({ children, striped = true, index = 0 }: ItemRowProps) {
  return (
    <div className={`
      flex items-center gap-3 px-5 py-3 border-b border-inta-gray-100 last:border-b-0
      ${striped && index % 2 !== 0 ? "bg-inta-gray-50" : "bg-white"}
    `}>
      {children}
    </div>
  );
}
