// German: the day's aeroplane, the flight as a line of text, and somebody else's cabin.
//
// Three words carry this whole part of the game and they are decided here. "Tagesflug" for the
// daily, because it is the flight of the day and not a daily anything. "Startwert" for the seed,
// which is what the rest of the catalogue already says. And "Code" for the flight written out,
// left alone, because it is a thing you paste into a chat window and every German speaker who
// will ever paste one calls it that.
//
// The four lines that get shared are the one place in the game where the English title stays
// English: it is the name of the game, printed at the top of something a stranger is going to
// read, and a translated title is a different game they cannot go and find.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    PRS.i18n.add("de", [
        // ------------------------------------------------------------------ the day's flight ---
        ["TODAY'S FLIGHT", "FLUG DES TAGES"],
        ["Today's flight", "Flug des Tages"],
        ["Fly today's flight", "Flug des Tages fliegen"],
        ["Fly today's flight again", "Flug des Tages noch einmal fliegen"],
        ["Daily {day}", "Tagesflug {day}"],
        [" · daily {day}", " · Tagesflug {day}"],
        ["not yet flown", "noch nicht geflogen"],
        ["{n} of 60", "{n} von 60"],
        ["{n} days in a row", "{n} Tage in Folge"],
        ["The same aeroplane for everybody, once a day.",
         "Für alle dieselbe Maschine, einmal am Tag."],
        ["Share it", "Weitergeben"],

        // On the seed screen, next to "beliebig" and "Dieser Startwert".
        ["The date, hashed into a seed. Everybody who boards it today gets the same sixty " +
         "people in the same moods and the same fire, which is the only condition under which " +
         "comparing two afternoons means anything. The first one you land is the one the day " +
         "keeps.",
         "Das Datum, zu einem Startwert gehasht. Wer heute einsteigt, bekommt dieselben " +
         "sechzig Menschen in derselben Laune und dasselbe Feuer - und nur dann heißt es " +
         "etwas, zwei Nachmittage zu vergleichen. Es zählt der erste, den du landest."],

        // The screen after the report.
        ["the first of a run", "der Anfang einer Serie"],
        ["flight {n} on this aeroplane · the day still stands at {was} of 60",
         "Flug {n} in dieser Maschine · für den Tag zählen weiter {was} von 60"],
        ["This is the day's flight: {n} of 60, grade {grade}.",
         "Das ist der Flug des Tages: {n} von 60, Note {grade}."],
        ["Today's line was written by your first landing and stays where it is.",
         "Die Zeile für heute stammt von deiner ersten Landung und bleibt so stehen."],
        ["Copy the day's flight", "Flug des Tages kopieren"],

        // The days, above the flights in the log book.
        ["The days", "Die Tage"],
        ["{n} days in a row. The first flight you land on a day is the one that stands.",
         "{n} Tage in Folge. Es zählt der erste Flug, den du an einem Tag landest."],
        ["The first flight you land on a day is the one that stands.",
         "Es zählt der erste Flug, den du an einem Tag landest."],
        ["{n} flights", "{n} Flüge"],

        // ------------------------------------------------------------------ telling somebody ---
        ["Tell somebody", "Erzähl es jemandem"],
        ["Writing it out…", "Wird geschrieben …"],
        ["Copy it", "Kopieren"],
        ["The last line is the whole flight: the seed, who you were, and every click in order, " +
         "small enough to paste into a message. Anybody who puts it back into “A flight " +
         "somebody sent you” is on your aeroplane with your cabin running under theirs.",
         "Die letzte Zeile ist der ganze Flug: der Startwert, wer du warst und jeder Klick der " +
         "Reihe nach, klein genug für eine Nachricht. Wer ihn unter „Ein Flug, den dir jemand " +
         "geschickt hat“ wieder einsetzt, fliegt deine Maschine, mit deiner Kabine unter " +
         "seiner."],

        // The four lines themselves. The title is the name of the game and stays as it is.
        ["PLEASE REMAIN SEATED · TN 447 · daily {day}",
         "PLEASE REMAIN SEATED · TN 447 · Tagesflug {day}"],
        ["PLEASE REMAIN SEATED · TN 447 · seed {seed}",
         "PLEASE REMAIN SEATED · TN 447 · Startwert {seed}"],
        ["{n} of 60 off alive · {grade} · {who}",
         "{n} von 60 lebend heraus · {grade} · {who}"],
        ["{n} of 60 off alive · {saved} who would not have been · {grade} · {who}",
         "{n} von 60 lebend heraus · {saved} davon nur wegen dir · {grade} · {who}"],
        ["(this flight will not encode)", "(dieser Flug lässt sich nicht kodieren)"],

        // ----------------------------------------------------------- a flight somebody sent ---
        ["A flight somebody sent you", "Ein Flug, den dir jemand geschickt hat"],
        ["Paste the whole message or just the code. It sets the aeroplane to theirs and puts " +
         "their cabin under yours, on the same clock, for the whole fifteen minutes.",
         "Füge die ganze Nachricht ein oder nur den Code. Das setzt die Maschine auf ihre und " +
         "stellt ihre Kabine unter deine, auf derselben Uhr, die vollen fünfzehn Minuten."],
        ["Take this flight", "Diesen Flug übernehmen"],
        ["Fly it alone", "Allein fliegen"],
        ["Nobody in the cabin beside you.", "Niemand in der Kabine neben dir."],
        ["Flying beside you: {who}, who got {n} of 60 off this aeroplane.",
         "Neben dir fliegt {who} - {n} von 60 aus dieser Maschine heraus."],
        ["The seed is set to theirs all the same.",
         "Der Startwert ist trotzdem auf ihren gesetzt."],

        // Why a code was refused. Every one of these is read by somebody who has just been sent
        // something, so none of them is only "nein".
        ["That is not a flight code. One starts with TN447- and has no spaces in it.",
         "Das ist kein Flugcode. Einer beginnt mit TN447- und hat keine Leerzeichen."],
        ["That code has something in it that is not part of one.",
         "In diesem Code steht etwas, das nicht dazugehört."],
        ["That code is too short to be a flight.",
         "Dieser Code ist zu kurz für einen Flug."],
        ["That code did not survive the journey - a piece of it is missing or has been changed.",
         "Dieser Code hat den Weg nicht überstanden - ein Stück fehlt oder wurde verändert."],
        ["That code stops in the middle of a flight.",
         "Dieser Code bricht mitten im Flug ab."],
        ["That code was written by a different version of the game and does not mean the same " +
         "thing here.",
         "Dieser Code stammt aus einer anderen Version des Spiels und bedeutet hier nicht " +
         "dasselbe."],
        ["That flight was flown on a different version of the aeroplane. The seed is still " +
         "good - the same fifteen minutes are one number away - but the flight itself cannot " +
         "be replayed here.",
         "Dieser Flug wurde in einer anderen Version der Maschine geflogen. Der Startwert gilt " +
         "weiter - dieselben fünfzehn Minuten sind eine Zahl entfernt -, aber der Flug selbst " +
         "lässt sich hier nicht abspielen."],
        ["That flight was flown on a different version of the aeroplane and cannot be written " +
         "out here.",
         "Dieser Flug wurde in einer anderen Version der Maschine geflogen und lässt sich hier " +
         "nicht ausschreiben."],

        // Where a replay stopped, which the game says out loud rather than pretending.
        ["there was nothing left to do", "es gab nichts mehr zu tun"],
        ["the code ran out", "der Code war zu Ende"],
        ["action {n} is not on this aeroplane",
         "Handlung {n} gibt es in dieser Maschine nicht"],
        ["action {n} did not work here", "Handlung {n} hat hier nicht funktioniert"],

        // ------------------------------------------------------------ the cabin beside yours ---
        ["The same fifteen minutes, flown by {who}",
         "Dieselben fünfzehn Minuten, geflogen von {who}"],
        ["{down} down · {moved} moved", "{down} am Boden · {moved} bewegt"],
        ["you are {n} ahead", "du liegst {n} vorn"],
        ["you are {n} behind", "du liegst {n} zurück"],
        ["level with you", "gleichauf mit dir"],
        ["they finished with {n} of 60", "am Ende {n} von 60"],
    ]);
})(window);
