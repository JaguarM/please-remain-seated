// German: everything that is furniture rather than fiction. The HUD, the cards, the tooltips,
// the words painted on the cabin floor.
//
// Two rules held throughout this catalogue. The game addresses the player as "du", because
// "Sie" would make an aeroplane on fire sound like a tax form. And a label in a box is written
// to the width of the box and not to the width of the German language: where English had two
// words under a forty-eight pixel icon, German has two words, even when a longer and more
// correct one exists. "Mehrzweckwerkzeug" is the right word for a multi-tool and it does not
// fit, so it is "Werkzeug".
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    PRS.i18n.add("de", {

        // ----------------------------------------------------------------- game/engine/core ---
        // Sekunden and Minuten, abbreviated the way a German clock does it.
        "s␟suffix on a number of seconds": "s",
        "m␟suffix on a number of minutes": "m",
        "and": "und",

        // Words counted by PRS.util.plural. Singular on the left of the pair, plural on the
        // right; the number is put in front of whichever the count asks for.
        "flight": "Flug",
        "flights": "Flüge",
        "soul": "Seele",
        "souls": "Seelen",
        "person": "Person",
        "people": "Personen",
        "life": "Leben",
        "lives": "Leben",
        "second": "Sekunde",
        "seconds": "Sekunden",
        "person is": "Person arbeitet",
        "people are": "Personen arbeiten",

        // --------------------------------------------------------------- game/engine/render ---
        // Painted into one tile. There is no room for a longer word and no second line.
        "GALLEY␟written down the side of a galley, one short word": "BORDKÜCHE",
        "LAV␟written across a lavatory door, three letters at most": "WC",
        "CLEAR␟the air by a door, painted on the floor": "FREI",
        "SMOKE␟the air by a door, painted on the floor": "RAUCH",
        "GONE␟the air by a door, painted on the floor": "TOT",

        // ------------------------------------------------------------------------ game/main ---
        "The aeroplane did not load": "Das Flugzeug wurde nicht geladen",
        "If you have just regenerated the art, run `python pixel-workshop/make_cabin_textures.py` and reload.":
            "Wenn du gerade die Grafik neu erzeugt hast: `python pixel-workshop/" +
            "make_cabin_textures.py` ausführen und neu laden.",

        // ------------------------------------------------------------------ game/ui/play.js ---
        // Under a forty-eight pixel icon. One word each, and the word has to be the one somebody
        // would say out loud while reaching for the thing.
        "water": "Wasser",
        "towel": "Handtuch",
        "blanket": "Decke",
        "gloves": "Handschuhe",
        "hood": "Rauchhaube",
        "goggles": "Brille",
        "multi-tool": "Werkzeug",
        "tape": "Klebeband",
        "bin liners": "Müllsäcke",
        "first aid": "Erste Hilfe",
        "inhaler": "Inhalator",
        "strap": "Gurt",
        "hi-vis": "Warnweste",
        "phone": "Handy",
        "halon": "Halon",
        "extinguisher": "Löscher",

        "TO TOUCHDOWN": "BIS ZUM AUFSETZEN",
        "The clock only moves when you do. Every action costs seconds. You cannot put this fire out.":
            "Die Uhr läuft nur, wenn du dich bewegst. Jede Handlung kostet Sekunden. Dieses " +
            "Feuer kannst du nicht löschen.",
        "+{n} MOVED": "+{n} BEWEGT",
        "HELPING": "HILFT",
        "BELIEVED": "GEGLAUBT",
        "Backspace · {what}": "Rücktaste · {what}",
        "OUT OF THEIR SEATS": "AUS DEN SITZEN",
        "CREDIBILITY": "GLAUBWÜRDIGKEIT",
        "they listen": "sie hören zu",
        "most of them": "die meisten",
        "some of them": "einige",
        "nobody": "niemand",
        "CABIN PANIC": "PANIK IN DER KABINE",
        "CREW": "CREW",
        "What you can do here, and to yourself": "Was du hier tun kannst, und mit dir selbst",
        "YOUR LUNGS": "DEINE LUNGE",
        "failing": "versagt",
        "bad": "schlecht",
        "coughing": "Husten",
        "fine": "in Ordnung",
        "BURNS": "VERBRENNUNGEN",
        "severe": "schwer",
        "sore": "wund",
        "none": "keine",
        "CARRYING": "TRÄGT",
        "DRAGGING": "ZIEHT",
        "What you can do with {who}": "Was du mit {who} tun kannst",
        "YOUR BAG": "DEIN GEPÄCK",
        "used from your card": "wird über deine Karte benutzt",
        "Nothing on you. Everything else is in the aeroplane, and in other people's laps.":
            "Nichts dabei. Alles andere ist im Flugzeug, und auf fremden Schößen.",
        "empty": "leer",
        "wet": "nass",
        "on": "an",
        "{n} left": "noch {n}",
        "{name} — {status}": "{name} — {status}",
        " · click for what it can do": " · klicken für das, was damit geht",
        "fire: {what}": "Feuer: {what}",
        "smoke: {what}": "Rauch: {what}",
        "You are at {where}": "Du stehst {where}",
        "It has landed.": "Es ist gelandet.",
        "Click a person, the fire, or yourself. Anywhere else is a walk.":
            "Klick eine Person, das Feuer oder dich selbst an. Alles andere ist ein Weg.",
        "You, at {where}": "Du, {where}",
        "The fire · {where}": "Das Feuer · {where}",
        "Click for what you can do with {who}": "Klicken für das, was mit {who} geht",
        "Click the fire for what you can do about it":
            "Klick das Feuer an, um zu sehen, was dagegen geht",
        "Click yourself for what you can do here": "Klick dich selbst an für das, was hier geht",
        "You walked from here. Click to take that back · +{secs}":
            "Von hier bist du losgegangen. Klicken macht das rückgängig · +{secs}",
        "Click to walk here · {secs}": "Klicken, um hierher zu gehen · {secs}",
        "You cannot stand there. A click walks you to the nearest tile you can.":
            "Da kannst du nicht stehen. Ein Klick bringt dich zum nächsten Feld, auf dem es geht.",
        "▸ {n} more…": "▸ {n} weitere…",
        "…and {n} more once you are there.": "…und {n} weitere, sobald du dort bist.",
        "Out of reach.": "Außer Reichweite.",
        "Close (Esc)": "Schließen (Esc)",
        "over␟an action that costs more time than is left": "zu spät",

        // -------------------------------------------------------------- game/ui/settings.js ---
        "Settings": "Einstellungen",
        "Settings (Esc)": "Einstellungen (Esc)",
        "SETTINGS": "EINSTELLUNGEN",
        "Sound": "Ton",
        "muted": "stumm",
        "Mute": "Stumm",
        "Unmute": "Ton an",
        "Language": "Sprache",
        "Help": "Hilfe",
        "Show how to play": "Spielanleitung zeigen",
        "This flight": "Dieser Flug",
        "Quit the flight": "Flug abbrechen",
        "Leave the aeroplane?": "Das Flugzeug verlassen?",
        "Leave the flight": "Flug verlassen",
        "Cancel": "Abbrechen",
        "Close": "Schließen",
        "Escape closes this. M mutes.": "Escape schließt das. M schaltet stumm.",

        // -------------------------------------------------------------- game/ui/hotspots.js ---
        "the fire": "das Feuer",
        "you": "du",
        "There is nothing more to be done for {who}.":
            "Für {who} ist nichts mehr zu tun.",
        "Walk over to {who}": "Zu {who} hinübergehen",
        "Nothing you can do for {who} from here.":
            "Von hier aus kannst du nichts für {who} tun.",
        "has seen the locker": "hat das Fach gesehen",
        "You cannot get to {who} from here.": "Von hier aus kommst du nicht zu {who}.",
        "Walk to the fire": "Zum Feuer gehen",
        "You cannot get near it from here.": "Von hier aus kommst du nicht heran.",
        "In your arms": "Auf deinen Armen",
        "Here": "Hier",
        "More": "Mehr",
        "Nothing here but you.": "Hier bist nur du.",
        "Walk there": "Dorthin gehen",
        "Walk there, then": "Hingehen, und dann",
        "Out of reach": "Außer Reichweite",
        "Walk to the aft lavatory": "Zum hinteren WC gehen",
        "There is a tap in there.": "Da drin ist ein Wasserhahn.",
        "working with you": "arbeitet mit dir",
        "in your arms": "auf deinen Armen",
        "{n} tiles away": "{n} Felder entfernt",
        "The case is in the lavatory basin, under water.":
            "Der Koffer liegt im WC-Becken, unter Wasser.",
        "The seat of it is the locker above {seat}.": "Der Herd ist das Gepäckfach über {seat}.",
        " You have seen inside it.": " Du hast hineingesehen.",
        " Nobody has looked inside it.": " Niemand hat hineingesehen.",
        "{fire} · {where} · smoke {smoke}": "{fire} · {where} · Rauch {smoke}",
        "lungs failing": "Lunge versagt",
        "lungs bad": "Lunge schlecht",
        "breathing fine": "atmet normal",
        "fire {what}": "Feuer {what}",
        "smoke {what}": "Rauch {what}",
        "burned": "verbrannt",
        "carrying {n}": "trägt {n}",
        "dragging somebody": "zieht jemanden",
        "{name} — you": "{name} — du",
        "wearing {what}": "trägt {what}",
        "{seat} · {kg}kg · {state} · {condition}": "{seat} · {kg} kg · {state} · {condition}",
    });

    // The long ones, as pairs: a key is a whole English sentence and an object key cannot be
    // two literals joined with a +.
    PRS.i18n.add("de", [
        ["Transnational 447, thirty-one thousand feet, beginning the descent. Sixty-one souls. " +
         "There is something burning in the locker above {seat} and you are the only person on " +
         "this aeroplane who has noticed.",
         "Transnational 447, einunddreißigtausend Fuß, Beginn des Sinkflugs. Einundsechzig " +
         "Seelen. Im Gepäckfach über {seat} brennt etwas, und du bist der einzige Mensch in " +
         "diesem Flugzeug, dem es aufgefallen ist."],

        ["A flight is not saved. Where everyone is, what is in your arms, the seconds you have " +
         "left - all of it goes, and an unfinished flight is written nowhere in the log book.",
         "Ein Flug wird nicht gespeichert. Wo alle sitzen, was du auf den Armen hast, die " +
         "Sekunden, die dir bleiben — alles davon ist weg, und ein abgebrochener Flug steht " +
         "nirgends im Flugbuch."],

        ["Click a person, the fire, or yourself to see what you can do. Click anywhere else to " +
         "walk there, and back onto your own trail to take a walk back.",
         "Klick eine Person an, das Feuer oder dich selbst, um zu sehen, was geht. Klick " +
         "irgendwo anders hin, um dorthin zu gehen — und zurück auf deine eigene Spur, um einen " +
         "Weg rückgängig zu machen."],
    ]);
})(window);
