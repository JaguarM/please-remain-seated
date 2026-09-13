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
        // ------------------------------------------------------------------------ the fleet ---
        //
        // An aircraft type is a proper noun and stays in English: a German pilot says
        // "Beechcraft 1900D" too. The descriptions are not, and "narrowbody" has no German noun
        // that anybody says out loud - "Schmalrumpfflugzeug" is a word in a dictionary - so it
        // is what the thing is: one aisle.
        ["Transnational 447", "Transnational 447"],
        ["Single-aisle narrowbody", "Einzelgang-Schmalrumpf"],
        ["Sixty-one souls, twenty-three rows and three cabin crew. Fifteen minutes.",
         "Einundsechzig Seelen, dreiundzwanzig Reihen und drei Flugbegleiter. Fünfzehn Minuten."],
        ["Coastal Link 2231", "Coastal Link 2231"],
        ["Beechcraft 1900D", "Beechcraft 1900D"],
        ["Nineteen seats, one lavatory, and no cabin crew. You are what this aeroplane has.",
         "Neunzehn Sitze, eine Toilette und keine Flugbegleiter. Du bist das, was dieses " +
         "Flugzeug hat."],

        // Painted down the side of a galley: one short word, and it has to fit on one tile.
        ["GALLEY", "BORDKÜCHE"],
        ["CLOSET", "SCHRANK"],
        ["BAGS", "GEPÄCK"],

        ["Coastal Link 2231, eleven thousand feet, island to mainland, nineteen souls and no " +
         "cabin crew. There is something burning in the locker above {seat}. The flight deck " +
         "is a locked door and everyone else on board is older than you or asleep.",
         "Coastal Link 2231, elftausend Fuß, von der Insel aufs Festland, neunzehn Seelen und " +
         "keine Flugbegleiter. Im Gepäckfach über {seat} brennt etwas. Das Cockpit ist eine " +
         "verschlossene Tür, und alle anderen an Bord sind älter als du oder schlafen."],

        // ------------------------------------------------------------ the last four minutes ---
        //
        // "Schlussvier" was tried and dropped: it is a coinage, and the whole point of the
        // scenario's name is that it says plainly what you are getting.
        ["The last four minutes", "Die letzten vier Minuten"],
        ["Four minutes, nineteen seats, and a cabin that cannot walk itself out. Start here.",
         "Vier Minuten, neunzehn Sitze und eine Kabine, die nicht allein hinauskommt. Fang " +
         "hier an."],
        ["Coastal Link 2231, four minutes out, nineteen souls and no cabin crew. The locker " +
         "above {seat} has been alight for three minutes and you have spent one of those " +
         "deciding it was really happening. Almost nobody on this aeroplane can get themselves " +
         "off it.",
         "Coastal Link 2231, vier Minuten vor der Landung, neunzehn Seelen und keine " +
         "Flugbegleiter. Das Gepäckfach über {seat} brennt seit drei Minuten, und eine davon " +
         "hast du damit verbracht, dir einzugestehen, dass es wirklich passiert. Fast niemand " +
         "in diesem Flugzeug kommt allein heraus."],

        // The tutorial's own lines. They arrive in the log in the middle of a flight, so they
        // are the same voice as every other rule the game states: flat, present tense, second
        // person, and never a word of encouragement.
        ["The clock moved because you moved. It is the only thing that moves it: stand still " +
         "and read the cabin for as long as you like, it costs you nothing.",
         "Die Uhr ist gelaufen, weil du gelaufen bist. Nur das bewegt sie: Bleib stehen und " +
         "lies die Kabine, so lange du willst, es kostet dich nichts."],
        ["Nobody is going to take your word for it, and they are right not to. Show them " +
         "something instead: the open locker, the photograph, your hand. A sceptic is not " +
         "talked round. A sceptic is shown.",
         "Niemand nimmt dir das einfach ab, und das zu Recht. Zeig ihnen stattdessen etwas: " +
         "das offene Fach, das Foto, deine Hand. Einen Skeptiker überredet man nicht. Einem " +
         "Skeptiker zeigt man es."],
        ["That one works for the rest of the flight without being asked again. Every other " +
         "pair of hands on this aeroplane is worth more than anything in your bag.",
         "Diese Person arbeitet den Rest des Fluges weiter, ohne noch einmal gefragt zu " +
         "werden. Jedes weitere Paar Hände in diesem Flugzeug ist mehr wert als alles in " +
         "deiner Tasche."],
        ["By the doors is where people live. Not because the air is good there - it will not " +
         "be - but because it is the only floor the fire has to cross the whole cabin to reach.",
         "An den Türen überleben die Leute. Nicht weil die Luft dort gut ist - das wird sie " +
         "nicht sein - sondern weil das Feuer für diesen Boden als einzigen die ganze Kabine " +
         "durchqueren muss."],
        ["You cannot put this out. What you are buying is a walkable aisle and less smoke in " +
         "it, and on this aeroplane that is worth buying - but it is not the thing that saves " +
         "anybody. People are.",
         "Du kannst das nicht löschen. Was du kaufst, ist ein begehbarer Gang und weniger " +
         "Rauch darin, und in diesem Flugzeug lohnt sich das - aber gerettet wird dadurch " +
         "niemand. Durch Menschen schon."],
        ["Two minutes. Whoever is still in a seat aft of the wing is a decision now rather " +
         "than a plan.",
         "Zwei Minuten. Wer hinter der Tragfläche noch auf einem Sitz sitzt, ist jetzt eine " +
         "Entscheidung und kein Plan mehr."],
        ["You cannot save everybody, and this is the part where that stops being a sentence " +
         "in a rulebook.",
         "Du kannst nicht alle retten, und das hier ist der Teil, an dem das aufhört, ein Satz " +
         "in einem Regelwerk zu sein."],

        // ---------------------------------------------------------------- the flight deck ---
        ["Call the flight deck on the interphone", "Das Cockpit über die Bordsprechanlage rufen"],
        ["The handset is on the bulkhead. They cannot see the cabin and they have never heard " +
         "your voice before.",
         "Der Hörer hängt an der Trennwand. Sie sehen die Kabine nicht und haben deine Stimme " +
         "noch nie gehört."],
        ["“Flight deck.” You tell them, and you hear the other pilot say something you do not " +
         "catch. Then: “Understood. Sit down and hold on to something.” The nose drops before " +
         "you have put the handset back.",
         "„Cockpit.“ Du sagst es ihnen, und du hörst den anderen Piloten etwas sagen, das du " +
         "nicht verstehst. Dann: „Verstanden. Hinsetzen und irgendwo festhalten.“ Die Nase " +
         "geht runter, bevor du den Hörer zurückgehängt hast."],
        ["“Sir, I need you to go back to your seat and speak to a member of crew.” There is no " +
         "member of crew. You can hear them not believing you, and you can hear that they have " +
         "written it down, which is not nothing.",
         "„Gehen Sie bitte zurück auf Ihren Platz und wenden Sie sich an das Kabinenpersonal.“ " +
         "Es gibt kein Kabinenpersonal. Du hörst, dass sie dir nicht glauben, und du hörst, " +
         "dass sie es notiert haben, und das ist nicht nichts."],

        ["Walk to the lavatory", "Zur Toilette gehen"],

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
        ["Pick the burning case up again", "Den brennenden Koffer wieder aufheben"],
        ["It is where you left it and it is worse than it was. Somewhere else is not nowhere, " +
         "but it is somewhere else.",
         "Er liegt, wo du ihn gelassen hast, und er ist schlimmer als vorher. Woanders ist " +
         "nicht nirgendwo, aber es ist woanders."],
        ["You take it back out of the basin. The water comes off it as steam before it reaches " +
         "your wrists.",
         "Du holst ihn wieder aus dem Becken. Das Wasser geht als Dampf weg, bevor es deine " +
         "Handgelenke erreicht."],
        ["You get your hands back under it.", "Du bekommst die Hände wieder darunter."],
        ["The jet is coming out of the seam about a foot from your face and you are carrying it.",
         "Der Strahl kommt einen Fuß vor deinem Gesicht aus der Fuge, und du trägst das Ding."],
        ["It is heavier than it was and it is still going.",
         "Er ist schwerer als vorher und er brennt weiter."],
        ["Put the case down here", "Den Koffer hier abstellen"],
        ["Whatever is under it and whatever is beside it. Look before you do this.",
         "Was auch immer darunter ist und was daneben. Sieh hin, bevor du das tust."],
        ["You put it down at {where}. It starts working on the floor immediately, and on " +
         "whatever is within arm's length of the floor.",
         "Du stellst ihn bei {where} ab. Er macht sich sofort über den Boden her, und über " +
         "alles, was in Armlänge davon liegt."],

        [" It goes to steam a foot above the case and the jet does not flicker. Whatever that " +
         "is now, water is not part of the conversation.",
         " Es verdampft einen Fuß über dem Koffer, und der Strahl flackert nicht einmal. Was " +
         "das jetzt ist, darüber hat Wasser keine Meinung mehr."],
        [" Most of it comes straight back off as steam. The case is already as cold as water " +
         "can make it, and it is still getting hotter inside.",
         " Das meiste kommt sofort als Dampf zurück. Der Koffer ist schon so kalt, wie Wasser " +
         "ihn machen kann, und drinnen wird er trotzdem heißer."],
        ["Nothing about it changes.", "Es ändert sich nichts daran."],
        [" Nothing about it changes.", " Es ändert sich nichts daran."],
        ["The thing in the basin changes note. What comes off it now is a blue jet about a foot " +
         "long, and it is going straight up through the water without appearing to notice it. " +
         "The tap is still running. It is not doing anything any more.",
         "Das Ding im Becken wechselt die Tonlage. Was jetzt herauskommt, ist ein blauer Strahl, " +
         "etwa einen Fuß lang, und er geht durch das Wasser nach oben, als wäre es nicht da. " +
         "Der Hahn läuft noch. Er bewirkt nichts mehr."],
        ["The fire changes colour. What was orange is now a blue jet coming out of the seam " +
         "under pressure, with a sound like a blowtorch, and the seat backs either side of it " +
         "have started to go without being touched.",
         "Das Feuer wechselt die Farbe. Was orange war, ist jetzt ein blauer Strahl, der unter " +
         "Druck aus der Fuge kommt, mit einem Geräusch wie ein Schweißbrenner, und die " +
         "Sitzlehnen links und rechts fangen an, ohne dass sie jemand berührt hätte."],
        ["a blue jet", "ein blauer Strahl"],

        ["Thirty seconds of pouring the same bottle onto the same seam. Nothing looks different. ",
         "Dreißig Sekunden lang dieselbe Flasche auf dieselbe Fuge. Es sieht nicht anders aus. "],
        ["Thirty seconds of pouring, and most of it comes back up as steam before it is halfway " +
         "in. The case is already as cold as water can make it. ",
         "Dreißig Sekunden gießen, und das meiste kommt als Dampf zurück, bevor es halb drin " +
         "ist. Der Koffer ist schon so kalt, wie Wasser ihn machen kann. "],
        ["You pour the whole bottle over a case that boils it off as fast as it lands. Whatever " +
         "is left in there is past what a tap can do. ",
         "Du kippst die ganze Flasche über einen Koffer, der sie verkocht, so schnell wie sie " +
         "ankommt. Was da drin noch übrig ist, ist über das hinaus, was ein Wasserhahn kann. "],
        ["The next cell is now {eta} away, and that is what cooling means.",
         "Die nächste Zelle ist jetzt {eta} entfernt, und genau das heißt kühlen."],

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
