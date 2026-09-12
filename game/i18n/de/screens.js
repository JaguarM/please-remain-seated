// German: the screens that are not the aeroplane. The boarding pass, the roster, the wardrobe,
// the bag, the seed, the help card and the incident report.
//
// The report is written in the flat register a German air accident report is written in -
// Bundesstelle für Flugunfalluntersuchung, not a newspaper - and the rest of the game is not.
// That contrast is the point of the report, so it survives the translation: "nicht erfasst" for
// "not accounted for", and no adjective anywhere near it.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    PRS.i18n.add("de", [
        // A flight number and an altitude are not translated. Feet are what the altimeter says.
        ["TRANSNATIONAL 447 · 31,000 FT · DESCENT",
         "TRANSNATIONAL 447 · 31.000 FT · SINKFLUG"],

        // One line under the title, and it has to stay one line, so the German is built short
        // rather than translated long. "nur du" rather than "der Einzige", because most of the
        // cast are women and "Einzige" would have to pick.
        ["There is a fire. You are the only one who has noticed.",
         "Es brennt. Nur du hast es bemerkt."],

        // Under the four big numbers on the title screen. Short, and the shortest that is true.
        ["souls on board", "Seelen an Bord"],
        ["to touchdown", "bis zum Aufsetzen"],
        ["things you can do", "Dinge, die du tun kannst"],
        ["ways to put it out", "Wege, es zu löschen"],

        ["Change who you are", "Jemand anderes sein"],
        ["How to play", "Spielanleitung"],
        ["Previous flights ({n})", "Frühere Flüge ({n})"],

        // "gerettet" and not "lebend heraus": the book counts the people your afternoon put
        // on the tarmac who would not otherwise have got there, which is a smaller number.
        ["{flights} · {souls} saved · {people} of {ofPeople} people and {outfits} of " +
         "{ofOutfits} outfits",
         "{flights} · {souls} gerettet · {people} von {ofPeople} Personen und {outfits} " +
         "von {ofOutfits} Ausstattungen"],
        [" · next outfit at {n} souls.", " · nächste Ausstattung bei {n} Seelen."],

        // ------------------------------------------------------------------ the boarding pass ---
        ["{title} · seat {seat}", "{title} · Sitz {seat}"],
        ["Board", "Einsteigen"],
        ["as you are", "wie du bist"],
        ["wearing", "Kleidung"],
        ["nothing", "nichts"],
        ["kit", "fest"],
        ["{n} uses", "{n} Anwendungen"],
        ["any seed", "beliebig"],
        ["seed", "Startwert"],
        ["Part of who they are", "Gehört zu dieser Person"],
        ["Click to change", "Klicken zum Ändern"],
        ["KIT", "FEST"],

        // ---------------------------------------------------------------------- the wardrobe ---
        ["What you flew in", "Was du anhattest"],
        ["Whatever {who} had on. The five numbers are the five numbers.",
         "Was {who} eben anhatte. Die fünf Zahlen sind die fünf Zahlen."],
        ["Unlocks at {n} souls · {have} so far",
         "Freigeschaltet bei {n} Seelen · bisher {have}"],
        ["What you are wearing", "Was du trägst"],
        ["It does nothing except move {who}'s five numbers. Two points of speed is a second off " +
         "every step of nine hundred of them, and two points of voice is the difference between " +
         "being believed at minute four and at minute nine.",
         "Sie tut nichts, außer {who}s fünf Zahlen zu verschieben. Zwei Punkte Tempo sind eine " +
         "Sekunde weniger pro Schritt, neunhundert Sekunden lang, und zwei Punkte Stimme sind " +
         "der Unterschied zwischen Minute vier und Minute neun, bis dir jemand glaubt."],
        ["Back", "Zurück"],
        ["strength", "Kraft"],
        ["speed", "Tempo"],
        ["lungs", "Lunge"],
        ["voice", "Stimme"],

        // ---------------------------------------------------------------------------- the bag ---
        ["Nothing", "Nichts"],
        ["An empty slot. Both hands free, and everything you need is somebody else's.",
         "Ein leerer Platz. Beide Hände frei, und alles, was du brauchst, gehört jemand anderem."],
        ["{n} uses, refilled at the tap", "{n} Anwendungen, am Wasserhahn wieder voll"],
        ["What is on you", "Was du dabeihast"],
        ["Slot {n} of {of}. Three things is the cabin baggage allowance, and the airline is " +
         "going to keep enforcing it while its aeroplane is on fire. Everything else is aboard: " +
         "in the galley drawers, in the crew's kit, and in other passengers' laps.",
         "Platz {n} von {of}. Drei Dinge sind das Handgepäcklimit, und die Fluggesellschaft wird " +
         "es weiter durchsetzen, während ihr Flugzeug brennt. Alles andere ist an Bord: in den " +
         "Schubladen der Bordküche, im Gepäck der Crew und auf den Schößen anderer Passagiere."],

        // ------------------------------------------------------------------------- the flight ---
        ["Whatever comes", "Was auch kommt"],
        ["A new seed every flight. The report quotes it, so a flight worth flying again is one " +
         "number away.",
         "Jeder Flug ein neuer Startwert. Der Bericht nennt ihn, ein Flug, der es noch einmal " +
         "wert ist, ist also eine Zahl entfernt."],
        ["606, or a word", "606, oder ein Wort"],
        ["This seed", "Dieser Startwert"],
        ["Every die in the flight is cast from it before you board: what mood each passenger is " +
         "in, when row 14 catches, what the cabin does on its third turn. Two flights on one " +
         "seed differ only in what you do. The address bar takes it too: index.html?seed=606.",
         "Aus ihm wird vor dem Einsteigen jeder Würfel des Fluges geworfen: die Laune jedes " +
         "Passagiers, wann Reihe 14 Feuer fängt, was die Kabine in ihrem dritten Zug tut. Zwei " +
         "Flüge auf einem Startwert unterscheiden sich nur darin, was du tust. Die Adresszeile " +
         "nimmt ihn auch: index.html?seed=606."],
        ["Fly this seed", "Diesen Startwert fliegen"],
        ["Which flight", "Welcher Flug"],
        ["It is the same aeroplane every time and the fire is in the same locker. What the seed " +
         "decides is everything that could have gone either way.",
         "Es ist jedes Mal dasselbe Flugzeug, und das Feuer ist in demselben Fach. Der Startwert " +
         "entscheidet alles, was auch anders hätte kommen können."],

        // ------------------------------------------------------------------------- the roster ---
        ["{age} · {title}", "{age} · {title}"],
        ["LOCKED", "GESPERRT"],
        ["{age} · {title} · seat {seat}", "{age} · {title} · Sitz {seat}"],
        ["{name}. {note}", "{name}. {note}"],
        ["What you flew in.", "Was du anhattest."],
        ["Board as {who}", "Als {who} einsteigen"],
        ["Who you are", "Wer du bist"],
        ["A locked card says what turns it over: people by something you do on the aeroplane, " +
         "clothes by the souls in the book.",
         "Eine gesperrte Karte sagt, was sie umdreht: Menschen durch etwas, das du im Flugzeug " +
         "tust, Kleidung durch die Seelen im Buch."],

        // Three letters on a bar three letters wide. Kraft, Tempo, Lunge, Stimme.
        ["STR␟strength, on a stat bar", "KRF"],
        ["SPD␟speed, on a stat bar", "TMP"],
        ["LNG␟lungs, on a stat bar", "LUN"],
        ["VOI␟voice, on a stat bar", "STM"],

        // ---------------------------------------------------------------------------- the help ---
        ["Click a person", "Klick eine Person an"],
        ["to talk to them, treat them, or pick them up and carry them to a green end of the " +
         "aeroplane. Nobody counts until they are there.",
         "um mit ihr zu reden, sie zu versorgen oder sie hochzunehmen und an ein grünes Ende " +
         "des Flugzeugs zu tragen. Niemand zählt, bevor er dort ist."],
        ["Click the fire", "Klick das Feuer an"],
        ["to fight it. Nothing puts it out. Everything buys time.",
         "um es zu bekämpfen. Nichts löscht es. Alles kauft Zeit."],
        ["Click yourself", "Klick dich selbst an"],
        ["for everything about where you are standing - the tap, the lockers, the trolley - and " +
         "for the things in your bag.",
         "für alles, was dort ist, wo du stehst — der Wasserhahn, die Gepäckfächer, der " +
         "Wagen — und für die Dinge in deinem Gepäck."],
        ["Click anywhere else to walk there.", "Klick irgendwo anders hin, um dorthin zu gehen."],
        ["Whatever is under the pointer lights up, with the price. Arrow keys step.",
         "Was unter dem Zeiger liegt, leuchtet auf, mit dem Preis. Die Pfeiltasten gehen einen " +
         "Schritt."],
        ["Time only moves when you act.", "Die Zeit läuft nur, wenn du handelst."],
        ["Every click costs the seconds it says, and you watch them go by. Backspace takes the " +
         "last one back, and so does walking back the way you came.",
         "Jeder Klick kostet die Sekunden, die dranstehen, und du siehst ihnen beim Vergehen zu. " +
         "Die Rücktaste nimmt den letzten zurück, und den Weg zurückzugehen auch."],
        ["Got it", "Verstanden"],

        // ------------------------------------------------------------------------- the log book ---
        ["The log book", "Das Flugbuch"],
        // One row of the book: what that flight put on the tarmac that would not have got there.
        ["{n} saved", "{n} gerettet"],
        ["{n} survived", "{n} überlebt"],
        ["{n} secured", "{n} gesichert"],
        ["{n} lost", "{n} verloren"],
        ["Save recorded flights ({n})", "Aufgezeichnete Flüge speichern ({n})"],
        ["Start the book again", "Das Buch neu beginnen"],
        ["Start the book again?", "Das Buch neu beginnen?"],
        ["Forget every flight, and lock everything the book has unlocked?",
         "Jeden Flug vergessen und alles wieder sperren, was das Buch freigeschaltet hat?"],
        ["Forget every flight", "Jeden Flug vergessen"],

        // ---------------------------------------------------------------------------- the report ---
        ["AIR ACCIDENTS INVESTIGATION · PRELIMINARY REPORT · TRANSNATIONAL 447",
         "FLUGUNFALLUNTERSUCHUNG · VORLÄUFIGER BERICHT · TRANSNATIONAL 447"],
        ["Souls on board", "Seelen an Bord"],
        ["on board", "an Bord"],
        ["walked off", "selbst ausgestiegen"],
        ["treated", "behandelt"],
        ["serious", "schwer verletzt"],
        ["not accounted for", "nicht erfasst"],
        ["Without you:", "Ohne dich:"],
        ["With you:", "Mit dir:"],
        ["{n} alive who would not have been.", "{n} am Leben, die es sonst nicht wären."],
        ["The cabin would have done {n} better with you in your seat.",
         "Die Kabine hätte es um {n} besser gemacht, wenn du sitzen geblieben wärst."],
        ["Exactly what the cabin would have managed with you in your seat.",
         "Genau so viel, wie die Kabine geschafft hätte, wenn du sitzen geblieben wärst."],
        ["What were you trying to do, and when did you notice it was or was not working? " +
         "(optional)",
         "Was hattest du vor, und wann hast du gemerkt, dass es funktioniert oder nicht " +
         "funktioniert? (freiwillig)"],
        ["Flight recorder", "Flugschreiber"],
        ["This flight is kept with your last {n}. Save them to a file to send them in for " +
         "balancing.",
         "Dieser Flug liegt bei deinen letzten {n}. Speichere sie in eine Datei, um sie zur " +
         "Balance-Auswertung einzuschicken."],
        ["Save recorded flights", "Aufgezeichnete Flüge speichern"],
        ["saved to your downloads", "in deinen Downloads gespeichert"],
        ["Copy this flight", "Diesen Flug kopieren"],
        ["copied", "kopiert"],

        ["Everything you did ({n})", "Alles, was du getan hast ({n})"],

        // --------------------------------------------------------------- what you changed ---
        ["WHAT YOU CHANGED", "WAS DU VERÄNDERT HAST"],
        ["What you changed", "Was du verändert hast"],
        ["The report again", "Nochmal der Bericht"],
        ["{now} of {target}", "{now} von {target}"],
        ["{n} in all", "{n} insgesamt"],
        ["Next: {what}", "Als Nächstes: {what}"],
        ["Every outfit in the wardrobe is yours.",
         "Der ganze Schrank gehört dir."],
        ["CLOSEST TO UNLOCKING", "AM NÄCHSTEN DRAN"],
        // The note arrives as a plural noun phrase - "vier von fünf aus den Reihen getragen".
        ["{have} of {need} {what}, this flight",
         "{have} von {need} {what}, in diesem Flug"],

        ["+{n} in the log book", "+{n} im Flugbuch"],
        ["Unlocked:", "Freigeschaltet:"],
        ["The cabin at touchdown", "Die Kabine beim Aufsetzen"],
        ["Manifest", "Passagierliste"],
        // {where} arrives as a destination and brings its own preposition with it - "in den
        // vorderen Quergang" - so the German does not add a second one.
        ["moved to {where} by {who}", "von {who} {where} gebracht"],
        ["moved to {where}", "{where} gebracht"],
        ["was helping, at {where}", "hat mitgeholfen, {where}"],
        ["{state}, at {where}", "{state}, {where}"],
        ["{name} (you)", "{name} (du)"],
        ["Sixty-one souls, the ones who walked off first and the ones who did not last. " +
         "Point at anybody.",
         "Einundsechzig Seelen, die Ausgestiegenen zuerst und die Vermissten zuletzt. " +
         "Zeig auf irgendwen."],
        ["{kg}kg", "{kg} kg"],
        // What a person's afternoon cost them, in the arithmetic the report scored them with.
        ["smoke they had breathed", "eingeatmeter Rauch"],
        ["burns", "Verbrennungen"],
        ["the air where they lay", "die Luft, wo sie lagen"],
        ["the heat where they lay", "die Hitze, wo sie lagen"],
        ["nothing over their face", "nichts vor dem Gesicht"],
        ["upright, in the smoke layer", "aufrecht, in der Rauchschicht"],
        ["unconscious when the doors opened", "bewusstlos, als die Türen aufgingen"],
        ["the aisle between them and a door", "der Gang zwischen ihnen und einer Tür"],
        ["could not get out of the seat", "kam nicht aus dem Sitz"],
        ["everything else", "alles andere"],
        ["Nothing worth writing down happened to them.",
         "Ihnen ist nichts passiert, was der Bericht festhalten müsste."],
        ["worked with you", "hat mit dir gearbeitet"],
        ["you carried them", "von dir getragen"],
        ["something over their face", "etwas vor dem Gesicht"],
        ["low, out of the smoke layer", "tief, unter der Rauchschicht"],
        ["hooded", "mit Rauchhaube"],
        ["Where the fifteen minutes went", "Wohin die fünfzehn Minuten gegangen sind"],
        ["Carrying people", "Menschen tragen"],
        ["Fighting the fire", "Das Feuer bekämpfen"],
        ["Talking to people", "Mit Menschen reden"],
        ["Everything else", "Alles andere"],
        ["Other observations", "Weitere Feststellungen"],

        ["Fly it again", "Noch einmal fliegen"],
        ["Fly seed {seed} again", "Startwert {seed} noch einmal fliegen"],
        ["Title", "Titel"],
        ["{name} in {outfit}", "{name} in {outfit}"],
        [" · seed {seed}", " · Startwert {seed}"],
        [" · {n} actions taken · {found} things found aboard · ",
         " · {n} Handlungen · {found} Dinge an Bord gefunden · "],
        ["changed your mind {n} times", "{n}-mal anders entschieden"],
        ["never changed your mind", "nie anders entschieden"],
    ]);
})(window);
