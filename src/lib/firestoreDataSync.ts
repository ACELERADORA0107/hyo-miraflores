import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAppStore } from "@/store/useAppStore";
import { suscribirColeccion, guardarDocumento, eliminarDocumento } from "@/lib/firestoreSync";
import { COLECCIONES } from "@/lib/firestoreSchema";
import { db, firebaseHabilitado } from "@/lib/firebase";
import type {
  Admin,
  Asesor,
  Cliente,
  Comunicado,
  Gestion,
  Herramienta,
  MovimientoComision,
  SabadoPresentacion,
} from "@/types";

/**
 * Mantiene una coleccion del store sincronizada con Firestore en ambas direcciones:
 * - Firestore -> store: tiempo real (onSnapshot), para que todos los dispositivos vean
 *   los mismos datos.
 * - store -> Firestore: cualquier accion del store que cree/modifique/borre un item de
 *   esta coleccion (crearClienteNuevo, pagarCuota, aprobarGestion, etc.) se guarda solo,
 *   sin tener que tocar cada accion una por una.
 *
 * `aplicandoRemoto` evita el loop infinito Firestore -> store -> Firestore.
 */
let aplicandoRemoto = false;

function sincronizarColeccion<T extends { id: string }>(
  nombreColeccion: string,
  leer: () => T[],
  escribir: (items: T[]) => void,
): () => void {
  let anterior = leer();

  const unsubRemoto = suscribirColeccion<T>(nombreColeccion, (items) => {
    aplicandoRemoto = true;
    escribir(items);
    anterior = leer();
    aplicandoRemoto = false;
  });

  const unsubLocal = useAppStore.subscribe(() => {
    if (aplicandoRemoto) return;
    const actual = leer();
    if (actual === anterior) return;

    const anteriorPorId = new Map(anterior.map((item) => [item.id, item]));
    const actualPorId = new Map(actual.map((item) => [item.id, item]));

    for (const item of actual) {
      if (anteriorPorId.get(item.id) !== item) {
        guardarDocumento(nombreColeccion, item.id, item as Record<string, unknown>).catch((e) =>
          console.error(`[firestoreDataSync] error guardando ${nombreColeccion}/${item.id}`, e),
        );
      }
    }
    for (const item of anterior) {
      if (!actualPorId.has(item.id)) {
        eliminarDocumento(nombreColeccion, item.id).catch((e) =>
          console.error(`[firestoreDataSync] error eliminando ${nombreColeccion}/${item.id}`, e),
        );
      }
    }
    anterior = actual;
  });

  return () => {
    unsubRemoto();
    unsubLocal();
  };
}

/** `preciosPorEtapaYPlazo` es un solo documento de configuracion, no una lista. */
async function sincronizarPrecios(): Promise<() => void> {
  if (!db) return () => {};
  const ref = doc(db, COLECCIONES.config, "preciosPorEtapaYPlazo");

  // Primera vez: si no existe en Firestore, lo sembramos con los valores actuales del store.
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, useAppStore.getState().preciosPorEtapaYPlazo);
  } else {
    aplicandoRemoto = true;
    useAppStore.setState({ preciosPorEtapaYPlazo: snap.data() as never });
    aplicandoRemoto = false;
  }

  let anterior = useAppStore.getState().preciosPorEtapaYPlazo;
  const unsubLocal = useAppStore.subscribe(() => {
    if (aplicandoRemoto) return;
    const actual = useAppStore.getState().preciosPorEtapaYPlazo;
    if (actual === anterior) return;
    anterior = actual;
    void setDoc(ref, actual);
  });

  return unsubLocal;
}

/** Llamar una sola vez al iniciar la app. Devuelve la funcion para cancelar todo. */
export function iniciarSincronizacionFirestore(): () => void {
  if (!firebaseHabilitado) return () => {};

  const cancelaciones: (() => void)[] = [
    sincronizarColeccion<Cliente>(COLECCIONES.clientes, () => useAppStore.getState().clientes, (items) =>
      useAppStore.setState({ clientes: items }),
    ),
    sincronizarColeccion<Gestion>(COLECCIONES.gestiones, () => useAppStore.getState().gestiones, (items) =>
      useAppStore.setState({ gestiones: items }),
    ),
    sincronizarColeccion<Comunicado>(
      COLECCIONES.comunicados,
      () => useAppStore.getState().comunicados,
      (items) => useAppStore.setState({ comunicados: items }),
    ),
    sincronizarColeccion<Herramienta>(
      COLECCIONES.herramientas,
      () => useAppStore.getState().herramientas,
      (items) => useAppStore.setState({ herramientas: items }),
    ),
    sincronizarColeccion<MovimientoComision>(
      COLECCIONES.movimientosComision,
      () => useAppStore.getState().movimientosComision,
      (items) => useAppStore.setState({ movimientosComision: items }),
    ),
    sincronizarColeccion<SabadoPresentacion>(
      COLECCIONES.calendarioSabados,
      () => useAppStore.getState().calendarioSabados,
      (items) => useAppStore.setState({ calendarioSabados: items }),
    ),
    sincronizarColeccion<Asesor>(COLECCIONES.asesores, () => useAppStore.getState().asesores, (items) =>
      useAppStore.setState({ asesores: items }),
    ),
    sincronizarColeccion<Admin>(COLECCIONES.admins, () => useAppStore.getState().admins, (items) =>
      useAppStore.setState({ admins: items }),
    ),
  ];

  void sincronizarPrecios().then((cancelar) => cancelaciones.push(cancelar));

  return () => cancelaciones.forEach((cancelar) => cancelar());
}
