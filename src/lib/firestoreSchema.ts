/**
 * Mapa de colecciones de Firestore. Centralizado aca para que cambiar un nombre de
 * coleccion sea un solo lugar, y para documentar el esquema de la base de datos.
 *
 * Cada coleccion guarda documentos con la misma forma que su tipo correspondiente en
 * `src/types/index.ts`, con estas excepciones de seguridad:
 *
 * - `asesores/{id}` y `admins/{id}` YA NO guardan el campo `clave` (contrasena). La
 *   autenticacion pasa completamente por Firebase Auth; el documento de Firestore solo
 *   tiene el perfil (nombres, telefono, franquicia, rango, etc). El `id` del documento
 *   es el mismo `uid` que genera Firebase Auth al crear el usuario.
 * - El codigo (ASE-001, ADM-001) se mapea a un correo sintetico interno
 *   (`{codigo-en-minuscula}@hyo-oficial.internal`) solo para que Firebase Auth tenga
 *   un identificador con forma de email; el asesor/admin nunca ve ni usa ese correo.
 *
 * Documentos de configuracion unicos (no son listas, son un solo doc por coleccion):
 * - `config/preciosPorEtapaYPlazo` -> { "2DA ETAPA": { "1": 17000, ... }, ... }
 */
export const COLECCIONES = {
  clientes: "clientes",
  asesores: "asesores",
  admins: "admins",
  gestiones: "gestiones",
  comunicados: "comunicados",
  herramientas: "herramientas",
  movimientosComision: "movimientosComision",
  calendarioSabados: "calendarioSabados",
  config: "config",
} as const;
