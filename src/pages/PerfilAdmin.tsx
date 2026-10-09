import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import Topbar from "@/components/Topbar";
import SidebarNav from "@/components/SidebarNav";
import ManualModal from "@/components/ManualModal";
import FilaCliente from "@/components/admin/FilaCliente";
import Paginacion from "@/components/Paginacion";
import { useRedirectIfUnauthorized } from "@/lib/useRedirectIfUnauthorized";
import { movimientosDeCliente, totalPagadoUsd, documentosDeCliente } from "@/lib/clienteHelpers";
import { fmtFechaHora, categoriaGestion, esClienteNuevo } from "@/lib/gestiones";
import { fechaVencimientoApp, appVencida } from "@/lib/cuentaApp";
import { saldoPendienteInversion, inversionCompletada } from "@/lib/inversiones";
import type { Gestion, Moneda, TipoMovimientoComision } from "@/types";

const TAMANO_PAGINA_REGISTRO = 10;

const MANUAL_ADMIN = [
  {
    titulo: "Resumen / KPI",
    descripcion:
      "Dashboard general de la franquicia: total de clientes, inversiones en progreso/completadas, cobrado y pendiente por cobrar, mas el detalle por asesor. Incluye boton para exportar el listado de clientes en CSV.",
  },
  {
    titulo: "Aprobacion de envios",
    descripcion:
      "Cada vez que un asesor registra un cliente, lote, pago o solicitud, el copy queda aqui pendiente. Revisalo y presiona Aprobar y enviar para que se considere enviado a Administracion FK (antes de eso, el asesor y el cliente ven 'Pendiente de aprobacion').",
  },
  {
    titulo: "Documentos pendientes",
    descripcion:
      "Lista de Contratos y Boletas pendientes de todos los clientes. El asesor marca Entregado/Realizado; aqui ves ese estado y puedes activar Requiere correccion si Administracion FK pide corregir algo (con una nota).",
  },
  {
    titulo: "Cuentas de app",
    descripcion:
      "Activa la cuenta de la app del cliente cuando Administracion FK confirme que ya la activo. Queda vigente 1 ano desde esa fecha; aqui ves cuando vence o si ya vencio.",
  },
  {
    titulo: "Asesores",
    descripcion:
      "Tabla con todos los asesores (usuario, contrasena, rango, facturado, estado). Desde aqui creas cuentas nuevas, las activas/desactivas, las eliminas, y gestionas sus bonos meta y comisiones.",
  },
  {
    titulo: "Calendario sabados",
    descripcion:
      "Configura el calendario compartido de presentaciones de los sabados (presencial/virtual) entre franquicias, indicando fecha, franquicia y encargado.",
  },
  {
    titulo: "Comunicados",
    descripcion: "Publica, fija o elimina los avisos que veran todos los asesores de tu franquicia.",
  },
  {
    titulo: "Administradores",
    descripcion:
      "Crea otras cuentas de administrador de tu franquicia. Por ahora todas tienen el mismo acceso total.",
  },
];

type Seccion =
  | "resumen"
  | "registro"
  | "aprobacion"
  | "documentos"
  | "biblioteca"
  | "cuentasapp"
  | "asesores"
  | "calendario"
  | "comunicados"
  | "administradores";

export default function PerfilAdmin() {
  const sesion = useAppStore((s) => s.sesion);
  const admins = useAppStore((s) => s.admins);
  const asesores = useAppStore((s) => s.asesores);
  const clientes = useAppStore((s) => s.clientes);
  const movimientosComision = useAppStore((s) => s.movimientosComision);
  const agregarMovimientoComision = useAppStore((s) => s.agregarMovimientoComision);
  const gestiones = useAppStore((s) => s.gestiones);
  const aprobarGestion = useAppStore((s) => s.aprobarGestion);
  const rechazarGestion = useAppStore((s) => s.rechazarGestion);
  const actualizarCopyGestion = useAppStore((s) => s.actualizarCopyGestion);
  const actualizarDocumentoProceso = useAppStore((s) => s.actualizarDocumentoProceso);
  const actualizarCuentaApp = useAppStore((s) => s.actualizarCuentaApp);
  const agregarBonoMeta = useAppStore((s) => s.agregarBonoMeta);
  const eliminarBonoMeta = useAppStore((s) => s.eliminarBonoMeta);
  const actualizarActivoBonoMeta = useAppStore((s) => s.actualizarActivoBonoMeta);
  const calendarioSabados = useAppStore((s) => s.calendarioSabados);
  const agregarSabadoPresentacion = useAppStore((s) => s.agregarSabadoPresentacion);
  const eliminarSabadoPresentacion = useAppStore((s) => s.eliminarSabadoPresentacion);
  const comunicados = useAppStore((s) => s.comunicados);
  const agregarComunicado = useAppStore((s) => s.agregarComunicado);
  const actualizarComunicado = useAppStore((s) => s.actualizarComunicado);
  const eliminarComunicado = useAppStore((s) => s.eliminarComunicado);
  const agregarAdmin = useAppStore((s) => s.agregarAdmin);
  const eliminarAdmin = useAppStore((s) => s.eliminarAdmin);
  const agregarAsesor = useAppStore((s) => s.agregarAsesor);
  const eliminarAsesor = useAppStore((s) => s.eliminarAsesor);
  const actualizarActivoAsesor = useAppStore((s) => s.actualizarActivoAsesor);
  const [seccion, setSeccion] = useState<Seccion>("resumen");
  const [mostrarManual, setMostrarManual] = useState(false);
  const [asesorSelId, setAsesorSelId] = useState<string | null>(null);
  const [tipoMov, setTipoMov] = useState<TipoMovimientoComision>("INGRESO");
  const [montoMov, setMontoMov] = useState("");
  const [monedaMov, setMonedaMov] = useState<Moneda>("USD");
  const [clienteMovId, setClienteMovId] = useState("");
  const [motivoMov, setMotivoMov] = useState("");
  const [busquedaCuentaApp, setBusquedaCuentaApp] = useState("");
  const [verCredencialesId, setVerCredencialesId] = useState<string | null>(null);
  const [busquedaRegistro, setBusquedaRegistro] = useState("");
  const [registroPagina, setRegistroPagina] = useState(1);
  const [busquedaBiblioteca, setBusquedaBiblioteca] = useState("");
  const [docProcesoCorrigiendo, setDocProcesoCorrigiendo] = useState<string | null>(null);
  const [notaCorreccionTmp, setNotaCorreccionTmp] = useState("");
  const [tabAprobacion, setTabAprobacion] = useState<"enviados" | "pendientes" | "rechazados">(
    "enviados",
  );
  const [busquedaAprobacion, setBusquedaAprobacion] = useState("");
  const [gestionExpandidaId, setGestionExpandidaId] = useState<string | null>(null);
  const [gestionEditandoId, setGestionEditandoId] = useState<string | null>(null);
  const [textosEditados, setTextosEditados] = useState<string[]>([]);
  const [gestionRechazandoId, setGestionRechazandoId] = useState<string | null>(null);
  const [motivoRechazoInput, setMotivoRechazoInput] = useState("");
  const [correccionInput, setCorreccionInput] = useState("");
  const [tituloBono, setTituloBono] = useState("");
  const [objetivoBono, setObjetivoBono] = useState("");
  const [premioBono, setPremioBono] = useState("");
  const [fechaSabado, setFechaSabado] = useState("");
  const [franquiciaSabado, setFranquiciaSabado] = useState("");
  const [modalidadSabado, setModalidadSabado] = useState<"PRESENCIAL" | "VIRTUAL">("PRESENCIAL");
  const [encargadoSabado, setEncargadoSabado] = useState("");
  const [tituloComunicado, setTituloComunicado] = useState("");
  const [fechaComunicado, setFechaComunicado] = useState("");
  const [nombresAdmin, setNombresAdmin] = useState("");
  const [codigoAdmin, setCodigoAdmin] = useState("");
  const [claveAdmin, setClaveAdmin] = useState("");
  const [nombresAsesor, setNombresAsesor] = useState("");
  const [claveAsesor, setClaveAsesor] = useState("");
  const [codigoAsesor, setCodigoAsesor] = useState("");
  const [telefonoAsesor, setTelefonoAsesor] = useState("");
  const [rangoAsesor, setRangoAsesor] = useState("");

  const admin = admins.find((a) => a.id === sesion?.id);
  const autorizado = !!sesion && sesion.rol === "admin" && !!admin;
  useRedirectIfUnauthorized(autorizado);

  const codigoAdminDuplicado =
    codigoAdmin.trim() !== "" && admins.some((a) => a.codigo === codigoAdmin.trim());
  const codigoAsesorDuplicado =
    codigoAsesor.trim() !== "" &&
    (asesores.some((a) => a.codigo === codigoAsesor.trim()) ||
      admins.some((a) => a.codigo === codigoAsesor.trim()));

  if (!autorizado || !admin) {
    return null;
  }

  const asesoresFranquicia = asesores.filter((a) => a.franquicia === admin.franquicia);
  const clientesFranquicia = clientes.filter((c) =>
    asesoresFranquicia.some((a) => a.id === c.asesorId),
  );

  const adminsFranquicia = admins.filter((a) => a.franquicia === admin.franquicia);

  const documentosPendientesFranquicia = clientesFranquicia
    .flatMap((c) => c.documentosProceso.map((d) => ({ cliente: c, doc: d })))
    .filter(({ doc }) => !(doc.entregado && doc.realizado) || doc.requiereCorreccion);

  const documentosPendientesPorCliente = clientesFranquicia
    .map((c) => ({
      cliente: c,
      docs: c.documentosProceso
        .filter((d) => !(d.entregado && d.realizado) || d.requiereCorreccion)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }))
    .filter(({ docs }) => docs.length > 0)
    .sort((a, b) => b.docs[0].createdAt.localeCompare(a.docs[0].createdAt));

  const gestionesPendientes = gestiones
    .filter(
      (g) =>
        g.estado === "PENDIENTE_APROBACION" &&
        clientesFranquicia.some((c) => c.id === g.clienteId),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const gestionesEnviadas = gestiones
    .filter(
      (g) =>
        g.estado === "ENVIADO_A_ADMIN_FK" &&
        clientesFranquicia.some((c) => c.id === g.clienteId),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const gestionesRechazadas = gestiones
    .filter(
      (g) =>
        g.estado === "RECHAZADO" && clientesFranquicia.some((c) => c.id === g.clienteId),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function filtrarGestiones(lista: Gestion[]) {
    const q = busquedaAprobacion.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((g) => {
      const cliente = clientes.find((c) => c.id === g.clienteId);
      const asesor = asesoresFranquicia.find((a) => a.id === g.asesorId);
      return (
        (cliente?.nombres.toLowerCase().includes(q) ?? false) ||
        (cliente?.codigo.toLowerCase().includes(q) ?? false) ||
        (asesor?.nombres.toLowerCase().includes(q) ?? false)
      );
    });
  }

  const gestionesEnviadasFiltradas = filtrarGestiones(gestionesEnviadas);
  const gestionesPendientesFiltradas = filtrarGestiones(gestionesPendientes);
  const gestionesRechazadasFiltradas = filtrarGestiones(gestionesRechazadas);

  const inversionesFranquicia = clientesFranquicia.flatMap((c) => c.inversiones);
  const inversionesCompletadas = inversionesFranquicia.filter(inversionCompletada).length;
  const inversionesEnProgreso = inversionesFranquicia.length - inversionesCompletadas;
  const movimientosFranquicia = clientesFranquicia.flatMap((c) => movimientosDeCliente(c));
  const cobradoUsd = movimientosFranquicia
    .filter((m) => m.moneda === "USD")
    .reduce((acc, m) => acc + m.monto, 0);
  const cobradoPen = movimientosFranquicia
    .filter((m) => m.moneda === "PEN")
    .reduce((acc, m) => acc + m.monto, 0);
  const pendienteUsd = inversionesFranquicia
    .filter((i) => i.moneda === "USD")
    .reduce((acc, i) => acc + saldoPendienteInversion(i), 0);
  const pendientePen = inversionesFranquicia
    .filter((i) => i.moneda === "PEN")
    .reduce((acc, i) => acc + saldoPendienteInversion(i), 0);

  function exportarClientesCsv() {
    if (!admin) return;
    const headers = [
      "Codigo",
      "Nombres",
      "DNI",
      "Categoria",
      "Asesor",
      "Cobrado USD",
      "Cobrado PEN",
      "Pendiente USD",
      "Pendiente PEN",
    ];
    const filas = clientesFranquicia.map((c) => {
      const asesorNombre = asesoresFranquicia.find((a) => a.id === c.asesorId)?.nombres ?? "";
      const movs = movimientosDeCliente(c);
      const cobradoUsdC = movs.filter((m) => m.moneda === "USD").reduce((a, m) => a + m.monto, 0);
      const cobradoPenC = movs.filter((m) => m.moneda === "PEN").reduce((a, m) => a + m.monto, 0);
      const pendUsdC = c.inversiones
        .filter((i) => i.moneda === "USD")
        .reduce((a, i) => a + saldoPendienteInversion(i), 0);
      const pendPenC = c.inversiones
        .filter((i) => i.moneda === "PEN")
        .reduce((a, i) => a + saldoPendienteInversion(i), 0);
      return [
        c.codigo,
        c.nombres,
        c.dni,
        c.categoria,
        asesorNombre,
        cobradoUsdC.toFixed(2),
        cobradoPenC.toFixed(2),
        pendUsdC.toFixed(2),
        pendPenC.toFixed(2),
      ];
    });
    const csv = [headers, ...filas]
      .map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_${admin.franquicia.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const comunicadosFranquicia = comunicados
    .filter((c) => c.franquicia === admin.franquicia)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const clientesFiltradosCuentaApp = (
    busquedaCuentaApp.trim()
      ? clientesFranquicia.filter(
          (c) =>
            c.nombres.toLowerCase().includes(busquedaCuentaApp.toLowerCase()) ||
            c.codigo.toLowerCase().includes(busquedaCuentaApp.toLowerCase()),
        )
      : clientesFranquicia
  )
    .slice()
    .sort((a, b) => {
      const vencA =
        a.cuentaApp.activa && a.cuentaApp.fechaActivacion
          ? fechaVencimientoApp(a.cuentaApp.fechaActivacion)
          : null;
      const vencB =
        b.cuentaApp.activa && b.cuentaApp.fechaActivacion
          ? fechaVencimientoApp(b.cuentaApp.fechaActivacion)
          : null;
      if (vencA === null && vencB === null) return 0;
      if (vencA === null) return 1;
      if (vencB === null) return -1;
      return vencA.localeCompare(vencB);
    });

  const clientesFiltradosRegistro = busquedaRegistro.trim()
    ? clientesFranquicia.filter(
        (c) =>
          c.nombres.toLowerCase().includes(busquedaRegistro.toLowerCase()) ||
          c.codigo.toLowerCase().includes(busquedaRegistro.toLowerCase()) ||
          (asesoresFranquicia.find((a) => a.id === c.asesorId)?.nombres ?? "")
            .toLowerCase()
            .includes(busquedaRegistro.toLowerCase()),
      )
    : clientesFranquicia;

  const clientesFiltradosBiblioteca = (() => {
    const q = busquedaBiblioteca.trim().toLowerCase();
    if (!q) return [];
    return clientesFranquicia.filter(
      (c) =>
        c.nombres.toLowerCase().includes(q) ||
        c.codigo.toLowerCase().includes(q) ||
        documentosDeCliente(c).some((d) => d.nombre.toLowerCase().includes(q)),
    );
  })();

  const asesorSel = asesoresFranquicia.find((a) => a.id === asesorSelId) ?? null;
  const clientesDeAsesorSel = asesorSel
    ? clientes.filter((c) => c.asesorId === asesorSel.id)
    : [];
  const movimientosDeAsesorSel = asesorSel
    ? movimientosComision
        .filter((m) => m.asesorId === asesorSel.id)
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
    : [];
  const facturadoSel = movimientosDeAsesorSel
    .filter((m) => m.tipo === "INGRESO")
    .reduce((acc, m) => acc + m.monto, 0);
  const egresosSel = movimientosDeAsesorSel
    .filter((m) => m.tipo === "EGRESO")
    .reduce((acc, m) => acc + m.monto, 0);
  const saldoSel = facturadoSel - egresosSel;

  function registrarMovimiento() {
    if (!asesorSel) return;
    agregarMovimientoComision({
      asesorId: asesorSel.id,
      tipo: tipoMov,
      monto: Number(montoMov) || 0,
      moneda: monedaMov,
      clienteId: tipoMov === "INGRESO" ? clienteMovId || undefined : undefined,
      motivo: tipoMov === "EGRESO" ? motivoMov : undefined,
    });
    setMontoMov("");
    setClienteMovId("");
    setMotivoMov("");
  }

  function registrarBono() {
    if (!asesorSel || !tituloBono.trim() || !premioBono.trim()) return;
    agregarBonoMeta(asesorSel.id, {
      titulo: tituloBono,
      objetivoVentas: Number(objetivoBono) || 0,
      premio: premioBono,
    });
    setTituloBono("");
    setObjetivoBono("");
    setPremioBono("");
  }

  function registrarSabado() {
    if (!fechaSabado || !franquiciaSabado.trim()) return;
    agregarSabadoPresentacion({
      fecha: fechaSabado,
      franquicia: franquiciaSabado,
      modalidad: modalidadSabado,
      encargado: encargadoSabado || "Por definir",
    });
    setFechaSabado("");
    setFranquiciaSabado("");
    setEncargadoSabado("");
  }

  function registrarComunicado() {
    if (!tituloComunicado.trim() || !fechaComunicado || !admin) return;
    agregarComunicado({
      franquicia: admin.franquicia,
      titulo: tituloComunicado,
      fecha: fechaComunicado,
    });
    setTituloComunicado("");
    setFechaComunicado("");
  }

  function registrarAdmin() {
    if (
      !nombresAdmin.trim() ||
      !codigoAdmin.trim() ||
      !claveAdmin.trim() ||
      !admin ||
      codigoAdminDuplicado
    )
      return;
    agregarAdmin({
      nombres: nombresAdmin,
      codigo: codigoAdmin,
      clave: claveAdmin,
      franquicia: admin.franquicia,
    });
    setNombresAdmin("");
    setCodigoAdmin("");
    setClaveAdmin("");
  }

  function registrarAsesor() {
    if (
      !nombresAsesor.trim() ||
      !codigoAsesor.trim() ||
      !claveAsesor.trim() ||
      !admin ||
      codigoAsesorDuplicado
    )
      return;
    agregarAsesor({
      nombres: nombresAsesor,
      codigo: codigoAsesor,
      clave: claveAsesor,
      telefono: telefonoAsesor,
      rango: rangoAsesor || "Embajador Bronce",
      franquicia: admin.franquicia,
    });
    setNombresAsesor("");
    setCodigoAsesor("");
    setClaveAsesor("");
    setTelefonoAsesor("");
    setRangoAsesor("");
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <Topbar titulo={`Admin - ${admin.franquicia}`} />

      <div className="flex">
        <SidebarNav
          items={[
            { key: "resumen", label: "Resumen / KPI", group: "General" },
            {
              key: "registro",
              label: "Registro de clientes",
              badge: clientesFranquicia.length,
              group: "Clientes",
            },
            {
              key: "aprobacion",
              label: "Aprobacion de envios",
              badge: gestionesPendientes.length,
              group: "Clientes",
            },
            {
              key: "documentos",
              label: "Documentos pendientes",
              badge: documentosPendientesFranquicia.length,
              group: "Clientes",
            },
            { key: "biblioteca", label: "Biblioteca de documentos", group: "Clientes" },
            { key: "cuentasapp", label: "Cuentas de app", group: "Clientes" },
            { key: "asesores", label: "Asesores", badge: asesoresFranquicia.length, group: "Asesores" },
            { key: "calendario", label: "Calendario sabados", group: "Franquicia" },
            {
              key: "comunicados",
              label: "Comunicados",
              badge: comunicadosFranquicia.length,
              group: "Franquicia",
            },
            {
              key: "administradores",
              label: "Administradores",
              badge: adminsFranquicia.length,
              group: "Administradores",
            },
          ]}
          activo={seccion}
          onSelect={(key) => {
            setSeccion(key as Seccion);
            if (key !== "asesores") setAsesorSelId(null);
          }}
        />

        <div className="flex-1 p-4">
          <div className="max-w-6xl mx-auto space-y-4">
            {seccion === "resumen" && (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold">Dashboard de clientes</h2>
                  <button
                    onClick={exportarClientesCsv}
                    className="text-xs bg-neutral-900 text-white rounded px-3 py-1.5"
                  >
                    Exportar informe (CSV)
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <section className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-neutral-500 mb-1">Total clientes</p>
                    <p className="text-xl font-semibold">{clientesFranquicia.length}</p>
                  </section>
                  <section className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-neutral-500 mb-1">Inversiones</p>
                    <p className="text-xl font-semibold">
                      {inversionesEnProgreso}{" "}
                      <span className="text-xs text-neutral-400 font-normal">en progreso</span>
                    </p>
                    <p className="text-xs text-neutral-400">
                      {inversionesCompletadas} completadas
                    </p>
                  </section>
                  <section className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-neutral-500 mb-1">Cobrado (historico)</p>
                    <p className="text-sm font-semibold">USD {cobradoUsd.toLocaleString()}</p>
                    <p className="text-sm font-semibold">PEN {cobradoPen.toLocaleString()}</p>
                  </section>
                  <section className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-neutral-500 mb-1">Pendiente por cobrar</p>
                    <p className="text-sm font-semibold text-amber-600">
                      USD {pendienteUsd.toLocaleString()}
                    </p>
                    <p className="text-sm font-semibold text-amber-600">
                      PEN {pendientePen.toLocaleString()}
                    </p>
                  </section>
                </div>

                <section className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold mb-3">KPI por asesor</h2>
                <div className="space-y-2">
                  {asesoresFranquicia.map((a) => {
                    const suyos = clientes.filter((c) => c.asesorId === a.id);
                    const totalVentasUsd = suyos.reduce((acc, c) => acc + totalPagadoUsd(c), 0);
                    return (
                      <div
                        key={a.id}
                        className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between"
                      >
                        <span>{a.nombres}</span>
                        <span>
                          {suyos.length} clientes - USD {totalVentasUsd.toLocaleString()} vendidos
                        </span>
                      </div>
                    );
                  })}
                </div>
                  <p className="text-xs text-neutral-400 mt-2">
                    Calculo provisional a partir de movimientos registrados. Falta definir formula
                    real de comision.
                  </p>
                </section>
              </>
            )}


            {seccion === "registro" && (
              <section className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h2 className="font-semibold">
                      Registro de clientes ({clientesFranquicia.length})
                    </h2>
                    <p className="text-xs text-neutral-400">
                      Todos los clientes creados, su asesor, y el cumplimiento de su seguimiento.
                    </p>
                  </div>
                </div>
                <input
                  className="input my-3"
                  placeholder="Buscar por cliente, codigo o asesor..."
                  value={busquedaRegistro}
                  onChange={(e) => {
                    setBusquedaRegistro(e.target.value);
                    setRegistroPagina(1);
                  }}
                />
                <div className="overflow-x-auto -mx-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
                        <th className="px-4 py-2 font-medium">Cliente</th>
                        <th className="px-4 py-2 font-medium">Asesor</th>
                        <th className="px-4 py-2 font-medium">Modalidad</th>
                        <th className="px-4 py-2 font-medium">Titulacion</th>
                        <th className="px-4 py-2 font-medium">App</th>
                        <th className="px-4 py-2 font-medium">Seguimiento</th>
                        <th className="px-4 py-2 font-medium text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesFiltradosRegistro
                        .slice(
                          (registroPagina - 1) * TAMANO_PAGINA_REGISTRO,
                          registroPagina * TAMANO_PAGINA_REGISTRO,
                        )
                        .map((c) => {
                          const asesorDeCliente = asesoresFranquicia.find(
                            (a) => a.id === c.asesorId,
                          );
                          const gestionesPendientesCliente = gestiones.filter(
                            (g) => g.clienteId === c.id && g.estado === "PENDIENTE_APROBACION",
                          ).length;
                          const docsPendientesCliente = c.documentosProceso.filter(
                            (d) => !(d.entregado && d.realizado),
                          ).length;
                          return (
                            <FilaCliente
                              key={c.id}
                              cliente={c}
                              asesorNombre={asesorDeCliente?.nombres ?? "Sin asesor"}
                              gestionesPendientes={gestionesPendientesCliente}
                              docsPendientes={docsPendientesCliente}
                            />
                          );
                        })}
                      {clientesFiltradosRegistro.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 text-center text-neutral-400">
                            Sin clientes
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {clientesFiltradosRegistro.length > 0 && (
                  <Paginacion
                    paginaActual={registroPagina}
                    totalPaginas={Math.max(
                      1,
                      Math.ceil(clientesFiltradosRegistro.length / TAMANO_PAGINA_REGISTRO),
                    )}
                    onCambiar={setRegistroPagina}
                    totalItems={clientesFiltradosRegistro.length}
                    tamanoPagina={TAMANO_PAGINA_REGISTRO}
                    etiqueta="clientes"
                  />
                )}
              </section>
            )}

            {seccion === "aprobacion" && (
              <section className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="font-semibold">Aprobacion de envios</h2>
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                      gestionesPendientes.length === 0
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {gestionesPendientes.length === 0
                      ? "Al dia"
                      : `Pendientes (${gestionesPendientes.length})`}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mb-3">
                  Revisa el copy antes de que se considere enviado a Administracion FK. El
                  asesor y el cliente veran el estado "Pendiente de aprobacion" hasta que lo
                  apruebes.
                </p>

                <div className="flex mb-3 rounded-md overflow-hidden border border-neutral-200 text-sm w-fit">
                  <button
                    onClick={() => setTabAprobacion("enviados")}
                    className={`px-4 py-2 font-medium ${
                      tabAprobacion === "enviados"
                        ? "bg-neutral-900 text-white"
                        : "bg-white text-neutral-600"
                    }`}
                  >
                    Enviados
                  </button>
                  <button
                    onClick={() => setTabAprobacion("pendientes")}
                    className={`px-4 py-2 font-medium ${
                      tabAprobacion === "pendientes"
                        ? "bg-neutral-900 text-white"
                        : "bg-white text-neutral-600"
                    }`}
                  >
                    Pendientes{gestionesPendientes.length > 0 ? ` (${gestionesPendientes.length})` : ""}
                  </button>
                  <button
                    onClick={() => setTabAprobacion("rechazados")}
                    className={`px-4 py-2 font-medium ${
                      tabAprobacion === "rechazados"
                        ? "bg-neutral-900 text-white"
                        : "bg-white text-neutral-600"
                    }`}
                  >
                    Rechazados
                    {gestionesRechazadas.length > 0 ? ` (${gestionesRechazadas.length})` : ""}
                  </button>
                </div>

                <div className="relative mb-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    🔍
                  </span>
                  <input
                    className="input pl-8"
                    placeholder="Buscar por cliente o asesor..."
                    value={busquedaAprobacion}
                    onChange={(e) => setBusquedaAprobacion(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  {(tabAprobacion === "enviados"
                    ? gestionesEnviadasFiltradas
                    : tabAprobacion === "pendientes"
                      ? gestionesPendientesFiltradas
                      : gestionesRechazadasFiltradas
                  ).map((g) => {
                    const cliente = clientes.find((c) => c.id === g.clienteId);
                    const asesor = asesoresFranquicia.find((a) => a.id === g.asesorId);
                    const expandida = gestionExpandidaId === g.id;
                    const editando = gestionEditandoId === g.id;
                    return (
                      <div
                        key={g.id}
                        className={`border rounded-lg p-3 ${
                          tabAprobacion === "pendientes"
                            ? "border-amber-200 bg-amber-50"
                            : tabAprobacion === "rechazados"
                              ? "border-red-200 bg-red-50"
                              : "border-neutral-200"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <span
                              className={`inline-block text-xs rounded px-2 py-0.5 mb-1 ${
                                esClienteNuevo(g)
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-purple-100 text-purple-700"
                              }`}
                            >
                              {esClienteNuevo(g) ? "Cliente nuevo" : "Cliente existente"}
                            </span>
                            <p className="text-sm font-medium truncate">
                              {asesor?.nombres ?? "Asesor"} - {categoriaGestion(g)} -{" "}
                              {cliente?.nombres ?? "Cliente"}
                            </p>
                            <p className="text-xs text-neutral-500">{fmtFechaHora(g.createdAt)}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {tabAprobacion === "pendientes" && (
                              <>
                                <button
                                  onClick={() => aprobarGestion(g.id)}
                                  className="text-xs bg-green-600 text-white rounded px-3 py-1.5"
                                >
                                  Aprobar
                                </button>
                                <button
                                  onClick={() => {
                                    setGestionRechazandoId(g.id);
                                    setMotivoRechazoInput("");
                                    setCorreccionInput("");
                                  }}
                                  className="text-xs bg-red-100 text-red-700 rounded px-3 py-1.5"
                                >
                                  Rechazar
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                if (expandida) {
                                  setGestionExpandidaId(null);
                                  setGestionEditandoId(null);
                                } else {
                                  setGestionExpandidaId(g.id);
                                }
                              }}
                              className="text-xs text-blue-600 border border-neutral-300 rounded px-3 py-1.5"
                            >
                              {expandida ? "Ocultar" : "Ver detalles"}
                            </button>
                          </div>
                        </div>

                        {tabAprobacion === "rechazados" && (
                          <div className="mt-2 text-xs bg-white border border-red-200 rounded p-2 space-y-1">
                            <p>
                              <span className="font-semibold text-red-700">Motivo: </span>
                              {g.motivoRechazo || "Sin detalle"}
                            </p>
                            <p>
                              <span className="font-semibold text-red-700">Debe corregir: </span>
                              {g.correccionSolicitada || "Sin detalle"}
                            </p>
                            <p className="text-neutral-400">
                              El asesor vera esto en "Procesos pendientes" con la opcion de corregir
                              y reenviar.
                            </p>
                          </div>
                        )}

                        {expandida && !editando && (
                          <div className="mt-2 space-y-2">
                            {g.copys.map((copy, i) => (
                              <div key={i}>
                                {g.copys.length > 1 && (
                                  <p className="text-xs font-semibold text-neutral-500 mb-1">
                                    Copy {i + 1}
                                    {i === 0 ? " - Venta/lote" : " - Activacion de app/membresia"}
                                  </p>
                                )}
                                <pre className="text-xs bg-white border border-neutral-200 rounded p-2 whitespace-pre-wrap">
                                  {copy}
                                </pre>
                              </div>
                            ))}
                            {tabAprobacion === "pendientes" && (
                              <button
                                onClick={() => {
                                  setGestionEditandoId(g.id);
                                  setTextosEditados([...g.copys]);
                                }}
                                className="text-xs bg-neutral-200 text-neutral-700 rounded px-3 py-1.5"
                              >
                                Editar
                              </button>
                            )}
                          </div>
                        )}

                        {expandida && editando && (
                          <div className="mt-2 space-y-2">
                            {textosEditados.map((texto, i) => (
                              <div key={i}>
                                {textosEditados.length > 1 && (
                                  <p className="text-xs font-semibold text-neutral-500 mb-1">
                                    Copy {i + 1}
                                    {i === 0 ? " - Venta/lote" : " - Activacion de app/membresia"}
                                  </p>
                                )}
                                <textarea
                                  className="input font-mono text-xs"
                                  rows={8}
                                  value={texto}
                                  onChange={(e) =>
                                    setTextosEditados((arr) =>
                                      arr.map((t, idx) => (idx === i ? e.target.value : t)),
                                    )
                                  }
                                />
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  actualizarCopyGestion(g.id, textosEditados);
                                  setGestionEditandoId(null);
                                }}
                                className="text-xs bg-neutral-900 text-white rounded px-3 py-1.5"
                              >
                                Guardar cambios
                              </button>
                              <button
                                onClick={() => setGestionEditandoId(null)}
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
                  {(tabAprobacion === "enviados"
                    ? gestionesEnviadasFiltradas
                    : tabAprobacion === "pendientes"
                      ? gestionesPendientesFiltradas
                      : gestionesRechazadasFiltradas
                  ).length === 0 && (
                    <p className="text-sm text-neutral-400">
                      {tabAprobacion === "enviados"
                        ? "Sin envios registrados"
                        : tabAprobacion === "pendientes"
                          ? "Sin envios pendientes de aprobacion"
                          : "Sin envios rechazados"}
                    </p>
                  )}
                </div>
              </section>
            )}

            {seccion === "documentos" && (
              <section className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold mb-1">
                  Documentos pendientes ({documentosPendientesFranquicia.length})
                </h2>
                <p className="text-xs text-neutral-400 mb-3">
                  El asesor marca Entregado/Realizado. Aqui ves el estado y puedes pedir
                  correccion en nombre de Administracion FK.
                </p>
                <div className="space-y-3">
                  {documentosPendientesPorCliente.map(({ cliente, docs }) => (
                    <div key={cliente.id} className="border border-neutral-200 rounded-lg px-3 py-2">
                      <p className="text-sm font-semibold mb-2">{cliente.nombres}</p>
                      <div className="space-y-2">
                        {docs.map((doc, i) => (
                          <div
                            key={doc.id}
                            className={i > 0 ? "pt-2 border-t border-neutral-100" : ""}
                          >
                            <p className="text-xs text-neutral-500 mb-1">{doc.descripcion}</p>
                            <div className="flex flex-wrap gap-2 items-center">
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
                                    actualizarDocumentoProceso(cliente.id, doc.id, {
                                      requiereCorreccion: false,
                                    })
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
                              <p className="text-xs text-red-600 mt-1">Nota: {doc.notaCorreccion}</p>
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
                      </div>
                    </div>
                  ))}
                  {documentosPendientesPorCliente.length === 0 && (
                    <p className="text-sm text-neutral-400">Sin pendientes</p>
                  )}
                </div>
              </section>
            )}

            {seccion === "biblioteca" && (
              <section className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold mb-1">Biblioteca de documentos</h2>
                <p className="text-xs text-neutral-400 mb-3">
                  Repositorio de solo lectura de todos los documentos de todos los clientes de
                  la franquicia (contratos, boletas, vouchers, fotos de DNI, fotos de lote).
                </p>
                <div className="relative mb-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    🔍
                  </span>
                  <input
                    className="input pl-8"
                    placeholder="Buscar cliente, codigo o nombre de archivo..."
                    value={busquedaBiblioteca}
                    onChange={(e) => setBusquedaBiblioteca(e.target.value)}
                  />
                </div>
                {!busquedaBiblioteca.trim() ? (
                  <p className="text-sm text-neutral-400 text-center py-4">
                    Busca por nombre, codigo de cliente o nombre de archivo para ver sus
                    documentos.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {clientesFiltradosBiblioteca.map((c) => {
                      const docs = documentosDeCliente(c);
                      return (
                        <div key={c.id} className="text-sm border border-neutral-200 rounded px-3 py-2">
                          <div className="flex justify-between mb-2">
                            <span className="font-medium">{c.nombres}</span>
                            <span className="text-neutral-400">{c.codigo}</span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {docs.map((d) => (
                              <a
                                key={d.id}
                                href={d.url}
                                className={`text-xs border rounded px-2 py-1 ${
                                  d.requiereCorreccion
                                    ? "bg-red-50 border-red-200 text-red-700"
                                    : "bg-neutral-100 border-neutral-200 text-blue-600"
                                }`}
                              >
                                [{d.categoria}] {d.nombre}
                              </a>
                            ))}
                            {docs.length === 0 && (
                              <span className="text-xs text-neutral-400">Sin documentos</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {clientesFiltradosBiblioteca.length === 0 && (
                      <p className="text-sm text-neutral-400 text-center py-2">
                        Sin resultados para "{busquedaBiblioteca}"
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}

            {seccion === "cuentasapp" && (
              <section className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold mb-1">Cuentas de app</h2>
                <p className="text-xs text-neutral-400 mb-3">
                  Marca aqui cuando Administracion FK confirme que ya activo la cuenta del
                  cliente. Queda vigente por 1 ano desde esa fecha. Ordenado por vencimiento
                  (lo mas urgente primero).
                </p>
                <input
                  className="input mb-3"
                  placeholder="Buscar cliente por nombre o codigo..."
                  value={busquedaCuentaApp}
                  onChange={(e) => setBusquedaCuentaApp(e.target.value)}
                />
                <div className="space-y-2">
                  {clientesFiltradosCuentaApp.map((c) => {
                    const vencimiento =
                      c.cuentaApp.activa && c.cuentaApp.fechaActivacion
                        ? fechaVencimientoApp(c.cuentaApp.fechaActivacion)
                        : null;
                    const vencida = vencimiento ? appVencida(c.cuentaApp.fechaActivacion!) : false;
                    const diasParaVencer = vencimiento
                      ? Math.ceil(
                          (new Date(`${vencimiento}T00:00:00`).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24),
                        )
                      : null;
                    const vencePronto =
                      !vencida && diasParaVencer !== null && diasParaVencer <= 30;
                    return (
                      <div
                        key={c.id}
                        className="text-sm border border-neutral-200 rounded px-3 py-2"
                      >
                        <div className="flex justify-between items-center gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{c.nombres}</p>
                            <p className="text-xs text-neutral-400 truncate">
                              {c.codigo}
                              {vencimiento && (
                                <>
                                  {" - "}
                                  {vencida ? (
                                    <span className="text-red-600">Vencida ({vencimiento})</span>
                                  ) : vencePronto ? (
                                    <span className="text-amber-600">
                                      Vence en {diasParaVencer}d ({vencimiento})
                                    </span>
                                  ) : (
                                    <span className="text-green-600">Vence {vencimiento}</span>
                                  )}
                                </>
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() =>
                                setVerCredencialesId((id) => (id === c.id ? null : c.id))
                              }
                              className="text-xs rounded px-3 py-1.5 bg-neutral-100 text-neutral-600"
                            >
                              {verCredencialesId === c.id ? "Ocultar" : "Ver credenciales"}
                            </button>
                            <button
                              onClick={() => actualizarCuentaApp(c.id, !c.cuentaApp.activa)}
                              className={`text-xs rounded px-3 py-1.5 ${
                                c.cuentaApp.activa
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {c.cuentaApp.activa ? "Desactivar" : "Activar"}
                            </button>
                          </div>
                        </div>
                        {verCredencialesId === c.id && (
                          <div className="mt-2 bg-neutral-50 border border-neutral-200 rounded p-2 text-xs">
                            <p>Usuario: {c.usuarioApp.usuario}</p>
                            <p>Contrasena: {c.usuarioApp.clave}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {clientesFiltradosCuentaApp.length === 0 && (
                    <p className="text-sm text-neutral-400">Sin clientes</p>
                  )}
                </div>
              </section>
            )}

            {seccion === "calendario" && (
              <section className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold mb-1">Calendario de sabados</h2>
                <p className="text-xs text-neutral-400 mb-3">
                  Configura los sabados de presentacion compartidos entre franquicias
                  (presencial/virtual) y quien queda a cargo. El asesor solo vera la semana
                  actual y el resto del mes en curso.
                </p>
                <div className="space-y-1 mb-4">
                  {[...calendarioSabados]
                    .sort((a, b) => a.fecha.localeCompare(b.fecha))
                    .map((s) => (
                      <div
                        key={s.id}
                        className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between items-center gap-2"
                      >
                        <div className="min-w-0">
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
                          <p className="text-xs text-neutral-400 truncate">
                            {s.franquicia} - Encargado: {s.encargado}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm(`Eliminar la fecha del ${s.fecha}?`)) {
                              eliminarSabadoPresentacion(s.id);
                            }
                          }}
                          className="text-xs text-red-600 shrink-0"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  {calendarioSabados.length === 0 && (
                    <p className="text-sm text-neutral-400">Sin fechas configuradas</p>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-neutral-600 mb-2">Agregar fecha</h3>
                <div className="flex gap-2 mb-2">
                  <input
                    type="date"
                    className="input"
                    value={fechaSabado}
                    onChange={(e) => setFechaSabado(e.target.value)}
                  />
                  <select
                    className="input w-auto"
                    value={modalidadSabado}
                    onChange={(e) =>
                      setModalidadSabado(e.target.value as "PRESENCIAL" | "VIRTUAL")
                    }
                  >
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="VIRTUAL">Virtual</option>
                  </select>
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    className="input"
                    placeholder="Franquicia (ej. Franquicia A)"
                    value={franquiciaSabado}
                    onChange={(e) => setFranquiciaSabado(e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Encargado"
                    value={encargadoSabado}
                    onChange={(e) => setEncargadoSabado(e.target.value)}
                  />
                </div>
                <button
                  onClick={registrarSabado}
                  disabled={!fechaSabado || !franquiciaSabado.trim()}
                  className="w-full bg-green-600 text-white rounded py-2 text-sm disabled:opacity-30"
                >
                  Agregar fecha
                </button>
              </section>
            )}

            {seccion === "comunicados" && (
              <section className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold mb-3">Comunicados - {admin.franquicia}</h2>
                <div className="space-y-1 mb-4">
                  {comunicadosFranquicia.map((c) => (
                    <div
                      key={c.id}
                      className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between items-center gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.titulo}</p>
                        <p className="text-xs text-neutral-400">{c.fecha}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => actualizarComunicado(c.id, { fijado: !c.fijado })}
                          className={`text-xs rounded px-2 py-1 ${
                            c.fijado
                              ? "bg-amber-100 text-amber-700"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {c.fijado ? "Fijado" : "Fijar"}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Eliminar el comunicado "${c.titulo}"?`)) {
                              eliminarComunicado(c.id);
                            }
                          }}
                          className="text-xs text-red-600"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                  {comunicadosFranquicia.length === 0 && (
                    <p className="text-sm text-neutral-400">Sin comunicados</p>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-neutral-600 mb-2">Nuevo comunicado</h3>
                <input
                  className="input mb-2"
                  placeholder="Titulo del comunicado"
                  value={tituloComunicado}
                  onChange={(e) => setTituloComunicado(e.target.value)}
                />
                <input
                  type="date"
                  className="input mb-2"
                  value={fechaComunicado}
                  onChange={(e) => setFechaComunicado(e.target.value)}
                />
                <button
                  onClick={registrarComunicado}
                  disabled={!tituloComunicado.trim() || !fechaComunicado}
                  className="w-full bg-green-600 text-white rounded py-2 text-sm disabled:opacity-30"
                >
                  Publicar comunicado
                </button>
              </section>
            )}

            {seccion === "administradores" && (
              <section className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold mb-1">Administradores - {admin.franquicia}</h2>
                <p className="text-xs text-neutral-400 mb-3">
                  Todos los administradores de esta franquicia tienen el mismo acceso total por
                  ahora. Los permisos por seccion se agregaran mas adelante.
                </p>
                <div className="space-y-1 mb-4">
                  {adminsFranquicia.map((a) => (
                    <div
                      key={a.id}
                      className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between items-center gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {a.nombres} {a.id === admin.id && "(tu)"}
                        </p>
                        <p className="text-xs text-neutral-400">Codigo: {a.codigo}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm(`Eliminar la cuenta de administrador de ${a.nombres}?`)) {
                            eliminarAdmin(a.id);
                          }
                        }}
                        disabled={a.id === admin.id || adminsFranquicia.length <= 1}
                        className="text-xs text-red-600 shrink-0 disabled:opacity-30"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>

                <h3 className="text-sm font-semibold text-neutral-600 mb-2">
                  Agregar administrador
                </h3>
                <input
                  className="input mb-2"
                  placeholder="Nombres"
                  value={nombresAdmin}
                  onChange={(e) => setNombresAdmin(e.target.value)}
                />
                <div className="flex gap-2 mb-2">
                  <input
                    className="input"
                    placeholder="Codigo (ej. ADM-002)"
                    value={codigoAdmin}
                    onChange={(e) => setCodigoAdmin(e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Contrasena"
                    value={claveAdmin}
                    onChange={(e) => setClaveAdmin(e.target.value)}
                  />
                </div>
                {codigoAdminDuplicado && (
                  <p className="text-xs text-red-600 -mt-1 mb-2">
                    ⚠ Ese codigo ya esta en uso por otro administrador
                  </p>
                )}
                <button
                  onClick={registrarAdmin}
                  disabled={
                    !nombresAdmin.trim() ||
                    !codigoAdmin.trim() ||
                    !claveAdmin.trim() ||
                    codigoAdminDuplicado
                  }
                  className="w-full bg-green-600 text-white rounded py-2 text-sm disabled:opacity-30"
                >
                  Crear administrador
                </button>
              </section>
            )}

            {seccion === "asesores" && !asesorSel && (
              <>
                <section className="bg-white rounded-lg shadow p-4">
                  <h2 className="font-semibold mb-3">Asesores registrados</h2>
                  <div className="overflow-x-auto -mx-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
                          <th className="px-4 py-2 font-medium">Nombres</th>
                          <th className="px-4 py-2 font-medium">Usuario</th>
                          <th className="px-4 py-2 font-medium">Contrasena</th>
                          <th className="px-4 py-2 font-medium">Rango</th>
                          <th className="px-4 py-2 font-medium text-right">Facturado (USD)</th>
                          <th className="px-4 py-2 font-medium">Estado</th>
                          <th className="px-4 py-2 font-medium text-right">Accion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {asesoresFranquicia.map((a) => {
                          const suyos = clientes.filter((c) => c.asesorId === a.id);
                          const facturado = suyos.reduce(
                            (acc, c) => acc + totalPagadoUsd(c),
                            0,
                          );
                          return (
                            <tr
                              key={a.id}
                              className="border-b border-neutral-100 hover:bg-neutral-50"
                            >
                              <td className="px-4 py-2">{a.nombres}</td>
                              <td className="px-4 py-2 text-neutral-600">{a.codigo}</td>
                              <td className="px-4 py-2 text-neutral-600 font-mono">{a.clave}</td>
                              <td className="px-4 py-2 text-neutral-600">{a.rango}</td>
                              <td className="px-4 py-2 text-right">
                                USD {facturado.toLocaleString()}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`text-xs rounded px-2 py-0.5 ${
                                    a.activo
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {a.activo ? "Activo" : "Inactivo"}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  onClick={() => setAsesorSelId(a.id)}
                                  className="text-xs text-blue-600"
                                >
                                  Ver
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {asesoresFranquicia.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-4 text-center text-neutral-400">
                              Sin asesores creados
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-semibold text-neutral-600 mb-2">
                    Crear cuenta de asesor
                  </h3>
                  <input
                    className="input mb-2"
                    placeholder="Nombres"
                    value={nombresAsesor}
                    onChange={(e) => setNombresAsesor(e.target.value)}
                  />
                  <div className="flex gap-2 mb-2">
                    <input
                      className="input"
                      placeholder="Codigo (ej. ASE-003)"
                      value={codigoAsesor}
                      onChange={(e) => setCodigoAsesor(e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="Contrasena"
                      value={claveAsesor}
                      onChange={(e) => setClaveAsesor(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input
                      className="input"
                      placeholder="Telefono"
                      value={telefonoAsesor}
                      onChange={(e) => setTelefonoAsesor(e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="Rango (ej. Embajador Bronce)"
                      value={rangoAsesor}
                      onChange={(e) => setRangoAsesor(e.target.value)}
                    />
                  </div>
                  {codigoAsesorDuplicado && (
                    <p className="text-xs text-red-600 -mt-1 mb-2">
                      ⚠ Ese codigo ya esta en uso por otro asesor o administrador
                    </p>
                  )}
                  <button
                    onClick={registrarAsesor}
                    disabled={
                      !nombresAsesor.trim() ||
                      !codigoAsesor.trim() ||
                      !claveAsesor.trim() ||
                      codigoAsesorDuplicado
                    }
                    className="w-full bg-green-600 text-white rounded py-2 text-sm disabled:opacity-30"
                  >
                    Crear asesor
                  </button>
                </section>
              </>
            )}

            {seccion === "asesores" && asesorSel && (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold">
                    {asesorSel.nombres}{" "}
                    {!asesorSel.activo && (
                      <span className="text-xs text-red-600 font-medium">(Inactivo)</span>
                    )}
                  </h2>
                  <button
                    onClick={() => setAsesorSelId(null)}
                    className="text-sm text-neutral-500"
                  >
                    Cambiar asesor
                  </button>
                </div>

                <section className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-semibold text-neutral-600 mb-2">Cuenta</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        actualizarActivoAsesor(asesorSel.id, !asesorSel.activo)
                      }
                      className={`text-xs rounded px-3 py-1.5 ${
                        asesorSel.activo
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {asesorSel.activo ? "Desactivar cuenta" : "Activar cuenta"}
                    </button>
                    <button
                      onClick={() => {
                        if (asesorSel.clienteIds.length > 0) return;
                        if (window.confirm(`Eliminar la cuenta de ${asesorSel.nombres}?`)) {
                          eliminarAsesor(asesorSel.id);
                          setAsesorSelId(null);
                        }
                      }}
                      disabled={asesorSel.clienteIds.length > 0}
                      className="text-xs bg-red-100 text-red-700 rounded px-3 py-1.5 disabled:opacity-30"
                    >
                      Eliminar cuenta
                    </button>
                  </div>
                  {asesorSel.clienteIds.length > 0 && (
                    <p className="text-xs text-neutral-400 mt-2">
                      No se puede eliminar: tiene {asesorSel.clienteIds.length} cliente(s)
                      asignado(s). Desactivala si ya no debe operar.
                    </p>
                  )}
                </section>

                <div className="grid grid-cols-2 gap-3">
                  <section className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-neutral-500 mb-1">Saldo disponible</p>
                    <p className="text-xl font-semibold">USD {saldoSel.toLocaleString()}</p>
                  </section>
                  <section className="bg-white rounded-lg shadow p-4">
                    <p className="text-xs text-neutral-500 mb-1">Facturado (acumulado)</p>
                    <p className="text-xl font-semibold">USD {facturadoSel.toLocaleString()}</p>
                  </section>
                </div>

                <section className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold mb-3">Subir comision / descuento</h3>
                  <div className="flex mb-3 rounded-md overflow-hidden border border-neutral-200 text-sm">
                    <button
                      onClick={() => setTipoMov("INGRESO")}
                      className={`flex-1 py-2 ${tipoMov === "INGRESO" ? "bg-neutral-900 text-white" : "bg-white text-neutral-600"}`}
                    >
                      Ingreso
                    </button>
                    <button
                      onClick={() => setTipoMov("EGRESO")}
                      className={`flex-1 py-2 ${tipoMov === "EGRESO" ? "bg-neutral-900 text-white" : "bg-white text-neutral-600"}`}
                    >
                      Egreso
                    </button>
                  </div>

                  {tipoMov === "INGRESO" ? (
                    <label className="block mb-3">
                      <span className="block text-xs text-neutral-500 mb-1">
                        Cliente de la venta
                      </span>
                      <select
                        className="input"
                        value={clienteMovId}
                        onChange={(e) => setClienteMovId(e.target.value)}
                      >
                        <option value="">Selecciona un cliente</option>
                        {clientesDeAsesorSel.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.codigo} - {c.nombres}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="block mb-3">
                      <span className="block text-xs text-neutral-500 mb-1">Motivo</span>
                      <input
                        className="input"
                        placeholder="Ej: retiro a cuenta bancaria, descuento por..."
                        value={motivoMov}
                        onChange={(e) => setMotivoMov(e.target.value)}
                      />
                    </label>
                  )}

                  <div className="flex gap-2 mb-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="input"
                      placeholder="Monto"
                      value={montoMov}
                      onChange={(e) => setMontoMov(e.target.value)}
                    />
                    <select
                      className="input"
                      value={monedaMov}
                      onChange={(e) => setMonedaMov(e.target.value as Moneda)}
                    >
                      <option value="USD">USD</option>
                      <option value="PEN">PEN</option>
                    </select>
                  </div>

                  <button
                    onClick={registrarMovimiento}
                    disabled={
                      !montoMov.trim() ||
                      (tipoMov === "INGRESO" ? !clienteMovId : !motivoMov.trim())
                    }
                    className="w-full bg-green-600 text-white rounded py-2 text-sm disabled:opacity-30"
                  >
                    Registrar movimiento
                  </button>
                </section>

                <section className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold mb-3">Movimientos</h3>
                  <div className="space-y-1">
                    {movimientosDeAsesorSel.map((m) => {
                      const cliente = m.clienteId ? clientes.find((c) => c.id === m.clienteId) : null;
                      return (
                        <div
                          key={m.id}
                          className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between"
                        >
                          <span>
                            {m.tipo === "INGRESO"
                              ? `+ ${cliente?.nombres ?? "cliente"}`
                              : `- ${m.motivo}`}{" "}
                            <span className="text-neutral-400 text-xs">({m.codigoMovimiento})</span>
                          </span>
                          <span className="text-neutral-500 text-xs">
                            {m.moneda} {m.monto} - {m.fecha}
                          </span>
                        </div>
                      );
                    })}
                    {movimientosDeAsesorSel.length === 0 && (
                      <p className="text-sm text-neutral-400">Sin movimientos aun</p>
                    )}
                  </div>
                </section>

                <section className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold mb-3">Bonos meta</h3>
                  <div className="space-y-1 mb-3">
                    {asesorSel.bonosMeta.map((b) => (
                      <div
                        key={b.id}
                        className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between items-center gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{b.titulo}</p>
                          <p className="text-xs text-neutral-400">
                            {b.premio} - meta {b.objetivoVentas} ventas
                            {b.canjeado ? " - canjeado" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() =>
                              actualizarActivoBonoMeta(asesorSel.id, b.id, !b.activoPorAdmin)
                            }
                            className={`text-xs rounded px-2 py-1 ${
                              b.activoPorAdmin
                                ? "bg-green-100 text-green-700"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {b.activoPorAdmin ? "Activo" : "Inactivo"}
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Eliminar el bono meta "${b.titulo}"?`)) {
                                eliminarBonoMeta(asesorSel.id, b.id);
                              }
                            }}
                            className="text-xs text-red-600"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                    {asesorSel.bonosMeta.length === 0 && (
                      <p className="text-sm text-neutral-400">Sin bonos meta configurados</p>
                    )}
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input
                      className="input"
                      placeholder="Titulo (ej. Meta octubre)"
                      value={tituloBono}
                      onChange={(e) => setTituloBono(e.target.value)}
                    />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      className="input w-24"
                      placeholder="Meta"
                      value={objetivoBono}
                      onChange={(e) => setObjetivoBono(e.target.value)}
                    />
                  </div>
                  <input
                    className="input mb-2"
                    placeholder="Premio (ej. Viaje a Iquitos)"
                    value={premioBono}
                    onChange={(e) => setPremioBono(e.target.value)}
                  />
                  <button
                    onClick={registrarBono}
                    disabled={!tituloBono.trim() || !premioBono.trim()}
                    className="w-full bg-green-600 text-white rounded py-2 text-sm disabled:opacity-30"
                  >
                    Agregar bono meta
                  </button>
                </section>

                <section className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold mb-3">
                    Estructura - clientes subidos ({clientesDeAsesorSel.length})
                  </h3>
                  <div className="space-y-1">
                    {clientesDeAsesorSel.map((c) => (
                      <div
                        key={c.id}
                        className="text-sm border border-neutral-200 rounded px-3 py-2 flex justify-between"
                      >
                        <span>
                          {c.codigo} - {c.nombres}
                        </span>
                        <span className="text-neutral-400 text-xs">{c.createdAt}</span>
                      </div>
                    ))}
                    {clientesDeAsesorSel.length === 0 && (
                      <p className="text-sm text-neutral-400">Aun no subio clientes</p>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setMostrarManual(true)}
        title="Manual de uso"
        className="fixed bottom-4 left-4 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg"
      >
        ?
      </button>

      {mostrarManual && (
        <ManualModal
          titulo="Manual de uso - Admin"
          items={MANUAL_ADMIN}
          onClose={() => setMostrarManual(false)}
        />
      )}

      {gestionRechazandoId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow p-4 w-full max-w-sm">
            <h2 className="font-semibold mb-3">Rechazar envio</h2>
            <label className="block mb-3">
              <span className="block text-xs text-neutral-500 mb-1">
                Motivo del rechazo (por que no se aprueba)
              </span>
              <textarea
                className="input"
                rows={2}
                value={motivoRechazoInput}
                onChange={(e) => setMotivoRechazoInput(e.target.value)}
                placeholder="Ej: el numero de DNI no coincide con el voucher"
              />
            </label>
            <label className="block mb-4">
              <span className="block text-xs text-neutral-500 mb-1">
                Que debe corregir el asesor
              </span>
              <textarea
                className="input"
                rows={2}
                value={correccionInput}
                onChange={(e) => setCorreccionInput(e.target.value)}
                placeholder="Ej: verificar el DNI del titular y volver a enviar"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setGestionRechazandoId(null)}
                className="text-sm text-neutral-500 px-3 py-2"
              >
                Cancelar
              </button>
              <button
                disabled={!motivoRechazoInput.trim()}
                onClick={() => {
                  rechazarGestion(gestionRechazandoId, motivoRechazoInput, correccionInput);
                  setGestionRechazandoId(null);
                }}
                className="bg-red-600 text-white text-sm rounded px-3 py-2 disabled:opacity-30"
              >
                Rechazar envio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
