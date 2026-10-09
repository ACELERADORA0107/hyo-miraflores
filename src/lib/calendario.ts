function inicioSemana(referencia: Date): Date {
  const d = new Date(referencia);
  const dia = d.getDay(); // 0=domingo ... 6=sabado
  const diff = dia === 0 ? -6 : 1 - dia; // lunes como inicio de semana
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function finSemana(referencia: Date): Date {
  const inicio = inicioSemana(referencia);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);
  fin.setHours(23, 59, 59, 999);
  return fin;
}

export function estaEnSemanaActual(fechaIso: string, referencia = new Date()): boolean {
  const f = new Date(`${fechaIso}T12:00:00`);
  return f >= inicioSemana(referencia) && f <= finSemana(referencia);
}

export function estaEnMesActual(fechaIso: string, referencia = new Date()): boolean {
  const f = new Date(`${fechaIso}T12:00:00`);
  return f.getFullYear() === referencia.getFullYear() && f.getMonth() === referencia.getMonth();
}
