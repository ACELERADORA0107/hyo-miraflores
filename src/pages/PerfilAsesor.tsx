import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useRedirectIfUnauthorized } from "@/lib/useRedirectIfUnauthorized";
import Topbar from "@/components/Topbar";
import SidebarNav from "@/components/SidebarNav";
import FichaEstadoCliente from "@/pages/asesor/FichaEstadoCliente";
import ManualModal from "@/components/ManualModal";
import Paginacion from "@/components/Paginacion";
import { documentosDeCliente, totalPagadoUsd } from "@/lib/clienteHelpers";
import { esVentaGestion, categoriaGestion, fmtFechaHora } from "@/lib/gestiones";
import { estaEnMesActual, estaEnSemanaActual } from "@/lib/calendario";
import type { CategoriaDocumento } from "@/types";

type Seccion = "perfil" | "clientes" | "comisiones" | "estructura" | "leads" | "calendario";
type TabComunicados = "NUEVO" | "FIJADOS" | "TODOS";

const TAMANO_PAGINA_ESTADO = 5;

const MANUAL_ASESOR = [
  {
    titulo: "Perfil",
    descripcion:
      "Tu informacion personal, rango, bonos meta por cumplimiento de ventas y los comunicados y herramientas que publica tu franquicia.",
  },
  {
    titulo: "Mis clientes",
    descripcion:
      "Desde aqui registras un Cliente nuevo o gestionas uno Cliente existente (nuevo lote, pago de cuota, pago al contado, solicitud/cambio). Tambien marcas los Procesos pendientes (Contrato/Boleta: Entregado/Realizado) y el Portafolio de documentos (biblioteca de archivos por cliente, buscable).",
  },
  {
    titulo: "Comision",
    descripcion:
      "Tu saldo disponible, lo facturado en el ano y el historial de movimientos de comision que sube Administracion.",
  },
  {
    titulo: "Estructura",
    descripcion: "Proximamente: tu red de referidos o estructura de equipo.",
  },
  {
    titulo: "Leads",
    descripcion: "Proximamente: seguimiento de leads o prospectos antes de convertirse en clientes.",
  },
  {
    titulo: "Calendario",
    descripcion:
      "El calendario de presentaciones de los sabados (presencial/virtual) compartido entre franquicias. Solo ves la semana actual y el resto del mes en curso; lo configura Administracion.",
  },
];

export default function PerfilAsesor() {
  const sesion = useAppStore((s) => s.sesion);
  const asesores = useAppStore((s) => s.asesores);
  const clientes = useAppStore((s) => s.clientes);
  const comunicados = useAppStore((s) => s.comunicados);
  const herramientas = useAppStore((s) => s.herramientas);
  const movimientosComision = useAppStore((s) => s.movimientosComision);
  const gestiones = useAppStore((s) => s.gestiones);
  const calendarioSabados = useAppStore((s) => s.calendarioSabados);
  const canjearBonoMeta = useAppStore((s) => s.canjearBonoMeta);
  const actualizarPerfilAsesor = useAppStore((s) => s.actualizarPerfilAsesor);
  const agregarDocumentoCliente = useAppStore((s) => s.agregarDocumentoCliente);
  const eliminarDocumentoCliente = useAppStore((s) => s.eliminarDocumentoCliente);
  const reenviarGestionCorregida = useAppStore((s) => s.reenviarGestionCorregida);
  const actualizarDocumentoProceso = useAppStore((s) => s.actualizarDocumentoProceso);
  const [seccion, setSeccion] = useState<Seccion>("perfil");
  const [gestionCorrigiendoId, setGestionCorrigiendoId] = useState<string | null>(null);
  const [textosCorreccion, setTextosCorreccion] = useState<string[]>([]);
  const [adjuntosCorreccion, setAdjuntosCorreccion] = useState<
    { categoria: CategoriaDocumento; nombre: string }[]
  >([]);
  const [categoriaAdjuntoCorreccion, setCategoriaAdjuntoCorreccion] =
    useState<CategoriaDocumento>("VOUCHER");
  const [categoriaNuevoDoc, setCategoriaNuevoDoc] = useState<Record<string, CategoriaDocumento>>(
    {},
  );
  const [busquedaDoc, setBusquedaDoc] = useState("");
  const [busquedaEstado, setBusquedaEstado] = useState("");
  const [paginaEstado, setPaginaEstado] = useState(1);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [mostrarManual, setMostrarManual] = useState(false);
  const [mostrarTodosBonos, setMostrarTodosBonos] = useState(false);
  const [tabComunicados, setTabComunicados] = useState<TabComunicados>("NUEVO");
  const [formNombres, setFormNombres] = useState("");
  const [formFotoUrl, setFormFotoUrl] = useState("");

  const asesor = asesores.find((a) => a.id === sesion?.id);
  const autorizado = !!sesion && sesion.rol === "asesor" && !!asesor;
  useRedirectIfUnauthorized(autorizado);

  if (!autorizado || !asesor) {
    return null;
  }

  const misClientes = clientes.filter((c) => asesor.clienteIds.includes(c.id));
  const comunicadosFranquicia = comunicados.filter((c) => c.franquicia === asesor.franquicia);
  const sabadosDelMes = calendarioSabados
    .filter((s) => estaEnMesActual(s.fecha))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const sabadosEstaSemana = sabadosDelMes.filter((s) => estaEnSemanaActual(s.fecha));
  const sabadosRestoDelMes = sabadosDelMes.filter((s) => !estaEnSemanaActual(s.fecha));
  const herramientasFranquicia = herramientas.filter((h) => h.franquicia === asesor.franquicia);

  const misGestionesRechazadas = gestiones
    .filter((g) => g.asesorId === asesor.id && g.estado === "RECHAZADO")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const pendientesDocumentos = misClientes
    .flatMap((c) =>
      c.documentosProceso
        .filter((d) => !(d.entregado && d.realizado))
        .map((d) => ({ cliente: c, doc: d })),
    )
    .sort((a, b) => b.doc.createdAt.localeCompare(a.doc.createdAt));

  const pendientesPorCliente = misClientes
    .map((c) => ({
      cliente: c,
      docs: c.documentosProceso
        .filter((d) => !(d.entregado && d.realizado))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }))
    .filter(({ docs }) => docs.length > 0)
    .sort((a, b) => b.docs[0].createdAt.localeCompare(a.docs[0].createdAt));

  const totalVentasUsd = misClientes.reduce((acc, c) => acc + totalPagadoUsd(c), 0);

  const clientesFiltradosDoc = (() => {
    const q = busquedaDoc.trim().toLowerCase();
    if (!q) return [];
    return misClientes.filter(
      (c) =>
        c.nombres.toLowerCase().includes(q) ||
        c.codigo.toLowerCase().includes(q) ||
        documentosDeCliente(c).some((d) => d.nombre.toLowerCase().includes(q)),
    );
  })();

  const clientesFiltradosEstado = busquedaEstado.trim()
    ? misClientes.filter(
        (c) =>
          c.nombres.toLowerCase().includes(busquedaEstado.toLowerCase()) ||
          c.codigo.toLowerCase().includes(busquedaEstado.toLowerCase()),
      )
    : misClientes;

  const ventasRealizadas = gestiones.filter(
    (g) => g.asesorId === asesor.id && esVentaGestion(g),
  ).length;

  function porcentajeBono(objetivoVentas: number) {
    return Math.min(100, Math.round((ventasRealizadas / objetivoVentas) * 100));
  }

  const bonosActivos = asesor.bonosMeta.filter((b) => b.activoPorAdmin);
  const bonosVisibles = mostrarTodosBonos ? bonosActivos : bonosActivos.slice(0, 2);

  const comunicadosFiltrados = comunicadosFranquicia.filter((c) => {
    if (tabComunicados === "FIJADOS") return c.fijado;
    if (tabComunicados === "NUEVO") return c.nuevo;
    return true;
  });

  const misMovimientosComision = movimientosComision
    .filter((m) => m.asesorId === asesor.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const facturado = misMovimientosComision
    .filter((m) => m.tipo === "INGRESO")
    .reduce((acc, m) => acc + m.monto, 0);
  const totalEgresos = misMovimientosComision
    .filter((m) => m.tipo === "EGRESO")
    .reduce((acc, m) => acc + m.monto, 0);
  const saldoDisponible = facturado - totalEgresos;

  return (
    <div className="min-h-screen bg-neutral-100">
      <Topbar titulo={`Asesor - ${asesor.nombres}`} />

      <div className="flex">
        <SidebarNav
          items={[
            { key: "perfil", label: "Perfil" },
            { key: "clientes", label: "Mis clientes", badge: misClientes.length },
            { key: "comisiones", label: "Comision" },
            { key: "estructura", label: "Estructura" },
            { key: "leads", label: "Leads" },
            { key: "calendario", label: "Calendario" },
          ]}
          activo={seccion}
          onSelect={(key) => setSeccion(key as Seccion)}
        />

        <div className="flex-1 p-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* PERFIL (V1) */}
            {seccion === "perfil" && (
              <>
                <section className="bg-white rounded-lg shadow p-4 flex gap-4 items-center">
                  {asesor.fotoUrl ? (
                    <img
                      src={asesor.fotoUrl}
                      alt=""
                      className="w-16 h-16 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-neutral-300 shrink-0" />
                  )}
                  <div className="text-sm">
                    <p className="font-semibold">{asesor.nombres}</p>
                    <p className="text-neutral-500">{asesor.franquicia}</p>
                    <p className="text-neutral-500">Rango: {asesor.rango}</p>
                  </div>
                </section>

                <section className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="font-semibold">Bono meta</h2>
                    {bonosActivos.length > 2 && (
                      <button
                        onClick={() => setMostrarTodosBonos((v) => !v)}
                        className="text-xs text-blue-600"
                      >
                        {mostrarTodosBonos ? "Ver menos" : "Ver mas bonos"}
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {bonosVisibles.map((b) => {
                      const pct = porcentajeBono(b.objetivoVentas);
                      return (
                        <div key={b.id}>
                          <p className="text-sm text-neutral-600 mb-1">
                            {b.titulo}: {b.premio} - {ventasRealizadas}/{b.objetivoVentas} ventas
                            realizadas
                          </p>
                          <div className="h-2 bg-neutral-200 rounded mb-2">
                            <div className="h-2 bg-green-500 rounded" style={{ width: `${pct}%` }} />
                          </div>
                          {b.canjeado ? (
                            <span className="text-green-600 text-xs font-medium">Bono canjeado</span>
                          ) : (
                            <button
                              disabled={pct < 100}
                              onClick={() => canjearBonoMeta(asesor.id, b.id)}
                              className="text-xs bg-neutral-900 text-white rounded px-3 py-1.5 disabled:opacity-30"
                            >
                              Canjear bono
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {bonosActivos.length === 0 && (
                      <p className="text-sm text-neutral-400">
                        Administracion Fk aun no activo bonos meta para ti
                      </p>
                    )}
                  </div>
                </section>

                <section className="bg-white rounded-lg shadow p-4">
                  <h2 className="font-semibold mb-2">Comunicados o noticias</h2>
                  <div className="flex mb-3 rounded-md overflow-hidden border border-neutral-200 text-xs">
                    {(["NUEVO", "FIJADOS", "TODOS"] as TabComunicados[]).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setTabComunicados(tab)}
                        className={`flex-1 py-1.5 ${
                          tabComunicados === tab ? "bg-neutral-900 text-white" : "bg-white text-neutral-600"
                        }`}
                      >
                        {tab.charAt(0) + tab.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {comunicadosFiltrados.map((c) => (
                      <div key={c.id} className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between">
                        <span>
                          {c.fijado && "📌 "}
                          {c.titulo}
                        </span>
                        <span className="text-neutral-400 text-xs shrink-0 ml-2">{c.fecha}</span>
                      </div>
                    ))}
                    {comunicadosFiltrados.length === 0 && (
                      <p className="text-sm text-neutral-400">Sin comunicados en esta pestana</p>
                    )}
                  </div>
                </section>

                <section className="bg-white rounded-lg shadow p-4">
                  <h2 className="font-semibold mb-2">Herramientas</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {herramientasFranquicia.map((h) => (
                      <a
                        key={h.id}
                        href={h.url}
                        className="text-xs border border-neutral-200 rounded px-2 py-3 text-center hover:bg-neutral-50"
                      >
                        {h.tipo === "VIDEO" ? "Video: " : "Flyer: "}
                        {h.nombre}
                      </a>
                    ))}
                    {herramientasFranquicia.length === 0 && (
                      <p className="text-sm text-neutral-400 col-span-3">Sin recursos aun</p>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* MIS CLIENTES (V2) */}
            {seccion === "clientes" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/asesor/nuevo-cliente"
                    className="bg-neutral-900 text-white text-sm rounded-lg px-4 py-4 text-center font-medium"
                  >
                    Cliente nuevo
                  </Link>
                  <Link
                    to="/asesor/cliente-existente"
                    className="bg-white border border-neutral-300 text-sm rounded-lg px-4 py-4 text-center font-medium"
                  >
                    Cliente existente
                  </Link>
                </div>

                <section className="bg-white rounded-lg shadow p-4">
                  <h2 className="font-semibold mb-1">
                    Solicitudes rechazadas ({misGestionesRechazadas.length})
                  </h2>
                  <p className="text-xs text-neutral-400 mb-3">
                    Administracion FK rechazo estas solicitudes. Revisa lo que debes corregir y
                    reenvia.
                  </p>
                  <div className="space-y-2">
                    {misGestionesRechazadas.map((g) => {
                      const cliente = clientes.find((c) => c.id === g.clienteId);
                      const corrigiendo = gestionCorrigiendoId === g.id;
                      return (
                        <div
                          key={g.id}
                          className="border border-red-200 bg-red-50 rounded-lg p-3"
                        >
                          <p className="text-sm font-medium">
                            {categoriaGestion(g)} -{" "}
                            <span className="text-neutral-500">
                              {cliente?.nombres ?? "Cliente"}
                            </span>
                          </p>
                          <p className="text-xs text-neutral-500 mb-2">
                            {fmtFechaHora(g.createdAt)}
                          </p>
                          <div className="text-xs bg-white border border-red-200 rounded p-2 space-y-1 mb-2">
                            <p>
                              <span className="font-semibold text-red-700">Motivo: </span>
                              {g.motivoRechazo || "Sin detalle"}
                            </p>
                            <p>
                              <span className="font-semibold text-red-700">Debe corregir: </span>
                              {g.correccionSolicitada || "Sin detalle"}
                            </p>
                          </div>

                          {!corrigiendo ? (
                            <button
                              onClick={() => {
                                setGestionCorrigiendoId(g.id);
                                setTextosCorreccion([...g.copys]);
                                setAdjuntosCorreccion([]);
                              }}
                              className="text-xs bg-neutral-900 text-white rounded px-3 py-1.5"
                            >
                              Corregir
                            </button>
                          ) : (
                            <div className="space-y-2">
                              {textosCorreccion.map((texto, i) => (
                                <div key={i}>
                                  {textosCorreccion.length > 1 && (
                                    <p className="text-xs font-semibold text-neutral-500 mb-1">
                                      Copy {i + 1}
                                    </p>
                                  )}
                                  <textarea
                                    className="input font-mono text-xs"
                                    rows={8}
                                    value={texto}
                                    onChange={(e) =>
                                      setTextosCorreccion((arr) =>
                                        arr.map((t, idx) => (idx === i ? e.target.value : t)),
                                      )
                                    }
                                  />
                                </div>
                              ))}

                              <div className="border-t border-red-100 pt-2">
                                <p className="text-xs font-semibold text-neutral-500 mb-1">
                                  Adjuntar documento o foto corregida (opcional)
                                </p>
                                <div className="flex gap-2 items-center mb-1">
                                  <select
                                    className="input text-xs py-1"
                                    value={categoriaAdjuntoCorreccion}
                                    onChange={(e) =>
                                      setCategoriaAdjuntoCorreccion(
                                        e.target.value as CategoriaDocumento,
                                      )
                                    }
                                  >
                                    <option value="VOUCHER">Voucher</option>
                                    <option value="DNI">Foto de DNI</option>
                                    <option value="UBICACION_LOTE">Foto de ubicacion del lote</option>
                                    <option value="DOCUMENTO">Otro documento</option>
                                    <option value="CONTRATO">Contrato</option>
                                    <option value="BOLETA_O_FACTURA">Boleta o factura</option>
                                  </select>
                                  <label className="text-xs text-blue-600 cursor-pointer shrink-0">
                                    + Adjuntar archivo
                                    <input
                                      type="file"
                                      multiple
                                      accept="image/*,application/pdf"
                                      className="hidden"
                                      onChange={(e) => {
                                        const files = e.target.files;
                                        if (!files) return;
                                        const nuevos = Array.from(files).map((f) => ({
                                          categoria: categoriaAdjuntoCorreccion,
                                          nombre: f.name,
                                        }));
                                        setAdjuntosCorreccion((arr) => [...arr, ...nuevos]);
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                </div>
                                {adjuntosCorreccion.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-1">
                                    {adjuntosCorreccion.map((a, i) => (
                                      <span
                                        key={i}
                                        className="text-xs bg-neutral-100 border border-neutral-200 rounded px-2 py-1 flex items-center gap-1"
                                      >
                                        [{a.categoria}] {a.nombre}
                                        <button
                                          onClick={() =>
                                            setAdjuntosCorreccion((arr) =>
                                              arr.filter((_, idx) => idx !== i),
                                            )
                                          }
                                          className="text-red-500 hover:text-red-700 font-bold"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    adjuntosCorreccion.forEach((a) =>
                                      agregarDocumentoCliente(g.clienteId, a),
                                    );
                                    reenviarGestionCorregida(g.id, textosCorreccion);
                                    setGestionCorrigiendoId(null);
                                  }}
                                  className="text-xs bg-green-600 text-white rounded px-3 py-1.5"
                                >
                                  Reenviar corregido
                                </button>
                                <button
                                  onClick={() => setGestionCorrigiendoId(null)}
                                  className="text-xs text-neutral-500 px-3 py-1.5"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {misGestionesRechazadas.length === 0 && (
                      <p className="text-sm text-neutral-400">Sin solicitudes rechazadas</p>
                    )}
                  </div>
                </section>

                <section className="bg-white rounded-lg shadow p-4">
                  <h2 className="font-semibold mb-1">
                    Procesos pendientes ({pendientesDocumentos.length})
                  </h2>
                  <p className="text-xs text-neutral-400 mb-3">
                    Marca Entregado/Realizado cuando corresponda. Administracion FK puede pedir
                    correccion si algo esta mal.
                  </p>
                  <div className="space-y-3">
                    {pendientesPorCliente.map(({ cliente, docs }) => (
                      <div
                        key={cliente.id}
                        className="border border-neutral-200 rounded-lg px-3 py-2"
                      >
                        <p className="text-sm font-semibold mb-2">{cliente.nombres}</p>
                        <div className="space-y-2">
                          {docs.map((doc, i) => (
                            <div
                              key={doc.id}
                              className={i > 0 ? "pt-2 border-t border-neutral-100" : ""}
                            >
                              <p className="text-xs text-neutral-500 mb-1">{doc.descripcion}</p>
                              <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={doc.entregado}
                                    onChange={(e) =>
                                      actualizarDocumentoProceso(cliente.id, doc.id, {
                                        entregado: e.target.checked,
                                      })
                                    }
                                  />
                                  Entregado
                                </label>
                                <label className="flex items-center gap-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={doc.realizado}
                                    onChange={(e) =>
                                      actualizarDocumentoProceso(cliente.id, doc.id, {
                                        realizado: e.target.checked,
                                      })
                                    }
                                  />
                                  Realizado
                                </label>
                              </div>
                              {doc.requiereCorreccion && (
                                <p className="text-xs text-red-600 mt-1">
                                  ⚠ Requiere correccion
                                  {doc.notaCorreccion ? `: ${doc.notaCorreccion}` : ""}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {pendientesPorCliente.length === 0 && (
                      <p className="text-sm text-neutral-400">Sin pendientes</p>
                    )}
                  </div>
                </section>

                <section className="bg-white rounded-lg shadow p-4">
                  <h2 className="font-semibold mb-3">Portafolio de documentos</h2>
                  <div className="relative mb-3">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                      🔍
                    </span>
                    <input
                      className="input pl-8"
                      placeholder="Buscar cliente o documento exacto..."
                      value={busquedaDoc}
                      onChange={(e) => setBusquedaDoc(e.target.value)}
                    />
                  </div>
                  {!busquedaDoc.trim() ? (
                    <p className="text-sm text-neutral-400 text-center py-4">
                      Busca por nombre, codigo de cliente o nombre de archivo para ver sus
                      documentos.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {clientesFiltradosDoc.map((c) => {
                        const docs = documentosDeCliente(c);
                        return (
                          <div key={c.id} className="text-sm border border-neutral-200 rounded px-3 py-2">
                            <div className="flex justify-between mb-2">
                              <span className="font-medium">{c.nombres}</span>
                              <span className="text-neutral-400">{c.codigo}</span>
                            </div>
                            <div className="flex gap-2 flex-wrap mb-2">
                              {docs.map((d) => (
                                <span
                                  key={d.id}
                                  className="text-xs bg-neutral-100 border border-neutral-200 rounded px-2 py-1 flex items-center gap-1"
                                >
                                  <a href={d.url} className="text-blue-600">
                                    [{d.categoria}] {d.nombre}
                                  </a>
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Quitar "${d.nombre}" de la biblioteca?`)) {
                                        eliminarDocumentoCliente(c.id, d.id);
                                      }
                                    }}
                                    className="text-red-500 hover:text-red-700 font-bold"
                                    title="Quitar documento"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                              {docs.length === 0 && (
                                <span className="text-xs text-neutral-400">Sin documentos</span>
                              )}
                            </div>
                            <div className="flex gap-2 items-center pt-2 border-t border-neutral-100">
                              <select
                                className="input text-xs py-1"
                                value={categoriaNuevoDoc[c.id] ?? "DOCUMENTO"}
                                onChange={(e) =>
                                  setCategoriaNuevoDoc((m) => ({
                                    ...m,
                                    [c.id]: e.target.value as CategoriaDocumento,
                                  }))
                                }
                              >
                                <option value="DOCUMENTO">Documento</option>
                                <option value="DNI">Foto de DNI</option>
                                <option value="UBICACION_LOTE">Foto de ubicacion del lote</option>
                                <option value="CONTRATO">Contrato</option>
                                <option value="VOUCHER">Voucher</option>
                                <option value="BOLETA_O_FACTURA">Boleta o factura</option>
                              </select>
                              <label className="text-xs text-blue-600 cursor-pointer shrink-0">
                                + Agregar documento
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const nombre = e.target.files?.[0]?.name;
                                    if (!nombre) return;
                                    agregarDocumentoCliente(c.id, {
                                      categoria: categoriaNuevoDoc[c.id] ?? "DOCUMENTO",
                                      nombre,
                                    });
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                      {clientesFiltradosDoc.length === 0 && (
                        <p className="text-sm text-neutral-400 text-center py-2">
                          Sin resultados para "{busquedaDoc}"
                        </p>
                      )}
                    </div>
                  )}
                </section>

                <section className="bg-white rounded-lg shadow p-4">
                  <h2 className="font-semibold mb-3">Estados de clientes</h2>
                  <input
                    className="input mb-3"
                    placeholder="Buscar cliente..."
                    value={busquedaEstado}
                    onChange={(e) => {
                      setBusquedaEstado(e.target.value);
                      setPaginaEstado(1);
                    }}
                  />
                  {(() => {
                    const clientesConInversiones = clientesFiltradosEstado.filter(
                      (c) => c.inversiones.length > 0,
                    );
                    const totalPaginasEstado = Math.max(
                      1,
                      Math.ceil(clientesConInversiones.length / TAMANO_PAGINA_ESTADO),
                    );
                    const paginaActual = Math.min(paginaEstado, totalPaginasEstado);
                    const visibles = clientesConInversiones.slice(
                      (paginaActual - 1) * TAMANO_PAGINA_ESTADO,
                      paginaActual * TAMANO_PAGINA_ESTADO,
                    );
                    return (
                      <>
                        <div className="space-y-3">
                          {visibles.map((c) => (
                            <FichaEstadoCliente key={c.id} cliente={c} />
                          ))}
                          {clientesConInversiones.length === 0 && (
                            <p className="text-sm text-neutral-400">Sin inversiones registradas</p>
                          )}
                        </div>
                        {clientesConInversiones.length > 0 && (
                          <Paginacion
                            paginaActual={paginaActual}
                            totalPaginas={totalPaginasEstado}
                            onCambiar={setPaginaEstado}
                            totalItems={clientesConInversiones.length}
                            tamanoPagina={TAMANO_PAGINA_ESTADO}
                            etiqueta="clientes"
                          />
                        )}
                      </>
                    );
                  })()}
                </section>
              </>
            )}

            {/* COMISION (V3) */}
            {seccion === "comisiones" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <section className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-neutral-500 mb-1">Saldo disponible</p>
                    <p className="text-xl font-semibold">USD {saldoDisponible.toLocaleString()}</p>
                  </section>
                  <section className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-neutral-500 mb-1">Facturado (acumulado del ano)</p>
                    <p className="text-xl font-semibold">USD {facturado.toLocaleString()}</p>
                  </section>
                </div>

                <section className="bg-white rounded-lg shadow p-4">
                  <h2 className="font-semibold mb-3">Movimientos</h2>
                  <div className="space-y-1">
                    {misMovimientosComision.map((m) => {
                      const cliente = m.clienteId ? clientes.find((c) => c.id === m.clienteId) : null;
                      return (
                        <div
                          key={m.id}
                          className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between items-center"
                        >
                          <span>
                            <span
                              className={
                                m.tipo === "INGRESO"
                                  ? "text-green-600 font-medium"
                                  : "text-red-600 font-medium"
                              }
                            >
                              {m.tipo === "INGRESO" ? "+" : "-"}
                            </span>{" "}
                            {m.tipo === "INGRESO"
                              ? `Comision de ${cliente?.nombres ?? "cliente"}`
                              : `Egreso: ${m.motivo ?? "sin motivo"}`}{" "}
                            <span className="text-neutral-400 text-xs">({m.codigoMovimiento})</span>
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className="font-medium">
                              {m.moneda} {m.monto}
                            </span>
                            <span className="text-neutral-400 text-xs">{m.fecha}</span>
                          </span>
                        </div>
                      );
                    })}
                    {misMovimientosComision.length === 0 && (
                      <p className="text-sm text-neutral-400">Sin movimientos de comision aun</p>
                    )}
                  </div>
                </section>

                <section className="bg-white rounded-lg shadow p-4">
                  <h2 className="font-semibold mb-3">Ventas (referencia)</h2>
                  <div className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between mb-2">
                    <span>Clientes activos</span>
                    <span className="font-medium">{misClientes.length}</span>
                  </div>
                  <div className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between">
                    <span>Total vendido (USD)</span>
                    <span className="font-medium">USD {totalVentasUsd.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-2">
                    El saldo/facturado de arriba lo actualiza Administracion Fk cuando sube o
                    descuenta una comision.
                  </p>
                </section>
              </>
            )}

            {/* ESTRUCTURA (V4) */}
            {seccion === "estructura" && (
              <section className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold mb-3">
                  Clientes subidos por mi ({misClientes.length})
                </h2>
                <div className="space-y-1">
                  {[...misClientes]
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((c) => (
                      <div
                        key={c.id}
                        className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between"
                      >
                        <span>
                          {c.codigo} - {c.nombres}
                        </span>
                        <span className="text-neutral-400 text-xs">
                          {c.propiedades[0]
                            ? `${c.propiedades[0].etapa} MZ ${c.propiedades[0].manzana} LOTE ${c.propiedades[0].lote}`
                            : "Sin lote"}{" "}
                          - {c.createdAt}
                        </span>
                      </div>
                    ))}
                  {misClientes.length === 0 && (
                    <p className="text-sm text-neutral-400">Aun no has subido clientes</p>
                  )}
                </div>
              </section>
            )}

            {/* LEADS (V5) */}
            {seccion === "leads" && (
              <section className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold mb-2">Leads</h2>
                <p className="text-sm text-neutral-400">
                  Proximamente. Aun no se definio la logica de esta seccion.
                </p>
              </section>
            )}

            {seccion === "calendario" && (
              <section className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold mb-3">Calendario de presentaciones</h2>
                <h3 className="text-sm font-semibold text-neutral-600 mb-2">Esta semana</h3>
                <div className="space-y-1 mb-4">
                  {sabadosEstaSemana.map((s) => (
                    <div
                      key={s.id}
                      className="text-sm border border-blue-300 bg-blue-50 rounded px-3 py-2"
                    >
                      <p className="font-medium">
                        {s.fecha} -{" "}
                        <span
                          className={
                            s.modalidad === "PRESENCIAL" ? "text-green-700" : "text-blue-700"
                          }
                        >
                          {s.modalidad}
                        </span>
                      </p>
                      <p className="text-xs text-neutral-500">
                        {s.franquicia} - Encargado: {s.encargado}
                      </p>
                    </div>
                  ))}
                  {sabadosEstaSemana.length === 0 && (
                    <p className="text-sm text-neutral-400">
                      No hay presentacion programada para esta semana.
                    </p>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-neutral-600 mb-2">Resto del mes</h3>
                <div className="space-y-1">
                  {sabadosRestoDelMes.map((s) => (
                    <div key={s.id} className="text-sm border border-neutral-200 rounded px-3 py-2">
                      <p>
                        {s.fecha} -{" "}
                        <span
                          className={
                            s.modalidad === "PRESENCIAL" ? "text-green-700" : "text-blue-700"
                          }
                        >
                          {s.modalidad}
                        </span>
                      </p>
                      <p className="text-xs text-neutral-400">
                        {s.franquicia} - Encargado: {s.encargado}
                      </p>
                    </div>
                  ))}
                  {sabadosRestoDelMes.length === 0 && (
                    <p className="text-sm text-neutral-400">Sin mas fechas este mes.</p>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setMostrarManual(true)}
        title="Manual de uso"
        className="fixed bottom-4 left-16 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg"
      >
        ?
      </button>

      <button
        onClick={() => {
          setFormNombres(asesor.nombres);
          setFormFotoUrl(asesor.fotoUrl ?? "");
          setMostrarConfig(true);
        }}
        title="Configuracion"
        className="fixed bottom-4 left-4 w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-lg"
      >
        ⚙
      </button>

      {mostrarManual && (
        <ManualModal
          titulo="Manual de uso - Asesor"
          items={MANUAL_ASESOR}
          onClose={() => setMostrarManual(false)}
        />
      )}

      {mostrarConfig && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow p-4 w-full max-w-sm">
            <h2 className="font-semibold mb-3">Editar perfil</h2>
            <label className="block mb-3">
              <span className="block text-xs text-neutral-500 mb-1">Nombre</span>
              <input
                className="input"
                value={formNombres}
                onChange={(e) => setFormNombres(e.target.value)}
              />
            </label>
            <label className="block mb-4">
              <span className="block text-xs text-neutral-500 mb-1">
                URL de foto de perfil
              </span>
              <input
                className="input"
                placeholder="https://..."
                value={formFotoUrl}
                onChange={(e) => setFormFotoUrl(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setMostrarConfig(false)}
                className="text-sm text-neutral-500 px-3 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  actualizarPerfilAsesor(asesor.id, {
                    nombres: formNombres,
                    fotoUrl: formFotoUrl || undefined,
                  });
                  setMostrarConfig(false);
                }}
                className="bg-neutral-900 text-white text-sm rounded px-3 py-2"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
