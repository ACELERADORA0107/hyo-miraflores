import type { Cliente, Documento, Inversion, Moneda } from "@/types";

export interface MovimientoDisplay {
  id: string;
  descripcion: string;
  fecha: string;
  monto: number;
  moneda: Moneda;
}

/** Todos los documentos del cliente: los sueltos + los de cada una de sus inversiones. */
export function documentosDeCliente(cliente: Cliente): Documento[] {
  return [...cliente.documentos, ...cliente.inversiones.flatMap((inv) => inv.documentos)];
}

/** Inversiones de venta de lote (las unicas que tienen proceso de titulacion propio). */
export function inversionesConTitulacion(cliente: Cliente): Inversion[] {
  return cliente.inversiones.filter((inv) => inv.modalidad !== undefined);
}

/**
 * Indicador rapido de que alguna venta de este cliente fue media manzana, manzana, o varios
 * lotes juntos, para alertar al admin que hay que revisar cuantos lotes/contratos hay.
 */
export function resumenTiposLote(cliente: Cliente): string | null {
  const todasConLotes = cliente.inversiones.filter((inv) => inv.lotes && inv.lotes.length > 0);
  const especiales = todasConLotes.filter(
    (inv) => inv.lotes!.length > 1 || inv.lotes![0].tipoLote !== "LOTE",
  );
  if (especiales.length === 0) return null;
  return especiales
    .map((inv) => {
      const tipo = inv.lotes![0].tipoLote;
      const etiqueta =
        tipo === "MEDIA_MANZANA" ? "Media manzana" : tipo === "MANZANA" ? "Manzana" : "Lotes";
      return `${etiqueta} (${inv.lotes!.length})`;
    })
    .join(", ");
}

/** Todos los pagos del cliente, reconstruidos desde sus inversiones (cuotas pagadas / montos fijos). */
export function movimientosDeCliente(cliente: Cliente): MovimientoDisplay[] {
  const deInversiones: MovimientoDisplay[] = cliente.inversiones.flatMap((inv) => {
    if (inv.tipoPlan === "CUOTAS") {
      const cuotasPagadas: MovimientoDisplay[] = inv.cuotas
        .filter((c) => c.pagada)
        .map((c) => ({
          id: `${inv.id}-cuota-${c.numero}`,
          descripcion: `${inv.descripcion} - Cuota ${c.numero}`,
          fecha: c.fechaPago ?? inv.createdAt,
          monto: c.montoPagado ?? c.monto,
          moneda: inv.moneda,
        }));
      const inicial: MovimientoDisplay[] = inv.montoInicial
        ? [
            {
              id: `${inv.id}-inicial`,
              descripcion: `${inv.descripcion} - Cuota inicial`,
              fecha: inv.createdAt,
              monto: inv.montoInicial,
              moneda: inv.moneda,
            },
          ]
        : [];
      return [...inicial, ...cuotasPagadas];
    }
    if ((inv.montoPagado ?? 0) > 0) {
      return [
        {
          id: `${inv.id}-pago`,
          descripcion: inv.descripcion,
          fecha: inv.createdAt,
          monto: inv.montoPagado ?? 0,
          moneda: inv.moneda,
        },
      ];
    }
    return [];
  });

  const deMovimientosLegacy: MovimientoDisplay[] = cliente.movimientos.map((m) => ({
    id: m.id,
    descripcion: m.tipo.replace(/_/g, " "),
    fecha: m.fecha,
    monto: m.monto,
    moneda: m.moneda,
  }));

  return [...deInversiones, ...deMovimientosLegacy].sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Total pagado en USD por el cliente, usado en los KPI de asesor/admin. */
export function totalPagadoUsd(cliente: Cliente): number {
  return movimientosDeCliente(cliente)
    .filter((m) => m.moneda === "USD")
    .reduce((acc, m) => acc + m.monto, 0);
}
