// BECHERBLUFF – Client. Der eigene Becher kommt vom Server, die fremden erst
// beim Aufdecken.
import { $, el, S, schicke, starteSchale, zeige } from "./schale.js";

const HILFE = [
  "<b>Jeder würfelt fünf Würfel</b> unter seinem Becher. Nur du siehst deine.",
  "<b>Geboten wird auf alle Würfel am Tisch</b>: „vier Fünfen“ heißt, es liegen mindestens vier Fünfen, egal bei wem.",
  "<b>Höher bieten</b> heißt: mehr Würfel, oder gleich viele mit höherer Augenzahl.",
  "<b>Einser sind Joker</b> und zählen für jede Augenzahl mit. Auf Einser selbst wird nicht geboten.",
  "<b>Wer nicht glaubt, zweifelt.</b> Dann decken alle auf: liegt die angesagte Menge da, verliert der Zweifler einen Würfel, sonst der Bieter.",
  "<b>Wer keine Würfel mehr hat, ist raus.</b> Der Letzte mit Würfeln gewinnt.",
];

const AUGEN = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
let wahlAnzahl = 1, wahlAugen = 2;

function zeichneSpiel(m) {
  zeige("game");
  $("tbLinks").innerHTML = `Runde <strong>${m.n}</strong>`;
  $("tbTag").textContent = `${m.gesamt} Würfel im Spiel`;

  const b = $("buehne");
  b.innerHTML = "";

  const tisch = el("div", "tisch");
  for (const p of m.spieler) {
    const d = el("div", "bp" + (p.id === m.amZug ? " zug" : "") + (p.weg ? " off" : ""));
    d.append(el("span", "bp-nm", p.name));
    d.append(el("span", "bp-kt", "🎲".repeat(p.anzahl) || "raus"));
    tisch.append(d);
  }
  b.append(tisch);

  const gebot = el("div", "gebotbox");
  if (m.gebot) {
    gebot.append(el("p", "gb-gross", `${m.gebot.anzahl} × ${AUGEN[m.gebot.augen]}`));
    gebot.append(el("p", "gb-klein", "angesagt von " + m.gebot.von));
  } else {
    gebot.append(el("p", "gb-klein", "Noch kein Gebot – der Erste sagt an."));
  }
  b.append(gebot);

  if (m.aufdeckung) {
    const a = m.aufdeckung;
    const box = el("div", "aufdeck");
    box.append(el("p", "auf-kopf",
      `${a.gebot.anzahl} × ${AUGEN[a.gebot.augen]} angesagt, ${a.tatsaechlich} liegen da.`));
    for (const bch of a.becher) {
      const z = el("div", "bzeile");
      z.append(el("span", "bz-nm", bch.name));
      z.append(el("span", "bz-w", bch.wuerfel.map((w) => AUGEN[w]).join(" ")));
      box.append(z);
    }
    box.append(el("p", "auf-txt", `${a.verlierer} verliert einen Würfel.`));
    b.append(box);
  }

  const mein = el("div", "meinbecher");
  mein.append(el("span", "mb-label", "Dein Becher"));
  mein.append(el("span", "mb-w", m.becher.map((w) => AUGEN[w]).join(" ") || "leer"));
  b.append(mein);

  const akt = $("aktionen");
  akt.innerHTML = "";
  const binDran = m.amZug === S.me && m.schritt === "bieten";
  if (binDran) {
    const min = m.gebot ? m.gebot.anzahl : 1;
    if (wahlAnzahl < min) wahlAnzahl = min;
    const box = el("div", "bieter");

    const zeileA = el("div", "bz");
    zeileA.append(el("span", "bz-l", "Anzahl"));
    const minus = el("button", "btn sm", "−");
    minus.onclick = () => { wahlAnzahl = Math.max(min, wahlAnzahl - 1); zeichneSpiel(m); };
    const plus = el("button", "btn sm", "+");
    plus.onclick = () => { wahlAnzahl = Math.min(m.gesamt, wahlAnzahl + 1); zeichneSpiel(m); };
    zeileA.append(minus, el("span", "bz-v", String(wahlAnzahl)), plus);
    box.append(zeileA);

    const zeileB = el("div", "bz");
    zeileB.append(el("span", "bz-l", "Augen"));
    for (let a = 2; a <= 6; a++) {
      const btn = el("button", "btn sm augen" + (wahlAugen === a ? " on" : ""), AUGEN[a]);
      btn.onclick = () => { wahlAugen = a; zeichneSpiel(m); };
      zeileB.append(btn);
    }
    box.append(zeileB);
    $("buehne").append(box);

    const hoeher = !m.gebot ||
      wahlAnzahl > m.gebot.anzahl ||
      (wahlAnzahl === m.gebot.anzahl && wahlAugen > m.gebot.augen);
    const bieten = el("button", "btn primary big", "Ansagen");
    bieten.disabled = !hoeher;
    bieten.onclick = () => schicke({ t: "bieten", anzahl: wahlAnzahl, augen: wahlAugen });
    akt.append(bieten);

    if (m.gebot) {
      const z = el("button", "btn big zweifel", "Zweifeln!");
      z.onclick = () => schicke({ t: "zweifeln" });
      akt.append(z);
    }
    $("rundenHint").textContent = "Du bist dran: höher ansagen oder zweifeln.";
  } else {
    $("rundenHint").textContent = m.schritt === "aufdecken"
      ? "Aufgedeckt – gleich wird neu gewürfelt."
      : `${m.spieler.find((p) => p.id === m.amZug)?.name ?? "Jemand"} ist dran.`;
  }
}

$("helpList").innerHTML = HILFE.map((h) => `<li>${h}</li>`).join("");

const extra = $("hostExtra");
extra.innerHTML = `<div class="setting"><span class="setting-label">Einser als Joker</span>
  <div class="segmented">
    <button class="seg" data-j="1">ja</button><button class="seg" data-j="0">nein</button>
  </div></div>`;
for (const b of extra.querySelectorAll("[data-j]")) {
  b.onclick = () => schicke({ t: "settings", joker: b.dataset.j === "1" });
}

starteSchale({
  key: "becher",
  zeichneSpiel,
  zeichneRaum: (r) => {
    for (const b of extra.querySelectorAll("[data-j]")) {
      b.classList.toggle("sel", (b.dataset.j === "1") === !!r.settings.joker);
    }
  },
});
