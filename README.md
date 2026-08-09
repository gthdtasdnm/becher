# Becherbluff 🎲

Jeder würfelt fünf Würfel unter seinem eigenen Becher. Geboten wird auf **alle
Würfel am Tisch**: „vier Fünfen" heißt, es liegen mindestens vier Fünfen – egal
bei wem. Wer nicht glaubt, zweifelt, und alle decken auf.

Verwandt mit Mäxchen, aber jeder hat eigene Würfel: geboten wird auf die
Gesamtmenge, nicht auf einen einzelnen Wurf.

Läuft auf **Deno**, ohne eine einzige externe Abhängigkeit. Kein Build-Schritt,
kein `node_modules`, ein Prozess.

---

## Starten

```bash
deno task dev          # http://localhost:8065/
PORT=9000 deno task dev
deno task check        # Typprüfung
deno task probe        # spielt bis zum ersten Ausscheiden (Server muss laufen)
```

Zum Ausprobieren allein: die Seite in **mehreren Browserfenstern** öffnen.

## An den Tisch kommen

Name eintippen, **Raum eröffnen** oder über die Liste bzw. den vierstelligen
**Code** beitreten. **Zwei bis sechs** Leute, je fünf Würfel.

## Bieten

Ein Gebot sind **Anzahl + Augenzahl**. Höher bieten heißt: mehr Würfel, oder
gleich viele mit höherer Augenzahl.

```
3× die 4   →   3× die 5   ✓  (gleich viele, höhere Augen)
3× die 4   →   4× die 2   ✓  (mehr Würfel)
3× die 4   →   2× die 6   ✗  (weniger Würfel)
3× die 4   →   3× die 4   ✗  (dasselbe)
```

Mehr Würfel bieten, als überhaupt auf dem Tisch liegen, ist keine kühne Ansage,
sondern eine, die nie aufgehen kann – deshalb ist sie ungültig.

**Einser sind Joker** und zählen für jede Augenzahl mit. Auf Einser selbst wird
nicht geboten. Damit entfallen die Halbierungsregeln, die das Spiel am Tisch
immer aufhalten. Der Host kann den Joker abschalten.

## Zweifeln

Wer dran ist, kann statt zu bieten zweifeln. Dann decken alle auf:

- Liegt die angesagte Menge da, verliert der **Zweifler** einen Würfel.
- Liegt sie nicht da, verliert der **Bieter** einen.

Das eigene Gebot kann niemand anzweifeln. Die Aufdeckung zeigt den Tisch so,
wie er beim Zählen lag – der verlorene Würfel liegt noch drin, sonst passt die
Zahl daneben nicht zum Bild. Sie bleibt sechs Sekunden stehen, dann wird neu
gewürfelt.

Wer verloren hat, fängt die nächste Runde an. Wer keine Würfel mehr hat, ist
raus. Der Letzte mit Würfeln gewinnt.

## Was nur der Server weiß

Die Becher liegen ausschließlich im Server. Der Client bekommt seinen **eigenen**
und von den anderen nur die Zahl ihrer Würfel. Erst die Aufdeckung zeigt alles.

## gebote.js

Zählen und Gebotsvergleich liegen in einer **eigenen Datei**, damit `probe.js`
mit denselben Funktionen rechnet wie der Server, und jede Aufdeckung nachrechnen
kann.

Der Ausgang ist steuerbar, obwohl die Würfel es nicht sind: wer alles bietet,
was auf dem Tisch liegt, verliert fast sicher – und weil der Verlierer die
nächste Runde anfängt, trifft es immer dieselbe Person. Nach fünf Runden ist sie
draußen, und damit ist auch das Ausscheiden geprüft.

## Wenn jemand geht

- Wer die Verbindung verliert, behält seinen Platz eine Minute lang.
- Verlässt jemand den Raum, während er am Zug ist, rückt der Zug weiter.
- Fallen die Mitspieler unter zwei, endet die Partie.

## Dateien

| Datei | Was |
|---|---|
| `server.js` | Würfeln, Gebote, Zweifeln, Aufdecken, Ausscheiden |
| `gebote.js` | `zaehle`, `gueltig`, `hoeher` – auch von `probe.js` benutzt |
| `probe.js` | rechnet ohne Server, dann Runden mit drei Clients |
| `bremse.js`, `raum.js`, `statisch.js` | gemeinsam, **wortgleich in allen Spielen** |
| `public/index.html` | alle vier Bildschirme plus die Hilfe |
| `public/schale.js` | gemeinsame Client-Schale (Verbindung, Lobby) |
| `public/style.css` | Lobby-Basis, gemeinsamer Rahmen, darunter das Eigene |
| `public/app.js` | Becher, Gebotswähler, Aufdeckung |

## Betrieb

Port **8065**, gebunden auf `127.0.0.1`, davor Apache als Reverse Proxy unter
`/becher/`. Dienst: `becher.service` (systemd, läuft als `www-data`).

```bash
systemctl status becher
journalctl -u becher -f
```

Der Zustand liegt vollständig im RAM. Ein Neustart wirft alle laufenden Partien
weg – das ist gewollt, es gibt nichts zu sichern.
