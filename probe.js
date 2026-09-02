// Spielt Becherbluff mit drei Clients durch: würfeln, bieten, höher bieten,
// zweifeln, aufdecken und nachrechnen, Würfel verlieren, jemanden aus dem Spiel
// werfen, Endstand, Neustart.
//
// Kein Testrahmen, keine Abhaengigkeit – das Skript wirft, wenn etwas nicht
// stimmt, und schreibt sonst mit, was passiert ist. Der Server muss dafuer
// laufen:
//
//   deno task dev            (in einer zweiten Sitzung)
//   deno task probe
// Gegen die Live-Fassung statt gegen den lokalen Server:
//   WS_URL=wss://inf-zeus.de/becher/ws deno task probe
//
// Die Wuerfel sind zufaellig, der Ausgang aber steuerbar: die Probe bietet
// absichtlich das Hoechstmoegliche, damit der Bieter fast sicher verliert – und
// weil der Verlierer die naechste Runde anfaengt, verliert immer dieselbe
// Person und ist nach fuenf Runden draussen. Nachgerechnet wird jede
// Aufdeckung mit derselben `gebote.js`, die auch der Server benutzt.
//
// Sechs Sekunden bleibt jede Aufdeckung stehen; die Probe braucht deshalb rund
// eine halbe Minute.

import { gueltig, hoeher, zaehle } from "./gebote.js";

const PORT = Deno.env.get("PORT") ?? "8065";
const URL_WS = Deno.env.get("WS_URL") ?? `ws://127.0.0.1:${PORT}/ws`;

const muss = (bedingung, text) => { if (!bedingung) throw new Error(text); };

// --- Erst die Gebote, ohne Server -------------------------------------------

muss(zaehle([[2, 2, 3], [1, 2]], 2, true) === 4, "Drei Zweien plus ein Joker sind vier");
muss(zaehle([[2, 2, 3], [1, 2]], 2, false) === 3, "Ohne Joker zählt die Eins nicht mit");
muss(zaehle([[1, 1, 1]], 6, true) === 3, "Joker zählen auch für eine Augenzahl, die keiner hat");
muss(zaehle([[3, 4, 5]], 6, true) === 0, "Da ist keine Sechs und kein Joker");
muss(zaehle([], 4, true) === 0, "Ein leerer Tisch hat nichts");
console.log("ok  zaehle(): mit Joker, ohne Joker, leer");

muss(gueltig(1, 2, 15), "Ein Würfel auf die Zwei ist ein gültiges Gebot");
muss(gueltig(15, 6, 15), "Alle Würfel auf die Sechs ist ein gültiges Gebot");
muss(!gueltig(16, 6, 15), "Mehr Würfel bieten, als auf dem Tisch liegen, geht nicht");
muss(!gueltig(0, 3, 15), "Null Würfel sind kein Gebot");
muss(!gueltig(2, 1, 15), "Auf Einser wird nicht geboten – sie sind Joker");
muss(!gueltig(2, 7, 15), "Sieben Augen hat kein Würfel");
muss(!gueltig(1.5, 3, 15), "Anderthalb Würfel gibt es nicht");
console.log("ok  gueltig(): Grenzen nach oben, nach unten und bei den Augen");

muss(hoeher({ anzahl: 3, augen: 2 }, null), "Ohne Vorgebot ist jedes Gebot höher");
muss(hoeher({ anzahl: 3, augen: 4 }, { anzahl: 3, augen: 3 }), "Gleich viele, höhere Augen: höher");
muss(hoeher({ anzahl: 4, augen: 2 }, { anzahl: 3, augen: 6 }), "Mehr Würfel schlagen höhere Augen");
muss(!hoeher({ anzahl: 3, augen: 3 }, { anzahl: 3, augen: 3 }), "Dasselbe Gebot ist nicht höher");
muss(!hoeher({ anzahl: 3, augen: 2 }, { anzahl: 3, augen: 3 }), "Niedrigere Augen sind nicht höher");
muss(!hoeher({ anzahl: 2, augen: 6 }, { anzahl: 3, augen: 2 }), "Weniger Würfel sind nicht höher");
console.log("ok  hoeher(): mehr Würfel, gleich viele mit mehr Augen, und was nicht zählt");

// --- Jetzt der Server -------------------------------------------------------

function client(name) {
  const c = {
    name, ws: new WebSocket(URL_WS), you: null, room: null, runde: null,
    final: null, fehler: [],
  };
  c.ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.t === "joined") c.you = m.you;
    if (m.t === "room") c.room = m;
    if (m.t === "runde") { c.runde = m; c.final = null; }
    if (m.t === "final") c.final = m;
    if (m.t === "error") c.fehler.push(m.msg);
  };
  c.send = (m) => c.ws.send(JSON.stringify(m));
  c.offen = new Promise((res) => { c.ws.onopen = res; });
  return c;
}

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

async function bis(bedingung, was, ms = 10_000) {
  const ende = Date.now() + ms;
  while (Date.now() < ende) {
    if (bedingung()) return;
    await warte(25);
  }
  throw new Error("Zeitüberschreitung: " + was);
}

const A = client("Anna"), B = client("Ben"), C = client("Cem");
const alleC = [A, B, C];
await Promise.all(alleC.map((c) => c.offen));

// Nicht oeffentlich: die Probe laeuft auch gegen live, und dort soll kein
// Geisterraum in der Liste stehen.
A.send({ t: "create", name: "Anna", isPublic: false });
await bis(() => A.room, "Raum angelegt");
console.log("Raum:", A.room.code);

for (const c of [B, C]) c.send({ t: "join", code: A.room.code, name: c.name });
await bis(() => A.room.players.length === 3, "drei Spieler");

A.send({ t: "start" });
await warte(150);
muss(A.room.phase === "lobby", "Start ging ohne Bereit durch");
console.log("ok  Start blockiert, solange nicht alle bereit sind");

for (const c of [B, C]) c.send({ t: "ready", value: true });
await bis(() => A.room.players.every((p) => p.ready || p.host), "alle bereit");
A.send({ t: "start" });
await bis(() => alleC.every((c) => c.runde?.becher?.length === 5), "gewürfelt");

// --- Was unter den Bechern liegt --------------------------------------------

muss(A.runde.gesamt === 15, "Drei mal fünf Würfel sind fünfzehn, gezählt: " + A.runde.gesamt);
for (const c of alleC) {
  muss(c.runde.becher.every((w) => w >= 1 && w <= 6), `${c.name} hat einen unmöglichen Würfel`);
  muss(c.runde.spieler.length === 3, "Die Spielerliste ist unvollständig");
  muss(c.runde.spieler.every((s) => s.wuerfel === undefined && s.becher === undefined),
    `${c.name} sieht fremde Würfel in der Spielerliste`);
  muss(c.runde.spieler.every((s) => s.anzahl === 5), "Nicht jeder hat fünf Würfel");
  muss(c.runde.aufdeckung === null, "Vor dem Aufdecken gibt es schon eine Aufdeckung");
  muss(c.runde.gebot === null, "Vor dem ersten Gebot steht schon ein Gebot");
}
console.log("ok  jeder sieht nur den eigenen Becher, alle zusammen fünfzehn Würfel");

const amZug = () => alleC.find((c) => c.you === A.runde.amZug);
const nachDran = () => {
  const ids = A.runde.spieler.map((s) => s.id);
  const i = ids.indexOf(A.runde.amZug);
  return alleC.find((c) => c.you === ids[(i + 1) % ids.length]);
};

// --- Was kein Gebot ist ------------------------------------------------------

{
  const d = amZug();
  nachDran().send({ t: "bieten", anzahl: 2, augen: 3 });   // nicht dran
  d.send({ t: "bieten", anzahl: 2, augen: 1 });            // auf Einser
  d.send({ t: "bieten", anzahl: 16, augen: 3 });           // mehr als da sind
  d.send({ t: "bieten", anzahl: 0, augen: 3 });            // gar keiner
  d.send({ t: "zweifeln" });                               // ohne Gebot
  await warte(250);
  muss(A.runde.gebot === null, "Eines dieser fünf ungültigen Gebote ist durchgegangen");
  console.log("ok  abgelehnt: fremder Zug, Einser, zu viele, keiner, Zweifel ohne Gebot");
}

// --- Bieten und höher bieten -------------------------------------------------

let d = amZug();
d.send({ t: "bieten", anzahl: 3, augen: 3 });
await bis(() => A.runde.gebot, "erstes Gebot");
muss(A.runde.gebot.anzahl === 3 && A.runde.gebot.augen === 3, "Das Gebot kam falsch an");
muss(A.runde.gebot.von === d.name, "Das Gebot steht bei der falschen Person");
muss(A.runde.amZug !== d.you, "Nach dem Gebot ist derselbe noch dran");

d = amZug();
d.send({ t: "bieten", anzahl: 3, augen: 2 });   // gleich viele, weniger Augen
d.send({ t: "bieten", anzahl: 2, augen: 6 });   // weniger Würfel
d.send({ t: "bieten", anzahl: 3, augen: 3 });   // dasselbe noch einmal
await warte(250);
muss(A.runde.gebot.anzahl === 3 && A.runde.gebot.augen === 3, "Ein zu niedriges Gebot ging durch");
console.log("ok  niedriger, gleich oder weniger Würfel – alles abgelehnt");

d.send({ t: "bieten", anzahl: 3, augen: 5 });
await bis(() => A.runde.gebot.augen === 5, "höher geboten");
console.log("ok  gleich viele Würfel mit höherer Augenzahl gehen durch");

// --- Zweifeln und nachrechnen ------------------------------------------------

const bieter = amZug() === d ? d : alleC.find((c) => c.you === A.runde.gebot.vonId);
const gebotVor = { ...A.runde.gebot };
const zweifler = amZug();
muss(zweifler.you !== A.runde.gebot.vonId, "Der Bieter ist selbst am Zug");
bieter.send({ t: "zweifeln" });          // das eigene Gebot anzweifeln
await warte(200);
muss(A.runde.schritt === "bieten", "Man konnte das eigene Gebot anzweifeln");
console.log("ok  das eigene Gebot kann niemand anzweifeln");

zweifler.send({ t: "zweifeln" });
await bis(() => A.runde.schritt === "aufdecken", "aufgedeckt");

const auf = A.runde.aufdeckung;
muss(auf.becher.length === 3, "Es wurden nicht alle drei Becher aufgedeckt");
// Die Aufdeckung zeigt den Tisch, wie er beim Zaehlen lag – der verlorene
// Wuerfel darf darin noch liegen, sonst passt die Zahl nicht zum Bild.
muss(auf.becher.every((b) => b.wuerfel.length === 5),
  "In der Aufdeckung fehlt schon ein Würfel: " +
    auf.becher.map((b) => `${b.name} ${b.wuerfel.join("")}`).join(" · "));
const soll = zaehle(auf.becher.map((b) => b.wuerfel), gebotVor.augen, A.runde.joker);
muss(auf.tatsaechlich === soll,
  `Server zählt ${auf.tatsaechlich}× die ${gebotVor.augen}, gebote.js zählt ${soll}`);
const hatteRecht = auf.tatsaechlich >= gebotVor.anzahl;
muss(auf.verlierer === (hatteRecht ? zweifler.name : bieter.name),
  `Verlieren müsste ${hatteRecht ? zweifler.name : bieter.name}, verliert aber ${auf.verlierer}`);
const verliererC = alleC.find((c) => c.name === auf.verlierer);
muss(A.runde.spieler.find((s) => s.id === verliererC.you).anzahl === 4,
  "Der Verlierer hat keinen Würfel verloren");
muss(A.runde.spieler.filter((s) => s.anzahl === 5).length === 2, "Es haben mehrere verloren");
console.log(`ok  ${gebotVor.anzahl}× die ${gebotVor.augen} – tatsächlich ${auf.tatsaechlich}, ` +
  `${auf.verlierer} verliert einen Würfel`);
console.log("    " + auf.becher.map((b) => `${b.name} ${b.wuerfel.join("")}`).join(" · "));

// --- Nächste Runde: neu würfeln, gleich viele Würfel ------------------------

const vorher = A.runde.spieler.map((s) => `${s.id}:${s.anzahl}`).join();
await bis(() => A.runde.schritt === "bieten" && A.runde.n === 2, "zweite Runde", 10_000);
muss(A.runde.gebot === null && A.runde.aufdeckung === null, "Die alte Runde steht noch da");
muss(A.runde.spieler.map((s) => `${s.id}:${s.anzahl}`).join() === vorher,
  "Beim Neuwürfeln hat sich die Zahl der Würfel geändert");
muss(A.runde.gesamt === 14, "Nach einem verlorenen Würfel müssten vierzehn übrig sein");
console.log("ok  neue Runde: neu gewürfelt, ein Würfel weniger auf dem Tisch");

// --- So lange bieten, bis jemand draußen ist --------------------------------

// Immer das Hoechstmoegliche bieten: dann liegt der Bieter fast sicher daneben,
// und weil der Verlierer die naechste Runde anfaengt, trifft es immer dieselbe
// Person. Nach fuenf verlorenen Wuerfeln ist sie raus.
for (let runde = 0; runde < 10 && !A.runde.raus.length; runde++) {
  const bietet = amZug();
  const gesamt = A.runde.gesamt;
  bietet.send({ t: "bieten", anzahl: gesamt, augen: 6 });
  await bis(() => A.runde.gebot?.anzahl === gesamt, `${bietet.name} bietet alles`);
  const dagegen = amZug();
  dagegen.send({ t: "zweifeln" });
  await bis(() => A.runde.schritt === "aufdecken", "aufgedeckt");

  const a = A.runde.aufdeckung;
  const gezaehlt = zaehle(a.becher.map((b) => b.wuerfel), 6, A.runde.joker);
  muss(a.tatsaechlich === gezaehlt, "Server und gebote.js zählen verschieden");
  muss(a.verlierer === (gezaehlt >= gesamt ? dagegen.name : bietet.name),
    "Der Falsche verliert einen Würfel");
  await bis(() => A.runde.schritt === "bieten" || A.runde.raus.length, "weiter", 10_000);
}

muss(A.runde.raus.length === 1, "Nach zehn Runden ist noch niemand raus");
const draussen = A.runde.raus[0];
muss(A.runde.spieler.length === 2, "Wer draußen ist, steht noch in der Liste");
muss(!A.runde.spieler.some((s) => s.name === draussen), `${draussen} ist raus und trotzdem dabei`);
const drausseC = alleC.find((c) => c.name === draussen);
muss(drausseC.runde.becher.length === 0, "Wer draußen ist, hat noch Würfel unter dem Becher");
console.log(`ok  ${draussen} hat alle fünf Würfel verloren und ist draußen`);

// --- Endstand ----------------------------------------------------------------

A.send({ t: "ende" });
await bis(() => A.final, "Endstand");
const f = A.final;
muss(f.tabelle.length === 3, "Im Endstand fehlt jemand");
muss(f.tabelle.filter((z) => z.wert.text === "gewonnen").length === 2, "Es sind nicht zwei übrig");
muss(f.tabelle.some((z) => z.name === draussen && z.wert.text === "Platz 2"),
  `${draussen} müsste auf Platz 2 stehen`);
console.log("Endstand: " + f.tabelle.map((z) => `${z.name} ${z.wert.text}`).join(" · "));

A.send({ t: "again" });
await bis(() => A.room.phase === "lobby", "zurück im Warteraum");
console.log("ok  Nochmal setzt alles zurück");

if (alleC.some((c) => c.fehler.length)) {
  throw new Error("Fehlermeldungen: " + JSON.stringify(alleC.map((c) => c.fehler)));
}
console.log("\nALLES GRÜN");
Deno.exit(0);
