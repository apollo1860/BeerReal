/**
 * Firebase-Web-Konfiguration. Diese Werte sind nicht geheim (Schutz läuft über
 * die Security Rules in database.rules.json). Sie kommen aus Umgebungsvariablen
 * (.env.local bzw. GitHub-Repository-Variablen), siehe README.
 */
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** Lokale Firebase-Emulatoren statt echtem Projekt verwenden (VITE_FIREBASE_EMULATOR=1). */
export const useEmulator = env.VITE_FIREBASE_EMULATOR === '1';

/** Mit ?local in der URL kann man trotz Firebase-Konfiguration den Tab-Modus nutzen. */
export const firebaseEnabled =
  (useEmulator || Boolean(firebaseConfig.databaseURL && firebaseConfig.apiKey)) &&
  !new URLSearchParams(location.search).has('local');
