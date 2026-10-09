import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { Cliente, Cuota, Inversion } from "@/types";

function fmt(n: number) {
  return n.toFixed(2);
}

function montoEsperado(c: Cuota) {
  return c.monto - (c.ajusteAplicado ?? 0);
}

export default function PagoCuotaFlow({
  cliente,
  asesorId,
  onDone,
  onCancel,
}: {
  cliente: Cliente;
  asesorId: string;
  onDone: (copy: string) => void;
  onCancel: () => void;
}) {
  const pagarCuota = useAppStore((s) => s.pagarCuota);
  const pagarCuotasMultiples = useAppStore((s) => s.pagarCuotasMultiples);
  const inversionesCuotas = cliente.inversiones.filter((inv) => inv.tipoPlan === "CUOTAS");

  const [inversionSel, setInversionSel] = useState<Inversion | null>(
    inversionesCuotas.length === 1 ? inversionesCuotas[0] : null,
  );
  const [cuotasSel, setCuotasSel] = useState<number[]>([]);
  const [vistaDetalle, setVistaDetalle] = useState(false);
  const [cuotaVariable, setCuotaVariable] = useState(false);
  const [montoPagado, setMontoPagado] = useState("");
  const [voucherNombre, setVoucherNombre] = useState("");

  function alternarCuota(numero: number) {
    setCuotasSel((sel) =>
      sel.includes(numero) ? sel.filter((n) => n !== numero) : [...sel, numero].sort((a, b) => a - b),
    );
  }

  function irADetalle() {
    if (!inversionSel || cuotasSel.length === 0) return;
    const cuotas = inversionSel.cuotas.filter((c) => cuotasSel.includes(c.numero));
    const total = Math.round(cuotas.reduce((acc, c) => acc + montoEsperado(c), 0) * 100) / 100;
    setCuotaVariable(false);
    setMontoPagado(fmt(total));
    setVoucherNombre("");
    setVistaDetalle(true);
  }

  function enviar() {
    if (!inversionSel || cuotasSel.length === 0) return;
    if (cuotasSel.length === 1) {
      const { copy } = pagarCuota({
        clienteId: cliente.id,
        asesorId,
        inversionId: inversionSel.id,
        numeroCuota: cuotasSel[0],
        montoPagado: Number(montoPagado) || 0,
        voucherNombre,
      });
      onDone(copy);
      return;
    }
    const { copy } = pagarCuotasMultiples({
      clienteId: cliente.id,
      asesorId,
      inversionId: inversionSel.id,
      numerosCuota: cuotasSel,
      montoPagado: Number(montoPagado) || 0,
      voucherNombre,
    });
    onDone(copy);
  }

  if (!inversionSel) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Pago de cuota - {cliente.nombres}</h3>
          <button onClick={onCancel} className="text-sm text-neutral-500">
            Atras
          </button>
        </div>
        <p className="text-sm text-neutral-500 mb-2">Selecciona la inversion</p>
        <div className="space-y-1">
          {inversionesCuotas.map((inv) => (
            <button
              key={inv.id}
              onClick={() => setInversionSel(inv)}
              className="w-full text-left text-sm border border-neutral-200 rounded px-3 py-2 hover:bg-neutral-50"
            >
              {inv.descripcion} - {inv.codigo} ({inv.cuotas.filter((c) => c.pagada).length} de{" "}
              {inv.cuotas.length} cuotas)
            </button>
          ))}
          {inversionesCuotas.length === 0 && (
            <p className="text-sm text-neutral-400">
              Este cliente no tiene inversiones a cuotas registradas
            </p>
          )}
        </div>
      </div>
    );
  }

  if (vistaDetalle) {
    const cuotas = inversionSel.cuotas
      .filter((c) => cuotasSel.includes(c.numero))
      .sort((a, b) => a.numero - b.numero);
    const totalEsperado = Math.round(cuotas.reduce((acc, c) => acc + montoEsperado(c), 0) * 100) / 100;

    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">
            {cuotas.length === 1 ? `Cuota ${cuotas[0].numero}` : `${cuotas.length} cuotas`} -{" "}
            {inversionSel.descripcion}
          </h3>
          <button onClick={() => setVistaDetalle(false)} className="text-sm text-neutral-500">
            Atras
          </button>
        </div>

        <div className="text-sm bg-neutral-50 border border-neutral-200 rounded p-3 mb-3">
          {cuotas.map((c) => (
            <p key={c.numero}>
              Cuota {c.numero}: {inversionSel.moneda} {fmt(montoEsperado(c))}
              {c.ajusteAplicado ? (
                <span className="text-xs text-neutral-400">
                  {" "}
                  (ajustado {c.ajusteAplicado > 0 ? "-" : "+"}
                  {fmt(Math.abs(c.ajusteAplicado))})
                </span>
              ) : null}
            </p>
          ))}
          <p className="font-medium mt-1">
            Total a pagar: {inversionSel.moneda} {fmt(totalEsperado)}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm mb-3">
          <input
            type="checkbox"
            checked={cuotaVariable}
            onChange={(e) => {
              setCuotaVariable(e.target.checked);
              if (!e.target.checked) setMontoPagado(fmt(totalEsperado));
            }}
          />
          Cuota variable (el cliente pago un monto distinto)
        </label>

        <label className="block mb-3">
          <span className="block text-xs text-neutral-500 mb-1">Monto pagado (total)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="input"
            value={montoPagado}
            disabled={!cuotaVariable}
            onChange={(e) => setMontoPagado(e.target.value)}
          />
        </label>
        {cuotaVariable && Number(montoPagado) !== totalEsperado && (
          <p className="text-xs text-amber-600 mb-3">
            {Number(montoPagado) > totalEsperado
              ? `El excedente de ${inversionSel.moneda} ${fmt(Number(montoPagado) - totalEsperado)} se aplicara a la siguiente cuota.`
              : `El faltante de ${inversionSel.moneda} ${fmt(totalEsperado - Number(montoPagado))} se sumara a la siguiente cuota.`}
          </p>
        )}

        <label className="block mb-3">
          <span className="block text-xs text-neutral-500 mb-1">Adjuntar voucher</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="text-sm"
            onChange={(e) => setVoucherNombre(e.target.files?.[0]?.name ?? "")}
          />
          {voucherNombre && <p className="text-xs text-neutral-500 mt-1">{voucherNombre}</p>}
        </label>

        <button
          onClick={enviar}
          disabled={!(Number(montoPagado) > 0) || !voucherNombre}
          className="w-full bg-green-600 text-white rounded py-2 text-sm disabled:opacity-30"
        >
          Generar copy y enviar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">
          {inversionSel.descripcion}{" "}
          <span className="text-neutral-400 font-normal">({cliente.nombres})</span>
        </h3>
        <button onClick={onCancel} className="text-sm text-neutral-500">
          Cancelar
        </button>
      </div>
      <p className="text-xs text-neutral-500 mb-2">
        Selecciona una o varias cuotas pendientes para pagarlas juntas.
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
        {inversionSel.cuotas.map((c) => {
          const seleccionada = cuotasSel.includes(c.numero);
          return (
            <button
              key={c.numero}
              disabled={c.pagada}
              onClick={() => alternarCuota(c.numero)}
              className={`text-center rounded-md border px-2 py-2 text-xs ${
                c.pagada
                  ? "border-green-300 bg-green-50 text-green-700"
                  : seleccionada
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50"
              }`}
            >
              <p className="font-medium">
                {c.pagada ? "✓ " : seleccionada ? "☑ " : ""}Cuota {c.numero}
              </p>
              <p>{c.pagada ? c.fechaPago : seleccionada ? "Seleccionada" : "Pagar"}</p>
            </button>
          );
        })}
      </div>
      <button
        onClick={irADetalle}
        disabled={cuotasSel.length === 0}
        className="w-full bg-neutral-900 text-white rounded py-2 text-sm disabled:opacity-30"
      >
        {cuotasSel.length === 0
          ? "Selecciona cuotas para continuar"
          : `Pagar ${cuotasSel.length} cuota${cuotasSel.length > 1 ? "s" : ""} seleccionada${cuotasSel.length > 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
