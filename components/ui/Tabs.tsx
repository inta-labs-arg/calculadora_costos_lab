interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex overflow-x-auto scrollbar-hide border-b border-inta-gray-200 bg-inta-gray-50">
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex-none flex items-center gap-1.5 px-4 py-2.5
              text-[13px] whitespace-nowrap border-b-2 transition-all duration-150
              ${isActive
                ? "border-inta-blue text-inta-blue font-semibold"
                : "border-transparent text-inta-gray-500 hover:text-inta-gray-700"}
            `}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`
                text-[10px] font-bold px-1.5 py-0.5 rounded-full
                ${isActive ? "bg-inta-blue text-white" : "bg-inta-gray-200 text-inta-gray-600"}
              `}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
