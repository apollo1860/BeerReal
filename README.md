# BeerReal 🍺

Trinkspiel für **mindestens 2 Spieler**, jede*r mit dem eigenen Handy im selben Raum.

## Spielprinzip

- **Öffentliche Karten** (wie Piccolo/Drinkopoly): Trinkanweisungen, Aufgaben, *Wer würde eher …?* (Abstimmung direkt am Handy), *Kiss Marry Kill*, *Ich hab noch nie*, Kategorien, Duelle und Regeln. Jede*r kann „Nächste Karte“ tippen.
- **Geheime Missionen** 🤫: Die App schickt zufälligen Spielern private Aufträge mit Zeitlimit (3–10 Min.), z. B. heimlich Fotos von einem Körperteil machen, etwas klauen, aus fremden Getränken trinken. Der Text ist nur sichtbar, solange man den Finger draufhält.
  - Geschafft → man darf Schlücke verteilen. Erwischt oder Zeit abgelaufen → Strafschlücke.
  - Danach wird die Mission für alle aufgedeckt.
  - Niemand hat jemals zwei geheime Missionen gleichzeitig.
- **Offene Angebote** 📣: Öffentliche Deals, z. B. „Für 1 Schluck verteilen: Schick ein Foto an eine Person, die die Gruppe bestimmt.“
  - Annehmen → durchziehen → verteilen (Kneifen = Belohnung selbst trinken).
  - Ablehnen (oder 90 Sek. nicht reagieren) → das Angebot geht **erhöht** an eine andere Person. Das passiert 1–5 Mal (zufällig), danach verschwindet es.
  - Max. ein offenes Angebot pro Person; eine geheime Mission **und** ein Angebot gleichzeitig ist erlaubt.
- **Verteilen**: Wer Schlücke verteilen darf, macht das direkt in der App. Am Ende gibt es eine Statistik mit Awards.
- **Einstellungen** in der Lobby: Tempo (chillig / normal / chaos), Missionen & Angebote an/aus, Spicy-Inhalte an/aus.

## Firebase einrichten (einmalig, ca. 10 Minuten)

1. Auf <https://console.firebase.google.com> ein neues Projekt anlegen (Google Analytics braucht ihr nicht).
2. **Build → Authentication → Jetzt starten → Anmeldemethode „Anonym“ aktivieren.**
3. **Build → Realtime Database → Datenbank erstellen** (Standort z. B. `europe-west1`, Start im *gesperrten Modus*).
   Dann im Tab **Regeln** den Inhalt von [`database.rules.json`](database.rules.json) einfügen und **Veröffentlichen**.
4. Die Web-App-Konfiguration des Projekts `beerreal-63f6a` steht bereits in [`src/net/firebaseConfig.ts`](src/net/firebaseConfig.ts). Für ein anderes Projekt: `.env.example` nach `.env.local` kopieren und ausfüllen.
5. Veröffentlichen:
   - **GitHub Pages**: Im Repo *Settings → Pages → Source: GitHub Actions*. Jeder Push (oder *Actions → Deploy auf GitHub Pages → Run workflow*) veröffentlicht die App unter `https://apollo1860.github.io/BeerReal/`.
     In Firebase unter *Authentication → Einstellungen → Autorisierte Domains* `apollo1860.github.io` hinzufügen.
   - **Lokal im WLAN**: `npm run dev` und die „Network“-Adresse auf den Handys öffnen.
   - **Firebase Hosting**: `npx firebase-tools login`, `npx firebase-tools use --add`, dann `npm run deploy`.

Mit `?local` in der URL startet die App im **lokalen Testmodus** (mehrere Tabs im selben Browser, ohne Firebase).

## Entwickeln

```bash
npm install
npm run dev            # App (Firebase, falls .env.local existiert, sonst Tab-Modus)
npm test               # Engine-Tests
npm run build

npm run emulators      # Firebase-Emulatoren (braucht Java)
npm run dev:emulator   # App gegen die Emulatoren
```

Im Dev-Modus hat der Host im Menü (☰) Buttons, um sofort eine Mission bzw. ein Angebot auszulösen.

## Aufbau

```
src/game/            Spiellogik (reines TypeScript, ohne UI)
  types.ts           Zustand, Aktionen
  engine.ts          applyAction(state, action, ctx) -> state, Timer im tick()
  view.ts            Was ein Spieler sehen darf (fremde Missionen werden ausgeblendet)
  content/           Karten, geheime Missionen, Angebote (hier neue Inhalte ergänzen)
src/net/
  types.ts           GameBackend / RoomConnection – das Interface für die UI
  local.ts           Lokales Backend (BroadcastChannel, Host-Tab führt die Engine aus)
src/ui/              React-Screens
```

## Wie Firebase genutzt wird

Das Handy, das den Raum erstellt (Host), führt die Spiel-Engine aus. Alle anderen schicken nur Aktionen.

| Pfad | Inhalt | Wer darf lesen / schreiben |
| --- | --- | --- |
| `rooms/{code}/meta` | Host-ID | alle lesen, einmalig anlegen |
| `rooms/{code}/public` | öffentlicher Spielstand | alle lesen, nur Host schreibt |
| `rooms/{code}/private/{uid}` | eigene geheime Mission, eigene Stimme | nur dieser Spieler liest |
| `rooms/{code}/host` | kompletter Zustand (für Reload) | nur Host |
| `rooms/{code}/actions` | Aktionen der Spieler | Spieler legen an, Host liest & löscht |

Geheime Missionen sind also auch über die Entwicklertools nicht für andere sichtbar.

**Wichtig:** Der Host muss die App während des Spiels offen haben (der Bildschirm bleibt automatisch an). Ist das Host-Handy weg, pausiert das Spiel und läuft weiter, sobald es zurück ist.
