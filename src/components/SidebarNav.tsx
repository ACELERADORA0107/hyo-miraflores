interface SidebarItem {
  key: string;
  label: string;
  badge?: number;
  group?: string;
}

export default function SidebarNav({
  items,
  activo,
  onSelect,
}: {
  items: SidebarItem[];
  activo: string;
  onSelect: (key: string) => void;
}) {
  let grupoAnterior: string | undefined;

  return (
    <nav className="w-48 shrink-0 bg-white border-r border-neutral-200 min-h-[calc(100vh-57px)] py-3">
      {items.map((item) => {
        const mostrarEncabezado = !!item.group && item.group !== grupoAnterior;
        grupoAnterior = item.group;
        return (
          <div key={item.key}>
            {mostrarEncabezado && (
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                {item.group}
              </p>
            )}
            <button
              onClick={() => onSelect(item.key)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between ${
                activo === item.key
                  ? "bg-neutral-900 text-white font-medium"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              <span>{item.label}</span>
              {!!item.badge && (
                <span
                  className={`text-xs rounded-full px-1.5 ${
                    activo === item.key ? "bg-white/20" : "bg-neutral-200"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
