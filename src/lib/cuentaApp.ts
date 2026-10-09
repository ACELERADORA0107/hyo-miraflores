export function fechaVencimientoApp(fechaActivacion: string): string {
  const d = new Date(`${fechaActivacion}T00:00:00`);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function appVencida(fechaActivacion: string, referencia = new Date()): boolean {
  return new Date(`${fechaVencimientoApp(fechaActivacion)}T00:00:00`) < referencia;
}
