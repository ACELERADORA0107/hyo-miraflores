import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import Topbar from "@/components/Topbar";
import ClienteExistenteFlow from "@/pages/asesor/ClienteExistenteFlow";
import { useRedirectIfUnauthorized } from "@/lib/useRedirectIfUnauthorized";

export default function ClienteExistentePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const sesion = useAppStore((s) => s.sesion);
  const asesores = useAppStore((s) => s.asesores);
  const clientes = useAppStore((s) => s.clientes);

  const asesor = asesores.find((a) => a.id === sesion?.id);
  const autorizado = !!sesion && sesion.rol === "asesor" && !!asesor;
  useRedirectIfUnauthorized(autorizado);

  if (!autorizado || !asesor) {
    return null;
  }

  const misClientes = clientes.filter((c) => asesor.clienteIds.includes(c.id));
  const clientePreseleccionadoId = (location.state as { clienteId?: string } | null)?.clienteId;

  return (
    <div className="min-h-screen bg-neutral-100">
      <Topbar titulo="Cliente existente" />
      <div className="max-w-3xl mx-auto p-4">
        <ClienteExistenteFlow
          misClientes={misClientes}
          asesorId={asesor.id}
          clientePreseleccionadoId={clientePreseleccionadoId}
          onClose={() => navigate("/asesor")}
        />
      </div>
    </div>
  );
}
