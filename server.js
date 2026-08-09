// BECHERBLUFF – Deno-Server. Jeder würfelt unter seinem eigenen Becher, alle
// zusammen bieten auf das, was auf dem Tisch liegen könnte.
//
// Verwandt mit Mäxchen, aber jeder hat eigene Würfel: geboten wird auf die
// Gesamtmenge, nicht auf einen einzelnen Wurf. Einser sind Joker; auf Einser
// selbst wird nicht geboten – damit entfallen die Halbierungsregeln, die das
// Spiel am Tisch immer aufhalten.

import { darfRaumOeffnen, raumVermerkt } from "./bremse.js";
import { cleanName, raumverwaltung, shuffle } from "./raum.js";
import { starte } from "./statisch.js";

const PORT = Number(Deno.env.get("PORT") ?? 8065);
const HOST = Deno.env.get("HOST") ?? "0.0.0.0";
const PUBLIC = new URL("./public/", import.meta.url);

const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;
const START_WUERFEL = 5;
const AUFDECK_MS = 6000;

const wuerfel = (n) => Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));

const {
  rooms, browsing,
  createRoom, clearTimers, anwesende,
  send, raw, broadcast,
  roomList, pushState, pushRoomList,
  makePlayer, attach, dropPlayer,
} = raumverwaltung({
  maxPlayers: MAX_PLAYERS,
  minPlayers: MIN_PLAYERS,
  einstellungen: { joker: true },
  raumfelder: () => ({
    reihe: [], amZug: null, gebot: null, schritt: "bieten", aufdeckung: null, raus: [],
  }),
  spielerfelder: () => ({ becher: [], drin: false }),

  beimBeitritt: (room) => { if (room.phase === "playing") pushRunde(room); },
  nachVerlassen: (room, player) => {
    if (room.phase === "playing" && room.amZug === player.id) weiterWennWeg(room);
  },
  beimPlatzfrei: (room, id) => {
    if (room.phase !== "playing") return;
    const i = room.reihe.indexOf(id);
    if (i >= 0) room.reihe.splice(i, 1);
    if (room.amZug === id) weiterWennWeg(room);
    if (room.reihe.length < 2) finishGame(room);
    else pushRunde(room);
  },
  zurueckZurLobby: (room) => backToLobby(room),
});

// ---------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------

function startGame(room) {
  clearTimers(room);
  room.phase = "playing";
  room.rundeNr = 0;
  room.raus = [];
  room.reihe = shuffle(anwesende(room).map((p) => p.id));
  for (const p of room.players.values()) {
    p.becher = [];
    p.drin = room.reihe.includes(p.id);
    p.punkte = 0;
    p.ready = false;
  }
  for (const id of room.reihe) room.players.get(id).becher = wuerfel(START_WUERFEL);
  room.amZug = room.reihe[0];
  room.gebot = null;
  room.schritt = "bieten";
  room.aufdeckung = null;
  room.rundeNr = 1;
  pushState(room);
  pushRunde(room);
  pushRoomList();
}

function naechster(room, von) {
  if (!room.reihe.length) return null;
  const i = room.reihe.indexOf(von);
  return room.reihe[(i < 0 ? 0 : i + 1) % room.reihe.length];
}

function weiterWennWeg(room) {
  const p = room.players.get(room.amZug);
  if (p?.connected) return;
  room.amZug = naechster(room, room.amZug);
  pushRunde(room);
}

const gesamtWuerfel = (room) =>
  room.reihe.reduce((n, id) => n + (room.players.get(id)?.becher.length ?? 0), 0);

/** Zählt, wie oft die Augenzahl auf dem Tisch liegt – Einser als Joker. */
function zaehle(room, augen) {
  let n = 0;
  for (const id of room.reihe) {
    for (const w of room.players.get(id)?.becher ?? []) {
      if (w === augen || (room.settings.joker && w === 1)) n++;
    }
  }
  return n;
}

function aufdecken(room, zweiflerId) {
  const g = room.gebot;
  if (!g) return;
  const tatsaechlich = zaehle(room, g.augen);
  const bieterHatRecht = tatsaechlich >= g.anzahl;
  const verliererId = bieterHatRecht ? zweiflerId : g.von;
  const verlierer = room.players.get(verliererId);
  if (verlierer) verlierer.becher.pop();

  room.aufdeckung = {
    gebot: { anzahl: g.anzahl, augen: g.augen, von: name(room, g.von) },
    zweifler: name(room, zweiflerId),
    tatsaechlich,
    verlierer: verlierer?.name ?? "?",
    becher: room.reihe.map((id) => ({
      name: name(room, id),
      wuerfel: [...(room.players.get(id)?.becher ?? [])],
    })),
  };
  room.schritt = "aufdecken";
  pushRunde(room);

  // Wer keine Würfel mehr hat, ist raus.
  if (verlierer && !verlierer.becher.length) {
    verlierer.drin = false;
    const i = room.reihe.indexOf(verliererId);
    if (i >= 0) room.reihe.splice(i, 1);
    room.raus.unshift(verlierer.name);
  }

  const naechsteId = room.reihe.includes(verliererId)
    ? verliererId              // wer verloren hat, fängt neu an
    : naechster(room, verliererId);

  const id = setTimeout(() => {
    room.timers.delete(id);
    if (room.reihe.length < 2) return finishGame(room);
    room.rundeNr++;
    for (const pid of room.reihe) {
      const p = room.players.get(pid);
      p.becher = wuerfel(p.becher.length);
    }
    room.gebot = null;
    room.aufdeckung = null;
    room.schritt = "bieten";
    room.amZug = naechsteId ?? room.reihe[0];
    pushRunde(room);
  }, AUFDECK_MS);
  room.timers.add(id);
}

const name = (room, id) => room.players.get(id)?.name ?? "?";

function pushRunde(room) {
  if (room.phase !== "playing") return;
  const spieler = room.reihe.map((id) => {
    const p = room.players.get(id);
    return { id, name: p?.name ?? "?", anzahl: p?.becher.length ?? 0, weg: !p?.connected };
  });
  for (const p of room.players.values()) {
    send(p, {
      t: "runde",
      n: room.rundeNr,
      schritt: room.schritt,
      amZug: room.amZug,
      gebot: room.gebot
        ? { anzahl: room.gebot.anzahl, augen: room.gebot.augen, von: name(room, room.gebot.von), vonId: room.gebot.von }
        : null,
      gesamt: gesamtWuerfel(room),
      spieler,
      raus: room.raus,
      becher: p.drin ? p.becher : [],
      aufdeckung: room.aufdeckung,
      joker: room.settings.joker,
    });
  }
}

function finishGame(room) {
  clearTimers(room);
  room.phase = "final";
  const sieger = room.reihe.map((id) => name(room, id));
  const tabelle = [
    ...sieger.map((n) => ({ name: n, wert: "gewonnen", punkte: 100 })),
    ...room.raus.map((n, i) => ({ name: n, wert: `Platz ${i + 2}`, punkte: -i })),
  ];
  for (const p of room.players.values()) p.ready = false;
  broadcast(room, {
    t: "final",
    tabelle,
    untertitel: sieger.length ? `${sieger.join(", ")} hat als Letzter noch Würfel.` : "Abgebrochen",
  });
  pushState(room);
  pushRoomList();
}

function backToLobby(room) {
  clearTimers(room);
  room.phase = "lobby";
  room.rundeNr = 0;
  room.reihe = [];
  room.raus = [];
  room.gebot = null;
  room.aufdeckung = null;
  room.schritt = "bieten";
  for (const p of room.players.values()) {
    p.ready = false;
    p.becher = [];
    p.drin = false;
    p.punkte = 0;
  }
  pushState(room);
}

// ---------------------------------------------------------------------------
// Nachrichten
// ---------------------------------------------------------------------------

function handle(ws, msg) {
  const room = ws._room;
  const player = ws._player;

  if (msg.t === "ping") return raw(ws, { t: "pong", c: msg.c, s: Date.now() });

  if (msg.t === "browse") {
    if (!ws._room) {
      browsing.add(ws);
      raw(ws, { t: "rooms", rooms: roomList() });
    }
    return;
  }

  if (msg.t === "create") {
    if (room) return;
    if (!darfRaumOeffnen(ws._ip)) {
      return raw(ws, { t: "error", msg: "Zu viele Räume in kurzer Zeit. Warte kurz." });
    }
    raumVermerkt(ws._ip);
    const r = createRoom(msg.isPublic);
    const p = makePlayer(msg.name, true);
    r.hostId = p.id;
    r.players.set(p.id, p);
    attach(ws, r, p);
    pushState(r);
    pushRoomList();
    return;
  }

  if (msg.t === "join") {
    if (room) return;
    const r = rooms.get(String(msg.code ?? "").toUpperCase().trim());
    if (!r) return raw(ws, { t: "error", msg: "Diesen Raum gibt es nicht" });
    if (msg.token) {
      const back = [...r.players.values()].find((p) => p.token === msg.token);
      if (back) {
        if (back.ws && back.ws !== ws && back.ws.readyState === WebSocket.OPEN) {
          try { back.ws.close(4001, "woanders geöffnet"); } catch { /* egal */ }
        }
        attach(ws, r, back);
        pushState(r);
        return;
      }
    }
    if (r.players.size >= MAX_PLAYERS) {
      return raw(ws, { t: "error", msg: `Der Raum ist voll (${MAX_PLAYERS} Spieler)` });
    }
    if (r.phase !== "lobby") return raw(ws, { t: "error", msg: "Die Runde läuft schon" });
    const p = makePlayer(msg.name, false);
    r.players.set(p.id, p);
    attach(ws, r, p);
    pushState(r);
    return;
  }

  if (!room || !player) return;
  room.lastActivity = Date.now();

  switch (msg.t) {
    case "name":
      player.name = cleanName(msg.name);
      pushState(room);
      pushRunde(room);
      break;

    case "ready":
      player.ready = !!msg.value;
      pushState(room);
      break;

    case "settings":
      if (player.id !== room.hostId || room.phase !== "lobby") break;
      if (typeof msg.joker === "boolean") room.settings.joker = msg.joker;
      if (typeof msg.isPublic === "boolean") room.isPublic = msg.isPublic;
      pushState(room);
      pushRoomList();
      break;

    case "start": {
      if (player.id !== room.hostId || room.phase !== "lobby") break;
      const da = anwesende(room);
      if (da.length < MIN_PLAYERS) break;
      if (!da.every((p) => p.ready || p.id === room.hostId)) break;
      startGame(room);
      break;
    }

    case "bieten": {
      if (room.phase !== "playing" || room.schritt !== "bieten") break;
      if (room.amZug !== player.id) break;
      const anzahl = Number(msg.anzahl);
      const augen = Number(msg.augen);
      if (!Number.isInteger(anzahl) || anzahl < 1 || anzahl > gesamtWuerfel(room)) break;
      // Auf Einser wird nicht geboten – sie sind Joker.
      if (!Number.isInteger(augen) || augen < 2 || augen > 6) break;
      const g = room.gebot;
      // Höher heißt: mehr Würfel, oder gleich viele mit höherer Augenzahl.
      if (g && !(anzahl > g.anzahl || (anzahl === g.anzahl && augen > g.augen))) break;
      room.gebot = { von: player.id, anzahl, augen };
      room.amZug = naechster(room, player.id);
      pushRunde(room);
      break;
    }

    case "zweifeln": {
      if (room.phase !== "playing" || room.schritt !== "bieten") break;
      if (!room.gebot || room.gebot.von === player.id) break;
      if (room.amZug !== player.id) break;
      aufdecken(room, player.id);
      break;
    }

    case "ende":
      if (player.id !== room.hostId || room.phase !== "playing") break;
      finishGame(room);
      break;

    case "again":
      if (player.id !== room.hostId || room.phase !== "final") break;
      backToLobby(room);
      break;

    case "leave":
      dropPlayer(ws, { immediate: true });
      break;
  }
}

starte({ port: PORT, host: HOST, publicDir: PUBLIC, titel: "BECHERBLUFF", handle, dropPlayer });
