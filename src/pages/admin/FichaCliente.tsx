import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import Topbar from "@/components/Topbar";
import Paginacion from "@/components/Paginacion";
import { useRedirectIfUnauthorized } from "@/lib/useRedirectIfUnauthorized";
import InversionCard from "@/pages/asesor/InversionCard";
import BeneficioEditor, { BENEFICIOS_TIPO } from "@/components/BeneficioEditor";
import { documentosDeCliente, resumenTiposLote } from "@/lib/clienteHelpers";
import { diasRestantesEliminacion, puedeEliminarseDefinitivo } from "@/lib/eliminacion";
import { categoriaGestion, esClienteNuevo, fmtFechaHora, LABEL_ESTADO_GESTION } from "@/lib/gestiones";
import { PASOS_TITULACION, labelProcesoTitulacion } from "@/lib/titulacion";
import { fechaVencimientoApp, appVencida } from "@/lib/cuentaApp";
import {
  saldoPendienteInversion,
  inversionCompletada,
  montoTotalPlanInversion,
  montoPagadoTotalInversion,
  estadoBono,
} from "@/lib/inversiones";
import type { CategoriaDocumento, PrioridadObservacion, TipoBono } from "@/types";

const CATEGORIAS_DOC: { value: CategoriaDocumento; label: string }[] = [
  { value: "DNI", label: "Fotos de DNI" },
  { value: "UBICACION_LOTE", label: "Fotos de ubicacion del lote" },
  { value: "CONTRATO", label: "Contratos" },
  { value: "BOLETA_O_FACTURA", label: "Boletas / Facturas" },
  { value: "VOUCHER", label: "Vouchers" },
  { value: "DOCUMENTO", label: "Otros documentos" },
];

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

const TAMANO_HISTORIAL = 10;

export default function FichaCliente() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const sesion = useAppStore((s) => s.sesion);
  const admins = useAppStore((s) => s.admins);
  const asesores = useAppStore((s) => s.asesores);
  const clientes = useAppStore((s) => s.clientes);
  const gestiones = useAppStore((s) => s.gestiones);
  const actualizarCuentaApp = useAppStore((s) => s.actualizarCuentaApp);
  const actualizarGruposCliente = useAppStore((s) => s.actualizarGruposCliente);
  const actualizarActivacionBono = useAppStore((s) => s.actualizarActivacionBono);
  const actualizarProcesoTitulacionInversion = useAppStore(
    (s) => s.actualizarProcesoTitulacionInversion,
  );
  const agregarBonoCliente = useAppStore((s) => s.agregarBonoCliente);
  const actualizarDocumentoProceso = useAppStore((s) => s.actualizarDocumentoProceso);
  const marcarObservacionVista = useAppStore((s) => s.marcarObservacionVista);
  const solicitarEliminacionCliente = useAppStore((s) => s.solicitarEliminacionCliente);
  const cancelarEliminacionCliente = useAppStore((s) => s.cancelarEliminacionCliente);
  const eliminarClienteDefinitivo = useAppStore((s) => s.eliminarClienteDefinitivo);
  const corregirCuotaPagada = useAppStore((s) => s.corregirCuotaPagada);
  const corregirMontoPagadoContado = useAppStore((s) => s.corregirMontoPagadoContado);

  const [historialPagina, setHistorialPagina] = useState(1);
  const [verCredenciales, setVerCredenciales] = useState(false);
  const [docProcesoCorrigiendo, setDocProcesoCorrigiendo] = useState<string | null>(null);
  const [notaCorreccionTmp, setNotaCorreccionTmp] = useState("");
  const [agregandoBono, setAgregandoBono] = useState(false);
  const [nuevoBonoTipo, setNuevoBonoTipo] = useState<TipoBono>(BENEFICIOS_TIPO[0].value);
  const [nuevoBonoEtiqueta, setNuevoBonoEtiqueta] = useState("");
  const [solicitandoEliminacion, setSolicitandoEliminacion] = useState(false);
  const [motivoEliminacion, setMotivoEliminacion] = useState("");
  const [corrigiendoPagoId, setCorrigiendoPagoId] = useState<string | null>(null);
  const [montoCorregido, setMontoCorregido] = useState("");

  const admin = admins.find((a) => a.id === sesion?.id);
  const autorizado = !!sesion && sesion.rol === "admin" && !!admin;
  useRedirectIfUnauthorized(autorizado);

  if (!autorizado || !admin) {
    return null;
  }

  const cliente = clientes.find((c) => c.id === id);
  const asesorDeCliente = cliente ? asesores.find((a) => a.id === cliente.asesorId) : undefined;
  const perteneceAFranquicia = asesorDeCliente?.franquicia === admin.franquicia;

  if (!cliente || !perteneceAFranquicia) {
    return (
      <div className="min-h-screen bg-neutral-100">
        <Topbar titulo="Ficha de cliente" />
        <div className="max-w-2xl mx-auto p-4">
          <p className="text-sm text-neutral-500 mb-3">Cliente no encontrado.</p>
          <button onClick={() => navigate("/admin")} className="text-sm text-blue-600">
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  const gestionesDelCliente = gestiones
    .filter((g) => g.clienteId === cliente.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const gestionesPendientesCliente = gestionesDelCliente.filter(
    (g) => g.estado === "PENDIENTE_APROBACION",
  ).length;
  const docsPendientes = cliente.documentosProceso.filter(
    (d) => !(d.entregado && d.realizado),
  );
  const tieneCorreccion = docsPendientes.some((d) => d.requiereCorreccion);
  const todosLosDocumentos = documentosDeCliente(cliente);

  const ordenadoHistorial = [...cliente.bitacora].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const totalPaginasHist = Math.max(1, Math.ceil(ordenadoHistorial.length / TAMANO_HISTORIAL));
  const paginaHist = Math.min(historialPagina, totalPaginasHist);
  const historialVisible = ordenadoHistorial.slice(
    (paginaHist - 1) * TAMANO_HISTORIAL,
    paginaHist * TAMANO_HISTORIAL,
  );

  return (
    <div className="min-h-screen bg-neutral-100">
      <Topbar titulo={`Ficha de cliente - ${cliente.nombres}`} />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <button onClick={() => navigate("/admin")} className="text-sm text-blue-600">
          ← Volver al registro de clientes
        </button>

        <section className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="font-semibold text-lg">{cliente.nombres}</h2>
              <p className="text-xs text-neutral-400">
                {cliente.codigo} - {cliente.categoria}
              </p>
            </div>
            <span
              className={`text-xs rounded-full px-2 py-0.5 font-medium shrink-0 ${
                gestionesPendientesCliente === 0
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {gestionesPendientesCliente === 0
                ? "Envios al dia"
                : `${gestionesPendientesCliente} envio(s) pendiente(s)`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-neutral-500">Asesor</span>
            <span>{asesorDeCliente?.nombres ?? "Sin asesor"}</span>
            <span className="text-neutral-500">Creado</span>
            <span>{new Date(`${cliente.createdAt}T00:00:00`).toLocaleDateString()}</span>
            <span className="text-neutral-500">DNI</span>
            <span>{cliente.dni}</span>
            <span className="text-neutral-500">Telefono</span>
            <span>{cliente.telefono}</span>
            {cliente.email && (
              <>
                <span className="text-neutral-500">Correo</span>
                <span>{cliente.email}</span>
              </>
            )}
            <span className="text-neutral-500">Comprobante</span>
            <span>
              {cliente.comprobante.tipo} a {cliente.comprobante.numero}
            </span>
          </div>
          {resumenTiposLote(cliente) && (
            <p
              title="Revisa la seccion de Inversiones para ver cuantos lotes y contratos tiene cada venta."
              className="mt-2 text-xs rounded-full px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 w-fit"
            >
              {resumenTiposLote(cliente)}
            </p>
          )}
          {cliente.copropietarios.length > 0 && (
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <p className="text-xs font-semibold text-neutral-500 mb-1">
                Copropietario(s) ({cliente.copropietarios.length})
              </p>
              <div className="space-y-1">
                {cliente.copropietarios.map((cp, i) => (
                  <div key={i} className="text-sm border border-neutral-200 rounded px-2 py-1">
                    <p>{cp.nombres}</p>
                    <p className="text-xs text-neutral-400">DNI: {cp.dni}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {cliente.solicitudEliminacion ? (
          <section className="bg-red-50 border border-red-200 rounded-lg shadow p-4">
            <h3 className="font-semibold text-red-700 mb-1">Eliminacion / devolucion solicitada</h3>
            <p className="text-sm text-neutral-700 mb-1">
              Motivo: {cliente.solicitudEliminacion.motivo}
            </p>
            <p className="text-xs text-neutral-500 mb-3">
              Solicitada el {fmtFechaHora(cliente.solicitudEliminacion.fecha)}.{" "}
              {puedeEliminarseDefinitivo(cliente.solicitudEliminacion.fecha)
                ? "Ya se puede eliminar definitivamente."
                : `Faltan ${diasRestantesEliminacion(cliente.solicitudEliminacion.fecha)} dia(s) para poder eliminarla definitivamente.`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => cancelarEliminacionCliente(cliente.id)}
                className="text-xs bg-neutral-100 text-neutral-600 rounded px-3 py-1.5"
              >
                Cancelar solicitud
              </button>
              <button
                disabled={!puedeEliminarseDefinitivo(cliente.solicitudEliminacion.fecha)}
                onClick={() => {
                  if (
                    window.confirm(
                      `Esto eliminara definitivamente a ${cliente.nombres} y todos sus datos. Esta accion no se puede deshacer. Continuar?`,
                    )
                  ) {
                    eliminarClienteDefinitivo(cliente.id);
                    navigate("/admin");
                  }
                }}
                className="text-xs bg-red-600 text-white rounded px-3 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Eliminar definitivamente
              </button>
            </div>
          </section>
        ) : (
          <section className="bg-white rounded-lg shadow p-4">
            {solicitandoEliminacion ? (
              <div className="space-y-2">
                <h3 className="font-semibold mb-1">Solicitar eliminacion / devolucion</h3>
                <p className="text-xs text-neutral-400">
                  Se podra eliminar definitivamente recien en 30 dias, como periodo de espera.
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
                      solicitarEliminacionCliente(cliente.id, {
                        motivo: motivoEliminacion.trim(),
                        solicitadoPorId: admin.id,
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
          <h3 className="font-semibold mb-2">Grupos y cuenta de app</h3>
          <div className="space-y-2 text-sm">
            <label className="flex justify-between items-center cursor-pointer">
              <span className="text-neutral-600 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cliente.grupoEmbajadores}
                  onChange={(e) =>
                    actualizarGruposCliente(cliente.id, { grupoEmbajadores: e.target.checked })
                  }
                />
                Grupo de embajadores
              </span>
              <span
                className={`text-xs rounded px-2 py-0.5 ${
                  cliente.grupoEmbajadores
                    ? "bg-green-100 text-green-700"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {cliente.grupoEmbajadores ? "✓ Agregado" : "Sin agregar"}
              </span>
            </label>
            <label className="flex justify-between items-center cursor-pointer">
              <span className="text-neutral-600 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cliente.grupoFamiliaKaizen}
                  onChange={(e) =>
                    actualizarGruposCliente(cliente.id, { grupoFamiliaKaizen: e.target.checked })
                  }
                />
                Grupo de Familia Kaizen
              </span>
              <span
                className={`text-xs rounded px-2 py-0.5 ${
                  cliente.grupoFamiliaKaizen
                    ? "bg-green-100 text-green-700"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {cliente.grupoFamiliaKaizen ? "✓ Agregado" : "Sin agregar"}
              </span>
            </label>
            <p className="text-xs text-neutral-400">
              El asesor o tu pueden marcar estos grupos cuando ya esten agregados.
            </p>
            <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
              <span className="text-neutral-600">
                Cuenta de app
                {cliente.cuentaApp.activa && cliente.cuentaApp.fechaActivacion && (
                  <span className="block text-xs text-neutral-400">
                    {appVencida(cliente.cuentaApp.fechaActivacion)
                      ? `Vencida (${fechaVencimientoApp(cliente.cuentaApp.fechaActivacion)})`
                      : `Vence ${fechaVencimientoApp(cliente.cuentaApp.fechaActivacion)}`}
                  </span>
                )}
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setVerCredenciales((v) => !v)}
                  className="text-xs rounded px-3 py-1.5 bg-neutral-100 text-neutral-600"
                >
                  {verCredenciales ? "Ocultar credenciales" : "Ver credenciales"}
                </button>
                <button
                  onClick={() => actualizarCuentaApp(cliente.id, !cliente.cuentaApp.activa)}
                  className={`text-xs rounded px-3 py-1.5 ${
                    cliente.cuentaApp.activa
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {cliente.cuentaApp.activa ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
            {verCredenciales && (
              <div className="bg-neutral-50 border border-neutral-200 rounded p-2 text-xs">
                <p>Usuario: {cliente.usuarioApp.usuario}</p>
                <p>Contrasena: {cliente.usuarioApp.clave}</p>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Bonos y beneficios ({cliente.bonos.length})</h3>
          <div className="space-y-2">
            {cliente.bonos.map((b) => {
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
                        actualizarActivacionBono(cliente.id, b.id, e.target.checked)
                      }
                    />
                    <span className="truncate">{b.etiqueta}</span>
                  </label>
                  <span className={`text-xs rounded px-2 py-0.5 shrink-0 ${estado.className}`}>
                    {estado.label}
                    {b.canjeado && b.fechaCanjeado ? ` (${b.fechaCanjeado})` : ""}
                  </span>
                </div>
              );
            })}
            {cliente.bonos.length === 0 && (
              <p className="text-sm text-neutral-400">Sin bonos registrados</p>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            El check lo puede marcar el asesor (cuando ya entrego/activo el beneficio) o tu, como
            confirmacion. "Canjeado" lo marca el cliente desde su perfil y ya no se puede editar.
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
                  agregarBonoCliente(cliente.id, {
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
          <h3 className="font-semibold mb-1">
            Contrato y boleta ({cliente.documentosProceso.length})
            {docsPendientes.length > 0 && (
              <span className="text-amber-600 font-normal"> - {docsPendientes.length} pendiente(s)</span>
            )}
          </h3>
          <p className="text-xs text-neutral-400 mb-3">
            El asesor marca Entregado/Realizado. Aqui ves el estado y puedes pedir correccion
            en nombre de Administracion FK.
          </p>
          <div className="space-y-2">
            {cliente.documentosProceso.map((doc) => (
              <div key={doc.id} className="text-sm border border-neutral-200 rounded px-3 py-2">
                <p className="font-medium mb-1">{doc.descripcion}</p>
                <div className="flex flex-wrap gap-2 items-center mb-1">
                  <span
                    className={`text-xs rounded px-2 py-0.5 ${
                      doc.entregado
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {doc.entregado ? "Entregado" : "Pendiente de entrega"}
                  </span>
                  <span
                    className={`text-xs rounded px-2 py-0.5 ${
                      doc.realizado
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {doc.realizado ? "Realizado" : "En proceso"}
                  </span>
                  {doc.requiereCorreccion ? (
                    <button
                      onClick={() =>
                        actualizarDocumentoProceso(cliente.id, doc.id, { requiereCorreccion: false })
                      }
                      className="text-xs text-green-700 bg-green-100 rounded px-2 py-0.5"
                    >
                      Quitar aviso
                    </button>
                  ) : docProcesoCorrigiendo === doc.id ? null : (
                    <button
                      onClick={() => {
                        setDocProcesoCorrigiendo(doc.id);
                        setNotaCorreccionTmp("");
                      }}
                      className="text-xs text-red-700 bg-red-100 rounded px-2 py-0.5"
                    >
                      Requiere correccion
                    </button>
                  )}
                </div>
                {doc.requiereCorreccion && doc.notaCorreccion && (
                  <p className="text-xs text-red-600">Nota: {doc.notaCorreccion}</p>
                )}
                {docProcesoCorrigiendo === doc.id && (
                  <div className="mt-2 space-y-1">
                    <textarea
                      className="input text-xs"
                      rows={2}
                      placeholder="Detalle de la correccion pedida por FK..."
                      value={notaCorreccionTmp}
                      onChange={(e) => setNotaCorreccionTmp(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          actualizarDocumentoProceso(cliente.id, doc.id, {
                            requiereCorreccion: true,
                            notaCorreccion: notaCorreccionTmp.trim(),
                          });
                          setDocProcesoCorrigiendo(null);
                          setNotaCorreccionTmp("");
                        }}
                        className="text-xs bg-neutral-900 text-white rounded px-2 py-1"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setDocProcesoCorrigiendo(null)}
                        className="text-xs text-neutral-500"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {cliente.documentosProceso.length === 0 && (
              <p className="text-sm text-neutral-400">Sin documentos registrados</p>
            )}
          </div>
          {tieneCorreccion && (
            <p className="text-xs text-red-600 mt-2">⚠ Hay documentos en correccion</p>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Inversiones ({cliente.inversiones.length})</h3>
          <div className="space-y-2">
            {cliente.inversiones.map((inv) => {
              const montoTotalPlan = montoTotalPlanInversion(inv);
              const montoPagadoTotal = montoPagadoTotalInversion(inv);
              const porcentaje =
                montoTotalPlan === 0 ? 0 : Math.round((montoPagadoTotal / montoTotalPlan) * 100);
              const completada = inversionCompletada(inv);
              return (
                <div key={inv.id} className="border border-neutral-200 rounded-lg px-3 py-2">
                  <div className="flex justify-between items-center gap-2 mb-1">
                    <span className="text-sm text-neutral-700">
                      {inv.descripcion}{" "}
                      <span className="text-neutral-400 text-xs">({inv.codigo})</span>
                    </span>
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 shrink-0 ${
                        completada ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {completada ? "Completada" : "En progreso"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mb-1">
                    Pagado: {inv.moneda} {montoPagadoTotal.toFixed(2)} de{" "}
                    {montoTotalPlan.toFixed(2)} ({porcentaje}%) - Saldo: {inv.moneda}{" "}
                    {saldoPendienteInversion(inv).toFixed(2)}
                  </p>
                  <div className="h-1.5 bg-neutral-200 rounded mb-2">
                    <div className="h-1.5 bg-green-500 rounded" style={{ width: `${porcentaje}%` }} />
                  </div>
                  {inv.modalidad && (
                    <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                      <span className="text-neutral-500">
                        Titulacion: {labelProcesoTitulacion(inv.procesoTitulacion ?? -1)}
                      </span>
                      <select
                        className="input w-auto text-xs py-1"
                        value={inv.procesoTitulacion ?? -1}
                        onChange={(e) =>
                          actualizarProcesoTitulacionInversion(
                            cliente.id,
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
                  )}
                  <InversionCard
                    inversion={inv}
                    clienteId={cliente.id}
                    clienteNombre={cliente.nombres}
                    soloLectura
                    textoBoton="Ver inversion"
                  />
                  {corrigiendoPagoId === inv.id ? (
                    <div className="mt-2 pt-2 border-t border-neutral-100 space-y-2">
                      <p className="text-xs font-semibold text-neutral-600">
                        Corregir pago (si el asesor registro algo por error)
                      </p>
                      {inv.tipoPlan === "CUOTAS" ? (
                        <div className="space-y-1">
                          {inv.cuotas.filter((cu) => cu.pagada).length === 0 && (
                            <p className="text-xs text-neutral-400">
                              No hay cuotas pagadas para corregir.
                            </p>
                          )}
                          {inv.cuotas
                            .filter((cu) => cu.pagada)
                            .map((cu) => (
                              <div
                                key={cu.numero}
                                className="flex justify-between items-center text-xs border border-neutral-200 rounded px-2 py-1"
                              >
                                <span>
                                  Cuota {cu.numero} - {inv.moneda} {(cu.montoPagado ?? cu.monto).toFixed(2)} (
                                  {cu.fechaPago})
                                </span>
                                <button
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Esto revierte la cuota ${cu.numero} a "pendiente". Continuar?`,
                                      )
                                    ) {
                                      corregirCuotaPagada(cliente.id, inv.id, cu.numero);
                                    }
                                  }}
                                  className="text-red-600 shrink-0 ml-2"
                                >
                                  Deshacer pago
                                </button>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            min={0}
                            max={inv.montoTotal ?? undefined}
                            step="0.01"
                            className="input text-xs py-1"
                            placeholder={`Monto pagado actual: ${inv.montoPagado ?? 0} (maximo ${inv.montoTotal ?? "-"})`}
                            value={montoCorregido}
                            onChange={(e) => setMontoCorregido(e.target.value)}
                          />
                          <button
                            onClick={() => {
                              const nuevo = Number(montoCorregido);
                              if (Number.isNaN(nuevo)) return;
                              if (
                                window.confirm(
                                  `Esto cambia el monto pagado de ${inv.moneda} ${inv.montoPagado ?? 0} a ${inv.moneda} ${nuevo}. Continuar?`,
                                )
                              ) {
                                corregirMontoPagadoContado(cliente.id, inv.id, nuevo);
                                setMontoCorregido("");
                              }
                            }}
                            className="text-xs bg-neutral-900 text-white rounded px-3 py-1.5 shrink-0"
                          >
                            Guardar
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setCorrigiendoPagoId(null);
                          setMontoCorregido("");
                        }}
                        className="text-xs text-neutral-500"
                      >
                        Cerrar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCorrigiendoPagoId(inv.id)}
                      className="mt-2 text-xs text-red-600"
                    >
                      Corregir pago
                    </button>
                  )}
                </div>
              );
            })}
            {cliente.inversiones.length === 0 && (
              <p className="text-sm text-neutral-400">Sin inversiones registradas</p>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Documentos ({todosLosDocumentos.length})</h3>
          <div className="space-y-3">
            {CATEGORIAS_DOC.map(({ value, label }) => {
              const docs = todosLosDocumentos.filter((d) => d.categoria === value);
              if (docs.length === 0) return null;
              return (
                <div key={value}>
                  <p className="text-xs font-semibold text-neutral-500 mb-1">
                    {label} ({docs.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {docs.map((d) => (
                      <a
                        key={d.id}
                        href={d.url}
                        className="text-xs bg-neutral-100 border border-neutral-200 rounded px-2 py-1 text-blue-600"
                      >
                        {d.nombre}
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
            {todosLosDocumentos.length === 0 && (
              <p className="text-sm text-neutral-400">Sin documentos aun</p>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-1">Observaciones ({cliente.observaciones.length})</h3>
          <p className="text-xs text-neutral-400 mb-3">
            Escritas por el asesor. Marca "Visto" cuando ya la revisaste.
          </p>
          <div className="space-y-2">
            {[...cliente.observaciones]
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
                  <label className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
                    <input
                      type="checkbox"
                      checked={o.visto}
                      onChange={(e) =>
                        marcarObservacionVista(cliente.id, o.id, e.target.checked)
                      }
                    />
                    Visto por Admin
                  </label>
                </div>
              ))}
            {cliente.observaciones.length === 0 && (
              <p className="text-sm text-neutral-400">Sin observaciones</p>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Estado de envios ({gestionesDelCliente.length})</h3>
          <div className="space-y-1">
            {gestionesDelCliente.map((g) => (
              <div
                key={g.id}
                className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between items-center gap-2"
              >
                <span className="min-w-0 truncate">
                  {esClienteNuevo(g) ? "Cliente nuevo" : "Cliente existente"} -{" "}
                  {categoriaGestion(g)}
                </span>
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
                  <span className="text-neutral-400 text-xs">{fmtFechaHora(g.createdAt)}</span>
                </span>
              </div>
            ))}
            {gestionesDelCliente.length === 0 && (
              <p className="text-sm text-neutral-400">Sin envios registrados</p>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">
            Historial de actividad ({cliente.bitacora.length})
          </h3>
          <div className="space-y-1">
            {historialVisible.map((e) => (
              <div key={e.id} className="text-xs flex justify-between gap-2 border-b border-neutral-100 pb-1">
                <span className="text-neutral-600">{e.descripcion}</span>
                <span className="text-neutral-400 shrink-0">{fmtFechaHora(e.fecha)}</span>
              </div>
            ))}
            {ordenadoHistorial.length === 0 && (
              <p className="text-sm text-neutral-400">Sin movimientos</p>
            )}
          </div>
          {ordenadoHistorial.length > TAMANO_HISTORIAL && (
            <Paginacion
              paginaActual={paginaHist}
              totalPaginas={totalPaginasHist}
              totalItems={ordenadoHistorial.length}
              tamanoPagina={TAMANO_HISTORIAL}
              etiqueta="eventos"
              onCambiar={setHistorialPagina}
            />
          )}
        </section>
      </div>
    </div>
  );
}
