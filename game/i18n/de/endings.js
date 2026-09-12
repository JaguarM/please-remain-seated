// German: the six ways fifteen minutes end.
//
// These are the longest pieces of writing in the game and the only ones the player reads slowly,
// so they are translated as prose and not as strings: the sentence lengths are German sentence
// lengths, the rhythm is rebuilt rather than carried over, and the one-line paragraphs that land
// hardest in English land as one line here too.
//
// German headlines are not shouted the way English ones are, but these are the headings of an
// official report and an official German report does use full capitals on a heading, so they
// stay in capitals.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    PRS.i18n.add("de", [
        // The name of the game, which is the title of one ending too. It is not translated:
        // it is what is written on the sign above the seat, in English, on this aeroplane.
        ["PLEASE REMAIN SEATED", "PLEASE REMAIN SEATED"],

        // --------------------------------------------------------- you did not get off either ---
        ["PASSENGER NOT ACCOUNTED FOR", "PASSAGIER NICHT ERFASST"],
        ["You went down in the aisle at {when} into the descent, somewhere around row {row}, " +
         "with {hands}.",
         "Du bist bei {when} des Sinkflugs im Gang zu Boden gegangen, irgendwo bei Reihe {row}, " +
         "{hands}."],
        ["somebody in your arms", "mit jemandem auf den Armen"],
        ["your hands empty", "mit leeren Händen"],
        ["The report will note that you were the first person on board to identify the source of " +
         "the fire, and that you identified it eleven minutes before the crew did, and that this " +
         "is in the transcript because {why}.",
         "Der Bericht wird festhalten, dass du als erste Person an Bord die Brandquelle erkannt " +
         "hast, dass du sie elf Minuten vor der Crew erkannt hast, und dass das im Protokoll " +
         "steht, weil {why}."],
        ["{n} people are alive to say so", "{n} Menschen am Leben sind, die es sagen können"],
        ["the cabin interphone recorded you saying it",
         "das Bordtelefon aufgezeichnet hat, wie du es gesagt hast"],
        ["It will not note that nobody listened, because the report does not have a field for " +
         "that.",
         "Er wird nicht festhalten, dass niemand zugehört hat, denn dafür hat der Bericht kein " +
         "Feld."],

        // ---------------------------------------------------------------------- the lavatory ---
        ["THE ONE THING THAT WORKED", "DAS EINE, WAS FUNKTIONIERT HAT"],
        ["You got the case into a lavatory sink and you filled the sink.",
         "Du hast den Koffer in ein WC-Becken bekommen, und du hast das Becken volllaufen lassen."],
        ["It did not put the fire out. Nothing puts that fire out; there were {n} cells left in " +
         "the pack when the wheels touched and every one of them was still going to go. But a " +
         "cell venting under nine centimetres of water is a noise and some steam, and a cell " +
         "venting in an overhead locker is a cabin full of hydrogen fluoride.",
         "Es hat das Feuer nicht gelöscht. Nichts löscht dieses Feuer; als die Räder aufsetzten, " +
         "waren noch {n} Zellen im Paket, und jede einzelne davon würde noch hochgehen. Aber " +
         "eine Zelle, die unter neun Zentimetern Wasser abbläst, ist ein Geräusch und etwas " +
         "Dampf, und eine Zelle, die in einem Gepäckfach abbläst, ist eine Kabine voll " +
         "Fluorwasserstoff."],
        ["{n} people got off this aeroplane alive and {walked} of them walked. Some of those are " +
         "breathing because of where somebody put them down, and some of them are breathing " +
         "because of a tap.",
         "{n} Menschen sind lebend aus diesem Flugzeug gekommen, und {walked} davon sind selbst " +
         "gegangen. Einige von ihnen atmen, weil jemand sie an der richtigen Stelle abgelegt " +
         "hat, und einige von ihnen atmen wegen eines Wasserhahns."],
        ["Nobody will ever know that you did this. It is not visible in any photograph of the " +
         "aeroplane.",
         "Niemand wird je erfahren, dass du das getan hast. Auf keinem Foto des Flugzeugs ist " +
         "es zu sehen."],

        // ------------------------------------------------------------------------ the helpers ---
        ["THE ONES WHO WALKED OFF", "DIE, DIE SELBST HERAUSGEGANGEN SIND"],
        ["You recruited {n} people.", "Du hast {n} Menschen gewonnen."],
        ["Between them they moved {them} passengers out of the rows. You moved {you}. You spent " +
         "most of the last four minutes not carrying anybody, because you were pointing, and " +
         "pointing turned out to be the highest-value action available on this aeroplane.",
         "Zusammen haben sie {them} Passagiere aus den Reihen geholt. Du hast {you} geholt. Die " +
         "meiste Zeit der letzten vier Minuten hast du niemanden getragen, weil du gezeigt " +
         "hast, und Zeigen war, wie sich herausstellte, die wertvollste Handlung, die es in " +
         "diesem Flugzeug gab."],
        ["{n} of sixty got off alive. {walked} walked. {lost}",
         "{n} von sechzig sind lebend herausgekommen. {walked} sind selbst gegangen. {lost}"],
        ["{n} did not.", "{n} nicht."],
        ["Everybody who was on this aeroplane got off this aeroplane.",
         "Alle, die in diesem Flugzeug waren, sind aus diesem Flugzeug herausgekommen."],
        ["In eleven of the statements taken afterward, the passenger being interviewed describes " +
         "themselves as the person who helped, and not one of them mentions you. This is the " +
         "correct outcome and you would not change it.",
         "In elf der später aufgenommenen Aussagen beschreibt sich der befragte Passagier " +
         "selbst als die Person, die geholfen hat, und nicht eine einzige erwähnt dich. Das ist " +
         "das richtige Ergebnis, und du würdest es nicht ändern."],

        // ---------------------------------------------------------------------- nobody at all ---
        ["You did not move one person.", "Du hast keinen einzigen Menschen bewegt."],
        ["{actions} actions. Nine hundred seconds. {poured} things poured on a fire that was " +
         "never going to go out, and {secs} seconds spent explaining to people who did not want " +
         "to be explained to.",
         "{actions} Handlungen. Neunhundert Sekunden. {poured} Dinge auf ein Feuer gegossen, " +
         "das nie ausgehen würde, und {secs} Sekunden damit verbracht, es Menschen zu erklären, " +
         "denen nichts erklärt werden wollte."],
        ["{walked} walked off, {treated} went to hospital, {serious} stayed there, and {lost} " +
         "did not.",
         "{walked} sind selbst ausgestiegen, {treated} kamen ins Krankenhaus, {serious} sind " +
         "dort geblieben, und {lost} nicht."],
        ["The cabin crew's report describes you as “obstructive”. It is going to be eight months " +
         "before anybody reads the maintenance log and works out what was in the bin, and by " +
         "then everybody will have agreed on a version of this afternoon that does not have you " +
         "in it.",
         "Der Bericht der Kabinencrew beschreibt dich als „behindernd“. Es wird acht Monate " +
         "dauern, bis jemand das Wartungsbuch liest und herausfindet, was in dem Gepäckfach " +
         "war, und bis dahin haben sich alle auf eine Fassung dieses Nachmittags geeinigt, in " +
         "der du nicht vorkommst."],

        // ------------------------------------------------------------------------- your arms ---
        ["WHAT ONE PERSON CAN CARRY", "WAS EIN MENSCH TRAGEN KANN"],
        ["You carried {n} people the length of an aeroplane, one at a time, through smoke, past " +
         "a trolley, with {burns} on the burn scale and {smoke} on the other one.",
         "Du hast {n} Menschen durch die Länge eines Flugzeugs getragen, einen nach dem " +
         "anderen, durch Rauch, an einem Wagen vorbei, mit {burns} auf der Verbrennungsskala " +
         "und {smoke} auf der anderen."],
        ["It is a physical limit and you found it. There was no arrangement of those nine " +
         "hundred seconds in which your arms got to {n}.",
         "Es ist eine körperliche Grenze, und du hast sie gefunden. Es gab keine Anordnung " +
         "dieser neunhundert Sekunden, in der deine Arme auf {n} gekommen wären."],
        ["{n} got off alive, {walked} walked, {lost} not accounted for.",
         "{n} sind lebend herausgekommen, {walked} selbst gegangen, {lost} nicht erfasst."],
        ["The thing you will think about, for years, is that four rows behind the last person " +
         "you carried there were eleven people who would have walked if somebody had told them " +
         "to.",
         "Woran du jahrelang denken wirst, ist, dass vier Reihen hinter dem letzten Menschen, " +
         "den du getragen hast, elf Menschen saßen, die selbst gegangen wären, wenn es ihnen " +
         "jemand gesagt hätte."],

        // ---------------------------------------------------------------------------- the rest ---
        ["INCIDENT CONCLUDED", "VORFALL ABGESCHLOSSEN"],
        ["The aeroplane landed. It always lands. That was never the question.",
         "Das Flugzeug ist gelandet. Es landet immer. Das war nie die Frage."],
        ["{moved} people were out of their seats and on the floor when it did. {walked} walked " +
         "off unaided, {treated} were taken to hospital and released, {serious} were taken to " +
         "hospital and kept, and {lost} were not accounted for.",
         "{moved} Menschen waren dabei aus ihren Sitzen heraus und am Boden. {walked} sind ohne " +
         "Hilfe ausgestiegen, {treated} kamen ins Krankenhaus und wurden entlassen, {serious} " +
         "kamen ins Krankenhaus und wurden dabehalten, und {lost} wurden nicht erfasst."],
        ["The fire vented {vented} cells of a pack of nine. There were {left} left when the " +
         "doors opened, and they went in the aircraft rescue foam nine minutes later, one at a " +
         "time, popping, while sixty people stood on a taxiway in the rain and watched.",
         "Das Feuer hat {vented} Zellen eines Neunerpakets abgeblasen. Als die Türen aufgingen, " +
         "waren noch {left} übrig, und die gingen neun Minuten später im Löschschaum der " +
         "Flughafenfeuerwehr hoch, eine nach der anderen, mit einem Knall, während sechzig " +
         "Menschen im Regen auf einem Rollweg standen und zusahen."],
        ["You were right about the bin at {you} into the descent. Nobody else was right about " +
         "the bin until {them}.",
         "Du hattest bei {you} des Sinkflugs recht mit dem Gepäckfach. Sonst hatte niemand " +
         "recht mit dem Gepäckfach, bis {them}."],
        ["the ground", "zum Boden"],
    ]);
})(window);
