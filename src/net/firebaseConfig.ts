/**
 * Firebase-Web-Konfiguration. Diese Werte sind nicht geheim (Schutz läuft über
 * die Security Rules in database.rules.json). Umgebungsvariablen (.env.local)
 * überschreiben die Standardwerte, z. B. für ein eigenes Testprojekt.
 */
const env = import.meta.env;

const defaults = {
  apiKey: 'AIzaSyDwkha6bhvGUJM2dkpiBz1-eKiSQml7zkI',
  authDomain: 'beerreal-63f6a.firebaseapp.com',
  databaseURL: 'https://beerreal-63f6a-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'beerreal-63f6a',
  appId: '1:429638890236:web:9362b8a1c8c2c0e03e1d79',
};

export const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string | undefined) || defaults.apiKey,
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || defaults.authDomain,
  databaseURL: (env.VITE_FIREBASE_DATABASE_URL as string | undefined) || defaults.databaseURL,
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string | undefined) || defaults.projectId,
  appId: (env.VITE_FIREBASE_APP_ID as string | undefined) || defaults.appId,
};

/** Lokale Firebase-Emulatoren statt echtem Projekt verwenden (VITE_FIREBASE_EMULATOR=1). */
export const useEmulator = env.VITE_FIREBASE_EMULATOR === '1';

/** Mit ?local in der URL kann man trotz Firebase-Konfiguration den Tab-Modus nutzen. */
export const firebaseEnabled =
  (useEmulator || Boolean(firebaseConfig.databaseURL && firebaseConfig.apiKey)) &&
  !new URLSearchParams(location.search).has('local');
