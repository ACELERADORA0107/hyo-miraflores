import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "@/pages/Login";
import PerfilCliente from "@/pages/PerfilCliente";
import PerfilAsesor from "@/pages/PerfilAsesor";
import ClienteNuevoWizard from "@/pages/ClienteNuevoWizard";
import ClienteExistentePage from "@/pages/ClienteExistentePage";
import PerfilAdmin from "@/pages/PerfilAdmin";
import FichaCliente from "@/pages/admin/FichaCliente";
import { observarSesionAuth } from "@/lib/firebaseAuth";
import { iniciarSincronizacionFirestore } from "@/lib/firestoreDataSync";
import { useAppStore } from "@/store/useAppStore";

export default function App() {
  const restaurarSesionDesdeUid = useAppStore((s) => s.restaurarSesionDesdeUid);

  useEffect(() => {
    // La sincronizacion con Firestore solo puede empezar DESPUES de que Firebase Auth
    // confirme la sesion: si se intenta antes, las reglas de seguridad rechazan los
    // listeners (permission-denied) y Firestore los mata para siempre, sin reintentar
    // ni cuando el usuario ya inicio sesion.
    let cancelarSync: (() => void) | null = null;
    const unsubAuth = observarSesionAuth((user) => {
      if (user) {
        if (!useAppStore.getState().sesion) void restaurarSesionDesdeUid(user.uid);
        if (!cancelarSync) cancelarSync = iniciarSincronizacionFirestore();
      } else {
        cancelarSync?.();
        cancelarSync = null;
      }
    });
    return () => {
      unsubAuth();
      cancelarSync?.();
    };
  }, [restaurarSesionDesdeUid]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cliente" element={<PerfilCliente />} />
        <Route path="/asesor" element={<PerfilAsesor />} />
        <Route path="/asesor/nuevo-cliente" element={<ClienteNuevoWizard />} />
        <Route path="/asesor/cliente-existente" element={<ClienteExistentePage />} />
        <Route path="/admin" element={<PerfilAdmin />} />
        <Route path="/admin/cliente/:id" element={<FichaCliente />} />
      </Routes>
    </BrowserRouter>
  );
}
