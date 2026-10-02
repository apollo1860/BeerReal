import type { OfferTemplate } from '../types';

let i = 0;
const o = (text: string, reward: [number, number], extra: Omit<OfferTemplate, 'id' | 'text' | 'reward'> = {}): OfferTemplate => ({
  id: `offer-${++i}`,
  text,
  reward,
  ...extra,
});

/**
 * Öffentliche Angebote. Alle sehen sie. Wer ablehnt, gibt sie u. U. erhöht
 * an die nächste Person weiter. {t} = zufällige Zielperson.
 */
export const OFFER_TEMPLATES: OfferTemplate[] = [
  o('Schick ein Foto an eine Person, die die Gruppe bestimmt.', [1, 2]),
  o('Lass die Gruppe eine Story auf deinem Instagram posten.', [2, 3]),
  o('Ruf die dritte Person in deiner Anrufliste an und sing „Happy Birthday“.', [2, 3]),
  o('Lass {t} eine Nachricht von deinem Handy an einen Kontakt seiner/ihrer Wahl schreiben.', [2, 3]),
  o('Trink dein Getränk auf Ex.', [2, 4]),
  o('Tausch für 10 Minuten ein Kleidungsstück mit {t}.', [1, 2]),
  o('Lass dir von der Gruppe einen Spitznamen geben – alle müssen ihn bis Spielende benutzen.', [1, 2]),
  o('Schreib deinem/deiner Ex „Ich vermisse dich“.', [3, 4], { spicy: true }),
  o('Lass {t} dein Profilbild für 24 Stunden aussuchen.', [2, 3]),
  o('Lass die Gruppe 30 Sekunden durch deine Galerie scrollen.', [2, 4]),
  o('Mach 20 Kniebeugen, während alle zuschauen.', [1, 2]),
  o('Sprich bis zur nächsten Runde nur noch in der dritten Person über dich.', [1, 2]),
  o('Schick eine Sprachnachricht an deine Mutter/deinen Vater: „Ich muss dir was gestehen …“ (darfst danach aufklären).', [2, 3]),
  o('Lass {t} dein Gesicht mit einem Stift bemalen (abwaschbar!).', [2, 3]),
  o('Iss einen Löffel von etwas, das die Gruppe aussucht.', [2, 3]),
  o('Kommentiere unter dem neuesten Post deines Schwarms ein Emoji, das die Gruppe aussucht.', [2, 4], { spicy: true }),
  o('Lass {t} eine WhatsApp-Statusmeldung für dich schreiben.', [2, 3]),
  o('Trink einen Shot, den die Gruppe mixt.', [2, 4]),
  o('Lies deine letzten 3 Google-Suchen laut vor.', [1, 3]),
  o('Gib {t} dein Handy für 1 Minute – entsperrt.', [3, 4]),
];
