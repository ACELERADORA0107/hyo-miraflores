import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Firestore rechaza por completo cualquier documento que contenga `undefined` en algun
 * campo (ej. `email?: string` sin valor). Los tipos del store usan `undefined` para
 * "campo opcional vacio", asi que antes de escribir hay que quitarlos recursivamente.
 */
function limpiarUndefined<T>(valor: T): T {
  if (Array.isArray(valor)) {
    return valor.map((item) => limpiarUndefined(item)) as T;
  }
  if (valor !== null && typeof valor === "object" && !(valor instanceof Date)) {
    const limpio: Record<string, unknown> = {};
    for (const [clave, val] of Object.entries(valor as Record<string, unknown>)) {
      if (val !== undefined) limpio[clave] = limpiarUndefined(val);
    }
    return limpio as T;
  }
  return valor;
}

/**
 * Se suscribe a una coleccion completa y llama `onCambio` con la lista actualizada cada
 * vez que algo cambia en Firestore (ya sea por este cliente u otro). Devuelve la funcion
 * para cancelar la suscripcion (usar en el cleanup de useEffect).
 */
export function suscribirColeccion<T extends { id: string }>(
  nombreColeccion: string,
  onCambio: (items: T[]) => void,
): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(collection(db, nombreColeccion), (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
    onCambio(items);
  });
}

/** Lee un solo documento. Devuelve null si no existe. */
export async function obtenerDocumento<T extends { id: string }>(
  nombreColeccion: string,
  id: string,
): Promise<T | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, nombreColeccion, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

/** Crea o reemplaza un documento completo. */
export async function guardarDocumento(
  nombreColeccion: string,
  id: string,
  data: DocumentData,
): Promise<void> {
  if (!db) return;
  const { id: _id, ...resto } = data;
  await setDoc(doc(db, nombreColeccion, id), limpiarUndefined(resto));
}

/** Actualiza solo los campos indicados de un documento existente. */
export async function actualizarDocumento(
  nombreColeccion: string,
  id: string,
  cambios: DocumentData,
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, nombreColeccion, id), limpiarUndefined(cambios));
}

export async function eliminarDocumento(nombreColeccion: string, id: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, nombreColeccion, id));
}
