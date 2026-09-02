// BECHERBLUFF – Client. Der eigene Becher kommt vom Server, die fremden erst
// beim Aufdecken.
import { $, el, S, satz, schicke, starteSchale, zeige } from "./schale.js";
import { starteSprache, t, uebersetze } from "./sprache.js";
import { WOERTER } from "./texte.js";

starteSprache(WOERTER);

const HILFE = [
  ["becher.h1", "<b>Jeder würfelt fünf Würfel</b> unter seinem Becher. Nur du siehst deine."],
  ["becher.h2", "<b>Geboten wird auf alle Würfel am Tisch</b>: „vier Fünfen“ heißt, es liegen mindestens vier Fünfen, egal bei wem."],
  ["becher.h3", "<b>Höher bieten</b> heißt: mehr Würfel, oder gleich viele mit höherer Augenzahl."],
  ["becher.h4", "<b>Einser sind Joker</b> und zählen für jede Augenzahl mit. Auf Einser selbst wird nicht geboten."],
  ["becher.h5", "<b>Wer nicht glaubt, zweifelt.</b> Dann decken alle auf: liegt die angesagte Menge da, verliert der Zweifler einen Würfel, sonst der Bieter."],
  ["becher.h6", "<b>Wer keine Würfel mehr hat, ist raus.</b> Der Letzte mit Würfeln gewinnt."],
];

const zeichneHilfe = () => {
  $("helpList").innerHTML = HILFE.map(([k, d]) => `<li>${t(k, {}, d)}</li>`).join("");
};

const AUGEN = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
let wahlAnzahl = 1, wahlAugen = 2;

function zeichneSpiel(m) {
  zeige("game");
  $("tbLinks").innerHTML = `${t("becher.runde", {}, "Runde")} <strong>${m.n}</strong>`;
  $("tbTag").textContent = t("becher.imSpiel", { n: m.gesamt }, `${m.gesamt} Würfel im Spiel`);

  const b = $("buehne");
  b.innerHTML = "";

  const tisch = el("div", "tisch");
  for (const p of m.spieler) {
    const d = el("div", "bp" + (p.id === m.amZug ? " zug" : "") + (p.weg ? " off" : ""));
    d.append(el("span", "bp-nm", p.name));
    d.append(el("span", "bp-kt", "🎲".repeat(p.anzahl) || t("becher.raus", {}, "raus")));
    tisch.append(d);
  }
  b.append(tisch);

  const gebot = el("div", "gebotbox");
  if (m.gebot) {
    gebot.append(el("p", "gb-gross", `${m.gebot.anzahl} × ${AUGEN[m.gebot.augen]}`));
    gebot.append(el("p", "gb-klein",
      t("becher.angesagtVon", { name: m.gebot.von }, "angesagt von " + m.gebot.von)));
  } else {
    gebot.append(el("p", "gb-klein",
      t("becher.keinGebot", {}, "Noch kein Gebot – der Erste sagt an.")));
  }
  b.append(gebot);

  if (m.aufdeckung) {
    const a = m.aufdeckung;
    const box = el("div", "aufdeck");
    box.append(el("p", "auf-kopf", t(
      "becher.aufdeckung",
      { gebot: `${a.gebot.anzahl} × ${AUGEN[a.gebot.augen]}`, da: a.tatsaechlich },
      `${a.gebot.anzahl} × ${AUGEN[a.gebot.augen]} angesagt, ${a.tatsaechlich} liegen da.`,
    )));
    for (const bch of a.becher) {
      const z = el("div", "bzeile");
      z.append(el("span", "bz-nm", bch.name));
      z.append(el("span", "bz-w", bch.wuerfel.map((w) => AUGEN[w]).join(" ")));
      box.append(z);
    }
    box.append(el("p", "auf-txt",
      t("becher.verliert", { name: a.verlierer }, `${a.verlierer} verliert einen Würfel.`)));
    b.append(box);
  }

  const mein = el("div", "meinbecher");
  mein.append(el("span", "mb-label", t("becher.deinBecher", {}, "Dein Becher")));
  mein.append(el("span", "mb-w",
    m.becher.map((w) => AUGEN[w]).join(" ") || t("becher.leer", {}, "leer")));
  b.append(mein);

  const akt = $("aktionen");
  akt.innerHTML = "";
  const binDran = m.amZug === S.me && m.schritt === "bieten";
  if (binDran) {
    const min = m.gebot ? m.gebot.anzahl : 1;
    if (wahlAnzahl < min) wahlAnzahl = min;
    const box = el("div", "bieter");

    const zeileA = el("div", "bz");
    zeileA.append(el("span", "bz-l", t("becher.anzahl", {}, "Anzahl")));
    const minus = el("button", "btn sm", "−");
    minus.onclick = () => { wahlAnzahl = Math.max(min, wahlAnzahl - 1); zeichneSpiel(m); };
    const plus = el("button", "btn sm", "+");
    plus.onclick = () => { wahlAnzahl = Math.min(m.gesamt, wahlAnzahl + 1); zeichneSpiel(m); };
    zeileA.append(minus, el("span", "bz-v", String(wahlAnzahl)), plus);
    box.append(zeileA);

    const zeileB = el("div", "bz");
    zeileB.append(el("span", "bz-l", t("becher.augen", {}, "Augen")));
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
    const bieten = el("button", "btn primary big", t("becher.ansagen", {}, "Ansagen"));
    bieten.disabled = !hoeher;
    bieten.onclick = () => schicke({ t: "bieten", anzahl: wahlAnzahl, augen: wahlAugen });
    akt.append(bieten);

    if (m.gebot) {
      const z = el("button", "btn big zweifel", t("becher.zweifeln", {}, "Zweifeln!"));
      z.onclick = () => schicke({ t: "zweifeln" });
      akt.append(z);
    }
    $("rundenHint").textContent =
      t("becher.duDran", {}, "Du bist dran: höher ansagen oder zweifeln.");
  } else {
    const wer = m.spieler.find((p) => p.id === m.amZug)?.name ??
      t("becher.jemand", {}, "Jemand");
    $("rundenHint").textContent = m.schritt === "aufdecken"
      ? t("becher.aufgedeckt", {}, "Aufgedeckt – gleich wird neu gewürfelt.")
      : t("becher.istDran", { name: wer }, `${wer} ist dran.`);
  }
}

zeichneHilfe();

const extra = $("hostExtra");
extra.innerHTML = `<div class="setting"><span class="setting-label" data-t="becher.joker">Einser als Joker</span>
  <div class="segmented">
    <button class="seg" data-j="1" data-t="becher.ja">ja</button><button class="seg" data-j="0" data-t="becher.nein">nein</button>
  </div></div>`;
uebersetze(extra);
document.addEventListener("sprachwechsel", zeichneHilfe);

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
