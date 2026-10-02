# BeerReal 🍺

Trinkspiel für **mindestens 3 Spieler**, jede*r mit dem eigenen Handy im selben Raum.

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

## Starten

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # Engine-Tests
npm run build
```

Aktuell läuft das Spiel im **lokalen Testmodus**: Alle Spieler müssen im selben Browser sein – einfach mehrere Tabs öffnen, in einem den Raum erstellen und in den anderen mit dem Code beitreten. Im Dev-Modus hat der Host im Menü (☰) Buttons, um sofort eine Mission bzw. ein Angebot auszulösen.

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

## Firebase (nächster Schritt)

Die UI spricht nur mit `GameBackend` (`src/net/types.ts`). Für Firebase wird ein zweites Backend gebaut und in `src/hooks/useGame.ts` eingetragen. Geplanter Aufbau:

- `rooms/{code}` – öffentlicher Zustand (Spieler, Karte, Angebote, Feed)
- `rooms/{code}/private/{playerId}` – eigene geheime Missionen (per Security Rules nur für diesen Spieler lesbar)
- `rooms/{code}/actions` – Aktionen der Spieler; ausgewertet vom Host-Client oder einer Cloud Function mit derselben `engine.ts`
- Zeiten über Server-Timestamps abgleichen
