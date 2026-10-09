import type { Bono, Inversion } from "@/types";

export function saldoPendienteInversion(inv: Inversion): number {
  if (inv.tipoPlan === "CUOTAS") {
    return inv.cuotas
      .filter((c) => !c.pagada)
      .reduce((acc, c) => acc + (c.monto - (c.ajusteAplicado ?? 0)), 0);
  }
  return Math.max(0, (inv.montoTotal ?? 0) - (inv.montoPagado ?? 0));
}

export function inversionCompletada(inv: Inversion): boolean {
  return inv.tipoPlan === "CUOTAS"
    ? inv.cuotas.every((c) => c.pagada)
    : (inv.montoPagado ?? 0) >= (inv.montoTotal ?? 0);
}

export function montoTotalPlanInversion(inv: Inversion): number {
  const montoInicial = inv.montoInicial ?? 0;
  return inv.tipoPlan === "CUOTAS"
    ? montoInicial + inv.cuotas.reduce((acc, c) => acc + c.monto, 0)
    : (inv.montoTotal ?? 0);
}

export function montoPagadoTotalInversion(inv: Inversion): number {
  const montoInicial = inv.montoInicial ?? 0;
  return inv.tipoPlan === "CUOTAS"
    ? montoInicial +
        inv.cuotas
          .filter((c) => c.pagada)
          .reduce((acc, c) => acc + (c.montoPagado ?? c.monto), 0)
    : (inv.montoPagado ?? 0);
}

export function estadoBono(b: Bono): { label: string; className: string } {
  if (b.canjeado) {
    return { label: "Canjeado", className: "bg-neutral-100 text-neutral-500" };
  }
  if (b.activadoPorAsesor) {
    return { label: "Activo - disponible", className: "bg-green-100 text-green-700" };
  }
  return { label: "Pendiente de activacion", className: "bg-amber-100 text-amber-700" };
}
