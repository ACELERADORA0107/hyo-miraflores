import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import type { Rol } from "@/types";

const RUTA_POR_ROL: Record<Rol, string> = {
  cliente: "/cliente",
  asesor: "/asesor",
  admin: "/admin",
};

// Perfil de cliente oculto temporalmente hasta nuevo aviso.
const PERFIL_CLIENTE_HABILITADO = false;

// Los accesos rapidos y pistas de clave solo deben verse en desarrollo local, nunca en produccion.
const MOSTRAR_AYUDAS_DE_PRUEBA = import.meta.env.DEV;

const TABS: { rol: Rol; label: string }[] = [
  ...(PERFIL_CLIENTE_HABILITADO ? [{ rol: "cliente" as const, label: "Cliente" }] : []),
  { rol: "asesor", label: "Asesor" },
  { rol: "admin", label: "Admin" },
];

export default function Login() {
  const [tab, setTab] = useState<Rol>("asesor");
  const [codigo, setCodigo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const { loginCliente, loginAsesor, loginAdmin, clientes, sesion } = useAppStore();

  useEffect(() => {
    if (sesion) navigate(RUTA_POR_ROL[sesion.rol]);
  }, [sesion, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (tab === "cliente") {
      if (loginCliente(codigo.trim())) return navigate("/cliente");
      setError("DNI de cliente no encontrado.");
      return;
    }

    setCargando(true);
    try {
      if (tab === "asesor") {
        if (await loginAsesor(codigo.trim(), clave.trim())) return navigate("/asesor");
        setError("Codigo o clave incorrectos.");
      } else {
        if (await loginAdmin(codigo.trim(), clave.trim())) return navigate("/admin");
        setError("Codigo o clave incorrectos.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold text-center mb-1">HYO OFICIAL</h1>
        <p className="text-center text-sm text-neutral-500 mb-6">Acceso al sistema</p>

        <div className="flex mb-6 rounded-md overflow-hidden border border-neutral-200">
          {TABS.map((t) => (
            <button
              key={t.rol}
              type="button"
              onClick={() => {
                setTab(t.rol);
                setError("");
              }}
              className={`flex-1 py-2 text-sm font-medium ${
                tab === t.rol ? "bg-neutral-900 text-white" : "bg-white text-neutral-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              {tab === "cliente" ? "DNI" : "Codigo"}
            </label>
            <input
              className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder={
                tab === "cliente" ? "45678912" : tab === "asesor" ? "ASE-001" : "Tu codigo"
              }
              required
            />
          </div>

          {(tab === "admin" || tab === "asesor") && (
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Contrasena</label>
              <input
                type="password"
                className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
              />
            </div>
          )}

          {error && <p className="text-red-600 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-neutral-900 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
          >
            {cargando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {PERFIL_CLIENTE_HABILITADO && tab === "cliente" && (
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <p className="text-center text-xs text-neutral-400 mb-2">
              O entra directo como un cliente existente
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {clientes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    loginCliente(c.dni);
                    navigate("/cliente");
                  }}
                  className="w-full text-left text-xs border border-neutral-200 rounded px-3 py-2 hover:bg-neutral-50 flex justify-between"
                >
                  <span>
                    {c.nombres} <span className="text-neutral-400">({c.codigo})</span>
                  </span>
                  <span className="text-neutral-400">DNI {c.dni}</span>
                </button>
              ))}
              {clientes.length === 0 && (
                <p className="text-center text-xs text-neutral-400">
                  Aun no hay clientes creados en el sistema
                </p>
              )}
            </div>
          </div>
        )}

        {MOSTRAR_AYUDAS_DE_PRUEBA && (
          <div className="mt-6 pt-4 border-t border-neutral-200">
            <p className="text-center text-xs text-neutral-400 mb-3">Acceso rapido de prueba</p>
            <div className={`grid gap-2 ${PERFIL_CLIENTE_HABILITADO ? "grid-cols-3" : "grid-cols-2"}`}>
              {PERFIL_CLIENTE_HABILITADO && (
                <button
                  type="button"
                  disabled={clientes.length === 0}
                  onClick={() => {
                    loginCliente(clientes[0].dni);
                    navigate("/cliente");
                  }}
                  className="text-xs border border-neutral-300 rounded py-2 hover:bg-neutral-50 disabled:opacity-30"
                >
                  Cliente
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  if (await loginAsesor("ASE-001", "asesor123")) navigate("/asesor");
                }}
                className="text-xs border border-neutral-300 rounded py-2 hover:bg-neutral-50"
              >
                Asesor
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (await loginAdmin("cesarqui", "aceleradora0107")) navigate("/admin");
                }}
                className="text-xs border border-neutral-300 rounded py-2 hover:bg-neutral-50"
              >
                Admin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
