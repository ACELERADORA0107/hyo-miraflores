export interface PasoTitulacion {
  fase: "NOTARIAL" | "REGISTRAL";
  label: string;
}

export const PASOS_TITULACION: PasoTitulacion[] = [
  { fase: "NOTARIAL", label: "Contrato en proceso" },
  { fase: "NOTARIAL", label: "Contrato entregado" },
  { fase: "NOTARIAL", label: "Firma interna (cliente + gerente)" },
  { fase: "NOTARIAL", label: "Legalizacion de firma (cliente + gerente)" },
  { fase: "REGISTRAL", label: "Minuta en proceso" },
  { fase: "REGISTRAL", label: "Minuta firmada" },
  { fase: "REGISTRAL", label: "Kardex entregado" },
  { fase: "REGISTRAL", label: "Recojo de titulo" },
  { fase: "REGISTRAL", label: "Levantamiento" },
];

export function labelProcesoTitulacion(paso: number): string {
  if (paso < 0) return "No iniciado";
  const p = PASOS_TITULACION[paso];
  return p ? `${p.fase} - ${p.label}` : "No iniciado";
}
