// Gebote und Zählen – als eigene Datei, damit `probe.js` genau die Funktionen
// prüfen kann, mit denen auch der Server rechnet. Sonst prüft die Probe eine
// Nachbildung, und die kann mit dem Server auseinanderlaufen, ohne dass es
// jemandem auffällt. Dasselbe Muster wie `zug.js` beim Wortleger.

export const AUGEN_MIN = 2;   // auf Einser wird nicht geboten, sie sind Joker
export const AUGEN_MAX = 6;

export const wuerfel = (n) => Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));

/**
 * Zählt, wie oft die Augenzahl auf dem Tisch liegt – Einser als Joker.
 *
 * @param {number[][]} becher   alle Becher, jeder eine Liste von Augenzahlen
 * @param {number} augen        worauf geboten wurde
 * @param {boolean} joker       zählen Einser mit?
 */
export function zaehle(becher, augen, joker) {
  let n = 0;
  for (const b of becher) {
    for (const w of b) {
      if (w === augen || (joker && w === 1)) n++;
    }
  }
  return n;
}

/**
 * Taugt das überhaupt als Gebot? Unabhängig davon, was vorher geboten wurde.
 *
 * Mehr Würfel bieten, als auf dem Tisch liegen, ist keine kühne Ansage,
 * sondern eine, die nie aufgehen kann – deshalb ist sie ungültig.
 */
export function gueltig(anzahl, augen, gesamt) {
  if (!Number.isInteger(anzahl) || anzahl < 1 || anzahl > gesamt) return false;
  if (!Number.isInteger(augen) || augen < AUGEN_MIN || augen > AUGEN_MAX) return false;
  return true;
}

/**
 * Ist das neue Gebot höher als das alte?
 *
 * Höher heißt: mehr Würfel, oder gleich viele mit höherer Augenzahl. Ohne
 * altes Gebot ist jedes gültige Gebot höher.
 */
export function hoeher(neu, alt) {
  if (!alt) return true;
  return neu.anzahl > alt.anzahl || (neu.anzahl === alt.anzahl && neu.augen > alt.augen);
}
