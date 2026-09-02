// Türkisch und Englisch für Becherbluff.
//
// Deutsch steht im HTML und in den Aufrufen von `t()` bzw. als `text` in den
// Servermeldungen. Warteraum und Endstand kommen aus `schale-texte.js`.

import { SCHALE_WOERTER } from "./schale-texte.js";

const EIGEN = {
  tr: {
    "becher.tag": "Beş zar, bir kupa, ve bütün masa üstüne teklif verir.",
    "becher.runde": "Tur",
    "becher.imSpiel": "Oyunda {n} zar",
    "becher.raus": "çıktı",
    "becher.angesagtVon": "{name} söyledi",
    "becher.keinGebot": "Henüz teklif yok – ilk oyuncu söyler.",
    "becher.aufdeckung": "{gebot} söylendi, ortada {da} tane var.",
    "becher.verliert": "{name} bir zar kaybeder.",
    "becher.deinBecher": "Senin kupan",
    "becher.leer": "boş",
    "becher.anzahl": "Adet",
    "becher.augen": "Sayı",
    "becher.ansagen": "Söyle",
    "becher.zweifeln": "İnanmıyorum!",
    "becher.duDran": "Sıra sende: ya daha yükseğini söyle ya da şüphelen.",
    "becher.aufgedeckt": "Açıldı – birazdan yeniden atılır.",
    "becher.istDran": "Sıra {name} kişisinde.",
    "becher.jemand": "Biri",
    "becher.joker": "Birler joker",
    "becher.ja": "evet",
    "becher.nein": "hayır",

    // Was der Server schickt
    "becher.gewonnen": "kazandı",
    "becher.platz": "{n}. sıra",
    "becher.letzter": "Zarı en son kalan: {name}.",
    "becher.abgebrochen": "Yarıda kesildi",

    // Die Hilfe
    "becher.h1": "<b>Herkes kupasının altında beş zar atar.</b> Kendi zarlarını yalnızca sen görürsün.",
    "becher.h2": "<b>Teklif masadaki bütün zarlar üzerinedir</b>: „dört tane beş“ demek, kimde olursa olsun en az dört tane beş var demektir.",
    "becher.h3": "<b>Daha yüksek teklif</b> şu demektir: ya daha çok zar, ya da aynı sayıda ama daha yüksek sayı.",
    "becher.h4": "<b>Birler jokerdir</b> ve her sayı için sayılır. Birlerin kendisine teklif verilmez.",
    "becher.h5": "<b>İnanmayan şüphelenir.</b> Sonra herkes açar: söylenen kadar varsa şüphelenen, yoksa teklif veren bir zar kaybeder.",
    "becher.h6": "<b>Zarı kalmayan çıkar.</b> Zarı kalan son kişi kazanır.",
  },

  en: {
    "becher.tag": "Five dice, one cup, and the bidding covers the whole table.",
    "becher.runde": "Round",
    "becher.imSpiel": "{n} dice in play",
    "becher.raus": "out",
    "becher.angesagtVon": "bid by {name}",
    "becher.keinGebot": "No bid yet – the first player opens.",
    "becher.aufdeckung": "{gebot} was bid, {da} are on the table.",
    "becher.verliert": "{name} loses a die.",
    "becher.deinBecher": "Your cup",
    "becher.leer": "empty",
    "becher.anzahl": "Count",
    "becher.augen": "Face",
    "becher.ansagen": "Bid",
    "becher.zweifeln": "Call!",
    "becher.duDran": "Your turn: bid higher or call.",
    "becher.aufgedeckt": "Revealed – new dice in a moment.",
    "becher.istDran": "It is {name}'s turn.",
    "becher.jemand": "Someone",
    "becher.joker": "Ones are wild",
    "becher.ja": "yes",
    "becher.nein": "no",

    // Was der Server schickt
    "becher.gewonnen": "won",
    "becher.platz": "place {n}",
    "becher.letzter": "{name} is the last one with dice.",
    "becher.abgebrochen": "Abandoned",

    // Die Hilfe
    "becher.h1": "<b>Everyone rolls five dice</b> under their cup. Only you see yours.",
    "becher.h2": "<b>Bids cover every die on the table</b>: “four fives” means there are at least four fives, no matter whose.",
    "becher.h3": "<b>Bidding higher</b> means: more dice, or the same number with a higher face.",
    "becher.h4": "<b>Ones are wild</b> and count for every face. Nobody bids on ones themselves.",
    "becher.h5": "<b>Whoever does not believe it calls.</b> Then everyone lifts their cup: if the bid is there, the caller loses a die, otherwise the bidder does.",
    "becher.h6": "<b>Whoever has no dice left is out.</b> The last one with dice wins.",
  },
};

export const WOERTER = {
  tr: { ...SCHALE_WOERTER.tr, ...EIGEN.tr },
  en: { ...SCHALE_WOERTER.en, ...EIGEN.en },
};
