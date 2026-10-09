import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Gift, IdCard, MapPin, MessageSquare } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { estadoBono } from "@/lib/inversiones";
import { PASOS_TITULACION, labelProcesoTitulacion } from "@/lib/titulacion";
import { fechaVencimientoApp, appVencida } from "@/lib/cuentaApp";
import { documentosDeCliente, inversionesConTitulacion, resumenTiposLote } from "@/lib/clienteHelpers";
import BeneficioEditor, { BENEFICIOS_TIPO } from "@/components/BeneficioEditor";
import type { Cliente, PrioridadObservacion, TipoBono, TipoModalidad } from "@/types";

type Panel = "titulacion" | "app" | "lote" | "bonosgrupos" | "dni" | "observaciones";

const PRIORIDAD_ESTILO: Record<PrioridadObservacion, string> = {
  BAJA: "bg-amber-100 text-amber-700",
  MEDIA: "bg-orange-100 text-orange-700",
  ALTA: "bg-red-100 text-red-700",
};
const PRIORIDAD_LABEL: Record<PrioridadObservacion, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
};
const ORDEN_PRIORIDAD: Record<PrioridadObservacion, number> = { ALTA: 2, MEDIA: 1, BAJA: 0 };
const PRIORIDAD_DOT: Record<PrioridadObservacion, string> = {
  BAJA: "bg-amber-500",
  MEDIA: "bg-orange-500",
  ALTA: "bg-red-500",
};

const COLORES_AVATAR = [
  "bg-rose-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-indigo-400",
  "bg-fuchsia-400",
];

function colorAvatar(id: string): string {
  const hash = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return COLORES_AVATAR[hash % COLORES_AVATAR.length];
}

function iniciales(nombres: string): string {
  const partes = nombres.trim().split(/\s+/);
  return (partes[0]?.[0] ?? "").concat(partes[1]?.[0] ?? "").toUpperCase();
}

function resumenModalidad(cliente: Cliente): string {
  const modalidades = new Set(
    cliente.inversiones.map((i) => i.modalidad).filter((m): m is TipoModalidad => !!m),
  );
  if (modalidades.size === 0) return "-";
  if (modalidades.size > 1) return "Mixto";
  return modalidades.has("CONTADO") ? "Contado" : "Financiado";
}

function IconAccion({
  icon,
  activo,
  alerta,
  alertaColor = "bg-red-500",
  titulo,
  onClick,
}: {
  icon: React.ReactNode;
  activo: boolean;
  alerta: boolean;
  alertaColor?: string;
  titulo: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={titulo}
      className={`relative w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
        activo
          ? "bg-neutral-900 border-neutral-900 text-white"
          : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-100"
      }`}
    >
      {icon}
      {alerta && !activo && (
        <span
          className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${alertaColor}`}
        />
      )}
    </button>
  );
}

export default function FilaCliente({
  cliente,
  asesorNombre,
  gestionesPendientes,
  docsPendientes,
}: {
  cliente: Cliente;
  asesorNombre: string;
  gestionesPendientes: number;
  docsPendientes: number;
}) {
  const navigate = useNavigate();
  const actualizarCuentaApp = useAppStore((s) => s.actualizarCuentaApp);
  const actualizarActivacionBono = useAppStore((s) => s.actualizarActivacionBono);
  const actualizarGruposCliente = useAppStore((s) => s.actualizarGruposCliente);
  const agregarBonoCliente = useAppStore((s) => s.agregarBonoCliente);
  const actualizarProcesoTitulacionInversion = useAppStore(
    (s) => s.actualizarProcesoTitulacionInversion,
  );
  const actualizarCorreccionDocumento = useAppStore((s) => s.actualizarCorreccionDocumento);
  const marcarObservacionVista = useAppStore((s) => s.marcarObservacionVista);

  const [panel, setPanel] = useState<Panel | null>(null);

  function togglePanel(p: Panel) {
    setPanel((actual) => (actual === p ? null : p));
  }

  const [docIdCorrigiendo, setDocIdCorrigiendo] = useState<string | null>(null);
  const [notaTmp, setNotaTmp] = useState("");
  const [agregandoBono, setAgregandoBono] = useState(false);
  const [nuevoBonoTipo, setNuevoBonoTipo] = useState<TipoBono>(BENEFICIOS_TIPO[0].value);
  const [nuevoBonoEtiqueta, setNuevoBonoEtiqueta] = useState("");

  function guardarCorreccion(docId: string) {
    actualizarCorreccionDocumento(cliente.id, docId, {
      requiereCorreccion: true,
      notaCorreccion: notaTmp.trim(),
    });
    setDocIdCorrigiendo(null);
    setNotaTmp("");
  }

  function quitarCorreccion(docId: string) {
    actualizarCorreccionDocumento(cliente.id, docId, { requiereCorreccion: false });
  }

  const fotosDni = documentosDeCliente(cliente).filter((d) => d.categoria === "DNI");
  const fotosLote = documentosDeCliente(cliente).filter((d) => d.categoria === "UBICACION_LOTE");
  const bonosActivos = cliente.bonos.filter((b) => b.activadoPorAsesor && !b.canjeado);
  const gruposActivos = [
    cliente.grupoEmbajadores ? "Embajadores" : null,
    cliente.grupoFamiliaKaizen ? "Familia Kaizen" : null,
  ].filter(Boolean) as string[];
  const observacionesNoVistas = cliente.observaciones.filter((o) => !o.visto);
  const prioridadMasAlta = observacionesNoVistas.reduce<PrioridadObservacion | null>(
    (max, o) => (max === null || ORDEN_PRIORIDAD[o.prioridad] > ORDEN_PRIORIDAD[max] ? o.prioridad : max),
    null,
  );
  const appActiva = cliente.cuentaApp.activa && !appVencida(cliente.cuentaApp.fechaActivacion ?? "");
  const inversionesTitulacion = inversionesConTitulacion(cliente);

  return (
    <>
      <tr className="border-b border-neutral-100 hover:bg-neutral-50">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${colorAvatar(cliente.id)}`}
            >
              {iniciales(cliente.nombres)}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{cliente.nombres}</p>
              <p className="text-xs text-neutral-400 truncate">{cliente.codigo}</p>
              {cliente.solicitudEliminacion && (
                <span className="inline-block mt-0.5 text-xs bg-red-100 text-red-700 rounded px-1.5 py-0.5 whitespace-nowrap">
                  ⚠ Eliminacion pendiente
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">{asesorNombre}</td>
        <td className="px-4 py-3">
          <span className="text-xs rounded-full px-2.5 py-1 bg-neutral-100 text-neutral-600 whitespace-nowrap">
            {resumenModalidad(cliente)}
          </span>
          {resumenTiposLote(cliente) && (
            <span
              title="Esta venta incluye varios lotes o media manzana/manzana. Revisa el detalle de titulacion para ver como estan agrupados los contratos."
              className="block mt-1 text-xs rounded-full px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap w-fit"
            >
              {resumenTiposLote(cliente)}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {inversionesTitulacion.length === 0 ? (
            <span className="text-xs text-neutral-400">Sin lote</span>
          ) : (
            <button
              onClick={() => togglePanel("titulacion")}
              className={`text-xs rounded-full px-2.5 py-1 border whitespace-nowrap ${
                panel === "titulacion"
                  ? "bg-neutral-900 border-neutral-900 text-white"
                  : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {inversionesTitulacion.length === 1
                ? labelProcesoTitulacion(inversionesTitulacion[0].procesoTitulacion ?? -1)
                : `Titulacion (${inversionesTitulacion.length})`}
            </button>
          )}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={() => togglePanel("app")}
            className={`text-xs rounded-full px-2.5 py-1 border whitespace-nowrap ${
              appActiva
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {cliente.cuentaApp.activa ? (appActiva ? "App activa" : "App vencida") : "App inactiva"}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1">
            <span
              className={`text-xs rounded px-2 py-0.5 whitespace-nowrap ${
                gestionesPendientes > 0
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {gestionesPendientes > 0 ? `${gestionesPendientes} envio(s)` : "Envios al dia"}
            </span>
            <span
              className={`text-xs rounded px-2 py-0.5 whitespace-nowrap ${
                docsPendientes > 0 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
              }`}
            >
              {docsPendientes > 0 ? `${docsPendientes} doc(s)` : "Docs al dia"}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 justify-end">
            <IconAccion
              icon={<Gift size={15} />}
              titulo="Bonos y grupos"
              activo={panel === "bonosgrupos"}
              alerta={bonosActivos.length > 0}
              onClick={() => togglePanel("bonosgrupos")}
            />
            <IconAccion
              icon={<IdCard size={15} />}
              titulo="Fotos de DNI"
              activo={panel === "dni"}
              alerta={fotosDni.some((d) => d.requiereCorreccion)}
              onClick={() => togglePanel("dni")}
            />
            <IconAccion
              icon={<MapPin size={15} />}
              titulo="Foto de ubicacion del lote"
              activo={panel === "lote"}
              alerta={fotosLote.some((d) => d.requiereCorreccion)}
              onClick={() => togglePanel("lote")}
            />
            <IconAccion
              icon={<MessageSquare size={15} />}
              titulo="Observaciones"
              activo={panel === "observaciones"}
              alerta={observacionesNoVistas.length > 0}
              alertaColor={prioridadMasAlta ? PRIORIDAD_DOT[prioridadMasAlta] : undefined}
              onClick={() => togglePanel("observaciones")}
            />
            <button
              onClick={() => navigate(`/admin/cliente/${cliente.id}`)}
              title="Ver ficha completa"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-900 text-white hover:bg-neutral-700"
            >
              <Eye size={15} />
            </button>
          </div>
        </td>
      </tr>

      {panel && (
        <tr className="bg-neutral-50 border-b border-neutral-100">
          <td colSpan={7} className="px-4 py-4">
            {panel === "titulacion" && (
              <div className="space-y-2 max-w-lg">
                {inversionesTitulacion.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-2 bg-white border border-neutral-200 rounded px-2 py-1.5">
                    <span className="text-xs text-neutral-600 truncate">{inv.descripcion}</span>
                    <select
                      className="input w-auto max-w-[60%] shrink-0 text-xs"
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
                ))}
              </div>
            )}

            {panel === "app" && (
              <div className="text-sm space-y-2 max-w-sm">
                <p className="text-neutral-600">
                  {cliente.cuentaApp.activa && cliente.cuentaApp.fechaActivacion
                    ? appVencida(cliente.cuentaApp.fechaActivacion)
                      ? `Vencida (${fechaVencimientoApp(cliente.cuentaApp.fechaActivacion)})`
                      : `Vigente hasta ${fechaVencimientoApp(cliente.cuentaApp.fechaActivacion)}`
                    : "Aun no activada"}
                </p>
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
                <div className="bg-white border border-neutral-200 rounded p-2 text-xs">
                  <p className="font-semibold text-neutral-500 mb-1">Credenciales de la app</p>
                  <p>Usuario: {cliente.usuarioApp.usuario}</p>
                  <p>Contrasena: {cliente.usuarioApp.clave}</p>
                </div>
              </div>
            )}

            {(panel === "lote" || panel === "dni") && (
              <div className="space-y-2 max-w-lg">
                {(panel === "lote" ? fotosLote : fotosDni).map((d) => (
                  <div key={d.id} className="text-xs bg-white border border-neutral-200 rounded px-2 py-1.5">
                    <div className="flex justify-between items-center gap-2">
                      <a href={d.url} className="text-blue-600 truncate">
                        {d.nombre}
                      </a>
                      <div className="flex gap-1 shrink-0">
                        {d.requiereCorreccion ? (
                          <button
                            onClick={() => quitarCorreccion(d.id)}
                            className="text-green-700 bg-green-100 rounded px-2 py-0.5"
                          >
                            Quitar aviso
                          </button>
                        ) : docIdCorrigiendo === d.id ? null : (
                          <button
                            onClick={() => {
                              setDocIdCorrigiendo(d.id);
                              setNotaTmp("");
                            }}
                            className="text-red-700 bg-red-100 rounded px-2 py-0.5"
                          >
                            Pedir correccion
                          </button>
                        )}
                      </div>
                    </div>
                    {d.requiereCorreccion && d.notaCorreccion && (
                      <p className="text-red-600 mt-1">Nota: {d.notaCorreccion}</p>
                    )}
                    {docIdCorrigiendo === d.id && (
                      <div className="mt-2 space-y-1">
                        <textarea
                          className="input text-xs"
                          rows={2}
                          placeholder="Detalle de la correccion pedida..."
                          value={notaTmp}
                          onChange={(e) => setNotaTmp(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => guardarCorreccion(d.id)}
                            className="text-xs bg-neutral-900 text-white rounded px-2 py-1"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setDocIdCorrigiendo(null)}
                            className="text-xs text-neutral-500"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {(panel === "lote" ? fotosLote : fotosDni).length === 0 && (
                  <p className="text-xs text-neutral-400">Sin fotos subidas aun</p>
                )}
              </div>
            )}

            {panel === "bonosgrupos" && (
              <div className="space-y-3 max-w-lg">
                <div>
                  <p className="text-xs font-semibold text-neutral-500 mb-1">
                    Bonos activos ({bonosActivos.length})
                  </p>
                  <div className="space-y-1">
                    {cliente.bonos.map((b) => {
                      const estado = estadoBono(b);
                      return (
                        <div
                          key={b.id}
                          className="text-xs bg-white border border-neutral-200 rounded px-2 py-1 flex justify-between items-center gap-2"
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
                          <span className={`rounded px-2 py-0.5 shrink-0 ${estado.className}`}>
                            {estado.label}
                          </span>
                        </div>
                      );
                    })}
                    {cliente.bonos.length === 0 && (
                      <p className="text-xs text-neutral-400">Sin bonos</p>
                    )}
                  </div>
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
                    <button
                      onClick={() => setAgregandoBono(true)}
                      className="mt-2 text-xs text-blue-600"
                    >
                      + Agregar bono negociado
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-500 mb-1">
                    Grupos activos ({gruposActivos.length})
                  </p>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={cliente.grupoEmbajadores}
                        onChange={(e) =>
                          actualizarGruposCliente(cliente.id, {
                            grupoEmbajadores: e.target.checked,
                          })
                        }
                      />
                      Embajadores
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={cliente.grupoFamiliaKaizen}
                        onChange={(e) =>
                          actualizarGruposCliente(cliente.id, {
                            grupoFamiliaKaizen: e.target.checked,
                          })
                        }
                      />
                      Familia Kaizen
                    </label>
                  </div>
                </div>
              </div>
            )}

            {panel === "observaciones" && (
              <div className="space-y-2 max-w-lg">
                {[...cliente.observaciones]
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                  .map((o) => (
                    <div key={o.id} className="text-xs bg-white border border-neutral-200 rounded px-2 py-1.5">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className={`rounded px-2 py-0.5 shrink-0 ${PRIORIDAD_ESTILO[o.prioridad]}`}>
                          {PRIORIDAD_LABEL[o.prioridad]}
                        </span>
                        <span className="text-neutral-400 shrink-0">
                          {new Date(o.fecha).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-neutral-700">{o.texto}</p>
                      <label className="flex items-center gap-1 mt-1 text-neutral-500">
                        <input
                          type="checkbox"
                          checked={o.visto}
                          onChange={(e) =>
                            marcarObservacionVista(cliente.id, o.id, e.target.checked)
                          }
                        />
                        Visto
                      </label>
                    </div>
                  ))}
                {cliente.observaciones.length === 0 && (
                  <p className="text-xs text-neutral-400">Sin observaciones</p>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
