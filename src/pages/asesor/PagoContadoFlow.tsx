import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import BeneficioEditor from "@/components/BeneficioEditor";
import type { Cliente, Inversion, TipoBono } from "@/types";

interface Beneficio {
  id: string;
  tipo: TipoBono;
  etiqueta: string;
}

function fmt(n: number) {
  return n.toFixed(2);
}

export default function PagoContadoFlow({
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
  const pagarContado = useAppStore((s) => s.pagarContado);
  const inversionesContado = cliente.inversiones.filter(
    (inv) =>
      inv.tipoPlan === "MONTO_FIJO" || inv.cuotas.some((c) => !c.pagada),
  );

  function saldoCuotasPendientes(inv: Inversion) {
    return (
      Math.round(
        inv.cuotas
          .filter((c) => !c.pagada)
          .reduce((acc, c) => acc + (c.monto - (c.ajusteAplicado ?? 0)), 0) * 100,
      ) / 100
    );
  }

  const [inversionSel, setInversionSel] = useState<Inversion | null>(
    inversionesContado.length === 1 ? inversionesContado[0] : null,
  );
  const [monto, setMonto] = useState(() =>
    inversionSel?.tipoPlan === "CUOTAS" ? String(saldoCuotasPendientes(inversionSel)) : "",
  );
  const [precioPactadoDiferente, setPrecioPactadoDiferente] = useState(false);
  const [voucherNombre, setVoucherNombre] = useState("");
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);

  function seleccionarInversion(inv: Inversion) {
    setInversionSel(inv);
    setMonto(inv.tipoPlan === "CUOTAS" ? String(saldoCuotasPendientes(inv)) : "");
    setPrecioPactadoDiferente(false);
  }

  function alternarPrecioPactado(activo: boolean) {
    setPrecioPactadoDiferente(activo);
    if (!activo && inversionSel) {
      setMonto(String(saldoCuotasPendientes(inversionSel)));
    }
  }

  function agregarBeneficio() {
    setBeneficios((b) => [...b, { id: crypto.randomUUID(), tipo: "OTRO", etiqueta: "" }]);
  }

  function quitarBeneficio(id: string) {
    setBeneficios((b) => b.filter((x) => x.id !== id));
  }

  function enviar() {
    if (!inversionSel) return;
    const { copy } = pagarContado({
      clienteId: cliente.id,
      asesorId,
      inversionId: inversionSel.id,
      monto: Number(monto) || 0,
      voucherNombre,
      beneficios: beneficios.map((b) => ({ tipo: b.tipo, etiqueta: b.etiqueta })),
    });
    onDone(copy);
  }

  if (!inversionSel) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Pago al contado - {cliente.nombres}</h3>
          <button onClick={onCancel} className="text-sm text-neutral-500">
            Atras
          </button>
        </div>
        <p className="text-sm text-neutral-500 mb-2">Selecciona la inversion a saldar</p>
        <div className="space-y-1">
          {inversionesContado.map((inv) => (
            <button
              key={inv.id}
              onClick={() => seleccionarInversion(inv)}
              className="w-full text-left text-sm border border-neutral-200 rounded px-3 py-2 hover:bg-neutral-50"
            >
              {inv.tipoPlan === "MONTO_FIJO" ? (
                <>
                  {inv.descripcion} - {inv.codigo} ({inv.moneda} {fmt(inv.montoPagado ?? 0)} de{" "}
                  {fmt(inv.montoTotal ?? 0)})
                </>
              ) : (
                <>
                  {inv.descripcion} - {inv.codigo} (Financiado - saldo pendiente {inv.moneda}{" "}
                  {fmt(saldoCuotasPendientes(inv))})
                </>
              )}
            </button>
          ))}
          {inversionesContado.length === 0 && (
            <p className="text-sm text-neutral-400">
              Este cliente no tiene inversiones al contado registradas
            </p>
          )}
        </div>
      </div>
    );
  }

  const esFinanciado = inversionSel.tipoPlan === "CUOTAS";
  const cuotasPendientes = inversionSel.cuotas.filter((c) => !c.pagada).length;
  const saldoActual = esFinanciado
    ? saldoCuotasPendientes(inversionSel)
    : (inversionSel.montoTotal ?? 0) - (inversionSel.montoPagado ?? 0);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">
          Pago al contado - {inversionSel.descripcion}{" "}
          <span className="text-neutral-400 font-normal">({cliente.nombres})</span>
        </h3>
        <button onClick={onCancel} className="text-sm text-neutral-500">
          Cancelar
        </button>
      </div>

      <div className="text-sm bg-neutral-50 border border-neutral-200 rounded p-3 mb-3">
        {esFinanciado ? (
          <>
            <p>Plan financiado - liquidacion total de saldo</p>
            <p>Cuotas pendientes: {cuotasPendientes} de {inversionSel.cuotas.length}</p>
          </>
        ) : (
          <p>
            Pagado: {inversionSel.moneda} {fmt(inversionSel.montoPagado ?? 0)} de{" "}
            {fmt(inversionSel.montoTotal ?? 0)}
          </p>
        )}
        <p className="font-medium">
          Saldo pendiente: {inversionSel.moneda} {fmt(saldoActual)}
        </p>
      </div>

      {esFinanciado && (
        <label className="flex items-center gap-2 mb-3 text-sm">
          <input
            type="checkbox"
            checked={precioPactadoDiferente}
            onChange={(e) => alternarPrecioPactado(e.target.checked)}
          />
          Precio pactado diferente (monto acordado con gerencia distinto al saldo de cuotas)
        </label>
      )}

      <label className="block mb-3">
        <span className="block text-xs text-neutral-500 mb-1">
          {esFinanciado
            ? precioPactadoDiferente
              ? "Monto pactado a liquidar"
              : "Monto a liquidar (saldo total de las cuotas pendientes)"
            : "Monto que esta saldando"}
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          className="input"
          placeholder="Monto"
          value={monto}
          readOnly={esFinanciado && !precioPactadoDiferente}
          onChange={(e) => (!esFinanciado || precioPactadoDiferente) && setMonto(e.target.value)}
        />
        {esFinanciado && (
          <p className="text-xs text-neutral-400 mt-1">
            Se marcaran las {cuotasPendientes} cuotas pendientes como pagadas
            {precioPactadoDiferente ? ", distribuyendo el monto pactado entre ellas." : "."}
          </p>
        )}
      </label>

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

      <h4 className="text-sm font-semibold text-neutral-600 mb-1">
        Modificar beneficios (opcional)
      </h4>
      {beneficios.map((b) => (
        <BeneficioEditor
          key={b.id}
          tipo={b.tipo}
          etiqueta={b.etiqueta}
          onTipoChange={(tipo, etiquetaInicial) =>
            setBeneficios((arr) =>
              arr.map((x) => (x.id === b.id ? { ...x, tipo, etiqueta: etiquetaInicial } : x)),
            )
          }
          onEtiquetaChange={(etiqueta) =>
            setBeneficios((arr) => arr.map((x) => (x.id === b.id ? { ...x, etiqueta } : x)))
          }
          onQuitar={() => quitarBeneficio(b.id)}
        />
      ))}
      <button onClick={agregarBeneficio} className="text-xs text-blue-600">
        + Agregar beneficio
      </button>

      <button
        onClick={enviar}
        disabled={!(Number(monto) > 0) || !voucherNombre}
        className="w-full mt-4 bg-green-600 text-white rounded py-2 text-sm disabled:opacity-30"
      >
        Generar copy y enviar
      </button>
    </div>
  );
}
