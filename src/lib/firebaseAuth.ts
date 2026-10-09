import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, authSecundaria } from "@/lib/firebase";

/** El login sigue siendo codigo+clave; por dentro Firebase Auth necesita un correo. */
export function codigoAEmail(codigo: string): string {
  return `${codigo.trim().toLowerCase()}@hyo-oficial.internal`;
}

/** Inicia sesion con codigo+clave. Devuelve el uid si funciona, o null si las credenciales fallan. */
export async function iniciarSesionConCodigo(
  codigo: string,
  clave: string,
): Promise<string | null> {
  if (!auth) return null;
  try {
    const credencial = await signInWithEmailAndPassword(auth, codigoAEmail(codigo), clave);
    return credencial.user.uid;
  } catch {
    return null;
  }
}

export async function cerrarSesionAuth(): Promise<void> {
  if (auth) await signOut(auth);
}

/**
 * Crea una cuenta nueva de Auth (para un Asesor o Admin nuevo) usando la instancia secundaria,
 * para no perder la sesion del Admin que esta creando la cuenta. Devuelve el uid nuevo.
 */
export async function crearCuentaConCodigo(codigo: string, clave: string): Promise<string | null> {
  if (!authSecundaria) return null;
  try {
    const credencial = await createUserWithEmailAndPassword(
      authSecundaria,
      codigoAEmail(codigo),
      clave,
    );
    await signOut(authSecundaria);
    return credencial.user.uid;
  } catch {
    return null;
  }
}

/** Escucha cambios de sesion (ej. al recargar la pagina, restaura la sesion si ya estaba logueado). */
export function observarSesionAuth(callback: (user: User | null) => void): () => void {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}
