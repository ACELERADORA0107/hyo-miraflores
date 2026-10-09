import { create } from "zustand";
import type {
  Admin,
  Asesor,
  Bono,
  BonoMeta,
  Cliente,
  Comunicado,
  Cuota,
  CuotaLibre,
  CategoriaDocumento,
  Documento,
  Etapa,
  Gestion,
  Herramienta,
  DocumentoProceso,
  EventoBitacora,
  Inversion,
  Movimiento,
  MovimientoComision,
  PlazoAnios,
  PrioridadObservacion,
  Propiedad,
  Rol,
  SabadoPresentacion,
  TipoBono,
  TipoInversionAdicional,
  TipoModalidad,
  TipoMovimientoComision,
} from "@/types";
import { generarCuotasIguales, lineaCuotasTexto } from "@/lib/cuotas";

interface Sesion {
  rol: Rol;
  id: string; // id de cliente, asesor o admin segun rol
}

interface AppState {
  clientes: Cliente[];
  asesores: Asesor[];
  admins: Admin[];
  gestiones: Gestion[];
  comunicados: Comunicado[];
  herramientas: Herramienta[];
  movimientosComision: MovimientoComision[];
  calendarioSabados: SabadoPresentacion[];
  preciosPorEtapaYPlazo: Partial<Record<Etapa, Partial<Record<PlazoAnios, number>>>>;
  sesion: Sesion | null;

  loginCliente: (dni: string) => boolean;
  loginAsesor: (codigo: string, clave: string) => boolean;
  loginAdmin: (codigo: string, clave: string) => boolean;
  agregarAdmin: (data: {
    nombres: string;
    codigo: string;
    clave: string;
    franquicia: string;
  }) => void;
  eliminarAdmin: (adminId: string) => void;
  agregarAsesor: (data: {
    nombres: string;
    codigo: string;
    clave: string;
    telefono: string;
    rango: string;
    franquicia: string;
  }) => void;
  eliminarAsesor: (asesorId: string) => void;
  actualizarActivoAsesor: (asesorId: string, activo: boolean) => void;
  logout: () => void;

  agregarSabadoPresentacion: (data: Omit<SabadoPresentacion, "id">) => void;
  actualizarSabadoPresentacion: (
    id: string,
    cambios: Partial<Omit<SabadoPresentacion, "id">>,
  ) => void;
  eliminarSabadoPresentacion: (id: string) => void;

  agregarComunicado: (data: { franquicia: string; titulo: string; fecha: string }) => void;
  actualizarComunicado: (
    id: string,
    cambios: Partial<Pick<Comunicado, "titulo" | "fecha" | "fijado">>,
  ) => void;
  eliminarComunicado: (id: string) => void;

  crearClienteNuevo: (data: {
    asesorId: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    email?: string;
    copropietarios: Cliente["copropietarios"];
    propiedades: Cliente["propiedades"];
    modalidad: TipoModalidad;
    moneda: Movimiento["moneda"];
    precioTotal: number;
    montoInicial: number;
    voucherNombres: string[];
    dniFotoNombres: string[];
    fotoUbicacionNombres?: string[];
    fechaCompromiso?: string;
    plazoAnios?: PlazoAnios;
    cuotasLibres?: CuotaLibre[];
    beneficios: { tipo: TipoBono; etiqueta: string }[];
    comprobante: Cliente["comprobante"];
  }) => { cliente: Cliente; copyVenta: string; copyMembresia: string };

  crearClienteNuevoPlazoFijo: (data: {
    asesorId: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    email?: string;
    copropietarios: Cliente["copropietarios"];
    dniFotoNombres: string[];
    monto: number;
    moneda: Movimiento["moneda"];
    detalle?: string;
    voucherNombres: string[];
    comprobante: Cliente["comprobante"];
  }) => { cliente: Cliente; copy: string };

  crearGestionExistente: (data: {
    clienteId: string;
    asesorId: string;
    tipoInversion: TipoInversionAdicional;
    monto: number;
    moneda: Movimiento["moneda"];
    detalle: string;
  }) => { copy: string };

  agregarInversionLote: (data: {
    clienteId: string;
    asesorId: string;
    propiedades: Propiedad[];
    modalidad: TipoModalidad;
    moneda: Movimiento["moneda"];
    precioTotal: number;
    montoInicial: number;
    voucherNombres: string[];
    fotoUbicacionNombres?: string[];
    fechaCompromiso?: string;
    plazoAnios?: PlazoAnios;
    cuotasLibres?: CuotaLibre[];
    beneficios: { tipo: TipoBono; etiqueta: string }[];
    comprobante: Cliente["comprobante"];
  }) => { copy: string };

  agregarInversionSimple: (data: {
    clienteId: string;
    asesorId: string;
    tipo: "PLAZO_FIJO" | "MEMBRESIA";
    monto: number;
    moneda: Movimiento["moneda"];
    detalle?: string;
  }) => { copy: string };

  canjearBono: (clienteId: string, bonoId: string) => void;
  actualizarActivacionBono: (clienteId: string, bonoId: string, activado: boolean) => void;
  agregarBonoCliente: (clienteId: string, data: { tipo: TipoBono; etiqueta: string }) => void;
  agregarObservacion: (
    clienteId: string,
    data: { texto: string; prioridad: PrioridadObservacion; autorAsesorId: string },
  ) => void;
  marcarObservacionVista: (clienteId: string, observacionId: string, visto: boolean) => void;
  recordarObservacion: (clienteId: string, observacionId: string) => void;
  solicitarEliminacionCliente: (
    clienteId: string,
    data: { motivo: string; solicitadoPorId: string },
  ) => void;
  cancelarEliminacionCliente: (clienteId: string) => void;
  eliminarClienteDefinitivo: (clienteId: string) => void;
  corregirCuotaPagada: (clienteId: string, inversionId: string, numeroCuota: number) => void;
  corregirMontoPagadoContado: (clienteId: string, inversionId: string, nuevoMonto: number) => void;
  actualizarCorreccionDocumento: (
    clienteId: string,
    docId: string,
    cambios: { requiereCorreccion?: boolean; notaCorreccion?: string },
  ) => void;
  canjearBonoMeta: (asesorId: string, bonoMetaId: string) => void;
  agregarBonoMeta: (
    asesorId: string,
    data: { titulo: string; objetivoVentas: number; premio: string },
  ) => void;
  eliminarBonoMeta: (asesorId: string, bonoMetaId: string) => void;
  actualizarActivoBonoMeta: (asesorId: string, bonoMetaId: string, activo: boolean) => void;
  actualizarPerfilAsesor: (asesorId: string, data: { nombres?: string; fotoUrl?: string }) => void;
  agregarMovimientoComision: (data: {
    asesorId: string;
    tipo: TipoMovimientoComision;
    monto: number;
    moneda: Movimiento["moneda"];
    clienteId?: string;
    motivo?: string;
  }) => void;
  actualizarProcesoTitulacionInversion: (
    clienteId: string,
    inversionId: string,
    paso: number,
  ) => void;
  agregarDocumentoCliente: (
    clienteId: string,
    data: { categoria: CategoriaDocumento; nombre: string },
  ) => void;
  eliminarDocumentoCliente: (clienteId: string, docId: string) => void;
  actualizarGruposCliente: (
    clienteId: string,
    cambios: { grupoEmbajadores?: boolean; grupoFamiliaKaizen?: boolean },
  ) => void;
  actualizarCuentaApp: (clienteId: string, activa: boolean) => void;
  actualizarDocumentoProceso: (
    clienteId: string,
    docId: string,
    cambios: {
      entregado?: boolean;
      realizado?: boolean;
      requiereCorreccion?: boolean;
      notaCorreccion?: string;
    },
  ) => void;
  pagarCuota: (data: {
    clienteId: string;
    asesorId: string;
    inversionId: string;
    numeroCuota: number;
    montoPagado: number;
    voucherNombre: string;
  }) => { copy: string };

  pagarCuotasMultiples: (data: {
    clienteId: string;
    asesorId: string;
    inversionId: string;
    numerosCuota: number[];
    montoPagado: number;
    voucherNombre: string;
  }) => { copy: string };

  pagarContado: (data: {
    clienteId: string;
    asesorId: string;
    inversionId: string;
    monto: number;
    voucherNombre: string;
    beneficios: { tipo: TipoBono; etiqueta: string }[];
  }) => { copy: string };
  aprobarGestion: (gestionId: string) => void;
  rechazarGestion: (gestionId: string, motivo: string, correccion: string) => void;
  reenviarGestionCorregida: (gestionId: string, copys: string[]) => void;
  actualizarCopyGestion: (gestionId: string, copys: string[]) => void;
}

let clienteSeq = 0;
function siguienteCodigoCliente() {
  clienteSeq += 1;
  return `HYO-${String(clienteSeq).padStart(6, "0")}`;
}

let comisionSeq = 0;
function siguienteCodigoComision() {
  comisionSeq += 1;
  return `COM-${String(comisionSeq).padStart(6, "0")}`;
}

let inversionSeq = 0;
function siguienteCodigoInversion() {
  inversionSeq += 1;
  return `INV-${String(inversionSeq).padStart(6, "0")}`;
}

const LABEL_TIPO_LOTE: Record<Propiedad["tipoLote"], string> = {
  LOTE: "LOTE",
  MEDIA_MANZANA: "MEDIA MANZANA",
  MANZANA: "MANZANA",
};

function fmtMonto(n: number) {
  return n.toFixed(2);
}

function generarLineasLotes(propiedades: Propiedad[]) {
  return propiedades
    .map(
      (p) =>
        `${LABEL_TIPO_LOTE[p.tipoLote]} - ${p.etapa} - MZ ${p.manzana} LOTE ${p.lote} (${p.sede})${p.m2 ? ` - ${p.m2}m2` : ""}`,
    )
    .join("\n");
}

function generarCopyVenta(params: {
  nombreCompleto: string;
  dni: string;
  copropietarios?: { nombres: string; dni: string }[];
  propiedades: Propiedad[];
  modalidad: TipoModalidad;
  moneda: string;
  precioTotal: number;
  montoInicial: number;
  fechaCompromiso?: string;
  plazoAnios?: number;
  cuotas: { numero: number; monto: number }[];
  beneficios: { etiqueta: string }[];
  comprobante: { tipo: string; numero: string };
}) {
  const lineasLotes = generarLineasLotes(params.propiedades);

  const lineaModalidad =
    params.modalidad === "CONTADO"
      ? `CONTADO - compromiso de pago total: ${params.fechaCompromiso ?? "por confirmar"}`
      : `FINANCIADO - ${params.plazoAnios ?? "?"} ano(s) - ${params.cuotas.length} cuotas`;

  const lineasCuotas =
    params.modalidad === "FINANCIADO" && params.cuotas.length
      ? lineaCuotasTexto(params.cuotas, params.moneda)
      : "";

  const lineasCopropietarios = params.copropietarios?.length
    ? `Copropietario(s):\n${params.copropietarios.map((cp) => `- ${cp.nombres} - DNI: ${cp.dni}`).join("\n")}`
    : "";

  return [
    `CLIENTE: ${params.nombreCompleto}`,
    `DNI: ${params.dni}`,
    lineasCopropietarios,
    "",
    lineasLotes,
    "",
    `Modalidad: ${lineaModalidad}`,
    `Precio total: ${params.moneda} ${fmtMonto(params.precioTotal)}`,
    `Monto inicial: ${params.moneda} ${fmtMonto(params.montoInicial)}`,
    lineasCuotas,
    params.beneficios.length
      ? `\nBeneficios:\n${params.beneficios.map((b) => `- ${b.etiqueta}`).join("\n")}`
      : "",
    `\nComprobante: ${params.comprobante.tipo} a ${params.comprobante.numero}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function crearEvento(descripcion: string): EventoBitacora {
  return { id: crypto.randomUUID(), fecha: new Date().toISOString(), descripcion };
}

/** Toda compra de lote incluye de forma obligatoria una membresia educativa que el asesor debe activar. */
function crearBonoMembresiaEducativa(): Bono {
  return {
    id: crypto.randomUUID(),
    tipo: "MEMBRESIA_EDUCATIVA",
    etiqueta: "Membresia educativa - 1 ano",
    activadoPorAsesor: false,
    canjeado: false,
  };
}

function crearPendientesContratoBoleta(
  descripcionBase: string,
  fecha: string,
  pagoRelacionado?: { inversionId: string; numerosCuota?: number[] },
): DocumentoProceso[] {
  return [
    {
      id: crypto.randomUUID(),
      tipo: "CONTRATO_COMPRAVENTA",
      descripcion: `Contrato - ${descripcionBase}`,
      entregado: false,
      realizado: false,
      pagoRelacionado,
      createdAt: fecha,
    },
    {
      id: crypto.randomUUID(),
      tipo: "BOLETA_O_FACTURA",
      descripcion: `Boleta o factura - ${descripcionBase}`,
      entregado: false,
      realizado: false,
      pagoRelacionado,
      createdAt: fecha,
    },
  ];
}

export function labelTipoLote(t: Propiedad["tipoLote"]): string {
  return t === "MEDIA_MANZANA" ? "Media manzana" : t === "MANZANA" ? "Manzana" : "Lote";
}

/** Texto que resume uno o varios lotes de una misma venta: tipo, cantidad, y cuales son. */
export function resumenLotes(props: Propiedad[]): string {
  if (props.length === 0) return "Compra de lote";
  const lotes = props.map((p) => `MZ ${p.manzana} L${p.lote}`).join(", ");
  if (props.length === 1) {
    return `${props[0].etapa} - ${lotes}`;
  }
  return `${labelTipoLote(props[0].tipoLote)} (${props.length} lotes) - ${props[0].etapa}: ${lotes}`;
}

/**
 * Crea Contrato/Boleta agrupando los lotes de la venta por su grupoContrato (algunas ventas de
 * media manzana/manzana van en un solo contrato, otras se dividen en varios contratos separados).
 */
function crearPendientesContratoBoletaPorLotes(
  propiedades: Propiedad[],
  descripcionVenta: string,
  fecha: string,
): DocumentoProceso[] {
  if (propiedades.length === 0) {
    return crearPendientesContratoBoleta(descripcionVenta, fecha);
  }
  const grupos = new Map<number, Propiedad[]>();
  propiedades.forEach((p) => {
    const g = p.grupoContrato ?? 1;
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g)!.push(p);
  });
  const entradas = [...grupos.entries()].sort((a, b) => a[0] - b[0]);
  const totalGrupos = entradas.length;
  return entradas.flatMap(([, props], idx) => {
    const etiquetaGrupo = totalGrupos > 1 ? ` (Contrato ${idx + 1}/${totalGrupos})` : "";
    return crearPendientesContratoBoleta(
      `${descripcionVenta}${etiquetaGrupo} - ${resumenLotes(props)}`,
      fecha,
    );
  });
}

function construirDocumentosIniciales(params: {
  voucherNombres: string[];
  dniFotoNombres?: string[];
  fotoUbicacionNombres?: string[];
  fecha: string;
}): Documento[] {
  return [
    ...params.voucherNombres.map((nombre) => ({
      id: crypto.randomUUID(),
      categoria: "VOUCHER" as const,
      nombre,
      url: "#",
      fecha: params.fecha,
    })),
    ...(params.dniFotoNombres ?? []).map((nombre) => ({
      id: crypto.randomUUID(),
      categoria: "DNI" as const,
      nombre,
      url: "#",
      fecha: params.fecha,
    })),
    ...(params.fotoUbicacionNombres ?? []).map((nombre) => ({
      id: crypto.randomUUID(),
      categoria: "UBICACION_LOTE" as const,
      nombre,
      url: "#",
      fecha: params.fecha,
    })),
  ];
}

function construirInversionLote(params: {
  descripcion: string;
  modalidad: TipoModalidad;
  moneda: Movimiento["moneda"];
  precioTotal: number;
  montoInicial: number;
  fechaCompromiso?: string;
  plazoAnios?: PlazoAnios;
  cuotasLibres?: CuotaLibre[];
  documentos: Documento[];
  lotes?: Propiedad[];
  fecha: string;
}): Inversion {
  if (params.modalidad === "CONTADO") {
    return {
      id: crypto.randomUUID(),
      codigo: siguienteCodigoInversion(),
      lotes: params.lotes,
      descripcion: params.descripcion,
      tipoPlan: "MONTO_FIJO",
      moneda: params.moneda,
      cuotas: [],
      montoTotal: params.precioTotal,
      montoPagado: params.montoInicial,
      fechaCompromiso: params.fechaCompromiso,
      modalidad: params.modalidad,
      documentos: params.documentos,
      procesoTitulacion: -1,
      createdAt: params.fecha,
    };
  }

  let cuotas: Cuota[];
  if (params.cuotasLibres && params.cuotasLibres.length > 0) {
    cuotas = params.cuotasLibres.map((cl) => ({
      numero: cl.numero,
      monto: Math.round(cl.monto * 100) / 100,
      pagada: false,
    }));
  } else {
    const meses = (params.plazoAnios ?? 1) * 12;
    const saldoFinanciar = params.precioTotal - params.montoInicial;
    cuotas = generarCuotasIguales(saldoFinanciar, meses).map((c) => ({
      numero: c.numero,
      monto: c.monto,
      pagada: false,
    }));
  }

  return {
    id: crypto.randomUUID(),
    codigo: siguienteCodigoInversion(),
    descripcion: params.descripcion,
    tipoPlan: "CUOTAS",
    moneda: params.moneda,
    cuotas,
    montoInicial: params.montoInicial > 0 ? params.montoInicial : undefined,
    modalidad: params.modalidad,
    documentos: params.documentos,
    procesoTitulacion: -1,
    lotes: params.lotes,
    createdAt: params.fecha,
  };
}

function generarCopyMembresia(params: {
  nombreCompleto: string;
  usuarioAsesor: string;
  contacto: string;
}) {
  return [
    "Membresias anual por compra de lote CUOTA INICIAL (COMO TITULAR)",
    "",
    `Cliente: ${params.nombreCompleto}`,
    `Usuario del cliente: ${params.contacto}`,
    `Usuario de asesor: ${params.usuarioAsesor}`,
  ].join("\n");
}

export const useAppStore = create<AppState>((set, get) => ({
  clientes: [],
  asesores: [
    {
      id: "a1",
      codigo: "ASE-001",
      clave: "asesor123",
      nombres: "Asesor Demo Uno",
      telefono: "999111222",
      franquicia: "Franquicia FK Embajadora Ana",
      rango: "Embajador Plata",
      usuarioPlataformaEducativa: "Romeroyaneli",
      bonosMeta: [
        {
          id: "bm1",
          titulo: "Meta setiembre",
          objetivoVentas: 5,
          premio: "Viaje a Iquitos",
          canjeado: false,
          activoPorAdmin: true,
        },
        {
          id: "bm2",
          titulo: "Meta trimestral",
          objetivoVentas: 15,
          premio: "Bono S/500",
          canjeado: false,
          activoPorAdmin: true,
        },
        {
          id: "bm3",
          titulo: "Meta anual",
          objetivoVentas: 40,
          premio: "Viaje internacional",
          canjeado: false,
          activoPorAdmin: true,
        },
      ],
      clienteIds: [],
      activo: true,
    },
    {
      id: "a2",
      codigo: "ASE-002",
      clave: "asesor123",
      nombres: "Asesor Demo Dos",
      telefono: "999333444",
      franquicia: "Franquicia FK Embajadora Ana",
      rango: "Embajador Bronce",
      usuarioPlataformaEducativa: "asesordemodos",
      bonosMeta: [
        {
          id: "bm4",
          titulo: "Meta setiembre",
          objetivoVentas: 5,
          premio: "Viaje a Iquitos",
          canjeado: false,
          activoPorAdmin: true,
        },
      ],
      clienteIds: [],
      activo: true,
    },
  ],
  admins: [
    {
      id: "adm1",
      codigo: "72208970",
      clave: "1cic2i",
      nombres: "Admin Principal",
      franquicia: "Franquicia FK Embajadora Ana",
    },
  ],
  gestiones: [],
  comunicados: [
    {
      id: "co1",
      franquicia: "Franquicia FK Embajadora Ana",
      titulo: "Actualizacion de comisiones de setiembre",
      fecha: "2026-09-10",
      fijado: false,
      nuevo: false,
    },
    {
      id: "co2",
      franquicia: "Franquicia FK Embajadora Ana",
      titulo: "Nueva clausula de entrega de titulo en contratos financiados",
      fecha: "2026-09-14",
      fijado: true,
      nuevo: false,
    },
    {
      id: "co3",
      franquicia: "Franquicia FK Embajadora Ana",
      titulo: "Reunion general de asesores - 20 de setiembre",
      fecha: "2026-09-16",
      fijado: false,
      nuevo: true,
    },
  ],
  herramientas: [
    {
      id: "h1",
      franquicia: "Franquicia FK Embajadora Ana",
      tipo: "VIDEO",
      nombre: "Video avance de obra - setiembre",
      url: "#",
    },
    {
      id: "h2",
      franquicia: "Franquicia FK Embajadora Ana",
      tipo: "FLYER",
      nombre: "Flyer promocion 3era etapa",
      url: "#",
    },
    {
      id: "h3",
      franquicia: "Franquicia FK Embajadora Ana",
      tipo: "FLYER",
      nombre: "Flyer duplicacion de membresias",
      url: "#",
    },
  ],
  movimientosComision: [],
  calendarioSabados: [
    {
      id: "sab1",
      fecha: "2026-09-26",
      franquicia: "Franquicia A",
      modalidad: "PRESENCIAL",
      encargado: "Por definir",
    },
    {
      id: "sab2",
      fecha: "2026-10-03",
      franquicia: "Franquicia A",
      modalidad: "VIRTUAL",
      encargado: "Por definir",
    },
    {
      id: "sab3",
      fecha: "2026-10-10",
      franquicia: "Franquicia B",
      modalidad: "PRESENCIAL",
      encargado: "Por definir",
    },
    {
      id: "sab4",
      fecha: "2026-10-17",
      franquicia: "Franquicia B",
      modalidad: "VIRTUAL",
      encargado: "Por definir",
    },
  ],
  preciosPorEtapaYPlazo: {
    "2DA ETAPA": { 0.5: 16500, 1: 17000, 2: 19000, 3: 21000, 4: 23000 },
    "3ERA ETAPA": { 0.5: 13500, 1: 14000, 2: 16000, 3: 18000, 4: 20000 },
  },
  sesion: null,

  loginCliente: (dni) => {
    const cliente = get().clientes.find((c) => c.dni === dni);
    if (!cliente) return false;
    set({ sesion: { rol: "cliente", id: cliente.id } });
    return true;
  },

  loginAsesor: (codigo, clave) => {
    const asesor = get().asesores.find((a) => a.codigo === codigo && a.clave === clave);
    if (!asesor || !asesor.activo) return false;
    set({ sesion: { rol: "asesor", id: asesor.id } });
    return true;
  },

  loginAdmin: (codigo, clave) => {
    const admin = get().admins.find((a) => a.codigo === codigo && a.clave === clave);
    if (!admin) return false;
    set({ sesion: { rol: "admin", id: admin.id } });
    return true;
  },

  agregarAdmin: (data) => {
    const admin: Admin = {
      id: crypto.randomUUID(),
      codigo: data.codigo,
      clave: data.clave,
      nombres: data.nombres,
      franquicia: data.franquicia,
    };
    set((state) => ({ admins: [...state.admins, admin] }));
  },

  eliminarAdmin: (adminId) => {
    set((state) => ({ admins: state.admins.filter((a) => a.id !== adminId) }));
  },

  agregarAsesor: (data) => {
    const asesor: Asesor = {
      id: crypto.randomUUID(),
      codigo: data.codigo,
      clave: data.clave,
      nombres: data.nombres,
      telefono: data.telefono,
      franquicia: data.franquicia,
      rango: data.rango,
      usuarioPlataformaEducativa: data.codigo,
      bonosMeta: [],
      clienteIds: [],
      activo: true,
    };
    set((state) => ({ asesores: [...state.asesores, asesor] }));
  },

  eliminarAsesor: (asesorId) => {
    set((state) => {
      const asesor = state.asesores.find((a) => a.id === asesorId);
      if (!asesor || asesor.clienteIds.length > 0) return state;
      return { asesores: state.asesores.filter((a) => a.id !== asesorId) };
    });
  },

  actualizarActivoAsesor: (asesorId, activo) => {
    set((state) => ({
      asesores: state.asesores.map((a) => (a.id !== asesorId ? a : { ...a, activo })),
    }));
  },

  logout: () => set({ sesion: null }),

  crearClienteNuevo: (data) => {
    const codigo = siguienteCodigoCliente();
    const nombreCompleto = `${data.nombre} ${data.apellido}`.trim();
    const fecha = new Date().toISOString().slice(0, 10);
    const descripcionInversion = resumenLotes(data.propiedades);

    const documentosIniciales = construirDocumentosIniciales({
      voucherNombres: data.voucherNombres,
      dniFotoNombres: data.dniFotoNombres,
      fotoUbicacionNombres: data.fotoUbicacionNombres,
      fecha,
    });

    const inversion = construirInversionLote({
      descripcion: descripcionInversion,
      modalidad: data.modalidad,
      moneda: data.moneda,
      precioTotal: data.precioTotal,
      montoInicial: data.montoInicial,
      fechaCompromiso: data.fechaCompromiso,
      plazoAnios: data.plazoAnios,
      cuotasLibres: data.cuotasLibres,
      documentos: documentosIniciales,
      lotes: data.propiedades,
      fecha,
    });

    const bonos: Bono[] = [
      crearBonoMembresiaEducativa(),
      ...data.beneficios.map((b) => ({
        id: crypto.randomUUID(),
        tipo: b.tipo,
        etiqueta: b.etiqueta,
        activadoPorAsesor: false,
        canjeado: false,
      })),
    ];

    const bitacora: EventoBitacora[] = [
      crearEvento(`Cliente creado: ${nombreCompleto} (${codigo})`),
      crearEvento(
        `Documentos adjuntados: ${documentosIniciales.length} archivo(s) (voucher, DNI, ubicacion de lote)`,
      ),
      crearEvento(`Estado inicial: PROPIETARIO - Documentos pendientes en revision`),
      crearEvento(`Mensaje de venta registrado - pendiente de aprobacion de Administracion`),
    ];

    const cliente: Cliente = {
      id: crypto.randomUUID(),
      codigo,
      nombres: nombreCompleto,
      dni: data.dni,
      telefono: data.telefono,
      email: data.email,
      categoria: "PROPIETARIO",
      asesorId: data.asesorId,
      copropietarios: data.copropietarios,
      propiedades: data.propiedades,
      movimientos: [],
      inversiones: [inversion],
      bonos,
      documentosProceso: crearPendientesContratoBoletaPorLotes(
        data.propiedades,
        "Venta nueva",
        fecha,
      ),
      documentos: [],
      observaciones: [],
      bitacora,
      comprobante: data.comprobante,
      usuarioApp: { usuario: data.dni, clave: data.dni },
      grupoEmbajadores: false,
      grupoFamiliaKaizen: false,
      cuentaApp: { activa: false },
      createdAt: fecha,
    };

    const asesor = get().asesores.find((a) => a.id === data.asesorId);

    const copyVenta = generarCopyVenta({
      nombreCompleto,
      dni: data.dni,
      copropietarios: data.copropietarios,
      propiedades: data.propiedades,
      modalidad: data.modalidad,
      moneda: data.moneda,
      precioTotal: data.precioTotal,
      montoInicial: data.montoInicial,
      fechaCompromiso: data.fechaCompromiso,
      plazoAnios: data.plazoAnios,
      cuotas: inversion.cuotas,
      beneficios: data.beneficios,
      comprobante: data.comprobante,
    });

    const copyMembresia = generarCopyMembresia({
      nombreCompleto,
      usuarioAsesor: asesor?.usuarioPlataformaEducativa ?? "",
      contacto: data.email || data.telefono,
    });

    const gestion: Gestion = {
      id: crypto.randomUUID(),
      clienteId: cliente.id,
      asesorId: data.asesorId,
      tipo: "VENTA_NUEVA",
      estado: "PENDIENTE_APROBACION",
      copys: [copyVenta, copyMembresia],
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      clientes: [...state.clientes, cliente],
      asesores: state.asesores.map((a) =>
        a.id === data.asesorId ? { ...a, clienteIds: [...a.clienteIds, cliente.id] } : a,
      ),
      gestiones: [...state.gestiones, gestion],
    }));

    return { cliente, copyVenta, copyMembresia };
  },

  crearClienteNuevoPlazoFijo: (data) => {
    const codigo = siguienteCodigoCliente();
    const nombreCompleto = `${data.nombre} ${data.apellido}`.trim();
    const fecha = new Date().toISOString().slice(0, 10);
    const descripcion = data.detalle ? `Plazo fijo - ${data.detalle}` : "Plazo fijo";

    const documentosIniciales = construirDocumentosIniciales({
      voucherNombres: data.voucherNombres,
      dniFotoNombres: data.dniFotoNombres,
      fecha,
    });

    const inversion: Inversion = {
      id: crypto.randomUUID(),
      codigo: siguienteCodigoInversion(),
      descripcion,
      tipoPlan: "MONTO_FIJO",
      moneda: data.moneda,
      cuotas: [],
      montoTotal: data.monto,
      montoPagado: data.monto,
      documentos: documentosIniciales,
      createdAt: fecha,
    };

    const bitacora: EventoBitacora[] = [
      crearEvento(`Cliente creado: ${nombreCompleto} (${codigo})`),
      crearEvento(`Documentos adjuntados: ${documentosIniciales.length} archivo(s) (voucher, DNI)`),
      crearEvento(`Estado inicial: INVERSIONISTA - Documentos pendientes en revision`),
      crearEvento(`Mensaje de plazo fijo registrado - pendiente de aprobacion de Administracion`),
    ];

    const cliente: Cliente = {
      id: crypto.randomUUID(),
      codigo,
      nombres: nombreCompleto,
      dni: data.dni,
      telefono: data.telefono,
      email: data.email,
      categoria: "INVERSIONISTA",
      asesorId: data.asesorId,
      copropietarios: data.copropietarios,
      propiedades: [],
      movimientos: [],
      inversiones: [inversion],
      bonos: [],
      documentosProceso: crearPendientesContratoBoleta(descripcion, fecha),
      documentos: [],
      observaciones: [],
      bitacora,
      comprobante: data.comprobante,
      usuarioApp: { usuario: data.dni, clave: data.dni },
      grupoEmbajadores: false,
      grupoFamiliaKaizen: false,
      cuentaApp: { activa: false },
      createdAt: fecha,
    };

    const copy = [
      `CLIENTE: ${nombreCompleto}`,
      `DNI: ${data.dni}`,
      "",
      "PLAZO FIJO - CLIENTE NUEVO",
      `Monto: ${data.moneda} ${fmtMonto(data.monto)}`,
      data.detalle ? `Detalle: ${data.detalle}` : "",
      `\nComprobante: ${data.comprobante.tipo} a ${data.comprobante.numero}`,
    ]
      .filter(Boolean)
      .join("\n");

    const gestion: Gestion = {
      id: crypto.randomUUID(),
      clienteId: cliente.id,
      asesorId: data.asesorId,
      tipo: "VENTA_NUEVA",
      estado: "PENDIENTE_APROBACION",
      copys: [copy],
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      clientes: [...state.clientes, cliente],
      asesores: state.asesores.map((a) =>
        a.id === data.asesorId ? { ...a, clienteIds: [...a.clienteIds, cliente.id] } : a,
      ),
      gestiones: [...state.gestiones, gestion],
    }));

    return { cliente, copy };
  },

  crearGestionExistente: (data) => {
    const cliente = get().clientes.find((c) => c.id === data.clienteId);
    if (!cliente) return { copy: "" };

    const movimiento: Movimiento = {
      id: crypto.randomUUID(),
      tipo: data.tipoInversion === "OTRAS_INVERSIONES" ? "ADICIONAL" : data.tipoInversion === "CONTADO" ? "CONTADO" : "CUOTA",
      fecha: new Date().toISOString().slice(0, 10),
      monto: data.monto,
      moneda: data.moneda,
      voucherUrls: [],
    };

    const copy = [
      "SOLICITUD - CLIENTE EXISTENTE",
      "",
      `${cliente.codigo} - ${cliente.nombres}`,
      `Tipo: ${data.tipoInversion.replace(/_/g, " ")}`,
      `Monto: ${data.moneda} ${data.monto}`,
      data.detalle ? `Detalle: ${data.detalle}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const gestion: Gestion = {
      id: crypto.randomUUID(),
      clienteId: data.clienteId,
      asesorId: data.asesorId,
      tipo: data.detalle ? "SOLICITUD_CAMBIO" : "INVERSION_ADICIONAL",
      estado: "PENDIENTE_APROBACION",
      copys: [copy],
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      clientes: state.clientes.map((c) =>
        c.id !== data.clienteId
          ? c
          : {
              ...c,
              movimientos: [...c.movimientos, movimiento],
              bitacora: [
                ...c.bitacora,
                crearEvento("Solicitud/cambio registrada - pendiente de aprobacion de Administracion"),
              ],
            },
      ),
      gestiones: [...state.gestiones, gestion],
    }));

    return { copy };
  },

  agregarInversionLote: (data) => {
    const cliente = get().clientes.find((c) => c.id === data.clienteId);
    if (!cliente) return { copy: "" };

    const fecha = new Date().toISOString().slice(0, 10);
    const descripcion = resumenLotes(data.propiedades);

    const documentos = construirDocumentosIniciales({
      voucherNombres: data.voucherNombres,
      fotoUbicacionNombres: data.fotoUbicacionNombres,
      fecha,
    });

    const inversion = construirInversionLote({
      descripcion,
      modalidad: data.modalidad,
      moneda: data.moneda,
      precioTotal: data.precioTotal,
      montoInicial: data.montoInicial,
      fechaCompromiso: data.fechaCompromiso,
      plazoAnios: data.plazoAnios,
      cuotasLibres: data.cuotasLibres,
      documentos,
      lotes: data.propiedades,
      fecha,
    });

    const bonos: Bono[] = [
      crearBonoMembresiaEducativa(),
      ...data.beneficios.map((b) => ({
        id: crypto.randomUUID(),
        tipo: b.tipo,
        etiqueta: b.etiqueta,
        activadoPorAsesor: false,
        canjeado: false,
      })),
    ];

    const copy = generarCopyVenta({
      nombreCompleto: cliente.nombres,
      dni: cliente.dni,
      copropietarios: cliente.copropietarios,
      propiedades: data.propiedades,
      modalidad: data.modalidad,
      moneda: data.moneda,
      precioTotal: data.precioTotal,
      montoInicial: data.montoInicial,
      fechaCompromiso: data.fechaCompromiso,
      plazoAnios: data.plazoAnios,
      cuotas: inversion.cuotas,
      beneficios: data.beneficios,
      comprobante: data.comprobante,
    });

    const gestion: Gestion = {
      id: crypto.randomUUID(),
      clienteId: data.clienteId,
      asesorId: data.asesorId,
      tipo: "INVERSION_ADICIONAL",
      estado: "PENDIENTE_APROBACION",
      copys: [copy],
      createdAt: new Date().toISOString(),
    };

    const pendientes = crearPendientesContratoBoletaPorLotes(
      data.propiedades,
      "Nuevo lote / Inversion",
      fecha,
    );

    set((state) => ({
      clientes: state.clientes.map((c) =>
        c.id !== data.clienteId
          ? c
          : {
              ...c,
              propiedades: [...c.propiedades, ...data.propiedades],
              inversiones: [...c.inversiones, inversion],
              bonos: [...c.bonos, ...bonos],
              comprobante: data.comprobante,
              documentosProceso: [...c.documentosProceso, ...pendientes],
              bitacora: [
                ...c.bitacora,
                crearEvento(
                  `Nueva inversion registrada: ${descripcion} - Documentos adjuntados: ${documentos.length} - Mensaje pendiente de aprobacion de Administracion`,
                ),
              ],
            },
      ),
      gestiones: [...state.gestiones, gestion],
    }));

    return { copy };
  },

  agregarInversionSimple: (data) => {
    const cliente = get().clientes.find((c) => c.id === data.clienteId);
    if (!cliente) return { copy: "" };

    const fecha = new Date().toISOString().slice(0, 10);
    const label = data.tipo === "PLAZO_FIJO" ? "Plazo fijo" : "Membresia";
    const descripcion = data.detalle ? `${label} - ${data.detalle}` : label;

    const inversion: Inversion = {
      id: crypto.randomUUID(),
      codigo: siguienteCodigoInversion(),
      descripcion,
      tipoPlan: "MONTO_FIJO",
      moneda: data.moneda,
      cuotas: [],
      montoTotal: data.monto,
      montoPagado: data.monto,
      documentos: [],
      createdAt: fecha,
    };

    const copy = [
      `CLIENTE: ${cliente.nombres}`,
      `DNI: ${cliente.dni}`,
      "",
      label.toUpperCase(),
      `Monto: ${data.moneda} ${fmtMonto(data.monto)}`,
      data.detalle ? `Detalle: ${data.detalle}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const gestion: Gestion = {
      id: crypto.randomUUID(),
      clienteId: data.clienteId,
      asesorId: data.asesorId,
      tipo: "INVERSION_ADICIONAL",
      estado: "PENDIENTE_APROBACION",
      copys: [copy],
      createdAt: new Date().toISOString(),
    };

    const pendientes = crearPendientesContratoBoleta(descripcion, fecha);

    set((state) => ({
      clientes: state.clientes.map((c) =>
        c.id !== data.clienteId
          ? c
          : {
              ...c,
              inversiones: [...c.inversiones, inversion],
              documentosProceso: [...c.documentosProceso, ...pendientes],
              bitacora: [
                ...c.bitacora,
                crearEvento(
                  `${label} registrado: ${data.moneda} ${fmtMonto(data.monto)} - Mensaje pendiente de aprobacion de Administracion`,
                ),
              ],
            },
      ),
      gestiones: [...state.gestiones, gestion],
    }));

    return { copy };
  },

  canjearBonoMeta: (asesorId, bonoMetaId) => {
    set((state) => ({
      asesores: state.asesores.map((a) =>
        a.id !== asesorId
          ? a
          : {
              ...a,
              bonosMeta: a.bonosMeta.map((b) =>
                b.id !== bonoMetaId ? b : { ...b, canjeado: true },
              ),
            },
      ),
    }));
  },

  agregarBonoMeta: (asesorId, data) => {
    const bono: BonoMeta = {
      id: crypto.randomUUID(),
      titulo: data.titulo,
      objetivoVentas: data.objetivoVentas,
      premio: data.premio,
      canjeado: false,
      activoPorAdmin: true,
    };
    set((state) => ({
      asesores: state.asesores.map((a) =>
        a.id !== asesorId ? a : { ...a, bonosMeta: [...a.bonosMeta, bono] },
      ),
    }));
  },

  eliminarBonoMeta: (asesorId, bonoMetaId) => {
    set((state) => ({
      asesores: state.asesores.map((a) =>
        a.id !== asesorId
          ? a
          : { ...a, bonosMeta: a.bonosMeta.filter((b) => b.id !== bonoMetaId) },
      ),
    }));
  },

  actualizarActivoBonoMeta: (asesorId, bonoMetaId, activo) => {
    set((state) => ({
      asesores: state.asesores.map((a) =>
        a.id !== asesorId
          ? a
          : {
              ...a,
              bonosMeta: a.bonosMeta.map((b) =>
                b.id !== bonoMetaId ? b : { ...b, activoPorAdmin: activo },
              ),
            },
      ),
    }));
  },

  agregarSabadoPresentacion: (data) => {
    const sabado: SabadoPresentacion = { id: crypto.randomUUID(), ...data };
    set((state) => ({ calendarioSabados: [...state.calendarioSabados, sabado] }));
  },

  actualizarSabadoPresentacion: (id, cambios) => {
    set((state) => ({
      calendarioSabados: state.calendarioSabados.map((s) =>
        s.id !== id ? s : { ...s, ...cambios },
      ),
    }));
  },

  eliminarSabadoPresentacion: (id) => {
    set((state) => ({
      calendarioSabados: state.calendarioSabados.filter((s) => s.id !== id),
    }));
  },

  agregarComunicado: (data) => {
    const comunicado: Comunicado = {
      id: crypto.randomUUID(),
      franquicia: data.franquicia,
      titulo: data.titulo,
      fecha: data.fecha,
      fijado: false,
      nuevo: true,
    };
    set((state) => ({ comunicados: [...state.comunicados, comunicado] }));
  },

  actualizarComunicado: (id, cambios) => {
    set((state) => ({
      comunicados: state.comunicados.map((c) => (c.id !== id ? c : { ...c, ...cambios })),
    }));
  },

  eliminarComunicado: (id) => {
    set((state) => ({
      comunicados: state.comunicados.filter((c) => c.id !== id),
    }));
  },

  actualizarPerfilAsesor: (asesorId, data) => {
    set((state) => ({
      asesores: state.asesores.map((a) => (a.id !== asesorId ? a : { ...a, ...data })),
    }));
  },

  agregarMovimientoComision: (data) => {
    const movimiento: MovimientoComision = {
      id: crypto.randomUUID(),
      asesorId: data.asesorId,
      tipo: data.tipo,
      monto: data.monto,
      moneda: data.moneda,
      fecha: new Date().toISOString().slice(0, 10),
      codigoMovimiento: siguienteCodigoComision(),
      clienteId: data.tipo === "INGRESO" ? data.clienteId : undefined,
      motivo: data.tipo === "EGRESO" ? data.motivo : undefined,
    };
    set((state) => ({
      movimientosComision: [...state.movimientosComision, movimiento],
    }));
  },

  canjearBono: (clienteId, bonoId) => {
    set((state) => ({
      clientes: state.clientes.map((c) =>
        c.id !== clienteId
          ? c
          : {
              ...c,
              bonos: c.bonos.map((b) =>
                b.id !== bonoId
                  ? b
                  : { ...b, canjeado: true, fechaCanjeado: new Date().toISOString().slice(0, 10) },
              ),
            },
      ),
    }));
  },

  actualizarActivacionBono: (clienteId, bonoId, activado) => {
    set((state) => ({
      clientes: state.clientes.map((c) => {
        if (c.id !== clienteId) return c;
        const bono = c.bonos.find((b) => b.id === bonoId);
        return {
          ...c,
          bonos: c.bonos.map((b) =>
            b.id !== bonoId ? b : { ...b, activadoPorAsesor: activado },
          ),
          bitacora: bono
            ? [
                ...c.bitacora,
                crearEvento(
                  `Beneficio "${bono.etiqueta}" marcado como ${activado ? "activo/entregado" : "pendiente"}`,
                ),
              ]
            : c.bitacora,
        };
      }),
    }));
  },

  agregarBonoCliente: (clienteId, data) => {
    set((state) => ({
      clientes: state.clientes.map((c) => {
        if (c.id !== clienteId) return c;
        const bono: Bono = {
          id: crypto.randomUUID(),
          tipo: data.tipo,
          etiqueta: data.etiqueta,
          activadoPorAsesor: false,
          canjeado: false,
        };
        return {
          ...c,
          bonos: [...c.bonos, bono],
          bitacora: [...c.bitacora, crearEvento(`Beneficio agregado: "${data.etiqueta}"`)],
        };
      }),
    }));
  },

  agregarObservacion: (clienteId, data) => {
    set((state) => ({
      clientes: state.clientes.map((c) => {
        if (c.id !== clienteId) return c;
        const observacion = {
          id: crypto.randomUUID(),
          texto: data.texto,
          fecha: new Date().toISOString(),
          prioridad: data.prioridad,
          autorAsesorId: data.autorAsesorId,
          visto: false,
        };
        return {
          ...c,
          observaciones: [...c.observaciones, observacion],
          bitacora: [...c.bitacora, crearEvento(`Observacion agregada: "${data.texto}"`)],
        };
      }),
    }));
  },

  marcarObservacionVista: (clienteId, observacionId, visto) => {
    set((state) => ({
      clientes: state.clientes.map((c) => {
        if (c.id !== clienteId) return c;
        return {
          ...c,
          observaciones: c.observaciones.map((o) =>
            o.id !== observacionId
              ? o
              : {
                  ...o,
                  visto,
                  vistoFecha: visto ? new Date().toISOString().slice(0, 10) : undefined,
                },
          ),
        };
      }),
    }));
  },

  recordarObservacion: (clienteId, observacionId) => {
    set((state) => ({
      clientes: state.clientes.map((c) => {
        if (c.id !== clienteId) return c;
        return {
          ...c,
          observaciones: c.observaciones.map((o) =>
            o.id !== observacionId
              ? o
              : { ...o, visto: false, vistoFecha: undefined, fecha: new Date().toISOString() },
          ),
        };
      }),
    }));
  },

  solicitarEliminacionCliente: (clienteId, data) => {
    set((state) => ({
      clientes: state.clientes.map((c) =>
        c.id !== clienteId
          ? c
          : {
              ...c,
              solicitudEliminacion: {
                fecha: new Date().toISOString(),
                motivo: data.motivo,
                solicitadoPorId: data.solicitadoPorId,
              },
              bitacora: [
                ...c.bitacora,
                crearEvento(
                  `Solicitud de eliminacion/devolucion registrada: ${data.motivo}. Se podra completar en 30 dias.`,
                ),
              ],
            },
      ),
    }));
  },

  cancelarEliminacionCliente: (clienteId) => {
    set((state) => ({
      clientes: state.clientes.map((c) =>
        c.id !== clienteId
          ? c
          : {
              ...c,
              solicitudEliminacion: undefined,
              bitacora: [...c.bitacora, crearEvento("Solicitud de eliminacion/devolucion cancelada")],
            },
      ),
    }));
  },

  eliminarClienteDefinitivo: (clienteId) => {
    set((state) => ({
      clientes: state.clientes.filter((c) => c.id !== clienteId),
      gestiones: state.gestiones.filter((g) => g.clienteId !== clienteId),
      asesores: state.asesores.map((a) => ({
        ...a,
        clienteIds: a.clienteIds.filter((id) => id !== clienteId),
      })),
    }));
  },

  corregirCuotaPagada: (clienteId, inversionId, numeroCuota) => {
    set((state) => ({
      clientes: state.clientes.map((c) => {
        if (c.id !== clienteId) return c;
        const inversion = c.inversiones.find((inv) => inv.id === inversionId);
        return {
          ...c,
          inversiones: c.inversiones.map((inv) => {
            if (inv.id !== inversionId) return inv;
            return {
              ...inv,
              cuotas: inv.cuotas.map((cu) =>
                cu.numero !== numeroCuota
                  ? cu
                  : {
                      ...cu,
                      pagada: false,
                      fechaPago: undefined,
                      voucherUrl: undefined,
                      montoPagado: undefined,
                    },
              ),
            };
          }),
          // Se quitan solo los Contrato/Boleta de este pago que aun no se habian completado;
          // si ya se habian entregado y realizado, se dejan (ya es un tramite real hecho).
          documentosProceso: c.documentosProceso.filter(
            (d) =>
              !(
                d.pagoRelacionado?.inversionId === inversionId &&
                d.pagoRelacionado?.numerosCuota?.includes(numeroCuota) &&
                !(d.entregado && d.realizado)
              ),
          ),
          bitacora: [
            ...c.bitacora,
            crearEvento(
              `Administracion FK corrigio un pago: cuota ${numeroCuota} de ${inversion?.descripcion ?? "la inversion"} vuelve a quedar pendiente`,
            ),
          ],
        };
      }),
      // Igual que arriba: solo se cancela el envio si seguia pendiente de aprobacion.
      gestiones: state.gestiones.map((g) =>
        g.clienteId === clienteId &&
        g.estado === "PENDIENTE_APROBACION" &&
        g.pagoRelacionado?.inversionId === inversionId &&
        g.pagoRelacionado?.numerosCuota?.includes(numeroCuota)
          ? {
              ...g,
              estado: "RECHAZADO" as const,
              motivoRechazo: "Administracion FK corrigio este pago, el envio ya no corresponde",
            }
          : g,
      ),
    }));
  },

  corregirMontoPagadoContado: (clienteId, inversionId, nuevoMonto) => {
    set((state) => ({
      clientes: state.clientes.map((c) => {
        if (c.id !== clienteId) return c;
        const inv = c.inversiones.find((x) => x.id === inversionId);
        const tope = inv?.montoTotal ?? nuevoMonto;
        const montoValido = Math.min(Math.max(0, nuevoMonto), tope);
        return {
          ...c,
          inversiones: c.inversiones.map((x) =>
            x.id !== inversionId ? x : { ...x, montoPagado: montoValido },
          ),
          documentosProceso: c.documentosProceso.filter(
            (d) =>
              !(
                d.pagoRelacionado?.inversionId === inversionId &&
                !d.pagoRelacionado?.numerosCuota &&
                !(d.entregado && d.realizado)
              ),
          ),
          bitacora: [
            ...c.bitacora,
            crearEvento(`Administracion FK corrigio el monto pagado de una inversion al contado`),
          ],
        };
      }),
      gestiones: state.gestiones.map((g) =>
        g.clienteId === clienteId &&
        g.estado === "PENDIENTE_APROBACION" &&
        g.pagoRelacionado?.inversionId === inversionId &&
        !g.pagoRelacionado?.numerosCuota
          ? {
              ...g,
              estado: "RECHAZADO" as const,
              motivoRechazo: "Administracion FK corrigio este pago, el envio ya no corresponde",
            }
          : g,
      ),
    }));
  },

  actualizarCorreccionDocumento: (clienteId, docId, cambios) => {
    function aplicar(d: Documento): Documento {
      return d.id === docId ? { ...d, ...cambios } : d;
    }
    set((state) => ({
      clientes: state.clientes.map((c) => {
        if (c.id !== clienteId) return c;
        return {
          ...c,
          documentos: c.documentos.map(aplicar),
          inversiones: c.inversiones.map((inv) => ({
            ...inv,
            documentos: inv.documentos.map(aplicar),
          })),
          bitacora:
            cambios.requiereCorreccion === true
              ? [
                  ...c.bitacora,
                  crearEvento(
                    `Administracion FK pidio corregir un documento${cambios.notaCorreccion ? `: ${cambios.notaCorreccion}` : ""}`,
                  ),
                ]
              : c.bitacora,
        };
      }),
    }));
  },

  actualizarProcesoTitulacionInversion: (clienteId, inversionId, paso) => {
    set((state) => ({
      clientes: state.clientes.map((c) =>
        c.id !== clienteId
          ? c
          : {
              ...c,
              inversiones: c.inversiones.map((inv) =>
                inv.id !== inversionId ? inv : { ...inv, procesoTitulacion: paso },
              ),
            },
      ),
    }));
  },

  actualizarDocumentoProceso: (clienteId, docId, cambios) => {
    set((state) => ({
      clientes: state.clientes.map((c) => {
        if (c.id !== clienteId) return c;
        const original = c.documentosProceso.find((d) => d.id === docId);
        const eventoCorreccion =
          original && cambios.requiereCorreccion === true && !original.requiereCorreccion
            ? crearEvento(
                `Administracion FK pidio correccion en "${original.descripcion}"${
                  cambios.notaCorreccion ? `: ${cambios.notaCorreccion}` : ""
                }`,
              )
            : original && cambios.requiereCorreccion === false && original.requiereCorreccion
              ? crearEvento(`Correccion resuelta en "${original.descripcion}"`)
              : null;
        return {
          ...c,
          documentosProceso: c.documentosProceso.map((d) => {
            if (d.id !== docId) return d;
            const actualizado = { ...d, ...cambios };
            const yaCompletado = actualizado.entregado && actualizado.realizado;
            return {
              ...actualizado,
              completadoEl: yaCompletado
                ? (d.completadoEl ?? new Date().toISOString().slice(0, 10))
                : undefined,
            };
          }),
          bitacora: eventoCorreccion ? [...c.bitacora, eventoCorreccion] : c.bitacora,
        };
      }),
    }));
  },

  agregarDocumentoCliente: (clienteId, data) => {
    const documento: Documento = {
      id: crypto.randomUUID(),
      categoria: data.categoria,
      nombre: data.nombre,
      url: "#",
      fecha: new Date().toISOString().slice(0, 10),
    };
    set((state) => ({
      clientes: state.clientes.map((c) =>
        c.id !== clienteId
          ? c
          : {
              ...c,
              documentos: [...c.documentos, documento],
              bitacora: [
                ...c.bitacora,
                crearEvento(`Documento agregado a la biblioteca: ${data.nombre}`),
              ],
            },
      ),
    }));
  },

  eliminarDocumentoCliente: (clienteId, docId) => {
    set((state) => ({
      clientes: state.clientes.map((c) => {
        if (c.id !== clienteId) return c;
        return {
          ...c,
          documentos: c.documentos.filter((d) => d.id !== docId),
          inversiones: c.inversiones.map((inv) => ({
            ...inv,
            documentos: inv.documentos.filter((d) => d.id !== docId),
          })),
        };
      }),
    }));
  },

  actualizarGruposCliente: (clienteId, cambios) => {
    set((state) => ({
      clientes: state.clientes.map((c) => (c.id !== clienteId ? c : { ...c, ...cambios })),
    }));
  },

  actualizarCuentaApp: (clienteId, activa) => {
    set((state) => ({
      clientes: state.clientes.map((c) => {
        if (c.id !== clienteId) return c;
        const fechaActivacion =
          activa && !c.cuentaApp.activa
            ? new Date().toISOString().slice(0, 10)
            : c.cuentaApp.fechaActivacion;
        return {
          ...c,
          cuentaApp: { activa, fechaActivacion },
          bitacora: [
            ...c.bitacora,
            crearEvento(
              activa
                ? "Cuenta de app activada (confirmado por Administracion FK) - vigente por 1 ano"
                : "Cuenta de app desactivada",
            ),
          ],
        };
      }),
    }));
  },

  pagarCuota: (data) => {
    const cliente = get().clientes.find((c) => c.id === data.clienteId);
    const inversion = cliente?.inversiones.find((inv) => inv.id === data.inversionId);
    const cuota = inversion?.cuotas.find((cu) => cu.numero === data.numeroCuota);
    if (!cliente || !inversion || !cuota) return { copy: "" };
    if (cuota.pagada || data.montoPagado <= 0) return { copy: "" };

    const fecha = new Date().toISOString().slice(0, 10);
    const montoEsperado = cuota.monto - (cuota.ajusteAplicado ?? 0);
    const diferencia = Math.round((data.montoPagado - montoEsperado) * 100) / 100;

    const siguienteCuota = inversion.cuotas
      .filter((cu) => cu.numero > data.numeroCuota && !cu.pagada)
      .sort((a, b) => a.numero - b.numero)[0];

    const pendientes = crearPendientesContratoBoleta(
      `${inversion.descripcion} - Cuota ${data.numeroCuota}`,
      fecha,
      { inversionId: data.inversionId, numerosCuota: [data.numeroCuota] },
    );

    const copy = [
      `CLIENTE: ${cliente.nombres}`,
      `DNI: ${cliente.dni}`,
      "",
      `PAGO DE CUOTA - ${inversion.descripcion} (${inversion.codigo})`,
      `Cuota ${data.numeroCuota}: correspondia ${inversion.moneda} ${fmtMonto(montoEsperado)}`,
      `Pagado: ${inversion.moneda} ${fmtMonto(data.montoPagado)}`,
      diferencia !== 0
        ? diferencia > 0
          ? `Excedente de ${inversion.moneda} ${fmtMonto(diferencia)} aplicado a la siguiente cuota`
          : `Faltante de ${inversion.moneda} ${fmtMonto(Math.abs(diferencia))} se suma a la siguiente cuota`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const gestion: Gestion = {
      id: crypto.randomUUID(),
      clienteId: data.clienteId,
      asesorId: data.asesorId,
      tipo: "INVERSION_ADICIONAL",
      estado: "PENDIENTE_APROBACION",
      copys: [copy],
      pagoRelacionado: { inversionId: data.inversionId, numerosCuota: [data.numeroCuota] },
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      clientes: state.clientes.map((c) => {
        if (c.id !== data.clienteId) return c;
        return {
          ...c,
          inversiones: c.inversiones.map((inv) => {
            if (inv.id !== data.inversionId) return inv;
            return {
              ...inv,
              cuotas: inv.cuotas.map((cu) => {
                if (cu.numero === data.numeroCuota) {
                  return {
                    ...cu,
                    pagada: true,
                    fechaPago: fecha,
                    voucherUrl: data.voucherNombre,
                    montoPagado: data.montoPagado,
                  };
                }
                if (siguienteCuota && cu.numero === siguienteCuota.numero) {
                  return { ...cu, ajusteAplicado: (cu.ajusteAplicado ?? 0) + diferencia };
                }
                return cu;
              }),
              documentos: [
                ...inv.documentos,
                {
                  id: crypto.randomUUID(),
                  categoria: "VOUCHER" as const,
                  nombre: data.voucherNombre,
                  url: "#",
                  fecha,
                },
              ],
            };
          }),
          documentosProceso: [...c.documentosProceso, ...pendientes],
          bitacora: [
            ...c.bitacora,
            crearEvento(
              `Pago de cuota ${data.numeroCuota} registrado (${inversion.moneda} ${fmtMonto(data.montoPagado)}) - Mensaje pendiente de aprobacion de Administracion`,
            ),
          ],
        };
      }),
      gestiones: [...state.gestiones, gestion],
    }));

    return { copy };
  },

  pagarCuotasMultiples: (data) => {
    const cliente = get().clientes.find((c) => c.id === data.clienteId);
    const inversion = cliente?.inversiones.find((inv) => inv.id === data.inversionId);
    if (!cliente || !inversion) return { copy: "" };

    const cuotasSeleccionadas = inversion.cuotas
      .filter((cu) => data.numerosCuota.includes(cu.numero))
      .sort((a, b) => a.numero - b.numero);
    if (cuotasSeleccionadas.length === 0) return { copy: "" };
    if (cuotasSeleccionadas.some((cu) => cu.pagada) || data.montoPagado <= 0) return { copy: "" };

    const fecha = new Date().toISOString().slice(0, 10);
    const totalEsperado =
      Math.round(
        cuotasSeleccionadas.reduce((acc, cu) => acc + (cu.monto - (cu.ajusteAplicado ?? 0)), 0) * 100,
      ) / 100;
    const montoPagado = Math.round(data.montoPagado * 100) / 100;
    const diferencia = Math.round((montoPagado - totalEsperado) * 100) / 100;

    const montoAsignadoPorCuota = new Map<number, number>();
    let acumulado = 0;
    cuotasSeleccionadas.forEach((cu, idx) => {
      const pesoSaldo = cu.monto - (cu.ajusteAplicado ?? 0);
      const esUltima = idx === cuotasSeleccionadas.length - 1;
      const asignado = esUltima
        ? Math.round((montoPagado - acumulado) * 100) / 100
        : Math.round(montoPagado * (pesoSaldo / totalEsperado) * 100) / 100;
      montoAsignadoPorCuota.set(cu.numero, asignado);
      acumulado = Math.round((acumulado + asignado) * 100) / 100;
    });

    const ultimoNumero = cuotasSeleccionadas[cuotasSeleccionadas.length - 1].numero;
    const siguienteCuota = inversion.cuotas
      .filter((cu) => cu.numero > ultimoNumero && !cu.pagada)
      .sort((a, b) => a.numero - b.numero)[0];

    const numerosTexto = cuotasSeleccionadas.map((c) => c.numero).join(", ");

    const pendientes = crearPendientesContratoBoleta(
      `${inversion.descripcion} - Cuotas ${numerosTexto}`,
      fecha,
      { inversionId: data.inversionId, numerosCuota: data.numerosCuota },
    );

    const copy = [
      `CLIENTE: ${cliente.nombres}`,
      `DNI: ${cliente.dni}`,
      "",
      `PAGO DE CUOTAS - ${inversion.descripcion} (${inversion.codigo})`,
      `Cuotas pagadas: ${numerosTexto}`,
      `Correspondia: ${inversion.moneda} ${fmtMonto(totalEsperado)}`,
      `Pagado: ${inversion.moneda} ${fmtMonto(montoPagado)}`,
      diferencia !== 0
        ? diferencia > 0
          ? `Excedente de ${inversion.moneda} ${fmtMonto(diferencia)} aplicado a la siguiente cuota`
          : `Faltante de ${inversion.moneda} ${fmtMonto(Math.abs(diferencia))} se suma a la siguiente cuota`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const gestion: Gestion = {
      id: crypto.randomUUID(),
      clienteId: data.clienteId,
      asesorId: data.asesorId,
      tipo: "INVERSION_ADICIONAL",
      estado: "PENDIENTE_APROBACION",
      copys: [copy],
      pagoRelacionado: { inversionId: data.inversionId, numerosCuota: data.numerosCuota },
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      clientes: state.clientes.map((c) => {
        if (c.id !== data.clienteId) return c;
        return {
          ...c,
          inversiones: c.inversiones.map((inv) => {
            if (inv.id !== data.inversionId) return inv;
            return {
              ...inv,
              cuotas: inv.cuotas.map((cu) => {
                if (data.numerosCuota.includes(cu.numero)) {
                  return {
                    ...cu,
                    pagada: true,
                    fechaPago: fecha,
                    voucherUrl: data.voucherNombre,
                    montoPagado: montoAsignadoPorCuota.get(cu.numero) ?? cu.monto,
                  };
                }
                if (siguienteCuota && cu.numero === siguienteCuota.numero) {
                  return { ...cu, ajusteAplicado: (cu.ajusteAplicado ?? 0) + diferencia };
                }
                return cu;
              }),
              documentos: [
                ...inv.documentos,
                {
                  id: crypto.randomUUID(),
                  categoria: "VOUCHER" as const,
                  nombre: data.voucherNombre,
                  url: "#",
                  fecha,
                },
              ],
            };
          }),
          documentosProceso: [...c.documentosProceso, ...pendientes],
          bitacora: [
            ...c.bitacora,
            crearEvento(
              `Pago de cuotas ${numerosTexto} registrado (${inversion.moneda} ${fmtMonto(montoPagado)}) - Mensaje pendiente de aprobacion de Administracion`,
            ),
          ],
        };
      }),
      gestiones: [...state.gestiones, gestion],
    }));

    return { copy };
  },

  pagarContado: (data) => {
    const cliente = get().clientes.find((c) => c.id === data.clienteId);
    const inversion = cliente?.inversiones.find((inv) => inv.id === data.inversionId);
    if (!cliente || !inversion) return { copy: "" };
    if (data.monto <= 0) return { copy: "" };
    if (inversion.tipoPlan === "CUOTAS" && inversion.cuotas.every((cu) => cu.pagada)) {
      return { copy: "" };
    }
    if (
      inversion.tipoPlan === "MONTO_FIJO" &&
      (inversion.montoPagado ?? 0) >= (inversion.montoTotal ?? 0)
    ) {
      return { copy: "" };
    }

    const fecha = new Date().toISOString().slice(0, 10);

    if (inversion.tipoPlan === "CUOTAS") {
      const cuotasPendientes = inversion.cuotas
        .filter((cu) => !cu.pagada)
        .sort((a, b) => a.numero - b.numero);
      const saldoOriginal =
        Math.round(
          cuotasPendientes.reduce((acc, cu) => acc + (cu.monto - (cu.ajusteAplicado ?? 0)), 0) * 100,
        ) / 100;
      const montoLiquidacion = Math.round(data.monto * 100) / 100;
      const esPrecioPactado = Math.abs(montoLiquidacion - saldoOriginal) >= 0.01;

      const montoAsignadoPorCuota = new Map<number, number>();
      let acumulado = 0;
      cuotasPendientes.forEach((cu, idx) => {
        const pesoSaldo = cu.monto - (cu.ajusteAplicado ?? 0);
        const esUltima = idx === cuotasPendientes.length - 1;
        const asignado = esUltima
          ? Math.round((montoLiquidacion - acumulado) * 100) / 100
          : Math.round(montoLiquidacion * (pesoSaldo / saldoOriginal) * 100) / 100;
        montoAsignadoPorCuota.set(cu.numero, asignado);
        acumulado = Math.round((acumulado + asignado) * 100) / 100;
      });

      const bonos: Bono[] = data.beneficios.map((b) => ({
        id: crypto.randomUUID(),
        tipo: b.tipo,
        etiqueta: b.etiqueta,
        activadoPorAsesor: false,
        canjeado: false,
      }));

      const pendientes = crearPendientesContratoBoleta(
        `${inversion.descripcion} - Pago al contado (liquidacion de saldo)`,
        fecha,
        { inversionId: data.inversionId, numerosCuota: cuotasPendientes.map((cu) => cu.numero) },
      );

      const copy = [
        `CLIENTE: ${cliente.nombres}`,
        `DNI: ${cliente.dni}`,
        "",
        `PAGO AL CONTADO - LIQUIDACION DE SALDO - ${inversion.descripcion} (${inversion.codigo})`,
        `Cuotas liquidadas: ${cuotasPendientes.length}`,
        esPrecioPactado
          ? `PRECIO PACTADO DIFERENTE: ${inversion.moneda} ${fmtMonto(montoLiquidacion)} (saldo original de cuotas: ${inversion.moneda} ${fmtMonto(saldoOriginal)})`
          : `Monto pagado: ${inversion.moneda} ${fmtMonto(montoLiquidacion)}`,
        `Saldo restante: ${inversion.moneda} 0.00`,
        data.beneficios.length
          ? `\nBeneficios:\n${data.beneficios.map((b) => `- ${b.etiqueta}`).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      const gestion: Gestion = {
        id: crypto.randomUUID(),
        clienteId: data.clienteId,
        asesorId: data.asesorId,
        tipo: "INVERSION_ADICIONAL",
        estado: "PENDIENTE_APROBACION",
        copys: [copy],
        pagoRelacionado: {
          inversionId: data.inversionId,
          numerosCuota: cuotasPendientes.map((cu) => cu.numero),
        },
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        clientes: state.clientes.map((c) => {
          if (c.id !== data.clienteId) return c;
          return {
            ...c,
            inversiones: c.inversiones.map((inv) => {
              if (inv.id !== data.inversionId) return inv;
              return {
                ...inv,
                cuotas: inv.cuotas.map((cu) =>
                  cu.pagada
                    ? cu
                    : {
                        ...cu,
                        pagada: true,
                        fechaPago: fecha,
                        voucherUrl: data.voucherNombre,
                        montoPagado: montoAsignadoPorCuota.get(cu.numero) ?? cu.monto,
                      },
                ),
                documentos: [
                  ...inv.documentos,
                  {
                    id: crypto.randomUUID(),
                    categoria: "VOUCHER" as const,
                    nombre: data.voucherNombre,
                    url: "#",
                    fecha,
                  },
                ],
              };
            }),
            bonos: [...c.bonos, ...bonos],
            documentosProceso: [...c.documentosProceso, ...pendientes],
            bitacora: [
              ...c.bitacora,
              crearEvento(
                `Liquidacion de saldo al contado registrada (${inversion.moneda} ${fmtMonto(montoLiquidacion)}) - Mensaje pendiente de aprobacion de Administracion`,
              ),
            ],
          };
        }),
        gestiones: [...state.gestiones, gestion],
      }));

      return { copy };
    }

    const nuevoMontoPagado = Math.round(((inversion.montoPagado ?? 0) + data.monto) * 100) / 100;
    const saldoRestante = Math.max(
      0,
      Math.round(((inversion.montoTotal ?? 0) - nuevoMontoPagado) * 100) / 100,
    );

    const bonos: Bono[] = data.beneficios.map((b) => ({
      id: crypto.randomUUID(),
      tipo: b.tipo,
      etiqueta: b.etiqueta,
      activadoPorAsesor: false,
      canjeado: false,
    }));

    const pendientes = crearPendientesContratoBoleta(
      `${inversion.descripcion} - Pago al contado`,
      fecha,
      { inversionId: data.inversionId },
    );

    const copy = [
      `CLIENTE: ${cliente.nombres}`,
      `DNI: ${cliente.dni}`,
      "",
      `PAGO AL CONTADO - ${inversion.descripcion} (${inversion.codigo})`,
      `Monto abonado: ${inversion.moneda} ${fmtMonto(data.monto)}`,
      `Total pagado: ${inversion.moneda} ${fmtMonto(nuevoMontoPagado)} de ${inversion.moneda} ${fmtMonto(inversion.montoTotal ?? 0)}`,
      `Saldo restante: ${inversion.moneda} ${fmtMonto(saldoRestante)}`,
      data.beneficios.length
        ? `\nBeneficios:\n${data.beneficios.map((b) => `- ${b.etiqueta}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const gestion: Gestion = {
      id: crypto.randomUUID(),
      clienteId: data.clienteId,
      asesorId: data.asesorId,
      tipo: "INVERSION_ADICIONAL",
      estado: "PENDIENTE_APROBACION",
      copys: [copy],
      pagoRelacionado: { inversionId: data.inversionId },
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      clientes: state.clientes.map((c) => {
        if (c.id !== data.clienteId) return c;
        return {
          ...c,
          inversiones: c.inversiones.map((inv) =>
            inv.id !== data.inversionId
              ? inv
              : {
                  ...inv,
                  montoPagado: nuevoMontoPagado,
                  documentos: [
                    ...inv.documentos,
                    {
                      id: crypto.randomUUID(),
                      categoria: "VOUCHER" as const,
                      nombre: data.voucherNombre,
                      url: "#",
                      fecha,
                    },
                  ],
                },
          ),
          bonos: [...c.bonos, ...bonos],
          bitacora: [
            ...c.bitacora,
            crearEvento(
              `Pago al contado registrado (${inversion.moneda} ${fmtMonto(data.monto)}) - Mensaje pendiente de aprobacion de Administracion`,
            ),
          ],
          documentosProceso: [...c.documentosProceso, ...pendientes],
        };
      }),
      gestiones: [...state.gestiones, gestion],
    }));

    return { copy };
  },

  aprobarGestion: (gestionId) => {
    const gestion = get().gestiones.find((g) => g.id === gestionId);
    if (!gestion) return;
    set((state) => ({
      gestiones: state.gestiones.map((g) =>
        g.id !== gestionId ? g : { ...g, estado: "ENVIADO_A_ADMIN_FK" },
      ),
      clientes: state.clientes.map((c) =>
        c.id !== gestion.clienteId
          ? c
          : {
              ...c,
              bitacora: [
                ...c.bitacora,
                crearEvento("Mensaje aprobado por Administracion y enviado a Administracion FK"),
              ],
            },
      ),
    }));
  },

  rechazarGestion: (gestionId, motivo, correccion) => {
    const gestion = get().gestiones.find((g) => g.id === gestionId);
    if (!gestion) return;
    set((state) => ({
      gestiones: state.gestiones.map((g) =>
        g.id !== gestionId
          ? g
          : { ...g, estado: "RECHAZADO", motivoRechazo: motivo, correccionSolicitada: correccion },
      ),
      clientes: state.clientes.map((c) =>
        c.id !== gestion.clienteId
          ? c
          : {
              ...c,
              bitacora: [
                ...c.bitacora,
                crearEvento(
                  `Envio rechazado por Administracion: ${motivo}${correccion ? ` - Corregir: ${correccion}` : ""}`,
                ),
              ],
            },
      ),
    }));
  },

  reenviarGestionCorregida: (gestionId, copys) => {
    const gestion = get().gestiones.find((g) => g.id === gestionId);
    if (!gestion) return;
    set((state) => ({
      gestiones: state.gestiones.map((g) =>
        g.id !== gestionId
          ? g
          : {
              ...g,
              copys,
              estado: "PENDIENTE_APROBACION",
              motivoRechazo: undefined,
              correccionSolicitada: undefined,
            },
      ),
      clientes: state.clientes.map((c) =>
        c.id !== gestion.clienteId
          ? c
          : {
              ...c,
              bitacora: [
                ...c.bitacora,
                crearEvento("Solicitud corregida por el asesor y reenviada a Administracion"),
              ],
            },
      ),
    }));
  },

  actualizarCopyGestion: (gestionId, copys) => {
    set((state) => ({
      gestiones: state.gestiones.map((g) => (g.id !== gestionId ? g : { ...g, copys })),
    }));
  },
}));
