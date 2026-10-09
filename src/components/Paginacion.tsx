export default function Paginacion({
  paginaActual,
  totalPaginas,
  onCambiar,
  totalItems,
  tamanoPagina,
  etiqueta = "elementos",
}: {
  paginaActual: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
  totalItems: number;
  tamanoPagina: number;
  etiqueta?: string;
}) {
  return (
    <div className="flex justify-between items-center mt-2 text-xs text-neutral-500">
      <span>
        Mostrando {totalItems === 0 ? 0 : (paginaActual - 1) * tamanoPagina + 1} a{" "}
        {Math.min(paginaActual * tamanoPagina, totalItems)} de {totalItems} {etiqueta}
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={paginaActual <= 1}
          onClick={() => onCambiar(paginaActual - 1)}
          className="disabled:opacity-30"
        >
          ‹
        </button>
        <span>
          Pagina {paginaActual} de {totalPaginas}
        </span>
        <button
          disabled={paginaActual >= totalPaginas}
          onClick={() => onCambiar(paginaActual + 1)}
          className="disabled:opacity-30"
        >
          ›
        </button>
      </div>
    </div>
  );
}
