import type { MissionTemplate } from '../types';

let i = 0;
const m = (text: string, extra: Omit<MissionTemplate, 'id' | 'text'>): MissionTemplate => ({
  id: `mission-${++i}`,
  text,
  ...extra,
});

/**
 * Geheime Missionen. Nur der/die Empfänger/in sieht sie. Wer erwischt wird
 * oder die Zeit verstreichen lässt, kassiert die Strafschlücke.
 * {t} = zufällige Zielperson
 */
export const MISSION_TEMPLATES: MissionTemplate[] = [
  m('Mach heimlich 3 Fotos von {t}s linkem Ohr.', { minutes: [4, 7], reward: [3, 4], penalty: [2, 3], proof: 'Fotos zeigen' }),
  m('Mach heimlich 5 Fotos von {t}s Oberarm.', { minutes: [5, 8], reward: [3, 5], penalty: [2, 3], proof: 'Fotos zeigen' }),
  m('Mach heimlich ein Foto von {t}s Nase in Großaufnahme.', { minutes: [3, 6], reward: [3, 4], penalty: [2, 3], proof: 'Foto zeigen' }),
  m('Mach heimlich 4 Fotos von {t}s Händen.', { minutes: [4, 7], reward: [3, 4], penalty: [2, 3], proof: 'Fotos zeigen' }),
  m('Mach heimlich ein Selfie, auf dem {t} im Hintergrund zu sehen ist – ohne dass {t} es merkt.', { minutes: [3, 6], reward: [3, 4], penalty: [2, 3], proof: 'Selfie zeigen' }),
  m('Klau unbemerkt einen Gegenstand aus dem Besitz von {t} (Feuerzeug, Kippe, Schlüssel …) und behalte ihn bis zum Ende der Mission.', { minutes: [5, 10], reward: [4, 5], penalty: [3, 4], proof: 'Gegenstand präsentieren' }),
  m('Nimm mindestens 3 Schlücke aus dem Getränk von {t}, ohne dass es jemand merkt.', { minutes: [4, 8], reward: [3, 5], penalty: [3, 4] }),
  m('Klau das Getränk von {t} und versteck es irgendwo im Raum.', { minutes: [5, 10], reward: [4, 5], penalty: [3, 4], proof: 'Versteck zeigen' }),
  m('Bring {t} dazu, das Wort „Ananas“ zu sagen.', { minutes: [3, 7], reward: [3, 4], penalty: [2, 3] }),
  m('Bring {t} dazu, dir ein High Five zu geben – ohne danach zu fragen.', { minutes: [3, 6], reward: [2, 3], penalty: [2, 2] }),
  m('Sag in den nächsten Minuten dreimal unauffällig das Wort „Zebrastreifen“.', { minutes: [4, 7], reward: [2, 4], penalty: [2, 3] }),
  m('Bring {t} dazu, aufzustehen und dir etwas zu holen.', { minutes: [4, 8], reward: [3, 4], penalty: [2, 3] }),
  m('Tausche unbemerkt dein Getränk mit dem von {t}.', { minutes: [4, 8], reward: [4, 5], penalty: [3, 4] }),
  m('Bring {t} dazu, über ein Thema zu reden, das du dir jetzt ausdenkst – ohne es direkt anzusprechen. Schreib das Thema vorher auf.', { minutes: [5, 9], reward: [3, 4], penalty: [2, 3], proof: 'Notiz zeigen' }),
  m('Versteck unbemerkt ein Kleidungsstück oder Accessoire von {t} (Mütze, Jacke, Handy …).', { minutes: [5, 10], reward: [4, 5], penalty: [3, 4], proof: 'Versteck zeigen' }),
  m('Mach heimlich ein Foto von jedem Schuh im Raum, der nicht dir gehört (mindestens 4).', { minutes: [5, 9], reward: [3, 5], penalty: [2, 3], proof: 'Fotos zeigen' }),
  m('Bring {t} dazu, ein Lied zu summen oder zu singen.', { minutes: [5, 9], reward: [3, 5], penalty: [2, 3] }),
  m('Nimm {t}s Handy in die Hand und leg es woanders hin, ohne dass {t} es merkt.', { minutes: [4, 8], reward: [4, 5], penalty: [3, 4] }),
  m('Mach heimlich 3 Fotos von {t}s Augenbraue.', { minutes: [4, 7], reward: [3, 4], penalty: [2, 3], proof: 'Fotos zeigen' }),
  m('Bring {t} dazu, dir ein Kompliment zu machen.', { minutes: [4, 8], reward: [3, 4], penalty: [2, 3] }),
  m('Berühre {t} dreimal unauffällig an der Schulter, ohne dass es auffällt.', { minutes: [3, 6], reward: [2, 3], penalty: [2, 2] }),
  m('Bring zwei andere Personen dazu, gleichzeitig zu trinken, ohne dass sie merken, dass du es drauf anlegst.', { minutes: [4, 8], reward: [3, 4], penalty: [2, 3] }),
  m('Mach heimlich ein Foto von {t}s Kinn und eins von {t}s Ellbogen.', { minutes: [4, 8], reward: [3, 5], penalty: [2, 3], proof: 'Fotos zeigen' }),
  m('Schaffe es, dass {t} deinen Namen zweimal sagt.', { minutes: [3, 7], reward: [2, 4], penalty: [2, 3] }),
  m('Flirte unauffällig mit {t}, bis {t} rot wird oder lacht.', { minutes: [4, 8], reward: [3, 5], penalty: [2, 3], spicy: true }),
];
