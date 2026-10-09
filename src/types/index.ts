export type Sede = "IQUITOS" | "OXAPAMPA";
export type Etapa = "1ERA ETAPA" | "2DA ETAPA" | "3ERA ETAPA" | "VARIADOS";
export type Categoria = "PROPIETARIO" | "ESTUDIANTE" | "INVERSIONISTA";
export type Moneda = "USD" | "PEN";
export type TipoMovimiento =
  | "RESERVA"
  | "CUOTA_INICIAL"
  | "CONTADO"
  | "CUOTA"
  | "ADICIONAL";
export type TipoBono =
  | "VIAJE_IQUITOS"
  | "MEMBRESIA_EDUCATIVA"
  | "DUPLICACION_MEMBRESIAS"
  | "OTRO";
export type TipoSolicitud = "DOCUMENTOS_PENDIENTES" | "CONTRATO_COMPRAVENTA" | "BOLETA_O_FACTURA";
export type CategoriaDocumento =
  | "CONTRATO"
  | "DOCUMENTO"
  | "VOUCHER"
  | "BOLETA_O_FACTURA"
  | "DNI"
  | "UBICACION_LOTE";
export type TipoComprobante = "BOLETA" | "FACTURA";

export interface Copropietario {
  id: string;
  nombres: string;
  dni: string;
  telefono?: string;
  dniFotoFrontal?: string;
  dniFotoPosterior?: string;
}

export interface Propiedad {
  id: string;
  sede: Sede;
  etapa: Etapa;
  tipoLote: "LOTE" | "MEDIA_MANZANA" | "MANZANA";
  manzana: string;
  lote: string;
  m2?: number;
  fotoUbicacion?: string;
  grupoContrato?: number; // lotes con el mismo numero van en un solo Contrato/Boleta. Por defecto 1 (un solo contrato para todos).
}

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  fecha: string;
  monto: number;
  moneda: Moneda;
  voucherUrls: string[];
}

export interface Bono {
  id: string;
  tipo: TipoBono;
  etiqueta: string;
  activadoPorAsesor: boolean;
  canjeado: boolean;
  fechaCanjeado?: string;
}

export interface DocumentoProceso {
  id: string;
  tipo: TipoSolicitud;
  descripcion: string; // ej. "Contrato (CUOTA 4)" o "Boleta - Nuevo lote"
  entregado: boolean;
  realizado: boolean;
  completadoEl?: string; // fecha en que entregado y realizado se cumplieron ambos
  requiereCorreccion?: boolean; // Administracion FK pidio corregir algo
  notaCorreccion?: string; // detalle de la correccion pedida por FK
  pagoRelacionado?: { inversionId: string; numerosCuota?: number[] }; // para poder limpiar esto si se corrige el pago que lo genero
  createdAt: string;
}

export interface Documento {
  id: string;
  categoria: CategoriaDocumento;
  nombre: string;
  url: string;
  fecha: string;
  requiereCorreccion?: boolean; // Administracion FK pidio corregir/resubir este archivo
  notaCorreccion?: string; // detalle de la correccion pedida
}

export type TipoPlanInversion = "CUOTAS" | "MONTO_FIJO";

export interface Cuota {
  numero: number;
  monto: number;
  pagada: boolean;
  fechaPago?: string;
  voucherUrl?: string;
  montoPagado?: number; // lo que realmente pago el cliente (puede diferir de monto)
  ajusteAplicado?: number; // excedente (+) o faltante (-) heredado del pago de la cuota anterior
}

export interface Inversion {
  id: string;
  codigo: string; // INV-000001
  descripcion: string; // "Lote 12 - Etapa 1" o "Aporte campana marketing"
  tipoPlan: TipoPlanInversion;
  moneda: Moneda;
  cuotas: Cuota[]; // usado si tipoPlan === CUOTAS
  montoInicial?: number; // cuota inicial pagada al firmar, usado si tipoPlan === CUOTAS
  montoTotal?: number; // usado si tipoPlan === MONTO_FIJO
  montoPagado?: number; // usado si tipoPlan === MONTO_FIJO
  fechaCompromiso?: string; // plazo maximo para completar pago al contado
  modalidad?: TipoModalidad; // solo para inversiones de venta de lote (no aplica a plazo fijo)
  documentos: Documento[];
  procesoTitulacion?: number; // indice en PASOS_TITULACION, -1 = no iniciado. Solo si modalidad esta definida (venta de lote)
  lotes?: Propiedad[]; // los lotes de esta venta (puede ser 1 lote, o varios si es media manzana/manzana)
  createdAt: string;
}

export interface EventoBitacora {
  id: string;
  fecha: string; // ISO datetime completo (fecha y hora)
  descripcion: string;
}

export type PrioridadObservacion = "BAJA" | "MEDIA" | "ALTA";

export interface Observacion {
  id: string;
  texto: string;
  fecha: string; // ISO datetime completo
  prioridad: PrioridadObservacion; // amarillo / naranja / rojo
  autorAsesorId: string;
  visto: boolean;
  vistoFecha?: string;
}

export type TipoModalidad = "CONTADO" | "FINANCIADO";
export type PlazoAnios = 0.5 | 1 | 2 | 3 | 4;

export interface CuotaLibre {
  numero: number;
  monto: number;
}

export interface Cliente {
  id: string;
  codigo: string; // HYO-000001
  nombres: string;
  dni: string;
  telefono: string;
  email?: string;
  categoria: Categoria;
  asesorId: string;
  copropietarios: Copropietario[];
  propiedades: Propiedad[];
  movimientos: Movimiento[];
  inversiones: Inversion[];
  bonos: Bono[];
  documentosProceso: DocumentoProceso[];
  documentos: Documento[];
  observaciones: Observacion[];
  bitacora: EventoBitacora[];
  comprobante: { tipo: TipoComprobante; numero: string };
  usuarioApp: { usuario: string; clave: string };
  grupoEmbajadores: boolean;
  grupoFamiliaKaizen: boolean;
  cuentaApp: { activa: boolean; fechaActivacion?: string };
  solicitudEliminacion?: {
    fecha: string; // cuando se solicito, el cliente se puede eliminar definitivamente 30 dias despues
    motivo: string;
    solicitadoPorId: string; // id del asesor o admin que la pidio
  };
  createdAt: string;
}

export interface BonoMeta {
  id: string;
  titulo: string;
  objetivoVentas: number;
  premio: string;
  canjeado: boolean;
  activoPorAdmin: boolean;
}

export interface Asesor {
  id: string;
  codigo: string;
  clave: string;
  nombres: string;
  telefono: string;
  franquicia: string;
  fotoUrl?: string;
  rango: string;
  usuarioPlataformaEducativa: string;
  bonosMeta: BonoMeta[];
  clienteIds: string[];
  activo: boolean;
}

export interface Comunicado {
  id: string;
  franquicia: string;
  titulo: string;
  fecha: string;
  fijado: boolean;
  nuevo: boolean;
}

export type ModalidadPresentacion = "PRESENCIAL" | "VIRTUAL";

export interface SabadoPresentacion {
  id: string;
  fecha: string; // YYYY-MM-DD, sabado
  franquicia: string; // ej. "Franquicia A", "Franquicia B"
  modalidad: ModalidadPresentacion;
  encargado: string;
}

export type TipoHerramienta = "VIDEO" | "FLYER";

export interface Herramienta {
  id: string;
  franquicia: string;
  tipo: TipoHerramienta;
  nombre: string;
  url: string;
}

export type TipoInversionAdicional = "CONTADO" | "FINANCIADO" | "PLAZO_FIJO" | "OTRAS_INVERSIONES";

export type TipoMovimientoComision = "INGRESO" | "EGRESO";

export interface MovimientoComision {
  id: string;
  asesorId: string;
  tipo: TipoMovimientoComision;
  monto: number;
  moneda: Moneda;
  fecha: string;
  codigoMovimiento: string;
  clienteId?: string; // para ingresos, de que venta proviene
  motivo?: string; // para egresos, por que se descuenta/retira
}

export interface Admin {
  id: string;
  codigo: string;
  clave: string;
  nombres: string;
  franquicia: string;
}

export type TipoGestion =
  | "VENTA_NUEVA"
  | "INVERSION_ADICIONAL"
  | "SOLICITUD_CAMBIO"
  | "COMISION_PENDIENTE"
  | "COMISION_ACTUALIZADA"
  | "ACTUALIZACION_CONTRATO"
  | "CONTRATO_LEGALIZADO";

export type EstadoGestion = "PENDIENTE_APROBACION" | "ENVIADO_A_ADMIN_FK" | "RECHAZADO";

export interface Gestion {
  id: string;
  clienteId: string;
  asesorId: string;
  tipo: TipoGestion;
  estado: EstadoGestion;
  copys: string[]; // uno o mas copys generados (ej. venta de lote + activacion de membresia/app)
  motivoRechazo?: string; // por que Administracion rechazo el envio
  correccionSolicitada?: string; // que debe corregir el asesor antes de reenviar
  pagoRelacionado?: { inversionId: string; numerosCuota?: number[] }; // para poder limpiar esto si se corrige el pago que lo genero
  createdAt: string;
}

export type Rol = "cliente" | "asesor" | "admin";
