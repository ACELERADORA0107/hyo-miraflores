interface ManualItem {
  titulo: string;
  descripcion: string;
}

export default function ManualModal({
  titulo,
  items,
  onClose,
}: {
  titulo: string;
  items: ManualItem[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow p-4 w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">{titulo}</h2>
          <button onClick={onClose} className="text-sm text-neutral-500">
            Cerrar
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="border border-neutral-200 rounded px-3 py-2">
              <p className="text-sm font-medium mb-1">{item.titulo}</p>
              <p className="text-xs text-neutral-500">{item.descripcion}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
