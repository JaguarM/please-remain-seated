// German: the aeroplane itself. Where you are standing, what the fire is doing, what state a
// person is in, what the crew are up to, and how the report grades it.
//
// The vocabulary here is the real one. A German cabin crew says "Bordküche", not "Küche"; the
// aisle is the "Gang"; the overhead locker is the "Gepäckfach"; the flight deck is the
// "Cockpit", which is the word German pilots use. BCF and Halon are not translated, because the
// bottle on the aeroplane says BCF.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    PRS.i18n.add("de", [
        // ---------------------------------------------------------------- the decks of actions ---
        ["Move", "Gehen"],
        ["Click the cabin to walk there. Arrows or WASD to step.",
         "Klick in die Kabine, um dorthin zu gehen. Pfeiltasten oder WASD für einen Schritt."],
        ["The fire", "Das Feuer"],
        ["None of this puts it out.", "Nichts davon löscht es."],
        ["People", "Menschen"],
        ["The only thing that scales.", "Das Einzige, was sich vervielfacht."],
        ["Crew", "Crew"],
        ["They have the equipment and the procedure.",
         "Sie haben die Ausrüstung und das Verfahren."],
        ["The cabin", "Die Kabine"],
        ["Bins, masks, doors, the trolley, the lav.",
         "Gepäckfächer, Masken, Türen, der Wagen, das WC."],
        ["Yourself", "Du selbst"],
        ["You are also a person on this aeroplane.",
         "Du bist auch ein Mensch in diesem Flugzeug."],
        ["Your bag", "Dein Gepäck"],
        ["Three things and whatever you have found.",
         "Drei Dinge und was du sonst gefunden hast."],

        ["Something in the cabin does not work the way you expected.",
         "Etwas in der Kabine funktioniert anders, als du erwartet hast."],
        ["You go down in the aisle. You do not get up.",
         "Du gehst im Gang zu Boden. Du stehst nicht wieder auf."],
        ["The gear comes down. The cabin lights come up. Whatever is happening now is what is " +
         "going to have happened.",
         "Das Fahrwerk fährt aus. Die Kabinenbeleuchtung geht an. Was jetzt geschieht, ist das, " +
         "was geschehen sein wird."],

        // --------------------------------------------------------------------------- the cabin ---
        ["hull", "Rumpf"],
        ["seat", "Sitz"],
        ["aisle", "Gang"],
        ["cross-aisle", "Quergang"],
        ["galley", "Bordküche"],
        ["lavatory", "WC"],
        ["exit door", "Ausgangstür"],
        ["flight deck door", "Cockpittür"],
        ["bulkhead", "Trennwand"],

        // These are read after "You are at", "Walk to", "moved to", so they are in the dative:
        // "Du stehst im Gang bei Reihe 14", "nach hinterer Bordküche gebracht".
        ["seat {seat}", "auf Sitz {seat}"],
        ["the flight deck door", "an der Cockpittür"],
        ["door {door}", "an Tür {door}"],
        ["the forward galley", "in der vorderen Bordküche"],
        ["the aft lavatory", "im hinteren WC"],
        ["the aft galley", "in der hinteren Bordküche"],
        ["the aisle at row {row}", "im Gang bei Reihe {row}"],
        ["the forward cross-aisle", "im vorderen Quergang"],
        ["the overwing exit row", "in der Notausstiegsreihe über der Tragfläche"],
        ["the aft cross-aisle", "im hinteren Quergang"],
        ["the aisle", "im Gang"],
        ["the cabin", "in der Kabine"],

        // And the same places as somewhere to go, which in German is a different case: you
        // stand "im Gang" and you walk "in den Gang". English needs one list and gets two.
        ["seat {seat}␟as a destination", "auf Sitz {seat}"],
        ["the flight deck door␟as a destination", "zur Cockpittür"],
        ["door {door}␟as a destination", "zu Tür {door}"],
        ["the forward galley␟as a destination", "in die vordere Bordküche"],
        ["the aft lavatory␟as a destination", "ins hintere WC"],
        ["the aft galley␟as a destination", "in die hintere Bordküche"],
        ["the aisle at row {row}␟as a destination", "in den Gang bei Reihe {row}"],
        ["the forward cross-aisle␟as a destination", "in den vorderen Quergang"],
        ["the overwing exit row␟as a destination",
         "in die Notausstiegsreihe über der Tragfläche"],
        ["the aft cross-aisle␟as a destination", "in den hinteren Quergang"],
        ["the aisle␟as a destination", "in den Gang"],
        ["the cabin␟as a destination", "in die Kabine"],

        // ---------------------------------------------------------------------------- the crew ---
        ["Service", "Service"],
        ["The trolley is out. There is a smell, and smells happen.",
         "Der Wagen ist draußen. Es riecht, und Gerüche kommen vor."],
        ["Noted", "Zur Kenntnis genommen"],
        ["Somebody has mentioned it to somebody. It has been noted.",
         "Jemand hat es jemandem gesagt. Es ist zur Kenntnis genommen worden."],
        ["Investigating", "Wird nachgesehen"],
        ["A member of crew is coming to look. The trolley is being stowed.",
         "Jemand von der Crew kommt nachsehen. Der Wagen wird verstaut."],
        ["Fighting", "Wird bekämpft"],
        ["Halon on the visible flame, which is not where the fire is.",
         "Halon auf die sichtbare Flamme, und dort ist das Feuer nicht."],
        ["Declared", "Notfall erklärt"],
        ["The flight deck knows. The descent steepens: a runway sooner, ninety seconds fewer.",
         "Das Cockpit weiß Bescheid. Der Sinkflug wird steiler: früher eine Bahn, neunzig " +
         "Sekunden weniger."],
        ["Secure cabin", "Kabine sichern"],
        ["Everybody sits down for landing. Including the ones you were carrying.",
         "Alle setzen sich zur Landung hin. Auch die, die du getragen hast."],
        ["CABIN CREW — {phase}. {what}", "KABINENCREW — {phase}. {what}"],

        ["The trolley goes away. The aisle is yours.",
         "Der Wagen verschwindet. Der Gang gehört dir."],
        ["“BCF! BCF, aft galley, now!” Somebody is finally running.",
         "„BCF! BCF, hintere Bordküche, sofort!“ Endlich rennt jemand."],
        ["PA: “Ladies and gentlemen, this is the flight deck. We have a situation in the cabin " +
         "and we are going down early. Cabin crew, stations.”",
         "Durchsage: „Sehr geehrte Damen und Herren, hier spricht das Cockpit. Wir haben einen " +
         "Vorfall in der Kabine und gehen früher runter. Kabinencrew auf Stationen.“"],
        ["The nose drops. You have just lost {n} seconds and gained a runway.",
         "Die Nase geht runter. Du hast gerade {n} Sekunden verloren und eine Landebahn gewonnen."],
        ["PA: “CABIN CREW, TAKE YOUR STATIONS. BRACE ON MY COMMAND.”",
         "Durchsage: „KABINENCREW AUF STATIONEN. AUF MEIN KOMMANDO IN BRACE-POSITION.“"],
        ["The crew begin putting people back into their seats. Including yours.",
         "Die Crew fängt an, die Leute wieder in ihre Sitze zu setzen. Auch deine."],
        ["“{who} has eyes on it. It's in the bin. It's in the bin, it's not the oven.”",
         "„{who} hat es im Blick. Es ist im Gepäckfach. Es ist im Gepäckfach, nicht im Ofen.“"],
        ["“STAND BACK!” {who} empties a halon bottle into row {row}. The flame goes out like a " +
         "light. The bin keeps ticking.",
         "„ZURÜCKTRETEN!“ {who} leert eine Halonflasche in Reihe {row}. Die Flamme geht aus wie " +
         "eine Lampe. Das Gepäckfach tickt weiter."],
        ["“Sit down, please. Sit DOWN.” {who} is put back into {seat}.",
         "„Bitte setzen Sie sich. SETZEN Sie sich.“ {who} wird wieder auf {seat} gesetzt."],
        ["{who} carries {whom} forward. That is one you did not have to do.",
         "{who} trägt {whom} nach vorn. Das ist eine, die du nicht machen musstest."],

        ["“Sir. Madam. Please take your seat, we're still serving.”",
         "„Der Herr. Die Dame. Bitte setzen Sie sich, wir servieren noch.“"],
        ["“We know about the smell. It's being looked at.”",
         "„Der Geruch ist uns bekannt. Es wird nachgesehen.“"],
        ["“I am looking at it right now. Please sit down.”",
         "„Ich sehe gerade nach. Bitte setzen Sie sich.“"],
        ["“It's under control. Sit down. SIT DOWN.”",
         "„Es ist unter Kontrolle. Setzen Sie sich. SETZEN Sie sich.“"],
        ["“We're going down. Get in a seat, any seat.”",
         "„Wir gehen runter. Setzen Sie sich hin, irgendwo.“"],
        ["“BRACE POSITION. NOW. IN A SEAT. NOW.”",
         "„BRACE-POSITION. SOFORT. IN EINEN SITZ. SOFORT.“"],

        ["Cabin crew, aft", "Kabinencrew, hinten"],
        ["Cabin crew, forward", "Kabinencrew, vorn"],
        ["Purser", "Purser"],
        ["“Sir. Madam. Whoever you are. Please take your seat.”",
         "„Der Herr. Die Dame. Wer auch immer Sie sind. Bitte setzen Sie sich.“"],
        ["“We're aware of a smell. It's being looked at. Please sit down.”",
         "„Ein Geruch ist uns bekannt. Es wird nachgesehen. Bitte setzen Sie sich.“"],
        ["“I have thirty-one years on this aircraft type. Sit down.”",
         "„Ich habe einunddreißig Jahre auf diesem Muster. Setzen Sie sich.“"],

        // ---------------------------------------------------------------------------- the fire ---
        ["water", "Wasser"],
        ["smothering", "Ersticken"],
        ["a wet cloth", "ein nasses Tuch"],
        ["beating", "Ausschlagen"],
        // These are read after a colon or after "auf" - "Feuer: Glut", "Es geht zurück auf:
        // starkes Feuer" - so every one of them is a noun phrase. English got away with mixing
        // "smouldering" and "an inferno" because both follow "drops to"; German does not.
        ["charred and cold", "verkohlt und kalt"],
        ["nothing", "nichts"],
        ["smouldering", "Glut"],
        ["alight", "offenes Feuer"],
        ["burning properly", "richtiges Feuer"],
        ["burning hard", "starkes Feuer"],
        ["an inferno", "ein Inferno"],
        ["not survivable", "nicht überlebbar"],
        ["clear", "klar"],
        ["hazy", "diesig"],
        ["thick", "dicht"],
        ["you cannot see the seat in front", "du siehst den Sitz vor dir nicht"],
        ["black", "schwarz"],
        ["solid", "undurchdringlich"],

        // ------------------------------------------------------------------------- the people ---
        ["asleep", "schläft"],
        ["seated", "sitzt"],
        ["standing", "steht"],
        ["in the aisle", "im Gang"],
        ["helping", "hilft"],
        ["on the floor, out of the seats", "am Boden, raus aus den Sitzen"],
        ["unconscious", "bewusstlos"],
        ["not moving", "bewegt sich nicht"],
        ["gone", "tot"],
        ["critical", "kritisch"],
        ["in a bad way", "in schlechtem Zustand"],

        ["{who} has been soaked once too often and gets hold of your arm. “What is WRONG with " +
         "you?” Everything you do to that fire is now done around them.",
         "{who} ist einmal zu oft nass geworden und packt deinen Arm. „Was STIMMT nicht mit " +
         "Ihnen?“ Alles, was du gegen das Feuer tust, tust du ab jetzt um diese Person herum."],
        ["{who} wakes up in {seat} and does not understand anything they can see.",
         "{who} wacht auf {seat} auf und versteht nichts von dem, was zu sehen ist."],
        ["{who} ({seat}) has stopped arguing about whether there is a fire.",
         "{who} ({seat}) streitet nicht mehr darüber, ob es brennt."],
        ["{who} is helping. ", "{who} hilft. "],
        ["({who} does not answer.)", "({who} antwortet nicht.)"],
        ["{who} gets {whom} down on the floor at {where}, breathing better than they were.",
         "{who} legt {whom} {where} auf den Boden, und die Atmung ist besser als vorher."],
        ["{who} gets {whom} down on the floor at {where}. You did not have to be there.",
         "{who} legt {whom} {where} auf den Boden. Du musstest nicht dabei sein."],

        // The traits, as they appear on a card. The ids stay English in the rules.
        ["headphones", "Kopfhörer"],
        ["sceptic", "skeptisch"],
        ["hostile", "feindselig"],
        ["helpful", "hilfsbereit"],
        ["child", "Kind"],
        ["infant", "Kleinkind"],
        ["elderly", "alt"],
        ["immobile", "gehunfähig"],
        ["large", "schwer"],
        ["drunk", "betrunken"],
        ["nervous", "nervös"],
        ["medical", "medizinisch"],
        ["crew", "Crew"],
        ["pet", "Tier"],

        // --------------------------------------------------------------------------- the score ---
        ["SOULS ON BOARD 61. ACCOUNTED FOR {n}. ", "SEELEN AN BORD 61. ERFASST {n}. "],
        ["NOT ACCOUNTED FOR {n}.", "NICHT ERFASST {n}."],
        ["ALL ACCOUNTED FOR.", "ALLE ERFASST."],

        ["Exceptional", "Außergewöhnlich"],
        ["Almost everybody. There is no version of this afternoon that goes better, and you " +
         "found the one that nearly does.",
         "Fast alle. Es gibt keine Fassung dieses Nachmittags, die besser ausgeht, und du hast " +
         "die gefunden, die es beinahe tut."],
        ["Remarkable", "Bemerkenswert"],
        ["Most of a burning aeroplane got off it alive, and a good part of that was what you did " +
         "in the first five minutes.",
         "Der größte Teil eines brennenden Flugzeugs ist lebend herausgekommen, und ein guter " +
         "Teil davon war das, was du in den ersten fünf Minuten getan hast."],
        ["Considerable", "Erheblich"],
        ["More people lived than would have. That is the job, and it is the whole job.",
         "Mehr Menschen haben überlebt, als überlebt hätten. Das ist die Aufgabe, und es ist " +
         "die ganze Aufgabe."],
        ["Some", "Einige"],
        ["Some. Which is a strange word to have to use.",
         "Einige. Was ein seltsames Wort ist, wenn man es benutzen muss."],
        ["A few", "Ein paar"],
        ["The fire decided most of this. You decided some of it.",
         "Das Feuer hat das meiste davon entschieden. Du hast einiges davon entschieden."],
        ["Almost none", "Fast niemand"],
        ["You were the only person on this aeroplane who understood, and it was not enough.",
         "Du warst der einzige Mensch in diesem Flugzeug, der es verstanden hat, und es hat " +
         "nicht gereicht."],

        // ---------------------------------------------------------------------- changing your mind ---
        ["The aeroplane is on the ground.", "Das Flugzeug steht am Boden."],
        ["You have not done anything yet.", "Du hast noch nichts getan."],
        ["That is further back than you can go.", "So weit zurück kommst du nicht."],
        ["You cannot un-see that. Anything that told you something new stays done.",
         "Das kannst du nicht ungesehen machen. Alles, was dir etwas Neues gesagt hat, bleibt " +
         "getan."],
        ["You go back the way you came, to {where}, and you have {secs} back.",
         "Du gehst den Weg zurück, den du gekommen bist, {where}, und hast {secs} zurück."],
        ["You did not do that. {what} (and the {n} before it) is undone, and you have the " +
         "{secs} seconds back.",
         "Das hast du nicht getan. {what} (und die {n} davor) ist rückgängig, und du hast die " +
         "{secs} Sekunden zurück."],
        ["You did not do that. {what} is undone, and you have the {secs} seconds back.",
         "Das hast du nicht getan. {what} ist rückgängig, und du hast die {secs} Sekunden zurück."],

        // ----------------------------------------------------------------------- what happens ---
        ["The aft lavatory smoke detector goes off. It is a very small noise and it changes " +
         "everything: sixty people stop talking at once.",
         "Der Rauchmelder im hinteren WC geht los. Es ist ein sehr kleines Geräusch, und es " +
         "ändert alles: sechzig Menschen hören auf einmal auf zu reden."],
        ["A bin latch lets go with a bang and the whole locker above row {row} is alight at once.",
         "Ein Verschluss gibt mit einem Knall nach, und das ganze Gepäckfach über Reihe {row} " +
         "brennt auf einmal."],
        ["The aeroplane drops half a wing and comes back. {what}",
         "Das Flugzeug sackt einen halben Flügel weit weg und fängt sich wieder. {what}"],
        ["You put {who} down harder than you meant to.",
         "Du setzt {who} härter ab, als du wolltest."],
        ["You get a hand to a seat back in time.",
         "Du kriegst rechtzeitig eine Hand an eine Rückenlehne."],
        ["Somebody knocks the brake off the trolley and two hundred kilos of duty free rolls " +
         "three rows aft and stops across the aisle at row {row}.",
         "Jemand stößt die Bremse vom Wagen, und zweihundert Kilo Duty-free rollen drei Reihen " +
         "nach hinten und bleiben quer im Gang bei Reihe {row} stehen."],
        ["{who} stands up in row {row}, gets a bag out of the bin, puts it down in the aisle, " +
         "and stands next to it.",
         "{who} steht in Reihe {row} auf, holt eine Tasche aus dem Gepäckfach, stellt sie in " +
         "den Gang und stellt sich daneben."],
        ["{who} catches your eye from {seat} and mouths: what do you need. Ask them.",
         "{who} sucht von {seat} aus deinen Blick und formt lautlos: was brauchst du. Frag sie."],
        ["{who}, from {seat}: {said}", "{who}, von {seat}: {said}"],
        ["“Will you SIT DOWN.”", "„Wollen Sie sich bitte HINSETZEN.“"],
        ["“You are frightening my children.”", "„Sie machen meinen Kindern Angst.“"],
        ["“There is a procedure and you are not it.”",
         "„Es gibt ein Verfahren, und Sie sind es nicht.“"],
        ["“I have asked you politely. That was the polite one.”",
         "„Ich habe Sie höflich gebeten. Das war die höfliche Bitte.“"],
        ["“Cabin crew! CABIN CREW! This person won't sit down!”",
         "„Kabinencrew! KABINENCREW! Diese Person setzt sich nicht hin!“"],
    ]);
})(window);
