// German: the fire deck, the named passengers, and everything you can do to somebody else.
//
// This is where most of the writing is. The rule followed throughout: a label is an imperative
// with the object in front of it, the way a German button reads ("Gepäckfach schließen"), and
// the line the log prints afterwards is a sentence with the rhythm rebuilt rather than carried
// over. English likes a long sentence with commas; German puts the verb at the end and reads
// better in two.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    PRS.i18n.add("de", [
        // ------------------------------------------------------------------------ the fire ---
        ["There is nothing burning within reach of you.",
         "In deiner Reichweite brennt nichts."],
        [" The flame goes flat, gets brighter, and comes back up through it. It is now {what}.",
         " Die Flamme legt sich, wird heller und kommt wieder hoch. Jetzt: {what}."],
        [" It goes out. For a moment there is nothing there at all, and it is the best moment of " +
         "your afternoon.",
         " Es geht aus. Einen Moment lang ist da überhaupt nichts, und es ist der beste Moment " +
         "deines Nachmittags."],
        [" It drops to {what}.", " Es geht zurück auf: {what}."],

        ["Close the overhead bin", "Gepäckfach schließen"],
        ["Take the air away from it. This is what the manual actually says.",
         "Nimm ihm die Luft. Genau das steht im Handbuch."],
        ["You get the latch shut. The noise from inside changes pitch. Containment is now {pct} " +
         "per cent, and every second of that is a second the cabin does not get.",
         "Du kriegst den Verschluss zu. Das Geräusch von innen wechselt die Tonhöhe. Die " +
         "Eindämmung liegt jetzt bei {pct} Prozent, und jede Sekunde davon ist eine Sekunde, " +
         "die die Kabine nicht abbekommt."],
        [" Your hand is burned.", " Deine Hand ist verbrannt."],

        ["Hold the bin shut with your body", "Fach mit dem Körper zuhalten"],
        ["It will not stay latched. You can make it stay latched.",
         "Es bleibt nicht zu. Du kannst dafür sorgen, dass es zubleibt."],
        ["You put your shoulder into the locker door and stand there. It gets hot enough through " +
         "the panel to be a decision. Containment {pct} per cent.",
         "Du stemmst die Schulter gegen die Klappe und bleibst so stehen. Durch die Klappe wird " +
         "es heiß genug, um eine Entscheidung zu sein. Eindämmung {pct} Prozent."],

        ["Tape the bin shut", "Fach zukleben"],
        ["Six strips across the latch. It is not going to open again.",
         "Sechs Streifen über den Verschluss. Das geht nicht wieder auf."],
        ["You run six strips of duct tape over the latch and down the seam. It holds. Containment " +
         "{pct} per cent, and unlike your shoulder, tape does not need to go anywhere.",
         "Du ziehst sechs Streifen Klebeband über den Verschluss und die Fuge hinunter. Es hält. " +
         "Eindämmung {pct} Prozent, und anders als deine Schulter muss Klebeband nirgendwohin."],

        ["Open the bin and look at it", "Fach öffnen und hineinsehen"],
        ["You will find out what this is. It will also get a great deal of air.",
         "Du wirst herausfinden, was das ist. Es wird außerdem sehr viel Luft bekommen."],
        ["The locker comes open and a wall of heat comes out with it. Inside, a hard-shell case " +
         "is burning from the inside out and there is a small cylindrical thing in the middle of " +
         "it going off like a firework every few seconds. It is a vape. It is somebody's vape.",
         "Die Klappe geht auf, und eine Wand aus Hitze kommt mit heraus. Drinnen brennt ein " +
         "Hartschalenkoffer von innen nach außen, und mittendrin geht alle paar Sekunden ein " +
         "kleines zylindrisches Ding hoch wie ein Feuerwerkskörper. Es ist eine Vape. Es ist " +
         "irgendjemandes Vape."],

        ["Pull the burning case out of the bin", "Brennenden Koffer herausziehen"],
        ["You will be holding it. Have a plan for the next fifteen seconds.",
         "Du wirst ihn in den Händen halten. Hab einen Plan für die nächsten fünfzehn Sekunden."],
        ["You get both hands under it and haul it out. It is the size of a cabin bag and it is on " +
         "fire and you are now holding it above your head in a corridor full of seated people.",
         "Du kriegst beide Hände darunter und wuchtest ihn heraus. Er hat die Größe eines " +
         "Handgepäckstücks, er brennt, und du hältst ihn jetzt über dem Kopf in einem Gang " +
         "voller sitzender Menschen."],
        [" The welding gloves are the only reason you still have hands.",
         " Die Schweißerhandschuhe sind der einzige Grund, warum du noch Hände hast."],
        [" You are not wearing gloves. You will feel this for a year.",
         " Du trägst keine Handschuhe. Das wirst du ein Jahr lang spüren."],

        ["Carry the case to the lavatory", "Koffer zum WC tragen"],
        ["There is a sink in there. A sink is a bucket you cannot knock over.",
         "Da drin ist ein Waschbecken. Ein Waschbecken ist ein Eimer, den man nicht umstoßen kann."],
        ["You get it down the aisle at arm's length, past eleven rows of people who move for the " +
         "first time all flight, and into the lavatory.",
         "Du bringst ihn mit ausgestreckten Armen den Gang hinunter, an elf Reihen Menschen " +
         "vorbei, die sich zum ersten Mal auf diesem Flug bewegen, und ins WC."],

        ["Put the case in the sink and run the tap", "Koffer ins Becken und Wasser laufen lassen"],
        ["This is the correct answer. Nobody in the history of this has done it in time.",
         "Das ist die richtige Antwort. Niemand hat sie je rechtzeitig gegeben."],
        ["You jam the case into the basin and hold the tap open with your elbow. It does not go " +
         "out — a cell in runaway makes its own oxygen and there are {n} of them left — but " +
         "every one of them is now going to vent under nine centimetres of water instead of " +
         "into a locker above somebody's head.",
         "Du klemmst den Koffer ins Becken und hältst den Hahn mit dem Ellbogen offen. Er geht " +
         "nicht aus — eine durchgehende Zelle macht ihren eigenen Sauerstoff, und es sind noch " +
         "{n} davon übrig —, aber jede einzelne wird jetzt unter neun Zentimetern Wasser " +
         "abblasen statt in einem Gepäckfach über irgendjemandes Kopf."],
        ["This is the best thing you will do today and nobody will ever know you did it.",
         "Das ist das Beste, was du heute tun wirst, und niemand wird je erfahren, dass du es " +
         "getan hast."],

        ["Throw everything else out of the bin", "Alles andere aus dem Fach werfen"],
        ["The fuel is not the fire. The fuel is four cabin bags and a coat.",
         "Der Brennstoff ist nicht das Feuer. Der Brennstoff sind vier Handgepäckstücke und ein " +
         "Mantel."],
        ["You throw four cabin bags, a wax jacket and a bag of Toblerone into the aisle. There " +
         "is measurably less to burn up there now.",
         "Du wirfst vier Handgepäckstücke, eine Wachsjacke und eine Tüte Toblerone in den Gang. " +
         "Da oben gibt es jetzt messbar weniger zu verbrennen."],

        ["Discharge the halon bottle into it", "Halonflasche hineinentladen"],
        ["The real thing. It works. It works on the flame, which is not the fire.",
         "Das echte Mittel. Es wirkt. Es wirkt auf die Flamme, und die ist nicht das Feuer."],
        ["You pull the pin and put the whole bottle into the locker. Everything orange in a " +
         "three metre radius stops being orange at once.",
         "Du ziehst den Stift und gibst die ganze Flasche ins Fach. Alles Orange im Umkreis von " +
         "drei Metern hört auf einmal auf, orange zu sein."],

        ["Water extinguisher from the galley", "Wasserlöscher aus der Bordküche"],
        ["Nine litres under pressure, straight in.", "Neun Liter unter Druck, direkt hinein."],

        ["Wet the row the fire is going to reach next",
         "Reihe nässen, die als Nächstes drankommt"],
        ["Not the fire. The seats beside it, and the people in them.",
         "Nicht das Feuer. Die Sitze daneben, und die Menschen darin."],
        ["You put the water on {n} tiles of seat that are not burning yet. Nothing visible " +
         "happens, which is how you know it was the right thing to do.",
         "Du gießt das Wasser auf {n} Felder Sitz, die noch nicht brennen. Sichtbar passiert " +
         "nichts, und genau daran erkennst du, dass es richtig war."],

        ["Pull the burning seat cushion out", "Brennendes Sitzkissen herausreißen"],
        ["Take the fuel away from the fire rather than the fire away from the fuel.",
         "Nimm dem Feuer den Brennstoff statt dem Brennstoff das Feuer."],
        ["You rip the cushion out of the frame. Most of the fire goes with it, and you throw it " +
         "down the aisle onto carpet over aluminium, where there is nothing for it to eat.",
         "Du reißt das Kissen aus dem Rahmen. Der größte Teil des Feuers geht mit, und du wirfst " +
         "es den Gang hinunter auf Teppich über Aluminium, wo es nichts zu fressen gibt."],

        ["Photograph the fire", "Feuer fotografieren"],
        ["Evidence. This is worth more than a bottle of water and it costs six seconds.",
         "Ein Beweis. Der ist mehr wert als eine Flasche Wasser und kostet sechs Sekunden."],
        ["Four photographs and eleven seconds of video of an overhead locker with flame coming " +
         "out of the seam. You now have something to show people instead of something to say to " +
         "them.",
         "Vier Fotos und elf Sekunden Video von einem Gepäckfach, aus dessen Fuge eine Flamme " +
         "kommt. Jetzt hast du den Leuten etwas zu zeigen statt etwas zu sagen."],

        ["Point at it and say nothing", "Darauf zeigen und nichts sagen"],
        ["For the people nearby who have still not looked up.",
         "Für die in der Nähe, die immer noch nicht hochgesehen haben."],
        ["You point at it. You do not explain. {n} people look where you are pointing, which is " +
         "more than have looked all flight.",
         "Du zeigst darauf. Du erklärst nichts. {n} Menschen sehen dorthin, wohin du zeigst, " +
         "und das sind mehr, als den ganzen Flug lang hingesehen haben."],

        ["Tape over the air vents in this row", "Luftdüsen dieser Reihe zukleben"],
        ["You tape over the gasper outlets down the whole row. It is a small thing and it " +
         "visibly slows the grey.",
         "Du klebst die Luftdüsen der ganzen Reihe zu. Es ist eine Kleinigkeit, und sie bremst " +
         "das Grau sichtbar."],

        // ----------------------------------------------------------------- the ones with names ---
        ["Make {who} look at the open bin", "{who} ins offene Fach sehen lassen"],
        ["A sceptic does not need persuading. A sceptic needs seeing.",
         "Ein Skeptiker muss nicht überzeugt werden. Ein Skeptiker muss sehen."],
        ["{who} looks at it for about four seconds and something goes out of their face. They " +
         "are not a sceptic any more and they never will be again about anything.",
         "{who} sieht etwa vier Sekunden lang hinein, und aus dem Gesicht weicht etwas. Diese " +
         "Person ist kein Skeptiker mehr und wird es nie wieder sein, in gar nichts."],

        ["Give {who} a job", "{who} eine Aufgabe geben"],
        ["The obstructive ones obstruct because nobody has given them anything to do.",
         "Die Störenden stören, weil ihnen niemand etwas zu tun gegeben hat."],
        ["The man who was telling you to sit down is now carrying people forward.",
         "Der Mann, der dir gesagt hat, du sollst dich hinsetzen, trägt jetzt Menschen nach vorn."],
        ["“Fine. Fine! What do you want me to do.” And then {who} does it, faster and better " +
         "than anybody, because being useful is all they ever wanted.",
         "„Gut. Gut! Was soll ich tun.“ Und dann tut {who} es, schneller und besser als alle " +
         "anderen, weil nützlich zu sein alles war, was diese Person je wollte."],
        ["“I'm not taking instructions from you.”",
         "„Von Ihnen lasse ich mir nichts sagen.“"],

        ["Tell {who} to act like crew", "{who} sagen, wie Crew zu handeln"],
        ["They know the aeroplane, the drill and the kit. They are in seat 15E.",
         "Diese Person kennt das Flugzeug, das Verfahren und die Ausrüstung. Sie sitzt auf 15E."],
        ["“It isn't my aeroplane and it isn't my licence.”",
         "„Es ist nicht mein Flugzeug und nicht meine Lizenz.“"],
        ["They know where everything is stowed, which you do not.",
         "Diese Person weiß, wo alles verstaut ist, und du nicht."],
        ["{who} stands up and stops being a passenger. Inside twenty seconds they have the aft " +
         "galley open, a bottle in their hand and two rows moving. This is what the training is " +
         "for and it does not care whose aeroplane it is.",
         "{who} steht auf und hört auf, Passagier zu sein. Binnen zwanzig Sekunden ist die " +
         "hintere Bordküche offen, eine Flasche in der Hand und zwei Reihen in Bewegung. Dafür " +
         "ist die Ausbildung da, und es ist ihr egal, wessen Flugzeug das ist."],

        ["Take {who} under the other arm", "{who} unter den anderen Arm nehmen"],
        ["Children weigh nothing. You can do two.",
         "Kinder wiegen nichts. Zwei schaffst du."],
        ["One under each arm. {who} weighs {kg} kilos and does not struggle, which is somehow " +
         "worse than struggling.",
         "Unter jedem Arm eines. {who} wiegt {kg} Kilo und wehrt sich nicht, was irgendwie " +
         "schlimmer ist als sich zu wehren."],

        ["Ask Chip Vanterpool what is in the bag",
         "Chip Vanterpool fragen, was in der Tasche ist"],
        ["It is his bag. He knows. He has known for eleven minutes.",
         "Es ist seine Tasche. Er weiß es. Er weiß es seit elf Minuten."],
        ["“It's a vape.”", "„Es ist eine Vape.“"],
        ["He says it to the tray table. “It's a vape, it got wet in Málaga, it's been getting hot " +
         "in my pocket all week and I put it in the case so I'd stop thinking about it.”",
         "Er sagt es zum Klapptisch. „Es ist eine Vape, sie ist in Málaga nass geworden, sie " +
         "wird die ganze Woche schon heiß in meiner Tasche, und ich habe sie in den Koffer " +
         "getan, damit ich aufhöre, daran zu denken.“"],
        ["You now know exactly what this is, eleven minutes before anybody else was going to.",
         "Jetzt weißt du genau, was das ist, elf Minuten bevor es irgendwer sonst gewusst hätte."],

        ["Ask Wilbur Ansty what he thinks it is",
         "Wilbur Ansty fragen, was er für möglich hält"],
        ["He flew Vulcans. He has smelled this before, on an aeroplane, on purpose.",
         "Er ist Vulcans geflogen. Er hat das schon gerochen, in einem Flugzeug, mit Absicht."],
        ["“Lithium. It's lithium. You can't put it out and you mustn't try to smother it, you " +
         "have to cool it, and the only thing on this aeroplane that cools anything is the tap " +
         "in the lavatory.”",
         "„Lithium. Das ist Lithium. Man kann es nicht löschen, und man darf nicht versuchen, es " +
         "zu ersticken, man muss es kühlen, und das Einzige in diesem Flugzeug, das irgendetwas " +
         "kühlt, ist der Wasserhahn im WC.“"],
        ["He is eighty-six and he has just told you the answer.",
         "Er ist sechsundachtzig, und er hat dir gerade die Antwort gesagt."],

        ["Keep pouring water on the same spot", "Weiter auf dieselbe Stelle gießen"],
        ["Not to put it out. To keep the case below the temperature the next cell needs, and " +
         "everybody in the row is going to get wet.",
         "Nicht zum Löschen. Um den Koffer unter der Temperatur zu halten, die die nächste Zelle " +
         "braucht, und alle in der Reihe werden nass."],
        ["Thirty seconds of pouring the same bottle onto the same seam. Nothing looks different. " +
         "The next cell is now {eta} away instead of thirty seconds away, and that is what " +
         "cooling means.",
         "Dreißig Sekunden lang dieselbe Flasche auf dieselbe Fuge. Es sieht nicht anders aus. " +
         "Die nächste Zelle ist jetzt {eta} entfernt statt dreißig Sekunden, und genau das " +
         "heißt kühlen."],

        ["Tell {who} it is a lithium battery: water, not halon",
         "{who} sagen: Lithiumakku, Wasser statt Halon"],
        ["There is a specific drill for this and it is not the drill they are doing. You only " +
         "know it because you looked, or because Wilbur told you.",
         "Dafür gibt es ein eigenes Verfahren, und es ist nicht das, das gerade gemacht wird. Du " +
         "weißt es nur, weil du nachgesehen hast oder weil Wilbur es dir gesagt hat."],
        ["“Lithium?” Everything in {who}'s training reorders itself in about a second and a " +
         "half. “Water. Not the BCF. Water, and keep putting water on it.” Which is right, and " +
         "which the next cell is going to notice.",
         "„Lithium?“ Alles, was {who} gelernt hat, ordnet sich in etwa anderthalb Sekunden neu. " +
         "„Wasser. Nicht das BCF. Wasser, und immer weiter Wasser drauf.“ Was richtig ist, und " +
         "was die nächste Zelle merken wird."],

        ["Stand on a seat and address the cabin", "Auf einen Sitz stellen und zur Kabine sprechen"],
        ["Everybody within six rows, once, and you only get one of these.",
         "Alle im Umkreis von sechs Reihen, einmal, und du hast davon nur eine."],
        ["You stand on an armrest and give thirty seconds of the worst and most sincere speech " +
         "of your life. {n} people are moved by it. The rest of them are embarrassed, which is a " +
         "thing people can still be eleven minutes into this.",
         "Du stellst dich auf eine Armlehne und hältst dreißig Sekunden lang die schlechteste " +
         "und aufrichtigste Rede deines Lebens. {n} Menschen bewegt sie. Den übrigen ist sie " +
         "peinlich, und peinlich kann Menschen elf Minuten nach Beginn davon immer noch etwas " +
         "sein."],

        // ------------------------------------------------------------------- giving things away ---
        ["Hand {who} the {what}", "{who} {what} geben"],
        ["You will not have it any more. They will.",
         "Du hast es dann nicht mehr. Die Person schon."],
        ["You hand {who} the {what} and do not explain and do not wait. It is the best use of " +
         "that object available and it is now somebody else's problem to use it well.",
         "Du gibst {who} {what} und erklärst nichts und wartest nicht. Es ist die beste " +
         "verfügbare Verwendung für diesen Gegenstand, und ihn gut zu benutzen ist jetzt das " +
         "Problem von jemand anderem."],
    ]);
})(window);
