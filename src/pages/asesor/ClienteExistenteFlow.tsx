import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import InversionCard from "@/pages/asesor/InversionCard";
import NuevoLoteExistenteFlow from "@/pages/asesor/NuevoLoteExistenteFlow";
import PagoContadoFlow from "@/pages/asesor/PagoContadoFlow";
import PagoCuotaFlow from "@/pages/asesor/PagoCuotaFlow";
import Paginacion from "@/components/Paginacion";
import { Bell } from "lucide-react";
import BeneficioEditor, { BENEFICIOS_TIPO } from "@/components/BeneficioEditor";
import type { Cliente, Movimiento, PrioridadObservacion, CategoriaDocumento, TipoBono } from "@/types";
import { LABEL_ESTADO_GESTION, fmtFechaHora, categoriaGestion } from "@/lib/gestiones";
import { fechaVencimientoApp, appVencida } from "@/lib/cuentaApp";
import { estadoBono, inversionCompletada } from "@/lib/inversiones";
import { documentosDeCliente, inversionesConTitulacion } from "@/lib/clienteHelpers";
import { PASOS_TITULACION } from "@/lib/titulacion";
import { diasRestantesEliminacion } from "@/lib/eliminacion";

const PRIORIDAD_OBSERVACION_ESTILO: Record<PrioridadObservacion, string> = {
  BAJA: "bg-amber-100 text-amber-700",
  MEDIA: "bg-orange-100 text-orange-700",
  ALTA: "bg-red-100 text-red-700",
};
const PRIORIDAD_OBSERVACION_LABEL: Record<PrioridadObservacion, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
};

type Vista =
  | "buscar"
  | "info"
  | "elegir-nueva-solicitud"
  | "elegir-tipo-nueva"
  | "lote-wizard"
  | "pago-contado"
  | "pago-cuota"
  | "simple-inversion"
  | "solicitud-form"
  | "enviado";

type TipoNuevaInversion = "NUEVO_LOTE" | "PLAZO_FIJO" | "PAGO_CONTADO" | "PAGO_CUOTA";

export default function ClienteExistenteFlow({
  misClientes,
  asesorId,
  clientePreseleccionadoId,
  onClose,
}: {
  misClientes: Cliente[];
  asesorId: string;
  clientePreseleccionadoId?: string;
  onClose: () => void;
}) {
  const crearGestionExistente = useAppStore((s) => s.crearGestionExistente);
  const actualizarGruposCliente = useAppStore((s) => s.actualizarGruposCliente);
  const actualizarActivacionBono = useAppStore((s) => s.actualizarActivacionBono);
  const agregarBonoCliente = useAppStore((s) => s.agregarBonoCliente);
  const agregarInversionSimple = useAppStore((s) => s.agregarInversionSimple);
  const actualizarProcesoTitulacionInversion = useAppStore(
    (s) => s.actualizarProcesoTitulacionInversion,
  );
  const agregarObservacion = useAppStore((s) => s.agregarObservacion);
  const recordarObservacion = useAppStore((s) => s.recordarObservacion);
  const solicitarEliminacionCliente = useAppStore((s) => s.solicitarEliminacionCliente);
  const cancelarEliminacionCliente = useAppStore((s) => s.cancelarEliminacionCliente);
  const agregarDocumentoCliente = useAppStore((s) => s.agregarDocumentoCliente);
  const gestiones = useAppStore((s) => s.gestiones);

  const preseleccionado = misClientes.find((c) => c.id === clientePreseleccionadoId) ?? null;

  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [clienteSelId, setClienteSelId] = useState<string | null>(preseleccionado?.id ?? null);
  const clienteSel = misClientes.find((c) => c.id === clienteSelId) ?? null;
  const [vista, setVista] = useState<Vista>(preseleccionado ? "elegir-nueva-solicitud" : "buscar");
  const [tipoNueva, setTipoNueva] = useState<TipoNuevaInversion | null>(null);
  const [montoSimple, setMontoSimple] = useState("");
  const [monedaSimple, setMonedaSimple] = useState<Movimiento["moneda"]>("USD");
  const [detalleSimple, setDetalleSimple] = useState("");
  const [detalleSolicitud, setDetalleSolicitud] = useState("");
  const [copyFinal, setCopyFinal] = useState<string | null>(null);
  const [historialPagina, setHistorialPagina] = useState(1);
  const [textoObservacion, setTextoObservacion] = useState("");
  const [prioridadObservacion, setPrioridadObservacion] = useState<PrioridadObservacion>("BAJA");
  const [categoriaReemplazo, setCategoriaReemplazo] = useState<CategoriaDocumento>("DOCUMENTO");
  const [agregandoBono, setAgregandoBono] = useState(false);
  const [nuevoBonoTipo, setNuevoBonoTipo] = useState<TipoBono>(BENEFICIOS_TIPO[0].value);
  const [nuevoBonoEtiqueta, setNuevoBonoEtiqueta] = useState("");
  const [solicitandoEliminacion, setSolicitandoEliminacion] = useState(false);
  const [motivoEliminacion, setMotivoEliminacion] = useState("");

  const TAMANO_PAGINA = 5;

  const resultados = busqueda.trim()
    ? misClientes.filter(
        (c) =>
          c.nombres.toLowerCase().includes(busqueda.toLowerCase()) ||
          c.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
          c.dni.includes(busqueda),
      )
    : misClientes;

  const totalPaginas = Math.max(1, Math.ceil(resultados.length / TAMANO_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const resultadosPagina = resultados.slice(
    (paginaActual - 1) * TAMANO_PAGINA,
    paginaActual * TAMANO_PAGINA,
  );

  function irANuevaInversion(c: Cliente) {
    setClienteSelId(c.id);
    setTipoNueva(null);
    setVista("elegir-tipo-nueva");
  }

  function irAInfo(c: Cliente) {
    setClienteSelId(c.id);
    setVista("info");
    setHistorialPagina(1);
  }

  function volverABuscar() {
    setClienteSelId(null);
    setBusqueda("");
    setVista("buscar");
  }

  function enviarSolicitud() {
    if (!clienteSel) return;
    const { copy } = crearGestionExistente({
      clienteId: clienteSel.id,
      asesorId,
      tipoInversion: "OTRAS_INVERSIONES",
      monto: 0,
      moneda: "USD",
      detalle: detalleSolicitud,
    });
    setCopyFinal(copy);
    setVista("enviado");
  }

  function enviarSimple() {
    if (!clienteSel) return;
    const { copy } = agregarInversionSimple({
      clienteId: clienteSel.id,
      asesorId,
      tipo: "PLAZO_FIJO",
      monto: Number(montoSimple) || 0,
      moneda: monedaSimple,
      detalle: detalleSimple || undefined,
    });
    setCopyFinal(copy);
    setVista("enviado");
  }

  if (vista === "enviado" && copyFinal) {
    return (
      <div className="bg-white rounded-lg shadow p-4 text-center">
        <p className="text-green-600 font-medium mb-2">Enviado</p>
        <p className="text-sm text-neutral-500 mb-4">
          El copy fue "enviado" a Administracion Fk (simulado, sin cuenta real de WhatsApp
          todavia).
        </p>
        <pre className="text-left text-xs bg-neutral-50 border border-neutral-200 rounded p-3 whitespace-pre-wrap mb-4">
          {copyFinal}
        </pre>
        <button
          onClick={() => {
            setCopyFinal(null);
            onClose();
          }}
          className="bg-neutral-900 text-white rounded px-4 py-2 text-sm"
        >
          Volver
        </button>
      </div>
    );
  }

  if (vista === "lote-wizard" && clienteSel) {
    return (
      <NuevoLoteExistenteFlow
        cliente={clienteSel}
        asesorId={asesorId}
        onCancel={() => setVista("elegir-tipo-nueva")}
        onDone={(copy) => {
          setCopyFinal(copy);
          setVista("enviado");
        }}
      />
    );
  }

  if (vista === "pago-contado" && clienteSel) {
    return (
      <PagoContadoFlow
        cliente={clienteSel}
        asesorId={asesorId}
        onCancel={() => setVista("elegir-tipo-nueva")}
        onDone={(copy) => {
          setCopyFinal(copy);
          setVista("enviado");
        }}
      />
    );
  }

  if (vista === "pago-cuota" && clienteSel) {
    return (
      <PagoCuotaFlow
        cliente={clienteSel}
        asesorId={asesorId}
        onCancel={() => setVista("elegir-tipo-nueva")}
        onDone={(copy) => {
          setCopyFinal(copy);
          setVista("enviado");
        }}
      />
    );
  }

  if (vista === "info" && clienteSel) {
    return (
      <div className="space-y-4">
        <section className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">
              {clienteSel.nombres}{" "}
              <span className="text-neutral-400 font-normal">({clienteSel.codigo})</span>
            </h3>
            <button onClick={volverABuscar} className="text-sm text-neutral-500">
              Volver
            </button>
          </div>
          {clienteSel.copropietarios.length > 0 && (
            <div className="text-xs text-neutral-500">
              Copropietario(s): {clienteSel.copropietarios.map((cp) => `${cp.nombres} - DNI: ${cp.dni}`).join(" | ")}
            </div>
          )}
        </section>

        {clienteSel.solicitudEliminacion ? (
          <section className="bg-red-50 border border-red-200 rounded-lg shadow p-4">
            <h4 className="text-sm font-semibold text-red-700 mb-1">
              Eliminacion / devolucion solicitada
            </h4>
            <p className="text-sm text-neutral-700 mb-1">
              Motivo: {clienteSel.solicitudEliminacion.motivo}
            </p>
            <p className="text-xs text-neutral-500 mb-2">
              Faltan {diasRestantesEliminacion(clienteSel.solicitudEliminacion.fecha)} dia(s) para
              que Administracion FK pueda eliminarla definitivamente.
            </p>
            <button
              onClick={() => cancelarEliminacionCliente(clienteSel.id)}
              className="text-xs bg-neutral-100 text-neutral-600 rounded px-3 py-1.5"
            >
              Cancelar solicitud
            </button>
          </section>
        ) : (
          <section className="bg-white rounded-lg shadow p-4">
            {solicitandoEliminacion ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-neutral-600 mb-1">
                  Solicitar eliminacion / devolucion
                </h4>
                <p className="text-xs text-neutral-400">
                  Administracion FK podra eliminarla definitivamente recien en 30 dias.
                </p>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Motivo de la eliminacion o devolucion..."
                  value={motivoEliminacion}
                  onChange={(e) => setMotivoEliminacion(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!motivoEliminacion.trim()) return;
                      solicitarEliminacionCliente(clienteSel.id, {
                        motivo: motivoEliminacion.trim(),
                        solicitadoPorId: asesorId,
                      });
                      setSolicitandoEliminacion(false);
                      setMotivoEliminacion("");
                    }}
                    disabled={!motivoEliminacion.trim()}
                    className="text-xs bg-red-600 text-white rounded px-3 py-1.5 disabled:opacity-30"
                  >
                    Confirmar solicitud
                  </button>
                  <button
                    onClick={() => setSolicitandoEliminacion(false)}
                    className="text-xs text-neutral-500"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setSolicitandoEliminacion(true)}
                className="text-xs text-red-600"
              >
                Solicitar eliminacion / devolucion de este cliente
              </button>
            )}
          </section>
        )}

        <section className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-semibold text-neutral-600 mb-2">
            Inversiones ({clienteSel.inversiones.length})
          </h4>
          <div className="space-y-2">
          {clienteSel.inversiones.map((inv) => (
            <InversionCard
              key={inv.id}
              inversion={inv}
              clienteId={clienteSel.id}
              clienteNombre={clienteSel.nombres}
              onNuevaInversion={() => irANuevaInversion(clienteSel)}
            />
          ))}
          {clienteSel.inversiones.length === 0 && (
            <p className="text-sm text-neutral-400">Este cliente aun no tiene inversiones registradas</p>
          )}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-semibold text-neutral-600 mb-2">Estado de envio</h4>
          <div className="space-y-1">
            {gestiones
              .filter((g) => g.clienteId === clienteSel.id)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((g) => (
                <div
                  key={g.id}
                  className="text-xs border border-neutral-200 rounded px-3 py-2 flex justify-between items-center gap-2"
                >
                  <span>{categoriaGestion(g)}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span
                      className={`rounded px-2 py-0.5 ${
                        g.estado === "ENVIADO_A_ADMIN_FK"
                          ? "bg-green-100 text-green-700"
                          : g.estado === "PENDIENTE_APROBACION"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {LABEL_ESTADO_GESTION[g.estado]}
                    </span>
                    <span className="text-neutral-400">{fmtFechaHora(g.createdAt)}</span>
                  </span>
                </div>
              ))}
            {gestiones.filter((g) => g.clienteId === clienteSel.id).length === 0 && (
              <p className="text-sm text-neutral-400">Sin envios registrados</p>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-semibold text-neutral-600 mb-2">
            Bonos y beneficios ({clienteSel.bonos.length})
          </h4>
          <div className="space-y-2">
            {clienteSel.bonos.map((b) => {
              const estado = estadoBono(b);
              return (
                <div
                  key={b.id}
                  className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between items-center gap-2"
                >
                  <label className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={b.activadoPorAsesor}
                      disabled={b.canjeado}
                      onChange={(e) =>
                        actualizarActivacionBono(clienteSel.id, b.id, e.target.checked)
                      }
                    />
                    <span className="truncate">{b.etiqueta}</span>
                  </label>
                  <span className={`text-xs rounded px-2 py-0.5 shrink-0 ${estado.className}`}>
                    {estado.label}
                  </span>
                </div>
              );
            })}
            {clienteSel.bonos.length === 0 && (
              <p className="text-sm text-neutral-400">Sin bonos registrados</p>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Marca el check cuando ya le entregaste/activaste el beneficio al cliente.
            Administracion FK vera este estado en su ficha.
          </p>
          {agregandoBono ? (
            <div className="mt-2 space-y-2">
              <BeneficioEditor
                tipo={nuevoBonoTipo}
                etiqueta={nuevoBonoEtiqueta}
                onTipoChange={(t, etiquetaInicial) => {
                  setNuevoBonoTipo(t);
                  setNuevoBonoEtiqueta(etiquetaInicial);
                }}
                onEtiquetaChange={setNuevoBonoEtiqueta}
                onQuitar={() => setAgregandoBono(false)}
              />
              <button
                onClick={() => {
                  if (!nuevoBonoEtiqueta.trim()) return;
                  agregarBonoCliente(clienteSel.id, {
                    tipo: nuevoBonoTipo,
                    etiqueta: nuevoBonoEtiqueta.trim(),
                  });
                  setAgregandoBono(false);
                  setNuevoBonoEtiqueta("");
                }}
                disabled={!nuevoBonoEtiqueta.trim()}
                className="text-xs bg-neutral-900 text-white rounded px-3 py-1.5 disabled:opacity-30"
              >
                Guardar bono
              </button>
            </div>
          ) : (
            <button onClick={() => setAgregandoBono(true)} className="mt-2 text-xs text-blue-600">
              + Agregar bono negociado con el cliente
            </button>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-semibold text-neutral-600 mb-2">
            Proceso de titulacion ({inversionesConTitulacion(clienteSel).length})
          </h4>
          <div className="space-y-2">
            {inversionesConTitulacion(clienteSel).map((inv) => (
              <div key={inv.id} className="border border-neutral-200 rounded px-3 py-2">
                <p className="text-xs text-neutral-500 mb-1">{inv.descripcion}</p>
                <select
                  className="input"
                  value={inv.procesoTitulacion ?? -1}
                  onChange={(e) =>
                    actualizarProcesoTitulacionInversion(
                      clienteSel.id,
                      inv.id,
                      Number(e.target.value),
                    )
                  }
                >
                  <option value={-1}>No iniciado</option>
                  {PASOS_TITULACION.map((p, i) => (
                    <option key={i} value={i}>
                      {p.fase} - {p.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {inversionesConTitulacion(clienteSel).length === 0 && (
              <p className="text-xs text-neutral-400">Este cliente no tiene compras de lote</p>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-semibold text-neutral-600 mb-2">
            Documentos ({documentosDeCliente(clienteSel).length})
          </h4>
          <div className="space-y-2">
            {documentosDeCliente(clienteSel).map((d) => (
              <div key={d.id} className="text-sm border border-neutral-200 rounded px-3 py-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="min-w-0 truncate">
                    [{d.categoria}] {d.nombre}
                  </span>
                  {d.requiereCorreccion && (
                    <span className="text-xs bg-red-100 text-red-700 rounded px-2 py-0.5 shrink-0">
                      Requiere correccion
                    </span>
                  )}
                </div>
                {d.requiereCorreccion && d.notaCorreccion && (
                  <p className="text-xs text-red-600 mt-1">Nota: {d.notaCorreccion}</p>
                )}
              </div>
            ))}
            {documentosDeCliente(clienteSel).length === 0 && (
              <p className="text-sm text-neutral-400">Sin documentos</p>
            )}
          </div>
          <div className="flex gap-2 items-center mt-2 pt-2 border-t border-neutral-100">
            <select
              className="input text-xs py-1"
              value={categoriaReemplazo}
              onChange={(e) => setCategoriaReemplazo(e.target.value as CategoriaDocumento)}
            >
              <option value="DOCUMENTO">Documento</option>
              <option value="DNI">Foto de DNI</option>
              <option value="UBICACION_LOTE">Foto de ubicacion del lote</option>
              <option value="CONTRATO">Contrato</option>
              <option value="VOUCHER">Voucher</option>
              <option value="BOLETA_O_FACTURA">Boleta o factura</option>
            </select>
            <label className="text-xs text-blue-600 cursor-pointer shrink-0">
              + Subir archivo corregido
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const nombre = e.target.files?.[0]?.name;
                  if (!nombre) return;
                  agregarDocumentoCliente(clienteSel.id, {
                    categoria: categoriaReemplazo,
                    nombre,
                  });
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-semibold text-neutral-600 mb-2">
            Observaciones ({clienteSel.observaciones.length})
          </h4>
          <div className="space-y-2 mb-3">
            {[...clienteSel.observaciones]
              .sort((a, b) => b.fecha.localeCompare(a.fecha))
              .map((o) => (
                <div key={o.id} className="text-sm border border-neutral-200 rounded px-3 py-2">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span
                      className={`text-xs rounded px-2 py-0.5 shrink-0 ${PRIORIDAD_OBSERVACION_ESTILO[o.prioridad]}`}
                    >
                      {PRIORIDAD_OBSERVACION_LABEL[o.prioridad]}
                    </span>
                    <span className="text-xs text-neutral-400 shrink-0">
                      {fmtFechaHora(o.fecha)}
                    </span>
                  </div>
                  <p className="text-neutral-700">{o.texto}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-neutral-400">
                      {o.visto ? `Visto por Admin (${o.vistoFecha})` : "Aun no visto por Admin"}
                    </p>
                    {o.visto && (
                      <button
                        onClick={() => recordarObservacion(clienteSel.id, o.id)}
                        title="Volver a notificar al Admin"
                        className="flex items-center gap-1 text-xs text-amber-600"
                      >
                        <Bell size={12} /> Recordar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            {clienteSel.observaciones.length === 0 && (
              <p className="text-sm text-neutral-400">Sin observaciones</p>
            )}
          </div>
          <textarea
            className="input mb-2"
            rows={2}
            placeholder="Escribe una observacion sobre este cliente..."
            value={textoObservacion}
            onChange={(e) => setTextoObservacion(e.target.value)}
          />
          <div className="flex gap-2">
            <select
              className="input w-auto"
              value={prioridadObservacion}
              onChange={(e) => setPrioridadObservacion(e.target.value as PrioridadObservacion)}
            >
              <option value="BAJA">Prioridad baja</option>
              <option value="MEDIA">Prioridad media</option>
              <option value="ALTA">Prioridad alta</option>
            </select>
            <button
              onClick={() => {
                if (!textoObservacion.trim()) return;
                agregarObservacion(clienteSel.id, {
                  texto: textoObservacion.trim(),
                  prioridad: prioridadObservacion,
                  autorAsesorId: asesorId,
                });
                setTextoObservacion("");
                setPrioridadObservacion("BAJA");
              }}
              disabled={!textoObservacion.trim()}
              className="flex-1 bg-neutral-900 text-white rounded px-3 py-1.5 text-sm disabled:opacity-30"
            >
              Agregar observacion
            </button>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-semibold text-neutral-600 mb-2">Grupos y cuenta</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={clienteSel.grupoEmbajadores}
                onChange={(e) =>
                  actualizarGruposCliente(clienteSel.id, { grupoEmbajadores: e.target.checked })
                }
              />
              Grupo de embajadores
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={clienteSel.grupoFamiliaKaizen}
                onChange={(e) =>
                  actualizarGruposCliente(clienteSel.id, {
                    grupoFamiliaKaizen: e.target.checked,
                  })
                }
              />
              Grupo de Familia Kaizen
            </label>
            <div className="text-sm flex items-center gap-2">
              <span className="text-neutral-500">Cuenta de App:</span>
              {clienteSel.cuentaApp.activa && clienteSel.cuentaApp.fechaActivacion ? (
                <span
                  className={`text-xs rounded px-2 py-0.5 ${
                    appVencida(clienteSel.cuentaApp.fechaActivacion)
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {appVencida(clienteSel.cuentaApp.fechaActivacion)
                    ? `Vencida (venció ${fechaVencimientoApp(clienteSel.cuentaApp.fechaActivacion)})`
                    : `Activa (vence ${fechaVencimientoApp(clienteSel.cuentaApp.fechaActivacion)})`}
                </span>
              ) : (
                <span className="text-xs bg-neutral-100 text-neutral-500 rounded px-2 py-0.5">
                  No activada aun
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400">
              Administracion FK confirma la activacion de la cuenta de app; Admin la marca desde
              su perfil.
            </p>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-semibold text-neutral-600 mb-2">
            Registro de actividad ({clienteSel.bitacora.length})
          </h4>
          {(() => {
            const TAMANO_HISTORIAL = 10;
            const ordenado = [...clienteSel.bitacora].sort((a, b) =>
              b.fecha.localeCompare(a.fecha),
            );
            const totalPaginasHist = Math.max(1, Math.ceil(ordenado.length / TAMANO_HISTORIAL));
            const paginaHist = Math.min(historialPagina, totalPaginasHist);
            const visibles = ordenado.slice(
              (paginaHist - 1) * TAMANO_HISTORIAL,
              paginaHist * TAMANO_HISTORIAL,
            );
            return (
              <>
                <div className="space-y-1">
                  {visibles.map((e) => (
                    <div key={e.id} className="text-xs border border-neutral-200 rounded px-3 py-2">
                      <p>{e.descripcion}</p>
                      <p className="text-neutral-400">{fmtFechaHora(e.fecha)}</p>
                    </div>
                  ))}
                  {ordenado.length === 0 && (
                    <p className="text-sm text-neutral-400">Sin movimientos registrados</p>
                  )}
                </div>
                {ordenado.length > TAMANO_HISTORIAL && (
                  <Paginacion
                    paginaActual={paginaHist}
                    totalPaginas={totalPaginasHist}
                    totalItems={ordenado.length}
                    tamanoPagina={TAMANO_HISTORIAL}
                    etiqueta="eventos"
                    onCambiar={setHistorialPagina}
                  />
                )}
              </>
            );
          })()}
        </section>
      </div>
    );
  }

  if (vista === "elegir-nueva-solicitud" && clienteSel) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">
            {clienteSel.nombres}{" "}
            <span className="text-neutral-400 font-normal">({clienteSel.codigo})</span>
          </h3>
          <button onClick={onClose} className="text-sm text-neutral-500">
            Cancelar
          </button>
        </div>
        <p className="text-sm text-neutral-500 mb-3">¿Que quieres hacer con este cliente?</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setVista("elegir-tipo-nueva")}
            className="bg-neutral-900 text-white rounded-lg px-4 py-4 text-sm font-medium"
          >
            Nueva inversion
          </button>
          <button
            onClick={() => setVista("solicitud-form")}
            className="bg-white border border-neutral-300 rounded-lg px-4 py-4 text-sm font-medium"
          >
            Solicitud / cambio
          </button>
        </div>
      </div>
    );
  }

  if (vista === "elegir-tipo-nueva" && clienteSel) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">
            {clienteSel.nombres}{" "}
            <span className="text-neutral-400 font-normal">({clienteSel.codigo})</span>
          </h3>
          <button onClick={onClose} className="text-sm text-neutral-500">
            Cancelar
          </button>
        </div>
        {clienteSel.solicitudEliminacion && (
          <div className="bg-red-50 border border-red-200 rounded px-3 py-2 mb-3 text-xs text-red-700">
            ⚠ Este cliente tiene una solicitud de eliminacion/devolucion pendiente desde el{" "}
            {fmtFechaHora(clienteSel.solicitudEliminacion.fecha)}. Confirma con Administracion FK
            antes de registrar una nueva operacion.
          </div>
        )}
        <p className="text-sm text-neutral-500 mb-3">¿Que tipo de nueva inversion?</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setVista("pago-contado")}
            className="border border-neutral-300 rounded-lg px-3 py-4 text-sm font-medium hover:bg-neutral-50"
          >
            Pago al contado
          </button>
          <button
            onClick={() => setVista("pago-cuota")}
            className="border border-neutral-300 rounded-lg px-3 py-4 text-sm font-medium hover:bg-neutral-50"
          >
            Pago de cuota
          </button>
          <button
            onClick={() => {
              setTipoNueva("PLAZO_FIJO");
              setMontoSimple("");
              setDetalleSimple("");
              setVista("simple-inversion");
            }}
            className="border border-neutral-300 rounded-lg px-3 py-4 text-sm font-medium hover:bg-neutral-50"
          >
            Plazo fijo
          </button>
          <button
            onClick={() => setVista("lote-wizard")}
            className="border border-neutral-300 rounded-lg px-3 py-4 text-sm font-medium hover:bg-neutral-50"
          >
            Nuevo lote
          </button>
        </div>
      </div>
    );
  }

  if (vista === "simple-inversion" && clienteSel && tipoNueva === "PLAZO_FIJO") {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">
            Plazo fijo - <span className="text-neutral-400 font-normal">{clienteSel.nombres}</span>
          </h3>
          <button onClick={() => setVista("elegir-tipo-nueva")} className="text-sm text-neutral-500">
            Atras
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="input"
              placeholder="Monto"
              value={montoSimple}
              onChange={(e) => setMontoSimple(e.target.value)}
            />
            <select
              className="input"
              value={monedaSimple}
              onChange={(e) => setMonedaSimple(e.target.value as Movimiento["moneda"])}
            >
              <option value="USD">USD</option>
              <option value="PEN">PEN</option>
            </select>
          </div>
          <label className="block">
            <span className="block text-xs text-neutral-500 mb-1">Detalle (opcional)</span>
            <input
              className="input"
              value={detalleSimple}
              onChange={(e) => setDetalleSimple(e.target.value)}
            />
          </label>
        </div>
        <button
          onClick={enviarSimple}
          disabled={!(Number(montoSimple) > 0)}
          className="w-full mt-4 bg-green-600 text-white rounded py-2 text-sm disabled:opacity-30"
        >
          Generar copy y enviar
        </button>
      </div>
    );
  }

  if (vista === "solicitud-form" && clienteSel) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">
            Solicitud / cambio -{" "}
            <span className="text-neutral-400 font-normal">{clienteSel.nombres}</span>
          </h3>
          <button onClick={() => setVista("elegir-nueva-solicitud")} className="text-sm text-neutral-500">
            Atras
          </button>
        </div>
        <label className="block">
          <span className="block text-xs text-neutral-500 mb-1">
            Busca su contrato/documento y detalla que cambio o solicitud quieres realizar
          </span>
          <textarea
            className="input"
            rows={3}
            value={detalleSolicitud}
            onChange={(e) => setDetalleSolicitud(e.target.value)}
            placeholder="Ej: actualizar contrato con nueva clausula de entrega de titulo..."
          />
        </label>
        <button
          onClick={enviarSolicitud}
          disabled={!detalleSolicitud.trim()}
          className="w-full mt-4 bg-green-600 text-white rounded py-2 text-sm disabled:opacity-30"
        >
          Generar copy y enviar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-1">
        <div>
          <h3 className="font-semibold">Cliente existente</h3>
          <p className="text-xs text-neutral-500">Selecciona el cliente sobre el que quieres gestionar algo</p>
        </div>
        <button onClick={onClose} className="text-sm text-neutral-500">
          Cancelar
        </button>
      </div>

      <input
        className="input my-3"
        placeholder="Buscar por nombre, codigo o DNI..."
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setPagina(1);
        }}
        autoFocus
      />

      <div className="overflow-x-auto -mx-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">DNI</th>
              <th className="px-4 py-2 font-medium">Contacto</th>
              <th className="px-4 py-2 font-medium">Inversiones</th>
              <th className="px-4 py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {resultadosPagina.map((c) => {
              const completadas = c.inversiones.filter(inversionCompletada).length;
              const enProgreso = c.inversiones.length - completadas;
              return (
                <tr key={c.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-600 shrink-0">
                        {c.nombres.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{c.nombres}</p>
                        <p className="text-xs text-neutral-400">{c.codigo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{c.dni}</td>
                  <td className="px-4 py-2 text-neutral-600">{c.telefono}</td>
                  <td className="px-4 py-2 text-neutral-600">
                    {c.inversiones.length === 0 ? (
                      "Sin inversiones"
                    ) : (
                      <>
                        {c.inversiones.length} total
                        {enProgreso > 0 && (
                          <span className="text-amber-600"> · {enProgreso} en progreso</span>
                        )}
                        {completadas > 0 && (
                          <span className="text-green-600"> · {completadas} completada(s)</span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => irANuevaInversion(c)}
                        className="text-xs bg-neutral-900 text-white rounded px-2 py-1.5"
                      >
                        Nueva inversion
                      </button>
                      <button
                        onClick={() => irAInfo(c)}
                        className="text-xs border border-neutral-300 rounded px-2 py-1.5"
                      >
                        Info
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {resultadosPagina.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-neutral-400">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-3 text-xs text-neutral-500">
        <span>
          Mostrando {resultados.length === 0 ? 0 : (paginaActual - 1) * TAMANO_PAGINA + 1} a{" "}
          {Math.min(paginaActual * TAMANO_PAGINA, resultados.length)} de {resultados.length} clientes
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={paginaActual <= 1}
            onClick={() => setPagina((p) => p - 1)}
            className="disabled:opacity-30"
          >
            ‹
          </button>
          <span>
            Pagina {paginaActual} de {totalPaginas}
          </span>
          <button
            disabled={paginaActual >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
            className="disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
