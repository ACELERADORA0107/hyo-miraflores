import { useState } from "react";
import type { TipoBono } from "@/types";

export const BENEFICIOS_TIPO: { value: TipoBono; label: string }[] = [
  { value: "VIAJE_IQUITOS", label: "Viaje a Iquitos" },
  { value: "MEMBRESIA_EDUCATIVA", label: "Membresia educativa" },
  { value: "DUPLICACION_MEMBRESIAS", label: "Membresias del club" },
  { value: "OTRO", label: "Otro beneficio" },
];

function etiquetaViajes(cantidad: number) {
  return `${cantidad} viaje${cantidad === 1 ? "" : "s"} a Iquitos`;
}

export default function BeneficioEditor({
  tipo,
  etiqueta,
  onTipoChange,
  onEtiquetaChange,
  onQuitar,
  tipos = BENEFICIOS_TIPO,
}: {
  tipo: TipoBono;
  etiqueta: string;
  onTipoChange: (tipo: TipoBono, etiquetaInicial: string) => void;
  onEtiquetaChange: (etiqueta: string) => void;
  onQuitar: () => void;
  tipos?: { value: TipoBono; label: string }[];
}) {
  const [viajesSeleccion, setViajesSeleccion] = useState<"1" | "2" | "3" | "OTRO">("1");
  const [viajesCantidadOtro, setViajesCantidadOtro] = useState("");
  const [duplicacionModo, setDuplicacionModo] = useState<"DUPLICADO" | "MONTO_EXACTO">("DUPLICADO");
  const [duplicacionMonto, setDuplicacionMonto] = useState("");

  function cambiarTipo(nuevoTipo: TipoBono) {
    let etiquetaInicial = "";
    if (nuevoTipo === "VIAJE_IQUITOS") {
      setViajesSeleccion("1");
      etiquetaInicial = etiquetaViajes(1);
    } else if (nuevoTipo === "MEMBRESIA_EDUCATIVA") {
      etiquetaInicial = "Membresia educativa - 1 ano";
    } else if (nuevoTipo === "DUPLICACION_MEMBRESIAS") {
      setDuplicacionModo("DUPLICADO");
      etiquetaInicial = "Membresias del club - Duplicado";
    }
    onTipoChange(nuevoTipo, etiquetaInicial);
  }

  return (
    <div className="border border-neutral-200 rounded p-2 space-y-2">
      <div className="flex gap-2">
        <select
          className="input"
          value={tipo}
          onChange={(e) => cambiarTipo(e.target.value as TipoBono)}
        >
          {tipos.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button onClick={onQuitar} className="text-red-600 text-xs shrink-0">
          Quitar
        </button>
      </div>

      {tipo === "VIAJE_IQUITOS" && (
        <div className="flex gap-2 items-center">
          <select
            className="input"
            value={viajesSeleccion}
            onChange={(e) => {
              const v = e.target.value as "1" | "2" | "3" | "OTRO";
              setViajesSeleccion(v);
              if (v === "OTRO") {
                onEtiquetaChange(
                  viajesCantidadOtro ? etiquetaViajes(Number(viajesCantidadOtro) || 0) : "",
                );
              } else {
                onEtiquetaChange(etiquetaViajes(Number(v)));
              }
            }}
          >
            <option value="1">1 viaje</option>
            <option value="2">2 viajes</option>
            <option value="3">3 viajes</option>
            <option value="OTRO">Otro</option>
          </select>
          {viajesSeleccion === "OTRO" && (
            <input
              className="input"
              type="number"
              min={1}
              placeholder="Cantidad de viajes"
              value={viajesCantidadOtro}
              onChange={(e) => {
                setViajesCantidadOtro(e.target.value);
                onEtiquetaChange(etiquetaViajes(Number(e.target.value) || 0));
              }}
            />
          )}
        </div>
      )}

      {tipo === "MEMBRESIA_EDUCATIVA" && (
        <p className="text-xs text-neutral-500">Membresia educativa - 1 ano (fijo)</p>
      )}

      {tipo === "DUPLICACION_MEMBRESIAS" && (
        <div className="flex gap-2 items-center">
          <select
            className="input"
            value={duplicacionModo}
            onChange={(e) => {
              const modo = e.target.value as "DUPLICADO" | "MONTO_EXACTO";
              setDuplicacionModo(modo);
              onEtiquetaChange(
                modo === "DUPLICADO"
                  ? "Membresias del club - Duplicado"
                  : duplicacionMonto
                    ? `Membresias del club - Monto exacto: ${duplicacionMonto}`
                    : "Membresias del club - Monto exacto",
              );
            }}
          >
            <option value="DUPLICADO">Duplicado</option>
            <option value="MONTO_EXACTO">Monto exacto</option>
          </select>
          {duplicacionModo === "MONTO_EXACTO" && (
            <input
              className="input"
              type="number"
              min={1}
              placeholder="Cantidad de membresias"
              value={duplicacionMonto}
              onChange={(e) => {
                setDuplicacionMonto(e.target.value);
                onEtiquetaChange(`Membresias del club - Monto exacto: ${e.target.value}`);
              }}
            />
          )}
        </div>
      )}

      {tipo === "OTRO" && (
        <input
          className="input"
          placeholder="Detalle del beneficio"
          value={etiqueta}
          onChange={(e) => onEtiquetaChange(e.target.value)}
        />
      )}
    </div>
  );
}
