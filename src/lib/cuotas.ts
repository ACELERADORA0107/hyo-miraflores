/**
 * Genera `meses` cuotas iguales que suman exactamente `saldo` (sin perder centavos por
 * redondeo). La ultima cuota absorbe el remanente que dejan las demas al redondear a 2
 * decimales, para que inicial + suma de cuotas coincida siempre con el precio total pactado.
 */
export function generarCuotasIguales(
  saldo: number,
  meses: number,
): { numero: number; monto: number }[] {
  const saldoRedondeado = Math.round(saldo * 100) / 100;
  const montoBase = Math.round((saldoRedondeado / meses) * 100) / 100;
  return Array.from({ length: meses }, (_, i) => {
    const esUltima = i === meses - 1;
    const monto = esUltima
      ? Math.round((saldoRedondeado - montoBase * (meses - 1)) * 100) / 100
      : montoBase;
    return { numero: i + 1, monto };
  });
}

function fmt(n: number) {
  return n.toFixed(2);
}

/**
 * Texto de cuotas para el copy de venta. Si las cuotas son (practicamente) iguales -como
 * siempre pasa con `generarCuotasIguales`, salvo centavos de ajuste en la ultima- se resume
 * como saldo a financiar en vez de listar cada cuota. Solo se itemiza cuando el monto
 * realmente varia mes a mes (cuotas libres definidas a mano).
 */
export function lineaCuotasTexto(
  cuotas: { numero: number; monto: number }[],
  moneda: string,
): string {
  if (cuotas.length === 0) return "";
  const saldo = Math.round(cuotas.reduce((acc, c) => acc + c.monto, 0) * 100) / 100;
  const base = cuotas[0].monto;
  const cuerpoIgual = cuotas.slice(0, -1).every((c) => Math.abs(c.monto - base) < 0.01);

  if (cuerpoIgual) {
    return `Saldo a financiar: ${moneda} ${fmt(saldo)} (${cuotas.length} cuotas de ${moneda} ${fmt(base)} c/u)`;
  }
  return `Cuotas:\n${cuotas.map((c) => `- Cuota ${c.numero}: ${moneda} ${fmt(c.monto)}`).join("\n")}`;
}
