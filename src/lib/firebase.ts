import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseHabilitado = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const app = firebaseHabilitado ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

/**
 * Instancia secundaria, solo para crear usuarios nuevos (crearUserWithEmailAndPassword
 * inicia sesion automaticamente como el usuario recien creado en la instancia donde se llama).
 * Usando una app separada, el Admin que esta creando un Asesor nuevo no pierde su propia sesion.
 */
export const appSecundaria = firebaseHabilitado
  ? initializeApp(firebaseConfig, "secundaria")
  : null;
export const authSecundaria = appSecundaria ? getAuth(appSecundaria) : null;
