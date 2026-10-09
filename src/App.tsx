import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "@/pages/Login";
import PerfilCliente from "@/pages/PerfilCliente";
import PerfilAsesor from "@/pages/PerfilAsesor";
import ClienteNuevoWizard from "@/pages/ClienteNuevoWizard";
import ClienteExistentePage from "@/pages/ClienteExistentePage";
import PerfilAdmin from "@/pages/PerfilAdmin";
import FichaCliente from "@/pages/admin/FichaCliente";

export default function App() {
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
