import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import Topbar from "@/components/Topbar";
import SidebarNav from "@/components/SidebarNav";
import {
  documentosDeCliente,
  movimientosDeCliente,
  inversionesConTitulacion,
} from "@/lib/clienteHelpers";
import { PASOS_TITULACION, labelProcesoTitulacion } from "@/lib/titulacion";
import { LABEL_ESTADO_GESTION, categoriaGestion } from "@/lib/gestiones";
import { useRedirectIfUnauthorized } from "@/lib/useRedirectIfUnauthorized";

type Seccion = "cliente" | "solicitudes" | "documentos";

function diasDesde(fecha: string) {
  const ms = Date.now() - new Date(fecha).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default function PerfilCliente() {
  const sesion = useAppStore((s) => s.sesion);
  const clientes = useAppStore((s) => s.clientes);
  const gestiones = useAppStore((s) => s.gestiones);
  const canjearBono = useAppStore((s) => s.canjearBono);
  const [seccion, setSeccion] = useState<Seccion>("cliente");

  const cliente = clientes.find((c) => c.id === sesion?.id);
  const autorizado = !!sesion && sesion.rol === "cliente" && !!cliente;
  useRedirectIfUnauthorized(autorizado);

  if (!autorizado || !cliente) {
    return null;
  }

  const documentosCliente = documentosDeCliente(cliente);
  const movimientosCliente = movimientosDeCliente(cliente);
  const misGestiones = gestiones
    .filter((g) => g.clienteId === cliente.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ultimaGestion = misGestiones[0] ?? null;

  function handleCanjear(bonoId: string, etiqueta: string) {
    if (!cliente) return;
    if (confirm(`Estas seguro que deseas canjear "${etiqueta}"? Esta accion no se puede deshacer.`)) {
      canjearBono(cliente.id, bonoId);
      alert("Solicitud de canje enviada al asesor.");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <Topbar titulo={`Cliente - ${cliente.codigo}`} />

      <div className="flex">
        <SidebarNav
          items={[
            { key: "cliente", label: "Cliente" },
            { key: "solicitudes", label: "Solicitudes" },
            { key: "documentos", label: "Documentos", badge: documentosCliente.length },
          ]}
          activo={seccion}
          onSelect={(key) => setSeccion(key as Seccion)}
        />

        <div className="flex-1 p-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {seccion === "cliente" && (
              <section className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold mb-3">Informacion</h2>

                {ultimaGestion && (
                  <div
                    className={`text-xs rounded px-3 py-2 mb-4 ${
                      ultimaGestion.estado === "ENVIADO_A_ADMIN_FK"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : ultimaGestion.estado === "PENDIENTE_APROBACION"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {ultimaGestion.estado === "ENVIADO_A_ADMIN_FK"
                      ? "✅ Tu informacion fue enviada correctamente a Administracion FK"
                      : ultimaGestion.estado === "PENDIENTE_APROBACION"
                        ? "Tu informacion esta en revision antes de enviarse a Administracion FK"
                        : "Tu asesor esta corrigiendo un detalle antes de reenviar tu informacion"}
                  </div>
                )}

                <div className="text-sm grid grid-cols-2 gap-y-1 mb-4">
                  <span className="text-neutral-500">Nombres</span>
                  <span>{cliente.nombres}</span>
                  <span className="text-neutral-500">DNI</span>
                  <span>{cliente.dni}</span>
                  <span className="text-neutral-500">Categoria</span>
                  <span>{cliente.categoria}</span>
                </div>

                {cliente.copropietarios.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-neutral-600 mb-2">Copropietario(s)</h3>
                    <div className="space-y-1 mb-4">
                      {cliente.copropietarios.map((cp) => (
                        <div
                          key={cp.id}
                          className="text-sm border border-neutral-200 rounded px-3 py-2"
                        >
                          {cp.nombres} - DNI: {cp.dni}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <h3 className="text-sm font-semibold text-neutral-600 mb-2">Propiedad</h3>
                <div className="space-y-1 mb-4">
                  {cliente.propiedades.map((p) => (
                    <div
                      key={p.id}
                      className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between items-center"
                    >
                      <span>
                        {p.sede} - {p.etapa} - MZ {p.manzana} LOTE {p.lote}{" "}
                        {p.m2 ? `(${p.m2} m2)` : ""}
                      </span>
                      <button
                        onClick={() =>
                          alert(
                            p.fotoUbicacion
                              ? "Mostraria la foto de ubicacion del lote"
                              : "El asesor aun no adjunto la foto de ubicacion",
                          )
                        }
                        className="text-xs text-blue-600 shrink-0 ml-2"
                      >
                        Ver ubicacion
                      </button>
                    </div>
                  ))}
                  {cliente.propiedades.length === 0 && (
                    <p className="text-sm text-neutral-400">Sin propiedad registrada</p>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-neutral-600 mb-2">Movimientos de pago</h3>
                <div className="space-y-1 mb-4">
                  {movimientosCliente.map((m) => (
                    <div
                      key={m.id}
                      className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between items-center"
                    >
                      <span>
                        {m.descripcion} - {m.fecha}
                      </span>
                      <span className="font-medium">
                        {m.moneda} {m.monto.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {movimientosCliente.length === 0 && (
                    <p className="text-sm text-neutral-400">Sin movimientos registrados</p>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-neutral-600 mb-2">Bonos</h3>
                <div className="space-y-1">
                  {cliente.bonos.map((b) => (
                    <div
                      key={b.id}
                      className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between items-center"
                    >
                      <span>{b.etiqueta}</span>
                      {b.canjeado ? (
                        <span className="text-green-600 text-xs font-medium">
                          Canjeado el {b.fechaCanjeado}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCanjear(b.id, b.etiqueta)}
                          className="text-xs bg-neutral-900 text-white rounded px-2 py-1"
                        >
                          Canjear
                        </button>
                      )}
                    </div>
                  ))}
                  {cliente.bonos.length === 0 && (
                    <p className="text-sm text-neutral-400">Sin bonos activados por el asesor</p>
                  )}
                </div>
              </section>
            )}

            {seccion === "solicitudes" && (
              <section className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold mb-3">Proceso de documentacion</h2>

                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <h3 className="text-sm font-semibold text-neutral-600 mb-2">
                    Historial de envios a Administracion FK
                  </h3>
                  <div className="space-y-1">
                    {misGestiones.map((g) => (
                      <div
                        key={g.id}
                        className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between items-center"
                      >
                        <span>{categoriaGestion(g)}</span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs rounded px-2 py-0.5 ${
                              g.estado === "ENVIADO_A_ADMIN_FK"
                                ? "bg-green-100 text-green-700"
                                : g.estado === "PENDIENTE_APROBACION"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {LABEL_ESTADO_GESTION[g.estado]}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {new Date(g.createdAt).toLocaleString()}
                          </span>
                        </span>
                      </div>
                    ))}
                    {misGestiones.length === 0 && (
                      <p className="text-sm text-neutral-400">Sin envios registrados</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <h3 className="text-sm font-semibold text-neutral-600 mb-2">
                    Proceso de titulacion
                  </h3>
                  {inversionesConTitulacion(cliente).map((inv) => {
                    const paso = inv.procesoTitulacion ?? -1;
                    return (
                      <div key={inv.id} className="mb-4 pb-4 border-b border-neutral-100 last:border-0">
                        <p className="text-xs text-neutral-500 mb-2">
                          {inv.descripcion} - Estado actual: {labelProcesoTitulacion(paso)}
                        </p>
                        {(["NOTARIAL", "REGISTRAL"] as const).map((fase) => (
                          <div key={fase} className="mb-3">
                            <p className="text-xs font-semibold text-neutral-400 mb-1">{fase}</p>
                            <div className="space-y-1">
                              {PASOS_TITULACION.map((p, i) => {
                                if (p.fase !== fase) return null;
                                const completado = i < paso;
                                const actual = i === paso;
                                return (
                                  <div
                                    key={i}
                                    className={`text-sm border rounded px-3 py-2 flex justify-between items-center ${
                                      actual
                                        ? "border-blue-300 bg-blue-50"
                                        : completado
                                          ? "border-green-200 bg-green-50"
                                          : "border-neutral-200"
                                    }`}
                                  >
                                    <span className={completado || actual ? "" : "text-neutral-400"}>
                                      {completado ? "✓ " : actual ? "▶ " : ""}
                                      {p.label}
                                    </span>
                                    {actual && (
                                      <span className="text-xs text-blue-600 font-medium shrink-0 ml-2">
                                        En proceso
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {inversionesConTitulacion(cliente).length === 0 && (
                    <p className="text-sm text-neutral-400">No tienes compras de lote registradas</p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <h3 className="text-sm font-semibold text-neutral-600 mb-2">
                    Documentos solicitados
                  </h3>
                  <div className="space-y-1">
                    {cliente.documentosProceso
                      .filter(
                        (d) =>
                          !(
                            d.entregado &&
                            d.realizado &&
                            d.completadoEl &&
                            diasDesde(d.completadoEl) >= 7
                          ),
                      )
                      .map((d) => (
                        <div
                          key={d.id}
                          className="text-sm border border-neutral-200 rounded px-3 py-2"
                        >
                          <div className="flex justify-between items-center">
                            <span>{d.descripcion}</span>
                            <span className="flex gap-2 shrink-0">
                              <span
                                className={`text-xs rounded px-2 py-0.5 ${
                                  d.entregado
                                    ? "bg-green-100 text-green-700"
                                    : "bg-neutral-100 text-neutral-500"
                                }`}
                              >
                                {d.entregado ? "Entregado" : "Pendiente"}
                              </span>
                              <span
                                className={`text-xs rounded px-2 py-0.5 ${
                                  d.realizado
                                    ? "bg-green-100 text-green-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {d.realizado ? "Realizado" : "En proceso"}
                              </span>
                            </span>
                          </div>
                          {d.requiereCorreccion && (
                            <p className="text-xs text-red-600 mt-1">⚠ En correccion</p>
                          )}
                        </div>
                      ))}
                  </div>
                  <p className="text-xs text-neutral-400 mt-2">
                    Los documentos entregados y realizados se archivan automaticamente a los 7 dias.
                  </p>
                </div>
              </section>
            )}

            {seccion === "documentos" && (
              <section className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold">Documentos</h2>
                <p className="text-xs text-green-600 mb-4">
                  ✓ Tus documentos estan al dia (ultima actualizacion {cliente.createdAt})
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {(
                    [
                      ["CONTRATO", "Contratos"],
                      ["DOCUMENTO", "Documentos"],
                      ["VOUCHER", "Vouchers"],
                      ["BOLETA_O_FACTURA", "Boletas o Fact"],
                    ] as const
                  ).map(([cat, label]) => (
                    <div key={cat}>
                      <h3 className="text-xs font-semibold text-neutral-600 mb-2">{label}</h3>
                      <div className="space-y-1">
                        {documentosCliente
                          .filter((d) => d.categoria === cat)
                          .map((d) => (
                            <div key={d.id} className="text-xs border border-neutral-200 rounded px-2 py-1.5">
                              <p className="truncate mb-1">{d.nombre}</p>
                              <a href={d.url} className="text-blue-600">
                                Ver / Descargar
                              </a>
                            </div>
                          ))}
                        {documentosCliente.filter((d) => d.categoria === cat).length === 0 && (
                          <p className="text-xs text-neutral-400">-</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
