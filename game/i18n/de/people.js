// German: the people deck, the things in other people's laps, walking, and yourself.
//
// The people deck is the half of the game that matters, and it is the half that is hardest to
// translate honestly, because English can say "them" about one person and German has to decide.
// It does not decide: where the English is deliberately unspecific, the German is built round
// "die Person" or recast so that no pronoun is needed at all, which is what a German writer
// would do anyway. Nobody in this cabin is given a gender the roster did not give them.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    PRS.i18n.add("de", [
        // ------------------------------------------------------- what the floor here is like ---
        ["Clear air, and a door right there. As good as this floor gets.",
         "Klare Luft, und eine Tür direkt da. Besser wird dieser Boden nicht."],
        ["Breathable, and not far from a door.", "Atembar, und nicht weit von einer Tür."],
        ["The air here is going, and the door is a long way off.",
         "Die Luft hier geht, und die Tür ist weit weg."],
        ["This is where the fire is. On the floor here is still here.",
         "Hier ist das Feuer. Am Boden hier ist immer noch hier."],

        // ------------------------------------------------------------------------- carrying ---
        ["Pick up {who}", "{who} hochnehmen"],
        ["You get {who} out of {seat} and into your arms. The nearest door is {rows} rows away. ",
         "Du bekommst {who} aus {seat} heraus und auf die Arme. Die nächste Tür ist {rows} " +
         "Reihen entfernt. "],
        ["Put {who} down here", "{who} hier absetzen"],
        ["{who} is on the floor at {where}, out of the seats and under the smoke. {air}",
         "{who} liegt {where} am Boden, raus aus den Sitzen und unter dem Rauch. {air}"],
        [" They do not know any of this yet.", " Davon weiß die Person noch nichts."],
        ["You put {who} down at {where}. ", "Du setzt {who} {where} ab. "],
        ["They are no better off than they were in {seat}.",
         "Besser als auf {seat} ist das nicht."],
        ["It is a little better than {seat}, and not much.",
         "Ein bisschen besser als {seat}, und nicht viel."],

        ["Drag {who} along the floor by the strap", "{who} am Gurt über den Boden ziehen"],
        ["Drag {who} along the floor", "{who} über den Boden ziehen"],
        ["{kg}kg. Slower than carrying, and it works on people you cannot lift.",
         "{kg} kg. Langsamer als Tragen, und es geht bei Menschen, die du nicht heben kannst."],
        [" The strap is a handle.", " Der Gurt ist ein Griff."],
        ["You get {who} under the arms and start dragging. It is undignified, it is slow, and it " +
         "is under the smoke.",
         "Du fasst {who} unter die Achseln und fängst an zu ziehen. Es ist würdelos, es ist " +
         "langsam, und es ist unter dem Rauch."],
        ["Stop dragging {who}", "{who} nicht weiter ziehen"],
        ["them", "die Person"],
        ["Your hands are empty.", "Deine Hände sind leer."],

        // ---------------------------------------------------------------------- recruiting ---
        ["Ask {who} to help you", "{who} um Hilfe bitten"],
        ["They are not going to say yes.", "Die Person wird nicht ja sagen."],
        ["They are unlikely to say yes.", "Die Person sagt wahrscheinlich nicht ja."],
        ["They are probably going to say yes.", "Die Person sagt vermutlich ja."],
        ["They are going to say yes.", "Die Person wird ja sagen."],
        [" They are {condition} and they will not last long on their feet.",
         " Zustand: {condition}. Lange bleibt die Person nicht auf den Beinen."],
        [" They are already coughing.", " Die Person hustet schon."],
        [" You have soaked them, and they remember.",
         " Du hast sie nass gemacht, und sie erinnert sich daran."],
        ["{who}: {said} (Ask again. It gets easier every time, and it gets easier faster if they " +
         "can see the fire.)",
         "{who}: {said} (Frag noch einmal. Es wird jedes Mal leichter, und es wird schneller " +
         "leichter, wenn die Person das Feuer sehen kann.)"],
        ["They are going to work the cabin until this ends.",
         "Sie arbeitet die Kabine ab, bis das hier vorbei ist."],
        ["{who} unbuckles, stands up, and asks who is next. {n} now working the cabin as well as " +
         "you.",
         "{who} macht den Gurt auf, steht auf und fragt, wer der Nächste ist. {n} jetzt außer " +
         "dir an der Kabine."],

        ["Send {who} for {whom}", "{who} zu {whom} schicken"],
        ["{seat} · {kg}kg · {condition}", "{seat} · {kg} kg · {condition}"],
        ["{who} goes for {whom} in {seat} without asking you a single question about it.",
         "{who} geht zu {whom} auf {seat}, ohne dir eine einzige Frage dazu zu stellen."],

        // ------------------------------------------------------------------------- talking ---
        ["Tell {who} there is a fire", "{who} sagen, dass es brennt"],
        ["They want to see it, not hear about it.",
         "Die Person will es sehen, nicht davon hören."],
        ["They are listening to you now.", "Die Person hört dir jetzt zu."],
        ["They are not going to believe you.", "Die Person wird dir nicht glauben."],
        ["{who}: “If you say so.” They do not believe you. They believe that you believe it.",
         "{who}: „Wenn Sie das sagen.“ Die Person glaubt dir nicht. Sie glaubt, dass du es " +
         "glaubst."],
        ["{who} looks up at the locker, then at you, then at the locker. “...Right. Right.”",
         "{who} sieht hoch zum Gepäckfach, dann dich an, dann wieder das Fach. „…Gut. Gut.“"],

        ["Show {who} the photograph", "{who} das Foto zeigen"],
        ["Telling people is slow. Showing them is not.",
         "Erzählen ist langsam. Zeigen nicht."],
        ["{who} looks at your phone for two full seconds and then unbuckles their seatbelt " +
         "without being asked.",
         "{who} sieht zwei ganze Sekunden lang auf dein Handy und macht dann ungefragt den " +
         "Gurt auf."],

        ["Calm {who} down", "{who} beruhigen"],
        ["They have had enough of you. Thirteen seconds of talking gets their hand off your arm.",
         "Die Person hat genug von dir. Dreizehn Sekunden Reden bringen ihre Hand von deinem " +
         "Arm."],
        ["A panicking person is a person who cannot be asked to do anything.",
         "Eine Person in Panik ist eine Person, die man um nichts bitten kann."],
        ["{who}'s breathing comes down. It takes thirteen seconds and it is thirteen seconds " +
         "well spent.",
         "Die Atmung von {who} geht runter. Es dauert dreizehn Sekunden, und es sind dreizehn " +
         "gut investierte Sekunden."],

        // ------------------------------------------------------------------------ the body ---
        ["Shake {who} awake", "{who} wach rütteln"],
        ["{who} comes up out of it badly. {said}",
         "{who} kommt schlecht daraus hoch. {said}"],

        ["Put burn gel on {who}", "{who} Brandgel geben"],
        ["Burn gel and a dressing on {who}. It will not stop them being in hospital tonight. It " +
         "will stop them being in hospital for a month.",
         "Brandgel und ein Verband auf {who}. Das verhindert nicht, dass die Person heute Nacht " +
         "im Krankenhaus liegt. Es verhindert, dass sie einen Monat dort liegt."],

        ["Give {who} the inhaler", "{who} den Inhalator geben"],
        ["Two puffs and a spacer made out of a paper cup. {who} gets a breath in that goes all " +
         "the way down.",
         "Zwei Hübe und ein Vorschaltrohr aus einem Pappbecher. {who} kriegt einen Atemzug hin, " +
         "der ganz nach unten geht."],

        ["Put the oxygen mask on {who}", "{who} die Sauerstoffmaske aufsetzen"],
        ["It is not oxygen for smoke. It is better than smoke.",
         "Es ist nicht der Sauerstoff für Rauch. Er ist besser als Rauch."],
        ["{who} has a mask on. It is a chemical oxygen generator designed for a decompression " +
         "and it is going to help anyway.",
         "{who} hat eine Maske auf. Es ist ein chemischer Sauerstoffgenerator für einen " +
         "Druckabfall, und er wird trotzdem helfen."],

        ["Tie something wet over {who}'s face", "{who} etwas Nasses vors Gesicht binden"],
        ["Not as good as a mask. Available now, which a mask is not.",
         "Nicht so gut wie eine Maske. Jetzt verfügbar, was eine Maske nicht ist."],
        ["You tie {what} over {who}'s nose and mouth. They can breathe through it, which is the " +
         "entire specification.",
         "Du bindest {what} über Mund und Nase von {who}. Die Person kann dadurch atmen, und " +
         "das ist die ganze Anforderung."],

        ["Take {who}'s headphones off", "{who} die Kopfhörer abnehmen"],
        ["They have not heard one word of any of this.",
         "Die Person hat von alldem kein Wort gehört."],
        ["You lift {who}'s headphones off. The cabin arrives all at once and their face does " +
         "something complicated.",
         "Du hebst {who} die Kopfhörer ab. Die Kabine kommt auf einmal an, und das Gesicht macht " +
         "etwas Kompliziertes."],

        ["Get {who} down onto the floor", "{who} auf den Boden bringen"],
        ["The smoke is at the ceiling. A person on the floor is in different air.",
         "Der Rauch ist an der Decke. Ein Mensch am Boden ist in anderer Luft."],
        ["{who} gets down between the seat rows, under the layer. Nothing about their situation " +
         "has improved except the only thing that matters.",
         "{who} geht zwischen den Sitzreihen runter, unter die Schicht. An der Lage hat sich " +
         "nichts verbessert außer dem Einzigen, worauf es ankommt."],

        ["Give {who} some water", "{who} Wasser geben"],
        ["{who} drinks it and hands the bottle back and is, from this moment, on your side.",
         "{who} trinkt und gibt die Flasche zurück und ist von diesem Moment an auf deiner " +
         "Seite."],

        ["Tell {who} to get to a door and get down",
         "{who} sagen: zu einer Tür und hinlegen"],
        ["The cheapest move there is, and it only works on the ones who can walk.",
         "Der billigste Zug, den es gibt, und er geht nur bei denen, die gehen können."],
        ["{who} gets up, walks to {where} and gets down on the floor there without being carried, " +
         "which took eighteen seconds instead of fifty.",
         "{who} steht auf, geht {where} und legt sich dort auf den Boden, ohne getragen zu " +
         "werden, und das hat achtzehn Sekunden gedauert statt fünfzig."],

        // ------------------------------------------------- what other people have in their laps ---
        ["Ask {who} what they have got", "{who} fragen, was sie dabeihat"],
        ["Seven seconds. Most of the useful objects on this aeroplane are in a lap.",
         "Sieben Sekunden. Die meisten nützlichen Dinge in diesem Flugzeug liegen auf einem " +
         "Schoß."],
        ["{who} has {what}. {note}", "{who} hat {what}. {note}"],
        ["Ask {who} for the {what}", "{who} um {what} bitten"],
        ["“It's mine.” {who} is not being unreasonable and it is not going to feel that way.",
         "„Das gehört mir.“ {who} ist nicht unvernünftig, und so wird es sich nicht anfühlen."],
        ["{who} hands it over without being asked twice. You have {what}.",
         "{who} gibt es her, ohne dass man zweimal fragen muss. Du hast {what}."],
        ["Take the {what} from {who}", "{what} von {who} nehmen"],
        ["They are not using it and they are not going to mind.",
         "Die Person braucht es nicht, und es wird sie nicht stören."],
        ["You take it out of {who}'s hands. They do not react, which is the whole reason you are " +
         "allowed to.",
         "Du nimmst es {who} aus den Händen. Keine Reaktion, und genau deshalb darfst du es."],
        ["Ask out loud whether anybody has anything useful",
         "Laut fragen, ob jemand etwas Nützliches hat"],
        ["One question to four rows. It is how you find the things you did not pack.",
         "Eine Frage an vier Reihen. So findest du die Dinge, die du nicht eingepackt hast."],
        ["Four rows of people look at you and at each other and nobody says anything, which is " +
         "what four rows of people do.",
         "Vier Reihen Menschen sehen dich an und einander an, und niemand sagt etwas, und das " +
         "ist es, was vier Reihen Menschen tun."],
        ["Hands go up. You come away with {what}, none of which you would have thought to pack.",
         "Hände gehen hoch. Du kommst mit {what} weg, und auf nichts davon wärst du beim Packen " +
         "gekommen."],
        ["Go through the galley drawers", "Schubladen der Bordküche durchsehen"],
        ["Nobody has told you that you cannot and nobody is going to.",
         "Niemand hat dir gesagt, dass du nicht darfst, und niemand wird es tun."],
        ["Cups, napkins, a hundred and forty sachets of sugar.",
         "Becher, Servietten, hundertvierzig Tütchen Zucker."],
        ["In the second drawer down: {what}. {note}",
         "In der zweiten Schublade von oben: {what}. {note}"],

        // -------------------------------------------------------------------------- walking ---
        ["It is {what} where you are standing.", "Dort, wo du stehst: {what}."],
        ["Smoke: {what}.", "Rauch: {what}."],
        ["You are on top of {who}.", "Du stehst auf {who}."],
        ["You are at {where}. ", "Du bist {where}. "],
        ["Go to {where}", "Gehen: {where}"],
        ["Stand back up", "Wieder aufstehen"],
        ["Get down and crawl", "Runter und kriechen"],
        ["The smoke is at the ceiling and the air is at the floor. Down there you breathe less " +
         "than half of it, and every step takes half again as long.",
         "Der Rauch ist an der Decke und die Luft am Boden. Da unten atmest du weniger als die " +
         "Hälfte davon, und jeder Schritt dauert halb so lang wieder länger."],
        ["You go down onto your hands and knees. The air down here is startlingly better and you " +
         "can see forty rows of shoes.",
         "Du gehst auf Hände und Knie. Die Luft hier unten ist erschreckend viel besser, und du " +
         "siehst vierzig Reihen Schuhe."],
        ["You stand back up into the grey.", "Du stehst wieder auf, ins Grau."],

        // ------------------------------------------------------------------------- yourself ---
        ["Put on the smoke hood", "Rauchhaube aufsetzen"],
        ["Fifteen minutes of air. It is the whole flight and it is twenty-six seconds.",
         "Fünfzehn Minuten Luft. Das ist der ganze Flug, und es kostet sechsundzwanzig Sekunden."],
        ["The foil packet, the seal round the neck, and then the whole cabin goes quiet and " +
         "slightly yellow and you can breathe. You can just breathe. Nobody else on this " +
         "aeroplane can do that.",
         "Die Folienpackung, die Dichtung um den Hals, und dann wird die ganze Kabine leise und " +
         "leicht gelb, und du kannst atmen. Du kannst einfach atmen. Niemand sonst in diesem " +
         "Flugzeug kann das."],

        ["Tie something wet over your face", "Etwas Nasses vors Gesicht binden"],
        ["Over the nose and mouth, tied at the back. It stops the particles and it does nothing " +
         "at all about the carbon monoxide, and one out of two is the best offer on this " +
         "aeroplane.",
         "Über Mund und Nase, hinten geknotet. Es hält die Partikel auf und tut überhaupt nichts " +
         "gegen das Kohlenmonoxid, und eins von zwei ist das beste Angebot in diesem Flugzeug."],

        ["Use the inhaler yourself", "Inhalator selbst benutzen"],
        ["Two puffs. The bottom of your lungs comes back online.",
         "Zwei Hübe. Der untere Teil deiner Lunge geht wieder ans Netz."],

        ["Put the swimming goggles on", "Schwimmbrille aufsetzen"],
        ["You put mirrored swimming goggles on in a burning aeroplane and you can suddenly keep " +
         "your eyes open in smoke that has everybody else's shut. You look absurd. You look " +
         "absurd and you can see.",
         "Du setzt in einem brennenden Flugzeug eine verspiegelte Schwimmbrille auf und kannst " +
         "auf einmal die Augen offen halten in Rauch, der alle anderen blind macht. Du siehst " +
         "absurd aus. Du siehst absurd aus und du siehst etwas."],

        ["Put the hi-vis vest on", "Warnweste anziehen"],
        ["You put on a hi-vis vest. Nothing about you has changed and the way everybody in four " +
         "rows looks at you has changed completely.",
         "Du ziehst eine Warnweste an. An dir hat sich nichts geändert, und wie dich alle in " +
         "vier Reihen ansehen, hat sich vollständig geändert."],

        ["Put the welding gloves on", "Schweißerhandschuhe anziehen"],
        ["Elbow-length, leather, from a hobby you have not done since March. You can now pick up " +
         "things that are on fire, which turns out to be the constraint on almost everything.",
         "Ellbogenlang, Leder, aus einem Hobby, das du seit März nicht mehr betrieben hast. Du " +
         "kannst jetzt Dinge anfassen, die brennen, und das ist, wie sich zeigt, bei fast allem " +
         "die Einschränkung."],

        ["Get your own breathing under control", "Eigene Atmung unter Kontrolle bringen"],
        ["Four in, seven hold, eight out, twice. It works. It always works and it is the last " +
         "thing anybody thinks of.",
         "Vier ein, sieben halten, acht aus, zweimal. Es funktioniert. Es funktioniert immer, " +
         "und es ist das Letzte, woran irgendwer denkt."],

        ["Put burn gel on your own hands", "Brandgel auf die eigenen Hände"],
        ["Gel, then a dressing, then the glove back over the top of it. Eighteen seconds and " +
         "your hands are hands again.",
         "Gel, dann ein Verband, dann der Handschuh wieder darüber. Achtzehn Sekunden, und " +
         "deine Hände sind wieder Hände."],
    ]);
})(window);
