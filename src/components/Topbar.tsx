import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";

export default function Topbar({ titulo }: { titulo: string }) {
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);

  return (
    <div className="bg-neutral-900 text-white px-4 py-3 flex items-center justify-between">
      <div>
        <p className="text-xs text-neutral-400 leading-none">HYO OFICIAL</p>
        <p className="font-medium">{titulo}</p>
      </div>
      <button
        className="text-sm text-neutral-300 hover:text-white"
        onClick={() => {
          logout();
          navigate("/");
        }}
      >
        Salir
      </button>
    </div>
  );
}
