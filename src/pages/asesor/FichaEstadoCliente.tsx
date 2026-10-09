import { useState } from "react";
import InversionCard from "@/pages/asesor/InversionCard";
import type { Cliente } from "@/types";

export default function FichaEstadoCliente({ cliente }: { cliente: Cliente }) {
  const [inversionId, setInversionId] = useState(cliente.inversiones[0]?.id ?? "");
  const inversionSel =
    cliente.inversiones.find((inv) => inv.id === inversionId) ?? cliente.inversiones[0];

  if (!inversionSel) return null;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center gap-2">
        <p className="text-xs text-neutral-500 truncate">{cliente.nombres}</p>
        {cliente.inversiones.length > 1 && (
          <select
            className="input text-xs py-1 w-auto max-w-[60%] shrink-0"
            value={inversionSel.id}
            onChange={(e) => setInversionId(e.target.value)}
          >
            {cliente.inversiones.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.descripcion}
              </option>
            ))}
          </select>
        )}
      </div>
      <InversionCard inversion={inversionSel} clienteId={cliente.id} clienteNombre={cliente.nombres} />
    </div>
  );
}
