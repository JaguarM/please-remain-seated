// German: the cabin deck, the crew deck, and everything you can pour or press on the fire.
//
// A label is a button and it is imperative. German imperatives are short, which helps: "Close
// the overhead bin" is "Gepäckfach schließen" and fits in less room than the English did. The
// detail under it is a sentence and gets full punctuation.
//
// The crew are spoken to with "Sie" throughout, and speak to you with "Sie", because that is
// what happens on an aeroplane. The narrator keeps "du".
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    PRS.i18n.add("de", [
        // ------------------------------------------------------------------- the lavatory ---
        ["Fill the bottle at the tap", "Flasche am Wasserhahn füllen"],
        ["The tap runs for four seconds a press. You will press it three times.",
         "Der Hahn läuft vier Sekunden pro Druck. Du wirst dreimal drücken."],
        ["Three presses of a tap that gives you four seconds each time. The bottle is full. " +
         "There is no limit on this and almost nobody comes back for a second one.",
         "Dreimal auf einen Hahn drücken, der jedes Mal vier Sekunden gibt. Die Flasche ist " +
         "voll. Das ist unbegrenzt, und fast niemand kommt für eine zweite zurück."],

        ["Soak the blanket in the sink", "Decke im Becken tränken"],
        ["A wet blanket is a completely different object to a dry one.",
         "Eine nasse Decke ist ein völlig anderer Gegenstand als eine trockene."],
        ["You fill the basin and push the whole blanket under it. It comes out four times heavier " +
         "and worth about six times as much.",
         "Du lässt das Becken volllaufen und drückst die ganze Decke unter Wasser. Sie kommt " +
         "viermal so schwer wieder heraus und ist ungefähr sechsmal so viel wert."],

        ["Wet the towel again", "Handtuch wieder nass machen"],
        ["The towel goes back to being a wet towel, which is its whole job.",
         "Das Handtuch ist wieder ein nasses Handtuch, und das ist seine ganze Aufgabe."],

        ["Fill a bin liner with water", "Müllsack mit Wasser füllen"],
        ["Nine litres. Four times the bottle. It is awkward and it is worth it.",
         "Neun Liter. Viermal die Flasche. Es ist unhandlich und es lohnt sich."],
        ["You hold a bin liner under a tap that gives four seconds a press for twenty seconds " +
         "and come out with nine litres of water in a bag. Do not put this down.",
         "Du hältst zwanzig Sekunden lang einen Müllsack unter einen Hahn, der vier Sekunden " +
         "pro Druck gibt, und kommst mit neun Litern Wasser in einer Tüte heraus. Stell das " +
         "nicht ab."],

        ["Set off the lavatory smoke detector", "Rauchmelder im WC auslösen"],
        ["It is a hard-wired alarm on the flight deck and you can make it happen now.",
         "Das ist ein fest verdrahteter Alarm im Cockpit, und du kannst ihn jetzt auslösen."],
        ["You hold the wet towel over the detector, wring the smoke out of it, and wave. It takes " +
         "eleven seconds and it puts a light on the flight deck panel that two pilots are " +
         "contractually unable to ignore.",
         "Du hältst das nasse Handtuch über den Melder, wringst den Rauch heraus und wedelst. Es " +
         "dauert elf Sekunden und setzt eine Leuchte auf dem Cockpitpanel, die zwei Piloten " +
         "vertraglich nicht ignorieren dürfen."],

        // --------------------------------------------------------------------- the galley ---
        ["Take the extinguisher out of the galley stowage",
         "Löscher aus der Halterung der Bordküche nehmen"],
        ["It is behind a placard and a clip. It is not locked.",
         "Er ist hinter einem Schild und einer Klammer. Abgeschlossen ist er nicht."],
        ["You unclip nine litres of water under pressure from the galley wall. A member of crew " +
         "sees you do it and does not have time to have a view about it.",
         "Du nimmst neun Liter Wasser unter Druck von der Wand der Bordküche. Jemand von der " +
         "Crew sieht es und hat keine Zeit, eine Meinung dazu zu haben."],

        ["Push the trolley into the galley yourself", "Wagen selbst in die Bordküche schieben"],
        ["Nobody has told you that you can. Nobody has told you that you cannot.",
         "Niemand hat dir gesagt, dass du darfst. Niemand hat dir gesagt, dass du nicht darfst."],
        ["Two hundred kilos of trolley, six rows, into the galley, brake on. The aisle is clear " +
         "from the flight deck door to the tail.",
         "Zweihundert Kilo Wagen, sechs Reihen, in die Bordküche, Bremse fest. Der Gang ist frei " +
         "von der Cockpittür bis zum Heck."],

        // ----------------------------------------------------------- the bins and the masks ---
        ["Force the oxygen mask panel open", "Klappe der Sauerstoffmasken aufhebeln"],
        ["There is a manual release. It is a hole and a pin and it is on the safety card.",
         "Es gibt eine Handauslösung. Sie ist ein Loch und ein Stift, und sie steht auf der " +
         "Sicherheitskarte."],
        ["You find the pinhole in the panel and put the multi-tool spike into it. The panel drops " +
         "and four masks come out on their tubes. Then you do the next one.",
         "Du findest das Loch in der Klappe und steckst die Ahle des Multitools hinein. Die " +
         "Klappe fällt auf, und vier Masken kommen an ihren Schläuchen heraus. Dann machst du " +
         "die nächste."],

        ["Pull down the masks for row {row}", "Masken für Reihe {row} herunterziehen"],
        ["Everybody in row {row} already has one on.", "In Reihe {row} hat sie schon jeder auf."],
        ["You pull the masks down and get them over {n} faces in row {row}. You have to tug them " +
         "to start the generator and nobody knows that.",
         "Du ziehst die Masken herunter und bekommst sie in Reihe {row} über {n} Gesichter. Man " +
         "muss daran ziehen, damit der Generator anspringt, und das weiß niemand."],

        ["Clear the bags out of the aisle", "Taschen aus dem Gang räumen"],
        ["You throw {n} cabin bags over the seat backs into rows that are not using their " +
         "footwells. Somebody objects. They are wrong.",
         "Du wirfst {n} Handgepäckstücke über die Rückenlehnen in Reihen, die ihren Fußraum " +
         "nicht brauchen. Jemand beschwert sich. Zu Unrecht."],

        ["Pick up the crew interphone and use the PA", "Bordtelefon nehmen und durchsagen"],
        ["It is on the bulkhead. There is no lock on it. There is a diagram.",
         "Es hängt an der Trennwand. Es hat kein Schloss. Es hat eine Zeichnung."],
        ["You take a handset off a bulkhead, press the button marked PA, and say the following " +
         "to sixty-one people at once: “There is a fire in the overhead locker above row " +
         "fourteen. If you can walk, walk forward. If you cannot, put your hand up.”",
         "Du nimmst einen Hörer von einer Trennwand, drückst die Taste mit der Aufschrift PA " +
         "und sagst einundsechzig Menschen auf einmal Folgendes: „Im Gepäckfach über Reihe " +
         "vierzehn brennt es. Wer gehen kann, geht nach vorn. Wer nicht gehen kann, hebt die " +
         "Hand.“"],
        ["Eleven hands go up. Nine people walk. Everybody else stands up at the same time.",
         "Elf Hände gehen hoch. Neun Menschen gehen. Alle anderen stehen gleichzeitig auf."],

        // -------------------------------------------------------------------- the crew deck ---
        ["Hold the call button down", "Rufknopf gedrückt halten"],
        ["Fourteen seconds of continuous chime. Somebody will come.",
         "Vierzehn Sekunden Dauergong. Es wird jemand kommen."],
        ["You hold it down. The chime does not stop. Fourteen seconds is a very long chime and by " +
         "the end of it somebody is walking up the aisle with a particular expression on their " +
         "face, which is exactly what you wanted.",
         "Du hältst ihn gedrückt. Der Gong hört nicht auf. Vierzehn Sekunden sind ein sehr " +
         "langer Gong, und am Ende kommt jemand mit einem ganz bestimmten Gesichtsausdruck den " +
         "Gang herauf, was genau das ist, was du wolltest."],

        ["Tell {who} about the bin", "{who} vom Gepäckfach erzählen"],
        ["{role} · {history}", "{role} · {history}"],
        ["has said no {n} times", "hat {n}-mal nein gesagt"],
        ["has not refused you yet", "hat dir noch nichts abgeschlagen"],
        ["{who} actually listens. “Which locker. Which row. Show me.”",
         "{who} hört tatsächlich zu. „Welches Fach. Welche Reihe. Zeigen Sie es mir.“"],
        ["{who}: {said}", "{who}: {said}"],

        ["Show {who} the photograph", "{who} das Foto zeigen"],
        ["Evidence beats an account of evidence every time.",
         "Ein Beweis schlägt jedes Mal die Schilderung eines Beweises."],
        ["{who} looks at your phone. The whole conversation you were about to have does not need " +
         "to happen.",
         "{who} sieht auf dein Handy. Das ganze Gespräch, das du führen wolltest, muss nicht " +
         "stattfinden."],

        ["Show {who} your hand", "{who} deine Hand zeigen"],
        ["You hold your hand out. There is no version of that hand that came from a galley oven. " +
         "{who} stops talking mid-sentence.",
         "Du hältst die Hand hin. Es gibt keine Fassung dieser Hand, die aus einem Bordofen " +
         "kommt. {who} hört mitten im Satz auf zu reden."],

        ["Take {who} to the bin", "{who} zum Gepäckfach führen"],
        ["Do not describe it. Walk them to it.",
         "Beschreib es nicht. Führ die Person hin."],
        ["You walk {who} eleven rows and point at the seam of the locker above {seat}. They put " +
         "the back of their hand on it for about a quarter of a second. Everything is different " +
         "from here.",
         "Du führst {who} elf Reihen weit und zeigst auf die Fuge des Fachs über {seat}. Die " +
         "Person legt etwa eine Viertelsekunde lang den Handrücken darauf. Ab hier ist alles " +
         "anders."],

        ["Ask {who} for the halon bottle", "{who} um die Halonflasche bitten"],
        ["There are two on this aeroplane and neither of them is yours.",
         "Es gibt zwei in diesem Flugzeug, und keine davon gehört dir."],
        ["“It's gone. Both of them are gone.”", "„Sie ist weg. Beide sind weg.“"],
        ["“Do you know how to use it?” You say yes. {who} gives you a red bottle and eleven " +
         "seconds of instructions.",
         "„Wissen Sie, wie man damit umgeht?“ Du sagst ja. {who} gibt dir eine rote Flasche und " +
         "elf Sekunden Erklärung."],
        ["“Absolutely not. Sit down.” Which is, to be fair to them, correct.",
         "„Auf keinen Fall. Setzen Sie sich.“ Was, fairerweise, richtig ist."],

        ["Ask {who} for a smoke hood", "{who} um eine Rauchhaube bitten"],
        ["{who} hands you a foil packet. It is the crew's own and they now do not have it.",
         "{who} reicht dir eine Folienpackung. Sie gehört der Crew, und jetzt hat die Crew sie " +
         "nicht mehr."],
        ["“They're for crew.” They are for crew.",
         "„Die sind für die Crew.“ Sie sind für die Crew."],

        ["Ask {who} to stow the trolley", "{who} bitten, den Wagen zu verstauen"],
        ["Two hundred kilos across the aisle is the single biggest thing in your way.",
         "Zweihundert Kilo quer im Gang sind das größte Einzelhindernis auf deinem Weg."],
        ["The trolley goes away. The aisle is a corridor again and everything you do for the " +
         "rest of this flight is faster.",
         "Der Wagen verschwindet. Der Gang ist wieder ein Gang, und alles, was du für den Rest " +
         "dieses Fluges tust, geht schneller."],
        ["“We're mid-service.” The trolley stays across row {row}.",
         "„Wir sind mitten im Service.“ Der Wagen bleibt quer in Reihe {row} stehen."],

        ["Ask {who} to drop the oxygen masks", "{who} bitten, die Sauerstoffmasken auszulösen"],
        ["It is the wrong oxygen for this and it is oxygen.",
         "Es ist der falsche Sauerstoff dafür, und es ist Sauerstoff."],
        ["Sixty panels open at once with a noise like a deck of cards. The masks come down all " +
         "the way to the tail. Half the cabin puts one on and the other half looks at it.",
         "Sechzig Klappen gehen auf einmal auf, mit einem Geräusch wie ein Kartenspiel. Die " +
         "Masken kommen bis ins Heck herunter. Die halbe Kabine setzt eine auf, die andere " +
         "Hälfte sieht sie an."],
        ["“Oxygen and fire.” They are not wrong. They are also not right.",
         "„Sauerstoff und Feuer.“ Damit haben sie nicht unrecht. Recht haben sie auch nicht."],

        ["Ask {who} to make an announcement", "{who} um eine Durchsage bitten"],
        ["One sentence to sixty people beats sixty conversations.",
         "Ein Satz an sechzig Menschen schlägt sechzig Gespräche."],
        ["PA: “Ladies and gentlemen, cabin crew — we have a small fire in the cabin and it is " +
         "being dealt with. Please remain seated with your seatbelts fastened.” The word remain " +
         "is doing a great deal of work.",
         "Durchsage: „Sehr geehrte Damen und Herren, hier ist die Kabinencrew — wir haben ein " +
         "kleines Feuer in der Kabine, und es wird sich darum gekümmert. Bitte bleiben Sie " +
         "angeschnallt sitzen.“ Das Wort bleiben leistet hier sehr viel Arbeit."],
        ["“That would cause a panic.” It would. That is not the same as it being wrong.",
         "„Das würde eine Panik auslösen.“ Würde es. Das ist nicht dasselbe, wie falsch zu sein."],

        ["Tell {who} to call the flight deck", "{who} sagen, das Cockpit anzurufen"],
        ["The two people who can put this aeroplane on the ground do not know yet. Told, they " +
         "get it down sooner, and sooner is ninety seconds you do not get.",
         "Die zwei Menschen, die dieses Flugzeug an den Boden bringen können, wissen es noch " +
         "nicht. Sagt man es ihnen, bringen sie es früher herunter, und früher sind neunzig " +
         "Sekunden, die du nicht bekommst."],
        ["{who} picks up the handset. Whatever they say takes nine seconds and the nose is down " +
         "before they have hung it up.",
         "{who} nimmt den Hörer ab. Was auch immer gesagt wird, dauert neun Sekunden, und die " +
         "Nase ist unten, bevor aufgelegt ist."],
        ["“Not yet. We assess first, then we call.” That is the procedure and the procedure is " +
         "costing you ninety seconds a minute.",
         "„Noch nicht. Erst beurteilen, dann melden.“ Das ist das Verfahren, und das Verfahren " +
         "kostet dich neunzig Sekunden pro Minute."],

        // ----------------------------------------------------------- pouring and smothering ---
        // These are read inside "Du gießt {what} darauf", so they are accusative.
        ["the nine litres in the bin liner", "die neun Liter im Müllsack"],
        ["the water bottle", "die Wasserflasche"],
        ["the wet blanket", "die nasse Decke"],
        ["the damp towel", "das feuchte Handtuch"],
        ["the blanket", "die Decke"],
        ["your jacket", "deine Jacke"],

        ["{who} has hold of your arm. ", "{who} hält deinen Arm fest. "],
        ["You put {what} on it. ", "Du gibst {what} darauf. "],
        ["It goes out. For a moment there is nothing there at all, and it is the best moment of " +
         "your afternoon.",
         "Es geht aus. Einen Moment lang ist da überhaupt nichts, und es ist der beste Moment " +
         "deines Nachmittags."],
        ["It drops to {what}.", "Es geht zurück auf: {what}."],
        [" Some of it gets into the bin and the case gets cooler, which is the only part of this " +
         "that counts.",
         " Etwas davon kommt ins Gepäckfach, und der Koffer wird kühler, und das ist der " +
         "einzige Teil davon, der zählt."],
        [" None of it reaches the bin.", " Nichts davon erreicht das Gepäckfach."],

        ["Pour {what} on it", "{what} darauf gießen"],
        ["{n} left. It will come down on whoever is sitting under it.",
         "Noch {n}. Es kommt auf dem herunter, der darunter sitzt."],
        ["It will come down on whoever is sitting under it.",
         "Es kommt auf dem herunter, der darunter sitzt."],
        // "mit" would want the dative and {what} arrives in the accusative, so the German
        // verb is one that takes the accusative and the phrase stays true: lay it over the top.
        ["Smother it with {what}", "{what} darüberlegen"],
        ["This is what everybody does and it is very nearly useless.",
         "Das macht jeder, und es ist beinahe nutzlos."],
        ["Dry, it takes some of the air off it, and it will not stay a blanket for long.",
         "Trocken nimmt sie ihm etwas Luft, und sie bleibt nicht lange eine Decke."],
        ["Takes the air off it without spreading it about.",
         "Nimmt ihm die Luft, ohne es zu verteilen."],
        [" The blanket burns through and you drop what is left of it.",
         " Die Decke brennt durch, und du lässt fallen, was von ihr übrig ist."],
        [" The blanket is scorched through in two places.",
         " Die Decke ist an zwei Stellen durchgesengt."],
    ]);
})(window);
