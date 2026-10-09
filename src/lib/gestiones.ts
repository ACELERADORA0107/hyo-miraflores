import type { EstadoGestion, Gestion } from "@/types";

export function fmtFechaHora(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export const LABEL_ESTADO_GESTION: Record<EstadoGestion, string> = {
  PENDIENTE_APROBACION: "Pendiente de aprobacion",
  ENVIADO_A_ADMIN_FK: "Enviado a Administracion FK",
  RECHAZADO: "Rechazado - requiere correccion",
};

export function esClienteNuevo(g: Gestion): boolean {
  return g.tipo === "VENTA_NUEVA";
}

/** Categoria legible de una gestion, derivada del tipo y el contenido de sus copys. */
export function categoriaGestion(g: Gestion): string {
  if (g.tipo === "SOLICITUD_CAMBIO") return "Solicitud / cambio";
  const copy = g.copys.join("\n");
  if (copy.includes("PAGO DE CUOTAS")) return "Pago de cuotas";
  if (copy.includes("PAGO DE CUOTA")) return "Pago de cuota";
  if (copy.includes("LIQUIDACION DE SALDO")) return "Liquidacion al contado";
  if (copy.includes("PAGO AL CONTADO")) return "Pago al contado";
  if (copy.includes("PLAZO FIJO")) return g.tipo === "VENTA_NUEVA" ? "Venta nueva - Plazo fijo" : "Plazo fijo";
  if (copy.includes("MEMBRESIA")) return "Membresia";
  if (g.tipo === "VENTA_NUEVA") return "Venta nueva - Lote";
  return "Nuevo lote / Inversion";
}

/** Gestiones que representan una venta/inversion nueva (no cobros sobre algo ya existente). */
export function esVentaGestion(g: Gestion): boolean {
  if (g.tipo === "VENTA_NUEVA") return true;
  if (g.tipo !== "INVERSION_ADICIONAL") return false;
  const copy = g.copys.join("\n");
  return !/PAGO DE CUOTA|PAGO AL CONTADO|LIQUIDACION DE SALDO/.test(copy);
}
