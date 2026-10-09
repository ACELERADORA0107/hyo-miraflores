import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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

/** Crea o reemplaza un documento completo. */
export async function guardarDocumento(
  nombreColeccion: string,
  id: string,
  data: DocumentData,
): Promise<void> {
  if (!db) return;
  const { id: _id, ...resto } = data;
  await setDoc(doc(db, nombreColeccion, id), resto);
}

/** Actualiza solo los campos indicados de un documento existente. */
export async function actualizarDocumento(
  nombreColeccion: string,
  id: string,
  cambios: DocumentData,
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, nombreColeccion, id), cambios);
}

export async function eliminarDocumento(nombreColeccion: string, id: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, nombreColeccion, id));
}
