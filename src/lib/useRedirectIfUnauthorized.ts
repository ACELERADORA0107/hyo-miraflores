import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** Redirige al login si `autorizado` es false. Cada pagina sigue calculando su propio
 * `autorizado` (rol correcto + entidad encontrada), esto solo centraliza el efecto repetido. */
export function useRedirectIfUnauthorized(autorizado: boolean) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!autorizado) navigate("/");
  }, [autorizado, navigate]);
}
