import { useState } from "react";
import { Link } from "react-router-dom";
import type { Inversion } from "@/types";

function fmt(n: number) {
  return n.toFixed(2);
}

export default function InversionCard({
  inversion,
  clienteId,
  clienteNombre,
  onNuevaInversion,
  soloLectura,
  textoBoton = "Ver detalles",
}: {
  inversion: Inversion;
  clienteId: string;
  clienteNombre: string;
  onNuevaInversion?: () => void;
  soloLectura?: boolean;
  textoBoton?: string;
}) {
  const [modalAbierto, setModalAbierto] = useState(false);

  const completado =
    inversion.tipoPlan === "CUOTAS"
      ? inversion.cuotas.every((c) => c.pagada)
      : (inversion.montoPagado ?? 0) >= (inversion.montoTotal ?? 0);

  const cuotasPagadas = inversion.cuotas.filter((c) => c.pagada).length;
  const montoInicial = inversion.montoInicial ?? 0;

  const montoTotalPlan =
    inversion.tipoPlan === "CUOTAS"
      ? montoInicial + inversion.cuotas.reduce((acc, c) => acc + c.monto, 0)
      : (inversion.montoTotal ?? 0);

  const montoPagadoTotal =
    inversion.tipoPlan === "CUOTAS"
      ? montoInicial +
        inversion.cuotas
          .filter((c) => c.pagada)
          .reduce((acc, c) => acc + (c.montoPagado ?? c.monto), 0)
      : (inversion.montoPagado ?? 0);

  const porcentaje =
    montoTotalPlan === 0 ? 0 : Math.round((montoPagadoTotal / montoTotalPlan) * 100);

  return (
    <>
      <div className={`border rounded-lg px-4 py-3 ${completado ? "border-green-200" : "border-amber-200"}`}>
        <div className="flex justify-between items-center mb-1">
          <span className="font-semibold text-sm">{clienteNombre}</span>
          <span
            className={`text-xs rounded-full px-2 py-0.5 font-medium ${
              completado ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {completado ? "Completado" : "En Progreso"}
          </span>
        </div>
        <p className="text-sm text-neutral-600">{inversion.descripcion}</p>
        <p className="text-xs text-neutral-400 mb-2">
          {inversion.codigo} ·{" "}
          {inversion.tipoPlan === "CUOTAS"
            ? `Cuotas · ${cuotasPagadas} de ${inversion.cuotas.length} cuotas`
            : `Monto fijo · ${inversion.moneda} ${inversion.montoPagado?.toLocaleString()} de ${inversion.montoTotal?.toLocaleString()}`}
        </p>
        {montoInicial > 0 && (
          <p className="text-xs text-neutral-500">
            Cuota inicial pagada: {inversion.moneda} {fmt(montoInicial)}
          </p>
        )}
        <p className="text-xs text-neutral-500 mb-1">
          Pagado: {inversion.moneda} {fmt(montoPagadoTotal)} de {fmt(montoTotalPlan)} ({porcentaje}%)
        </p>
        <div className="h-2 bg-neutral-200 rounded mb-2">
          <div className="h-2 bg-green-500 rounded" style={{ width: `${porcentaje}%` }} />
        </div>
        <button onClick={() => setModalAbierto(true)} className="text-xs text-blue-600">
          {textoBoton}
        </button>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow max-w-md w-full max-h-[85vh] overflow-y-auto p-4">
            <div className="flex justify-between items-start mb-1">
              <span className="font-semibold">{clienteNombre}</span>
              <span
                className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                  completado ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {completado ? "Completado" : "En Progreso"}
              </span>
            </div>
            <p className="text-sm text-neutral-600">{inversion.descripcion}</p>
            <p className="text-xs text-neutral-400 mb-1">
              {inversion.codigo} ·{" "}
              {inversion.tipoPlan === "CUOTAS"
                ? `Cuotas · ${cuotasPagadas} de ${inversion.cuotas.length} cuotas`
                : `Monto fijo · ${inversion.moneda} ${inversion.montoPagado?.toLocaleString()} de ${inversion.montoTotal?.toLocaleString()}`}
            </p>
            {montoInicial > 0 && (
              <p className="text-xs text-neutral-500">
                Cuota inicial pagada: {inversion.moneda} {fmt(montoInicial)}
              </p>
            )}
            <p className="text-xs text-neutral-500 mb-1">
              Pagado: {inversion.moneda} {fmt(montoPagadoTotal)} de {fmt(montoTotalPlan)} ({porcentaje}%)
            </p>
            <div className="h-2 bg-neutral-200 rounded mb-3">
              <div className="h-2 bg-green-500 rounded" style={{ width: `${porcentaje}%` }} />
            </div>

            {inversion.tipoPlan === "CUOTAS" && (
              <>
                <h4 className="text-xs font-semibold text-neutral-500 mb-2">CUOTAS</h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                  {inversion.cuotas.map((c) => {
                    const saldoCuota = c.monto - (c.ajusteAplicado ?? 0);
                    return (
                      <div
                        key={c.numero}
                        className={`text-center rounded-md border px-2 py-2 text-xs ${
                          c.pagada
                            ? "border-green-300 bg-green-50 text-green-700"
                            : "border-neutral-200 bg-white text-neutral-500"
                        }`}
                      >
                        <p className="font-medium">
                          {c.pagada && "✓ "}Cuota {c.numero}
                        </p>
                        {c.pagada ? (
                          <p>{c.fechaPago}</p>
                        ) : (
                          <p>
                            Pendiente
                            <br />
                            {inversion.moneda} {fmt(saldoCuota)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <h4 className="text-xs font-semibold text-neutral-500 mb-2">DOCUMENTOS Y COMPROBANTES</h4>
            <div className="space-y-1 mb-4">
              {inversion.documentos.map((d) => (
                <div
                  key={d.id}
                  className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between items-center"
                >
                  <span>
                    {d.nombre}
                    <span className="block text-xs text-neutral-400">
                      {d.categoria} · {d.fecha}
                    </span>
                  </span>
                  <a href={d.url} className="text-xs border border-neutral-300 rounded-full px-3 py-1">
                    Ver
                  </a>
                </div>
              ))}
              {inversion.documentos.length === 0 && (
                <p className="text-sm text-neutral-400">Sin documentos aun</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setModalAbierto(false)}
                className="text-sm border border-neutral-300 rounded px-3 py-2"
              >
                Cerrar
              </button>
              {!soloLectura &&
                (onNuevaInversion ? (
                  <button
                    onClick={onNuevaInversion}
                    className="flex-1 min-w-[160px] text-center bg-neutral-900 text-white rounded px-3 py-2 text-sm"
                  >
                    Nueva inversion / solicitud
                  </button>
                ) : (
                  <Link
                    to="/asesor/cliente-existente"
                    state={{ clienteId }}
                    className="flex-1 min-w-[160px] text-center bg-neutral-900 text-white rounded px-3 py-2 text-sm"
                  >
                    Nueva inversion / solicitud
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
