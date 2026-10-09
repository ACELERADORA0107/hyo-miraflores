import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import Topbar from "@/components/Topbar";
import BeneficioEditor, { BENEFICIOS_TIPO } from "@/components/BeneficioEditor";
import { generarCuotasIguales, lineaCuotasTexto } from "@/lib/cuotas";
import { useRedirectIfUnauthorized } from "@/lib/useRedirectIfUnauthorized";
import type {
  Copropietario,
  Movimiento,
  PlazoAnios,
  Propiedad,
  Sede,
  TipoBono,
  TipoComprobante,
  TipoModalidad,
} from "@/types";

const MAX_FOTOS_UBICACION = 10;

// La membresia educativa se agrega automaticamente en toda venta de lote, no se elige aqui.
const BENEFICIOS_TIPO_LOTE = BENEFICIOS_TIPO.filter((t) => t.value !== "MEMBRESIA_EDUCATIVA");

interface Beneficio {
  id: string;
  tipo: TipoBono;
  etiqueta: string;
}

interface CuotaLibreForm {
  numero: number;
  monto: string;
}

interface FormState {
  sede: Sede;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  copropietarios: Copropietario[];
  dniFotoNombres: string[];
  tipoLote: Propiedad["tipoLote"];
  etapa: Propiedad["etapa"];
  medida: number;
  propiedades: Propiedad[];
  fotoUbicacionNombres: string[];
  modalidad: TipoModalidad;
  plazoAnios: PlazoAnios;
  precioTotal: string;
  montoInicial: string;
  moneda: Movimiento["moneda"];
  voucherNombres: string[];
  fechaCompromiso: string;
  cuotasVariables: boolean;
  cuotasLibres: CuotaLibreForm[];
  beneficios: Beneficio[];
  tipoComprobante: TipoComprobante;
  numeroComprobante: string;
  usuarioClientePlataforma: string;
  montoPlazoFijo: string;
  detallePlazoFijo: string;
}

const ESTADO_INICIAL: FormState = {
  sede: "IQUITOS",
  nombre: "",
  apellido: "",
  dni: "",
  telefono: "",
  email: "",
  copropietarios: [],
  dniFotoNombres: [],
  tipoLote: "LOTE",
  etapa: "3ERA ETAPA",
  medida: 120,
  propiedades: [],
  fotoUbicacionNombres: [],
  modalidad: "FINANCIADO",
  plazoAnios: 1,
  precioTotal: "",
  montoInicial: "",
  moneda: "USD",
  voucherNombres: [],
  fechaCompromiso: "",
  cuotasVariables: false,
  cuotasLibres: [],
  beneficios: [],
  tipoComprobante: "BOLETA",
  numeroComprobante: "",
  usuarioClientePlataforma: "",
  montoPlazoFijo: "",
  detallePlazoFijo: "",
};

const PASOS_LOTE = [
  "Datos del titular",
  "Tipo de inversion",
  "Lote y propiedad",
  "Modalidad, plazo y precio",
  "Condicion de pago",
  "Beneficios y comprobante",
  "Copy de venta",
  "Activacion plataforma educativa",
  "Datos de membresia",
  "Previsualizacion final",
];

const PASOS_PLAZO_FIJO = [
  "Datos del titular",
  "Tipo de inversion",
  "Datos de plazo fijo",
  "Copy y envio",
];

const LABEL_TIPO_LOTE: Record<Propiedad["tipoLote"], string> = {
  LOTE: "LOTE",
  MEDIA_MANZANA: "MEDIA MANZANA",
  MANZANA: "MANZANA",
};

function fmt(n: number) {
  return n.toFixed(2);
}

function diasEntre(fechaIso: string) {
  const ms = new Date(fechaIso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function saldoAFinanciar(form: FormState) {
  return (Number(form.precioTotal) || 0) - (Number(form.montoInicial) || 0);
}

function totalCuotasLibres(form: FormState) {
  return form.cuotasLibres.reduce((acc, c) => acc + (Number(c.monto) || 0), 0);
}

function generarLineasLotesPreview(propiedades: Propiedad[]) {
  return propiedades
    .map(
      (p) =>
        `${LABEL_TIPO_LOTE[p.tipoLote]} - ${p.etapa} - MZ ${p.manzana} LOTE ${p.lote} (${p.sede})${p.m2 ? ` - ${p.m2}m2` : ""}`,
    )
    .join("\n");
}

function generarCuotasEfectivas(form: FormState) {
  if (form.cuotasVariables) {
    return form.cuotasLibres.map((c) => ({ numero: c.numero, monto: Number(c.monto) || 0 }));
  }
  const meses = form.plazoAnios * 12;
  return generarCuotasIguales(saldoAFinanciar(form), meses);
}

function generarCopyVentaPreview(form: FormState) {
  const nombreCompleto = `${form.nombre} ${form.apellido}`.trim();
  const lineasLotes = generarLineasLotesPreview(form.propiedades);
  const cuotas = form.modalidad === "FINANCIADO" ? generarCuotasEfectivas(form) : [];

  const lineaModalidad =
    form.modalidad === "CONTADO"
      ? `CONTADO - compromiso de pago total: ${form.fechaCompromiso || "por definir"}`
      : `FINANCIADO - ${form.plazoAnios} ano(s) - ${cuotas.length} cuotas`;

  const lineasCuotas =
    form.modalidad === "FINANCIADO" && cuotas.length
      ? lineaCuotasTexto(cuotas, form.moneda)
      : "";

  const lineasCopropietarios = form.copropietarios.length
    ? `Copropietario(s):\n${form.copropietarios.map((cp) => `- ${cp.nombres} - DNI: ${cp.dni}`).join("\n")}`
    : "";

  return [
    `CLIENTE: ${nombreCompleto}`,
    `DNI: ${form.dni}`,
    lineasCopropietarios,
    "",
    lineasLotes,
    "",
    `Modalidad: ${lineaModalidad}`,
    `Precio total: ${form.moneda} ${fmt(Number(form.precioTotal) || 0)}`,
    `Monto inicial: ${form.moneda} ${fmt(Number(form.montoInicial) || 0)}`,
    lineasCuotas,
    form.beneficios.length
      ? `\nBeneficios:\n${form.beneficios.map((b) => `- ${b.etiqueta}`).join("\n")}`
      : "",
    `\nComprobante: ${form.tipoComprobante} a ${form.numeroComprobante || form.dni}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function generarCopyPlazoFijoPreview(form: FormState) {
  const nombreCompleto = `${form.nombre} ${form.apellido}`.trim();
  return [
    `CLIENTE: ${nombreCompleto}`,
    `DNI: ${form.dni}`,
    "",
    "PLAZO FIJO - CLIENTE NUEVO",
    `Monto: ${form.moneda} ${fmt(Number(form.montoPlazoFijo) || 0)}`,
    form.detallePlazoFijo ? `Detalle: ${form.detallePlazoFijo}` : "",
    `\nComprobante: ${form.tipoComprobante} a ${form.numeroComprobante || form.dni}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function ClienteNuevoWizard() {
  const navigate = useNavigate();
  const sesion = useAppStore((s) => s.sesion);
  const asesores = useAppStore((s) => s.asesores);
  const clientes = useAppStore((s) => s.clientes);
  const preciosPorEtapaYPlazo = useAppStore((s) => s.preciosPorEtapaYPlazo);
  const crearClienteNuevo = useAppStore((s) => s.crearClienteNuevo);
  const crearClienteNuevoPlazoFijo = useAppStore((s) => s.crearClienteNuevoPlazoFijo);

  const [paso, setPaso] = useState(0);
  const [tipoInversionNueva, setTipoInversionNueva] = useState<"LOTE" | "PLAZO_FIJO" | null>(null);
  const [form, setForm] = useState<FormState>(ESTADO_INICIAL);
  const [manzanaTmp, setManzanaTmp] = useState("");
  const [loteTmp, setLoteTmp] = useState("");
  const [copyVenta, setCopyVenta] = useState("");
  const [copyMembresia, setCopyMembresia] = useState("");
  const [copyPlazoFijo, setCopyPlazoFijo] = useState("");
  const [usuarioPlataformaCreado, setUsuarioPlataformaCreado] = useState(false);
  const [mensajeFinal, setMensajeFinal] = useState<string | null>(null);

  const autorizado = !!sesion && sesion.rol === "asesor";
  const asesor = asesores.find((a) => a.id === sesion?.id);
  useRedirectIfUnauthorized(autorizado);

  if (!autorizado || !sesion || !asesor) {
    return null;
  }
  const asesorId = sesion.id;
  const usuarioPlataformaAsesor = asesor.usuarioPlataformaEducativa;

  const PASOS = tipoInversionNueva === "PLAZO_FIJO" ? PASOS_PLAZO_FIJO : PASOS_LOTE;

  function agregarCopropietario() {
    setForm((f) => ({
      ...f,
      copropietarios: [...f.copropietarios, { id: crypto.randomUUID(), nombres: "", dni: "" }],
    }));
  }

  function agregarLote() {
    if (!manzanaTmp || !loteTmp) return;
    setForm((f) => ({
      ...f,
      propiedades: [
        ...f.propiedades,
        {
          id: crypto.randomUUID(),
          sede: f.sede,
          etapa: f.etapa,
          tipoLote: f.tipoLote,
          manzana: manzanaTmp,
          lote: loteTmp,
          m2: f.medida,
        },
      ],
    }));
    setManzanaTmp("");
    setLoteTmp("");
  }

  function handleDniFiles(files: FileList | null) {
    if (!files) return;
    setForm((f) => ({
      ...f,
      dniFotoNombres: [...f.dniFotoNombres, ...Array.from(files).map((file) => file.name)],
    }));
  }

  function handleUbicacionFiles(files: FileList | null) {
    if (!files) return;
    setForm((f) => ({
      ...f,
      fotoUbicacionNombres: [...f.fotoUbicacionNombres, ...Array.from(files).map((file) => file.name)].slice(
        0,
        MAX_FOTOS_UBICACION,
      ),
    }));
  }

  function handleVoucherFiles(files: FileList | null) {
    if (!files) return;
    setForm((f) => ({
      ...f,
      voucherNombres: [...f.voucherNombres, ...Array.from(files).map((file) => file.name)],
    }));
  }

  function agregarBeneficio() {
    setForm((f) => ({
      ...f,
      beneficios: [...f.beneficios, { id: crypto.randomUUID(), tipo: "OTRO", etiqueta: "" }],
    }));
  }

  function quitarBeneficio(id: string) {
    setForm((f) => ({ ...f, beneficios: f.beneficios.filter((b) => b.id !== id) }));
  }

  function usarPrecioPredeterminado() {
    const precio = preciosPorEtapaYPlazo[form.etapa]?.[form.plazoAnios];
    if (precio) setForm((f) => ({ ...f, precioTotal: String(precio) }));
  }

  function agregarCuotaLibre() {
    setForm((f) => ({
      ...f,
      cuotasLibres: [...f.cuotasLibres, { numero: f.cuotasLibres.length + 1, monto: "" }],
    }));
  }

  function quitarCuotaLibre(numero: number) {
    setForm((f) => ({
      ...f,
      cuotasLibres: f.cuotasLibres
        .filter((c) => c.numero !== numero)
        .map((c, i) => ({ ...c, numero: i + 1 })),
    }));
  }

  function elegirTipoInversion(tipo: "LOTE" | "PLAZO_FIJO") {
    setTipoInversionNueva(tipo);
    setPaso(2);
  }

  const precioPredeterminado = preciosPorEtapaYPlazo[form.etapa]?.[form.plazoAnios];
  const saldoRestanteLibre = saldoAFinanciar(form) - totalCuotasLibres(form);

  const fechaCompromisoValida =
    form.modalidad !== "CONTADO" ||
    (form.fechaCompromiso !== "" &&
      diasEntre(form.fechaCompromiso) <= 31 &&
      diasEntre(form.fechaCompromiso) >= 0);

  const dniDuplicado =
    form.dni.trim() !== "" && clientes.some((c) => c.dni === form.dni.trim());

  function copropietarioDniDuplicado(copropietarioId: string): boolean {
    const cp = form.copropietarios.find((x) => x.id === copropietarioId);
    const dni = cp?.dni.trim();
    if (!dni) return false;
    if (dni === form.dni.trim()) return true;
    if (clientes.some((c) => c.dni === dni)) return true;
    if (clientes.some((c) => c.copropietarios.some((otro) => otro.dni === dni))) return true;
    return form.copropietarios.some((otro) => otro.id !== copropietarioId && otro.dni.trim() === dni);
  }

  const algunCopropietarioDuplicado = form.copropietarios.some((cp) =>
    copropietarioDniDuplicado(cp.id),
  );

  function siguientePermitido(): boolean {
    if (paso === 0)
      return (
        form.nombre.trim() !== "" &&
        form.apellido.trim() !== "" &&
        form.dni.trim() !== "" &&
        !dniDuplicado &&
        !algunCopropietarioDuplicado
      );
    if (paso === 1) return false;

    if (tipoInversionNueva === "PLAZO_FIJO") {
      if (paso === 2) return Number(form.montoPlazoFijo) > 0;
      return true;
    }

    if (paso === 2) return form.propiedades.length > 0;
    if (paso === 3)
      return (
        Number(form.precioTotal) > 0 &&
        Number(form.montoInicial) >= 0 &&
        Number(form.montoInicial) <= Number(form.precioTotal)
      );
    if (paso === 4) {
      if (form.modalidad === "CONTADO") return fechaCompromisoValida;
      if (form.cuotasVariables) {
        return form.cuotasLibres.length > 0 && Math.abs(saldoRestanteLibre) < 0.01;
      }
      return true;
    }
    if (paso === 5) return form.tipoComprobante !== "FACTURA" || form.numeroComprobante.trim() !== "";
    return true;
  }

  function confirmarCopyVenta() {
    setCopyVenta(generarCopyVentaPreview(form));
    setPaso(7);
  }

  function generarCopyMembresiaPreview() {
    const nombreCompleto = `${form.nombre} ${form.apellido}`.trim();
    const usuarioCliente = form.usuarioClientePlataforma || form.telefono;
    setCopyMembresia(
      [
        "Membresias anual por compra de lote CUOTA INICIAL (COMO TITULAR)",
        "",
        `Cliente: ${nombreCompleto}`,
        `Usuario del cliente: ${usuarioCliente}`,
        `Clave del cliente: ${usuarioCliente}`,
        `Usuario de asesor: ${usuarioPlataformaAsesor}`,
      ].join("\n"),
    );
    setPaso(9);
  }

  function generarCopyCredenciales() {
    const nombreCompleto = `${form.nombre} ${form.apellido}`.trim();
    const lineas = [
      `CREDENCIALES DE ACCESO - ${nombreCompleto}`,
      "",
      "App HYO OFICIAL (seguimiento de tu contrato):",
      `- Usuario: ${form.dni}`,
      `- Contrasena: ${form.dni}`,
    ];
    if (tipoInversionNueva === "LOTE") {
      const usuarioCultura = form.usuarioClientePlataforma || form.telefono;
      lineas.push(
        "",
        "App Cultura Emprendedora (plataforma educativa):",
        `- Usuario: ${usuarioCultura}`,
        `- Contrasena: ${usuarioCultura}`,
      );
    }
    return lineas.join("\n");
  }

  function enviarAmbos() {
    const cuotasLibres =
      form.modalidad === "FINANCIADO" && form.cuotasVariables
        ? form.cuotasLibres.map((c) => ({ numero: c.numero, monto: Number(c.monto) || 0 }))
        : undefined;

    const { cliente } = crearClienteNuevo({
      asesorId,
      nombre: form.nombre,
      apellido: form.apellido,
      dni: form.dni,
      telefono: form.telefono,
      email: form.email || undefined,
      copropietarios: form.copropietarios,
      propiedades: form.propiedades,
      modalidad: form.modalidad,
      moneda: form.moneda,
      precioTotal: Number(form.precioTotal) || 0,
      montoInicial: Number(form.montoInicial) || 0,
      voucherNombres: form.voucherNombres,
      dniFotoNombres: form.dniFotoNombres,
      fotoUbicacionNombres: form.fotoUbicacionNombres,
      fechaCompromiso: form.modalidad === "CONTADO" ? form.fechaCompromiso : undefined,
      plazoAnios: form.modalidad === "FINANCIADO" ? form.plazoAnios : undefined,
      cuotasLibres,
      beneficios: form.beneficios.map((b) => ({ tipo: b.tipo, etiqueta: b.etiqueta })),
      comprobante: { tipo: form.tipoComprobante, numero: form.numeroComprobante || form.dni },
    });

    const primerNombre = form.nombre.trim().split(/\s+/)[0] ?? "";
    const primerApellido = form.apellido.trim().split(/\s+/)[0] ?? "";
    setMensajeFinal(
      `✅ ${primerNombre} ${primerApellido} - ${form.dni} - CLIENTE NUEVO CREADO (${cliente.codigo})`,
    );
  }

  function enviarPlazoFijo() {
    const { cliente } = crearClienteNuevoPlazoFijo({
      asesorId,
      nombre: form.nombre,
      apellido: form.apellido,
      dni: form.dni,
      telefono: form.telefono,
      email: form.email || undefined,
      copropietarios: form.copropietarios,
      dniFotoNombres: form.dniFotoNombres,
      monto: Number(form.montoPlazoFijo) || 0,
      moneda: form.moneda,
      detalle: form.detallePlazoFijo || undefined,
      voucherNombres: form.voucherNombres,
      comprobante: { tipo: form.tipoComprobante, numero: form.numeroComprobante || form.dni },
    });

    const primerNombre = form.nombre.trim().split(/\s+/)[0] ?? "";
    const primerApellido = form.apellido.trim().split(/\s+/)[0] ?? "";
    setMensajeFinal(
      `✅ ${primerNombre} ${primerApellido} - ${form.dni} - CLIENTE NUEVO CREADO (${cliente.codigo})`,
    );
  }

  const adjuntos = [
    ...form.dniFotoNombres.map((n) => `DNI: ${n}`),
    ...form.fotoUbicacionNombres.map((n) => `Ubicacion de lote: ${n}`),
    ...form.voucherNombres.map((n) => `Voucher: ${n}`),
  ];

  if (mensajeFinal) {
    return (
      <div className="min-h-screen bg-neutral-100">
        <Topbar titulo="Cliente nuevo - enviado" />
        <div className="max-w-md mx-auto p-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-green-600 font-medium mb-2">{mensajeFinal}</p>
            <p className="text-sm text-neutral-500 mb-4">
              {tipoInversionNueva === "LOTE"
                ? 'Los 2 copys y sus adjuntos fueron "enviados" a Administracion Fk (simulado, sin cuenta real de WhatsApp todavia).'
                : 'El copy y sus adjuntos fueron "enviados" a Administracion Fk (simulado, sin cuenta real de WhatsApp todavia).'}
            </p>
            <h3 className="text-sm font-semibold text-neutral-600 mb-1 text-left">
              Copy {tipoInversionNueva === "LOTE" ? "3" : "2"} - Credenciales para el cliente
            </h3>
            <p className="text-xs text-neutral-500 mb-2 text-left">
              Envia esto al cliente para que acceda a su app
              {tipoInversionNueva === "LOTE" ? "s" : ""}.
            </p>
            <pre className="text-left text-xs bg-neutral-50 border border-neutral-200 rounded p-3 whitespace-pre-wrap mb-4">
              {generarCopyCredenciales()}
            </pre>
            <button
              onClick={() => navigate("/asesor")}
              className="bg-neutral-900 text-white rounded px-4 py-2 text-sm"
            >
              Volver a mis clientes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <Topbar titulo="Cliente nuevo" />
      <div className="max-w-md mx-auto p-4">
        <div className="flex gap-1 mb-4">
          {PASOS.map((p, i) => (
            <div
              key={p}
              className={`flex-1 h-1.5 rounded ${i <= paso ? "bg-neutral-900" : "bg-neutral-300"}`}
            />
          ))}
        </div>
        <p className="text-xs text-neutral-500 mb-4">
          Paso {paso + 1} de {PASOS.length}: {PASOS[paso]}
        </p>

        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          {paso === 0 && (
            <>
              <Campo label="Nombres">
                <input
                  className="input"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                />
              </Campo>
              <Campo label="Apellidos">
                <input
                  className="input"
                  value={form.apellido}
                  onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
                />
              </Campo>
              <Campo label="DNI">
                <input
                  className="input"
                  value={form.dni}
                  onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))}
                />
              </Campo>
              {dniDuplicado && (
                <p className="text-xs text-red-600 -mt-2">
                  ⚠ Ya existe un cliente registrado con este DNI. Revisa "Cliente existente" en
                  vez de crear uno nuevo.
                </p>
              )}
              <Campo label="Numero de telefono">
                <input
                  className="input"
                  value={form.telefono}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                />
              </Campo>
              <Campo label="Correo (opcional)">
                <input
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </Campo>
              <Campo label="Fotos de DNI (delantero / trasero, nitidas y legibles)">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="text-sm"
                  onChange={(e) => handleDniFiles(e.target.files)}
                />
              </Campo>
              <div className="space-y-1">
                {form.dniFotoNombres.map((n, i) => (
                  <p key={i} className="text-xs text-neutral-500">
                    {n}
                  </p>
                ))}
              </div>

              {form.copropietarios.map((cp, i) => (
                <div key={cp.id} className="border border-neutral-200 rounded p-2 space-y-2">
                  <p className="text-xs font-medium text-neutral-500">Copropietario {i + 1}</p>
                  <input
                    className="input"
                    placeholder="Nombres"
                    value={cp.nombres}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        copropietarios: f.copropietarios.map((x) =>
                          x.id === cp.id ? { ...x, nombres: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                  <input
                    className="input"
                    placeholder="DNI"
                    value={cp.dni}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        copropietarios: f.copropietarios.map((x) =>
                          x.id === cp.id ? { ...x, dni: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                  {copropietarioDniDuplicado(cp.id) && (
                    <p className="text-xs text-red-600">
                      ⚠ Este DNI ya esta registrado como titular o copropietario de otro cliente
                    </p>
                  )}
                </div>
              ))}
              <button onClick={agregarCopropietario} className="text-xs text-blue-600">
                + Agregar copropietario
              </button>
              {form.copropietarios.length > 0 && (
                <p className="text-xs text-neutral-400">
                  Recuerda: los pagos deben venir de cada titular/copropietario correspondientemente.
                </p>
              )}
            </>
          )}

          {paso === 1 && (
            <>
              <p className="text-sm text-neutral-500 mb-1">¿Que tipo de inversion es?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => elegirTipoInversion("PLAZO_FIJO")}
                  className="border border-neutral-300 rounded-lg px-3 py-4 text-sm font-medium hover:bg-neutral-50"
                >
                  Plazo fijo
                </button>
                <button
                  onClick={() => elegirTipoInversion("LOTE")}
                  className="border border-neutral-300 rounded-lg px-3 py-4 text-sm font-medium hover:bg-neutral-50"
                >
                  Nuevo lote
                </button>
              </div>
            </>
          )}

          {paso === 2 && tipoInversionNueva === "PLAZO_FIJO" && (
            <>
              <Campo label="Monto">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="input"
                  placeholder="Monto"
                  value={form.montoPlazoFijo}
                  onChange={(e) => setForm((f) => ({ ...f, montoPlazoFijo: e.target.value }))}
                />
              </Campo>
              <Campo label="Moneda">
                <select
                  className="input"
                  value={form.moneda}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, moneda: e.target.value as Movimiento["moneda"] }))
                  }
                >
                  <option value="USD">Dolares (USD)</option>
                  <option value="PEN">Soles (PEN)</option>
                </select>
              </Campo>
              <Campo label="Detalle (opcional)">
                <input
                  className="input"
                  placeholder="Ej: Aporte campana marketing"
                  value={form.detallePlazoFijo}
                  onChange={(e) => setForm((f) => ({ ...f, detallePlazoFijo: e.target.value }))}
                />
              </Campo>
              <Campo label="Adjuntar voucher(s)">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="text-sm"
                  onChange={(e) => handleVoucherFiles(e.target.files)}
                />
              </Campo>
              <div className="space-y-1">
                {form.voucherNombres.map((n, i) => (
                  <p key={i} className="text-xs text-neutral-500">
                    {n}
                  </p>
                ))}
              </div>
              <Campo label="Tipo de comprobante">
                <select
                  className="input"
                  value={form.tipoComprobante}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tipoComprobante: e.target.value as TipoComprobante }))
                  }
                >
                  <option value="BOLETA">Boleta a DNI</option>
                  <option value="FACTURA">Factura con RUC</option>
                </select>
              </Campo>
              {form.tipoComprobante === "FACTURA" && (
                <Campo label="RUC">
                  <input
                    className="input"
                    value={form.numeroComprobante}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, numeroComprobante: e.target.value }))
                    }
                  />
                </Campo>
              )}
            </>
          )}

          {paso === 3 && tipoInversionNueva === "PLAZO_FIJO" && (
            <>
              <p className="text-xs text-neutral-500">
                Revisa o edita el copy antes de enviar.
              </p>
              <textarea
                className="input font-mono text-xs"
                rows={10}
                value={copyPlazoFijo || generarCopyPlazoFijoPreview(form)}
                onChange={(e) => setCopyPlazoFijo(e.target.value)}
              />
              {adjuntos.length > 0 && (
                <div className="border-t border-neutral-100 pt-2">
                  <p className="text-xs font-semibold text-neutral-500 mb-1">
                    Adjuntos que se enviaran (cada uno como mensaje aparte):
                  </p>
                  {adjuntos.map((a, i) => (
                    <p key={i} className="text-xs text-neutral-500">
                      📎 {a}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}

          {paso === 2 && tipoInversionNueva === "LOTE" && (
            <>
              <Campo label="Sede">
                <select
                  className="input"
                  value={form.sede}
                  onChange={(e) => setForm((f) => ({ ...f, sede: e.target.value as Sede }))}
                >
                  <option value="IQUITOS">Iquitos</option>
                  <option value="OXAPAMPA">Oxapampa</option>
                </select>
              </Campo>
              <Campo label="Etapa">
                <select
                  className="input"
                  value={form.etapa}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, etapa: e.target.value as Propiedad["etapa"] }))
                  }
                >
                  <option value="1ERA ETAPA">1era etapa</option>
                  <option value="2DA ETAPA">2da etapa</option>
                  <option value="3ERA ETAPA">3era etapa</option>
                  <option value="VARIADOS">Variados</option>
                </select>
              </Campo>
              <Campo label="Tipo">
                <select
                  className="input"
                  value={form.tipoLote}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tipoLote: e.target.value as Propiedad["tipoLote"] }))
                  }
                >
                  <option value="LOTE">Lote</option>
                  <option value="MEDIA_MANZANA">Media manzana</option>
                  <option value="MANZANA">Manzana</option>
                </select>
              </Campo>
              <Campo label="Medida">
                <select
                  className="input"
                  value={form.medida}
                  onChange={(e) => setForm((f) => ({ ...f, medida: Number(e.target.value) }))}
                >
                  <option value={120}>120 m2</option>
                  <option value={165}>165 m2</option>
                </select>
              </Campo>
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder="Manzana"
                  value={manzanaTmp}
                  onChange={(e) => setManzanaTmp(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Lote"
                  value={loteTmp}
                  onChange={(e) => setLoteTmp(e.target.value)}
                />
                <button onClick={agregarLote} className="text-xs bg-neutral-900 text-white rounded px-3">
                  Agregar
                </button>
              </div>
              <Campo label={`Fotos de ubicacion del lote (hasta ${MAX_FOTOS_UBICACION})`}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="text-sm"
                  onChange={(e) => handleUbicacionFiles(e.target.files)}
                />
              </Campo>
              <div className="space-y-1">
                {form.fotoUbicacionNombres.map((n, i) => (
                  <p key={i} className="text-xs text-neutral-500">
                    {n}
                  </p>
                ))}
              </div>

              <div className="space-y-1">
                {form.propiedades.map((p) => (
                  <div key={p.id} className="text-sm border border-neutral-200 rounded px-2 py-1">
                    {LABEL_TIPO_LOTE[p.tipoLote]} - {p.sede} - {p.etapa} - MZ {p.manzana} LOTE{" "}
                    {p.lote} - {p.m2}m2
                  </div>
                ))}
              </div>

              {form.propiedades.length > 1 && (
                <div className="border border-neutral-200 rounded p-2">
                  <p className="text-xs font-semibold text-neutral-600 mb-1">
                    Agrupacion de contratos
                  </p>
                  <p className="text-xs text-neutral-400 mb-2">
                    Si todos los lotes van en un solo contrato, dejalos todos en el mismo numero
                    de grupo. Si se hacen contratos separados por lote (o por grupos de lotes),
                    ponle un numero de grupo distinto a cada uno.
                  </p>
                  <div className="space-y-1">
                    {form.propiedades.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-neutral-600">
                          MZ {p.manzana} LOTE {p.lote}
                        </span>
                        <input
                          type="number"
                          min={1}
                          className="input w-20 py-1"
                          value={p.grupoContrato ?? 1}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              propiedades: f.propiedades.map((x) =>
                                x.id === p.id
                                  ? { ...x, grupoContrato: Number(e.target.value) || 1 }
                                  : x,
                              ),
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {paso === 3 && tipoInversionNueva === "LOTE" && (
            <>
              <Campo label="Modalidad">
                <select
                  className="input"
                  value={form.modalidad}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, modalidad: e.target.value as TipoModalidad }))
                  }
                >
                  <option value="CONTADO">Contado</option>
                  <option value="FINANCIADO">Financiado</option>
                </select>
              </Campo>

              {form.modalidad === "FINANCIADO" && (
                <Campo label="Plazo de financiamiento">
                  <select
                    className="input"
                    value={form.plazoAnios}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, plazoAnios: Number(e.target.value) as PlazoAnios }))
                    }
                  >
                    <option value={0.5}>6 meses (6 cuotas)</option>
                    <option value={1}>1 ano (12 cuotas)</option>
                    <option value={2}>2 anos (24 cuotas)</option>
                    <option value={3}>3 anos (36 cuotas)</option>
                    <option value={4}>4 anos (48 cuotas)</option>
                  </select>
                </Campo>
              )}

              <Campo label="Precio total del lote">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    className="input"
                    placeholder="Precio total"
                    value={form.precioTotal}
                    onChange={(e) => setForm((f) => ({ ...f, precioTotal: e.target.value }))}
                  />
                  {form.modalidad === "FINANCIADO" && precioPredeterminado && (
                    <button
                      onClick={usarPrecioPredeterminado}
                      className="text-xs border border-neutral-300 rounded px-2 whitespace-nowrap"
                    >
                      Usar {form.moneda} {precioPredeterminado}
                    </button>
                  )}
                </div>
              </Campo>
              <Campo label="Monto inicial (voucher adjunto)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="input"
                  placeholder="Monto inicial"
                  value={form.montoInicial}
                  onChange={(e) => setForm((f) => ({ ...f, montoInicial: e.target.value }))}
                />
              </Campo>
              {form.montoInicial.trim() !== "" &&
                Number(form.montoInicial) > Number(form.precioTotal || 0) && (
                  <p className="text-xs text-red-600 -mt-2">
                    ⚠ El monto inicial no puede ser mayor al precio total.
                  </p>
                )}
              <Campo label="Moneda">
                <select
                  className="input"
                  value={form.moneda}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, moneda: e.target.value as Movimiento["moneda"] }))
                  }
                >
                  <option value="USD">Dolares (USD)</option>
                  <option value="PEN">Soles (PEN)</option>
                </select>
              </Campo>
              <p className="text-xs text-amber-600">
                ⚠ La operacion debe ser en una sola moneda. No se permite mezclar soles y dolares.
              </p>
              <Campo label="Adjuntar voucher(s) del monto inicial">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="text-sm"
                  onChange={(e) => handleVoucherFiles(e.target.files)}
                />
              </Campo>
              <div className="space-y-1">
                {form.voucherNombres.map((n, i) => (
                  <p key={i} className="text-xs text-neutral-500">
                    {n}
                  </p>
                ))}
              </div>
            </>
          )}

          {paso === 4 && tipoInversionNueva === "LOTE" && (
            <>
              {form.modalidad === "CONTADO" ? (
                <>
                  <Campo label="Fecha de compromiso de pago total">
                    <input
                      type="date"
                      className="input"
                      value={form.fechaCompromiso}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, fechaCompromiso: e.target.value }))
                      }
                    />
                  </Campo>
                  <p className="text-xs text-amber-600">
                    ⚠ El plazo maximo para completar un pago al contado es de 1 mes.
                  </p>
                  {form.fechaCompromiso && !fechaCompromisoValida && (
                    <p className="text-xs text-red-600">
                      La fecha debe estar entre hoy y 31 dias despues.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-neutral-600">
                    Saldo a financiar: {form.moneda} {fmt(saldoAFinanciar(form))}
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.cuotasVariables}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, cuotasVariables: e.target.checked }))
                      }
                    />
                    Cuotas variables (el cliente decide el monto de cada mes)
                  </label>

                  {form.cuotasVariables ? (
                    <div className="space-y-2">
                      {form.cuotasLibres.map((c) => (
                        <div key={c.numero} className="flex gap-2 items-center">
                          <span className="text-xs text-neutral-500 w-16 shrink-0">
                            Mes {c.numero}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            className="input"
                            placeholder="Monto"
                            value={c.monto}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                cuotasLibres: f.cuotasLibres.map((x) =>
                                  x.numero === c.numero ? { ...x, monto: e.target.value } : x,
                                ),
                              }))
                            }
                          />
                          <button
                            onClick={() => quitarCuotaLibre(c.numero)}
                            className="text-xs text-red-600 shrink-0"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                      <button onClick={agregarCuotaLibre} className="text-xs text-blue-600">
                        + Agregar cuota
                      </button>
                      <p
                        className={`text-sm font-medium ${
                          Math.abs(saldoRestanteLibre) < 0.01 ? "text-green-600" : "text-amber-600"
                        }`}
                      >
                        Saldo restante: {form.moneda} {fmt(saldoRestanteLibre)}
                      </p>
                      {Math.abs(saldoRestanteLibre) >= 0.01 && (
                        <p className="text-xs text-neutral-400">
                          Sigue agregando cuotas hasta que el saldo restante llegue a 0.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500">
                      Cuota estimada: {form.moneda}{" "}
                      {fmt(
                        Math.round((saldoAFinanciar(form) / (form.plazoAnios * 12)) * 100) / 100,
                      )}{" "}
                      x {form.plazoAnios * 12} meses
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {paso === 5 && tipoInversionNueva === "LOTE" && (
            <>
              <h3 className="text-sm font-semibold text-neutral-600">Beneficios otorgados</h3>
              <p className="text-xs text-neutral-400 -mt-2">
                La membresia educativa (1 ano) se agrega automaticamente a toda venta de lote. Aqui
                solo agregas beneficios adicionales (viajes, duplicacion de membresias, etc).
              </p>
              {form.beneficios.map((b) => (
                <BeneficioEditor
                  key={b.id}
                  tipo={b.tipo}
                  etiqueta={b.etiqueta}
                  tipos={BENEFICIOS_TIPO_LOTE}
                  onTipoChange={(tipo, etiquetaInicial) =>
                    setForm((f) => ({
                      ...f,
                      beneficios: f.beneficios.map((x) =>
                        x.id === b.id ? { ...x, tipo, etiqueta: etiquetaInicial } : x,
                      ),
                    }))
                  }
                  onEtiquetaChange={(etiqueta) =>
                    setForm((f) => ({
                      ...f,
                      beneficios: f.beneficios.map((x) =>
                        x.id === b.id ? { ...x, etiqueta } : x,
                      ),
                    }))
                  }
                  onQuitar={() => quitarBeneficio(b.id)}
                />
              ))}
              <button onClick={agregarBeneficio} className="text-xs text-blue-600">
                + Agregar beneficio
              </button>

              <h3 className="text-sm font-semibold text-neutral-600 pt-2">Comprobante</h3>
              <Campo label="Tipo">
                <select
                  className="input"
                  value={form.tipoComprobante}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tipoComprobante: e.target.value as TipoComprobante }))
                  }
                >
                  <option value="BOLETA">Boleta a DNI</option>
                  <option value="FACTURA">Factura con RUC</option>
                </select>
              </Campo>
              {form.tipoComprobante === "FACTURA" && (
                <Campo label="RUC">
                  <input
                    className="input"
                    value={form.numeroComprobante}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, numeroComprobante: e.target.value }))
                    }
                  />
                </Campo>
              )}
            </>
          )}

          {paso === 6 && tipoInversionNueva === "LOTE" && (
            <>
              <p className="text-xs text-neutral-500">
                Revisa o edita el copy antes de continuar. Aun no se envia.
              </p>
              <textarea
                className="input font-mono text-xs"
                rows={12}
                value={copyVenta || generarCopyVentaPreview(form)}
                onChange={(e) => setCopyVenta(e.target.value)}
              />
              {adjuntos.length > 0 && (
                <div className="border-t border-neutral-100 pt-2">
                  <p className="text-xs font-semibold text-neutral-500 mb-1">
                    Adjuntos que se enviaran (cada uno como mensaje aparte):
                  </p>
                  {adjuntos.map((a, i) => (
                    <p key={i} className="text-xs text-neutral-500">
                      📎 {a}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}

          {paso === 7 && tipoInversionNueva === "LOTE" && (
            <div className="text-center py-4">
              <p className="text-sm mb-3">
                Antes de continuar, crea el usuario de tu socio en la plataforma educativa:
              </p>
              <a
                href={`https://culturaemprendedora.online/registro/${usuarioPlataformaAsesor}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 text-sm break-all underline"
              >
                https://culturaemprendedora.online/registro/{usuarioPlataformaAsesor}
              </a>
              <label className="flex items-center gap-2 text-sm justify-center mt-4">
                <input
                  type="checkbox"
                  checked={usuarioPlataformaCreado}
                  onChange={(e) => setUsuarioPlataformaCreado(e.target.checked)}
                />
                Ya cree el usuario de mi socio
              </label>
            </div>
          )}

          {paso === 8 && tipoInversionNueva === "LOTE" && (
            <>
              <Campo label="Nombres del cliente (titular)">
                <input className="input" value={`${form.nombre} ${form.apellido}`.trim()} disabled />
              </Campo>
              <Campo label="Membresia educativa">
                <input className="input" value="Membresia anual" disabled />
              </Campo>
              <Campo label="Correo del cliente (opcional)">
                <input
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </Campo>
              <Campo label="Numero de cliente">
                <input
                  className="input"
                  value={form.telefono}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                />
              </Campo>
              <Campo label="Usuario del cliente (Cultura Emprendedora)">
                <input
                  className="input"
                  value={form.usuarioClientePlataforma}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, usuarioClientePlataforma: e.target.value }))
                  }
                />
              </Campo>
              <p className="text-xs text-amber-600 -mt-2">
                ⚠ Coloca aqui el mismo usuario que acabas de crear para tu cliente en la
                plataforma educativa (por defecto es su numero de contacto). Su contrasena sera
                igual a su usuario.
              </p>
              <Campo label="Usuario de asesor (predeterminado, no editable)">
                <input className="input" value={usuarioPlataformaAsesor} disabled />
              </Campo>
              <Campo label="Concepto">
                <input
                  className="input"
                  value="Membresias anual por compra de lote CUOTA INICIAL"
                  disabled
                />
              </Campo>
            </>
          )}

          {paso === 9 && tipoInversionNueva === "LOTE" && (
            <>
              <h3 className="text-sm font-semibold text-neutral-600 mb-1">
                Copy 1 - Venta de lote (editable)
              </h3>
              <textarea
                className="input font-mono text-xs mb-3"
                rows={10}
                value={copyVenta}
                onChange={(e) => setCopyVenta(e.target.value)}
              />
              <h3 className="text-sm font-semibold text-neutral-600 mb-1">
                Copy 2 - Activacion de membresia (editable)
              </h3>
              <textarea
                className="input font-mono text-xs"
                rows={6}
                value={copyMembresia}
                onChange={(e) => setCopyMembresia(e.target.value)}
              />
              {adjuntos.length > 0 && (
                <div className="border-t border-neutral-100 pt-2 mt-2">
                  <p className="text-xs font-semibold text-neutral-500 mb-1">Adjuntos:</p>
                  {adjuntos.map((a, i) => (
                    <p key={i} className="text-xs text-neutral-500">
                      📎 {a}
                    </p>
                  ))}
                </div>
              )}
              <p className="text-xs text-neutral-500 mt-2">
                Puedes corregir cualquier error antes de enviar. Se enviaran consecutivamente a
                Administracion Fk.
              </p>
            </>
          )}
        </div>

        <div className="flex justify-between mt-4">
          <button
            disabled={paso === 0}
            onClick={() => setPaso((p) => p - 1)}
            className="text-sm text-neutral-500 disabled:opacity-30"
          >
            Atras
          </button>

          {paso === 1 ? null : paso === 6 && tipoInversionNueva === "LOTE" ? (
            <button
              onClick={confirmarCopyVenta}
              className="bg-neutral-900 text-white rounded px-4 py-2 text-sm"
            >
              Confirmar copy y continuar
            </button>
          ) : paso === 7 && tipoInversionNueva === "LOTE" ? (
            <button
              disabled={!usuarioPlataformaCreado}
              onClick={() => {
                setForm((f) => ({
                  ...f,
                  usuarioClientePlataforma: f.usuarioClientePlataforma || f.telefono,
                }));
                setPaso(8);
              }}
              className="bg-neutral-900 text-white rounded px-4 py-2 text-sm disabled:opacity-30"
            >
              Continuar
            </button>
          ) : paso === 8 && tipoInversionNueva === "LOTE" ? (
            <button
              onClick={generarCopyMembresiaPreview}
              className="bg-neutral-900 text-white rounded px-4 py-2 text-sm"
            >
              Generar previsualizacion
            </button>
          ) : paso === 9 && tipoInversionNueva === "LOTE" ? (
            <button
              onClick={enviarAmbos}
              className="bg-green-600 text-white rounded px-4 py-2 text-sm"
            >
              Enviar ambos
            </button>
          ) : paso === 3 && tipoInversionNueva === "PLAZO_FIJO" ? (
            <button
              onClick={enviarPlazoFijo}
              className="bg-green-600 text-white rounded px-4 py-2 text-sm"
            >
              Enviar
            </button>
          ) : (
            <button
              disabled={!siguientePermitido()}
              onClick={() => setPaso((p) => p + 1)}
              className="bg-neutral-900 text-white rounded px-4 py-2 text-sm disabled:opacity-30"
            >
              Siguiente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
