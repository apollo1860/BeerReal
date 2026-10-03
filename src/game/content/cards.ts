import type { CardKind, CardTemplate } from '../types';

/** Wie oft welche Kartenart gezogen wird (relativ). */
export const CARD_KIND_WEIGHTS: Record<CardKind, number> = {
  drink: 3,
  task: 3,
  vote: 3,
  neverHaveIEver: 2,
  kmk: 1.5,
  category: 1.2,
  duel: 1.2,
  rule: 0.8,
};

export const CARD_KIND_LABELS: Record<CardKind, { title: string; icon: string }> = {
  drink: { title: 'Trinkanweisung', icon: '🍺' },
  task: { title: 'Aufgabe', icon: '🎯' },
  vote: { title: 'Wer würde eher …?', icon: '🗳️' },
  kmk: { title: 'Kiss, Marry, Kill', icon: '💋' },
  neverHaveIEver: { title: 'Ich hab noch nie …', icon: '🙊' },
  rule: { title: 'Neue Regel', icon: '📜' },
  category: { title: 'Kategorie', icon: '🧠' },
  duel: { title: 'Duell', icon: '⚔️' },
};

let i = 0;
const c = (kind: CardKind, text: string, extra: Omit<CardTemplate, 'id' | 'kind' | 'text'> = {}): CardTemplate => ({
  id: `card-${kind}-${++i}`,
  kind,
  text,
  ...extra,
});

export const CARD_TEMPLATES: CardTemplate[] = [
  // --- Trinkanweisungen ---------------------------------------------------
  c('drink', '{p1} trinkt {n} Schlücke. Einfach so. Prost!', { sips: [1, 3] }),
  c('drink', '{p1} darf {n} Schlücke verteilen.', { sips: [2, 4], distribute: true }),
  c('drink', '{p1} und {p2} trinken beide {n} Schlücke.', { sips: [1, 3] }),
  c('drink', 'Alle, die heute schon Alkohol hatten bevor das Spiel losging, trinken {n}.', { sips: [1, 2] }),
  c('drink', 'Wer zuletzt auf dem Klo war, trinkt {n}.', { sips: [2, 2] }),
  c('drink', 'Alle mit Brille oder Kontaktlinsen trinken {n}.', { sips: [1, 2] }),
  c('drink', 'Wasserfall! {p1} fängt an, alle trinken, bis die Person vor ihnen aufhört.'),
  c('drink', 'Alle, die Single sind, trinken {n}. Alle anderen trinken auf die Singles.', { sips: [1, 2] }),
  c('drink', 'Die jüngste Person im Raum trinkt {n}.', { sips: [2, 3] }),
  c('drink', 'Die älteste Person verteilt {n} Schlücke.', { sips: [2, 3] }),
  c('drink', 'Alle, deren Handy-Akku unter 30 % ist, trinken {n}.', { sips: [1, 3] }),
  c('drink', '{p1} sucht sich einen Trinkbuddy aus. Bis zur nächsten Regel trinkt der Buddy immer mit.'),
  c('drink', 'Alle, die schwarze Socken tragen, trinken {n}.', { sips: [1, 2] }),
  c('drink', '{p1} darf {n} Schlücke verteilen – aber nicht an {p2}.', { sips: [2, 4], distribute: true }),
  c('drink', 'Wer zuletzt eine Nachricht vom Ex bekommen hat, trinkt {n}.', { sips: [2, 3] }),
  c('drink', 'Prost auf {p1}! Alle trinken {n}.', { sips: [1, 1] }),

  // --- Aufgaben -----------------------------------------------------------
  c('task', '{p1}, mach 10 Liegestütze – oder trink {n}.', { sips: [2, 3] }),
  c('task', '{p1}, erzähl deinen peinlichsten Moment – oder trink {n}.', { sips: [2, 4] }),
  c('task', '{p1}, imitiere {p2}, bis jemand errät, wen du nachmachst. Sonst trinkst du {n}.', { sips: [2, 2] }),
  c('task', '{p1}, zeig das letzte Foto in deiner Galerie – oder trink {n}.', { sips: [3, 4] }),
  c('task', '{p1}, lies die letzte Nachricht vor, die du geschrieben hast – oder trink {n}.', { sips: [2, 4] }),
  c('task', '{p1} muss bis zur nächsten Karte mit Akzent reden. Wer drauf reinfällt und lacht, trinkt 1.'),
  c('task', '{p1}, sing den Refrain eines Songs, den {p2} aussucht – oder trink {n}.', { sips: [2, 3] }),
  c('task', '{p1}, mach {p2} ein ehrliches Kompliment und eine ehrliche Kritik. Oder trink {n}.', { sips: [2, 3] }),
  c('task', '{p1}, tausch für die nächsten 3 Karten den Platz mit {p2}.'),
  c('task', '{p1}, rede bis zur nächsten Karte nur in Reimen. Jeder Fehler: 1 Schluck.'),
  c('task', '{p1}, zeig deine meistgenutzte App und die Bildschirmzeit von heute – oder trink {n}.', { sips: [2, 3] }),
  c('task', '{p1}, lass {p2} ein Wort aussuchen, das du in den nächsten 10 Minuten in jeden Satz einbauen musst.'),
  c('task', '{p1} und {p2}: Starrwettbewerb! Wer zuerst lacht oder wegschaut, trinkt {n}.', { sips: [2, 3] }),
  c('task', '{p1}, mach ein Selfie mit dem schlimmsten Gesichtsausdruck und zeig es allen. Oder trink {n}.', { sips: [2, 3] }),
  c('task', '{p1}, erzähl was, das niemand hier über dich weiß. Oder trink {n}.', { sips: [2, 4] }),
  c('task', '{p1}, gib {p2} eine Massage für 30 Sekunden – oder ihr trinkt beide {n}.', { sips: [2, 2], spicy: true }),
  c('task', '{p1}, flirte 30 Sekunden lang mit der Wand. Wer lacht, trinkt 1.'),

  // --- Wer würde eher -----------------------------------------------------
  c('vote', 'Wer würde eher bei einem Date einschlafen?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher eine Nacht im Gefängnis verbringen?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher seinen Ex zurücknehmen?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher mit einem Promi schlafen, wenn er/sie die Chance hätte?', { sips: [2, 3], spicy: true }),
  c('vote', 'Wer würde eher im Urlaub den Flug verpassen?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher den Geburtstag der eigenen Mutter vergessen?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher heute Nacht als Erstes einschlafen?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher bei „Bauer sucht Frau“ mitmachen?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher aus Versehen ein Nacktbild an die Familiengruppe schicken?', { sips: [2, 4], spicy: true }),
  c('vote', 'Wer würde eher eine Zombie-Apokalypse überleben?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher 1000 € für Sneaker ausgeben?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher heimlich die Nachrichten des Partners lesen?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher morgen mit einem Tattoo aufwachen, an das er/sie sich nicht erinnert?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher Influencer werden?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher auf einer Hochzeit eine Rede halten, die komplett eskaliert?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher ein Jahr lang ohne Handy leben?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher mit dem/der besten Freund/in des Ex rummachen?', { sips: [2, 4], spicy: true }),
  c('vote', 'Wer würde eher heute noch die/den Ex anschreiben?', { sips: [2, 4] }),
  c('vote', 'Wer würde eher im Club den DJ anbetteln, sein Lieblingslied zu spielen?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher eine Lüge so lange erzählen, bis er/sie sie selbst glaubt?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher beim Monopoly schummeln?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher nackt baden gehen?', { sips: [2, 3], spicy: true }),
  c('vote', 'Wer würde eher die Rechnung „vergessen“?', { sips: [2, 3] }),
  c('vote', 'Wer würde eher heiraten, ohne es jemandem zu sagen?', { sips: [2, 3] }),

  // --- Kiss Marry Kill (die drei Personen denken sich die Spieler selbst aus) --
  c('kmk', '{p2} nennt {p1} drei Personen. {p1}: Kiss, Marry, Kill? Wer kneift, trinkt {n}.', { sips: [3, 4], spicy: true }),
  c('kmk', 'Die Gruppe einigt sich auf drei Personen. {p1}: Kiss, Marry, Kill – mit Begründung, sonst {n} Schlücke.', { sips: [2, 3], spicy: true }),
  c('kmk', '{p1} denkt sich drei Personen für {p2} aus. {p2}: Kiss, Marry, Kill? Wer sich drückt, trinkt {n}.', { sips: [2, 3], spicy: true }),
  c('kmk', '{p1} und {p2} nennen abwechselnd drei Personen. {p3} muss Kiss, Marry, Kill entscheiden – oder trinkt {n}.', { sips: [3, 4], spicy: true, minPlayers: 3 }),
  c('kmk', 'Alle schreiben heimlich einen Namen auf, {p1} zieht drei davon: Kiss, Marry, Kill! Kneifen kostet {n} Schlücke.', { sips: [3, 4], spicy: true }),

  // --- Ich hab noch nie ---------------------------------------------------
  c('neverHaveIEver', 'Ich hab noch nie … bei einer Prüfung geschummelt. Wer schon, trinkt {n}.', { sips: [1, 2] }),
  c('neverHaveIEver', 'Ich hab noch nie … jemanden geghostet. Wer schon, trinkt {n}.', { sips: [1, 2] }),
  c('neverHaveIEver', 'Ich hab noch nie … im Ausland die Nacht durchgemacht. Wer schon, trinkt {n}.', { sips: [1, 2] }),
  c('neverHaveIEver', 'Ich hab noch nie … meinen Schwarm gestalkt. Wer schon, trinkt {n}.', { sips: [1, 2] }),
  c('neverHaveIEver', 'Ich hab noch nie … einen Filmriss gehabt. Wer schon, trinkt {n}.', { sips: [1, 2] }),
  c('neverHaveIEver', 'Ich hab noch nie … jemanden aus dieser Runde geküsst. Wer schon, trinkt {n}.', { sips: [2, 3], spicy: true }),
  c('neverHaveIEver', 'Ich hab noch nie … eine Nachricht an die falsche Person geschickt. Wer schon, trinkt {n}.', { sips: [1, 2] }),
  c('neverHaveIEver', 'Ich hab noch nie … mich aus einem Club werfen lassen. Wer schon, trinkt {n}.', { sips: [2, 3] }),
  c('neverHaveIEver', 'Ich hab noch nie … über mein Alter gelogen. Wer schon, trinkt {n}.', { sips: [1, 2] }),
  c('neverHaveIEver', 'Ich hab noch nie … ein Date sitzen lassen. Wer schon, trinkt {n}.', { sips: [1, 2] }),
  c('neverHaveIEver', 'Ich hab noch nie … auf der Arbeit/in der Uni gepennt. Wer schon, trinkt {n}.', { sips: [1, 2] }),
  c('neverHaveIEver', 'Ich hab noch nie … an einem öffentlichen Ort rumgemacht. Wer schon, trinkt {n}.', { sips: [2, 3], spicy: true }),
  c('neverHaveIEver', 'Ich hab noch nie … ein Geschenk weiterverschenkt. Wer schon, trinkt {n}.', { sips: [1, 2] }),
  c('neverHaveIEver', 'Ich hab noch nie … mich als jemand anderes ausgegeben. Wer schon, trinkt {n}.', { sips: [1, 2] }),
  c('neverHaveIEver', 'Ich hab noch nie … in ein Taxi gekotzt. Wer schon, trinkt {n}.', { sips: [2, 3] }),

  // --- Regeln -------------------------------------------------------------
  c('rule', 'Neue Regel: Wer flucht, trinkt 1.'),
  c('rule', 'Neue Regel: Niemand darf mehr Vornamen sagen. Wer es tut, trinkt 2.'),
  c('rule', 'Neue Regel: {p1} ist Questionmaster. Wer eine Frage von {p1} beantwortet, trinkt 1.'),
  c('rule', 'Neue Regel: Nur mit der linken Hand trinken. Erwischt = 2 Schlücke.'),
  c('rule', 'Neue Regel: Vor jedem Schluck muss man „Prost, {p1}!“ sagen. Vergessen = noch 1.'),
  c('rule', 'Neue Regel: Wer aufs Handy schaut, ohne dass die App etwas Neues zeigt, trinkt 1.'),
  c('rule', 'Neue Regel: {p1} ist König/Königin. Wer {p1} nicht mit „Majestät“ anspricht, trinkt 1.'),
  c('rule', 'Neue Regel: Das Wort „trinken“ ist verboten. Wer es sagt, trinkt 2.'),

  // --- Kategorien ---------------------------------------------------------
  c('category', '{p1} fängt an: Automarken. Reihum, wer nichts mehr weiß, trinkt {n}.', { sips: [2, 3] }),
  c('category', '{p1} fängt an: Biersorten. Wer nichts mehr weiß, trinkt {n}.', { sips: [2, 3] }),
  c('category', '{p1} fängt an: Pokémon. Wer nichts mehr weiß, trinkt {n}.', { sips: [2, 3] }),
  c('category', '{p1} fängt an: Dinge, die man im Bett sagt. Wer nichts mehr weiß, trinkt {n}.', { sips: [2, 3], spicy: true }),
  c('category', '{p1} fängt an: Hauptstädte. Wer nichts mehr weiß, trinkt {n}.', { sips: [2, 3] }),
  c('category', '{p1} fängt an: Disney-Filme. Wer nichts mehr weiß, trinkt {n}.', { sips: [2, 3] }),
  c('category', '{p1} fängt an: Deutsche Rapper. Wer nichts mehr weiß, trinkt {n}.', { sips: [2, 3] }),
  c('category', '{p1} fängt an: Cocktails. Wer nichts mehr weiß, trinkt {n}.', { sips: [2, 3] }),

  // --- Duelle -------------------------------------------------------------
  c('duel', '{p1} gegen {p2}: Schere, Stein, Papier – best of 3. Verlierer trinkt {n}.', { sips: [2, 3] }),
  c('duel', '{p1} gegen {p2}: Wer zuerst sein Getränk leer hat, darf {n} verteilen.', { sips: [3, 4] }),
  c('duel', '{p1} gegen {p2}: Daumencatchen! Verlierer trinkt {n}.', { sips: [2, 3] }),
  c('duel', '{p1} gegen {p2}: Wer die Geburtstage von mehr Leuten hier kennt, gewinnt. Verlierer trinkt {n}.', { sips: [2, 3] }),
  c('duel', '{p1} gegen {p2}: Armdrücken. Verlierer trinkt {n}.', { sips: [2, 3] }),
  c('duel', '{p1} gegen {p2}: Wer länger auf einem Bein stehen kann. Verlierer trinkt {n}.', { sips: [2, 3] }),
];
