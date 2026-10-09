const DIAS_ESPERA_ELIMINACION = 30;

export function diasRestantesEliminacion(fechaSolicitud: string): number {
  const transcurridos = Math.floor(
    (Date.now() - new Date(fechaSolicitud).getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(0, DIAS_ESPERA_ELIMINACION - transcurridos);
}

export function puedeEliminarseDefinitivo(fechaSolicitud: string): boolean {
  return diasRestantesEliminacion(fechaSolicitud) === 0;
}
