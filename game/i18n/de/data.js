// German: the nine people you can be, and the medals the report hands out at the bottom.
//
// A medal is a sentence about the arithmetic, in the report's flat voice, and several of them
// are quietly unkind. That survives: "Nicht der Punkt" is meant to sting exactly as much as
// "Not the point" does.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    PRS.i18n.add("de", [
        // How near this flight got to the medal that turns a card over, printed after a count -
        // "2 von 3 Leuten, die dir gesagt haben, du sollst dich setzen". Each is a bare plural
        // noun phrase so the number can go in front of it.
        ["bins opened and looked into", "Fächer geöffnet und hineingesehen"],
        ["carried out of the rows", "aus den Reihen getragen"],
        ["children moved forward", "Kinder nach vorne gebracht"],
        ["people working the cabin for you", "Leute, die für dich die Kabine abarbeiten"],
        ["steps towards the flight deck, inside five minutes",
         "Schritte Richtung Cockpit, innerhalb von fünf Minuten"],
        ["people who told you to sit down", "Leute, die dir gesagt haben, du sollst dich setzen"],
        ["off alive", "lebend heraus"],


        // ------------------------------------------------------------------- who you can be ---
        ["Veterinary surgeon", "Tierärztin"],
        ["Small animals, mostly. Airways are airways, oxygen is oxygen, and she has resuscitated " +
         "a great many things that were not people.",
         "Kleintiere, meistens. Atemwege sind Atemwege, Sauerstoff ist Sauerstoff, und sie hat " +
         "sehr viele Dinge wiederbelebt, die keine Menschen waren."],
        ["Talks people out of their seats, and treats the ones who are hurt. Cannot lift the " +
         "heavy ones.",
         "Redet Menschen aus ihren Sitzen und versorgt die Verletzten. Kann die Schweren nicht " +
         "heben."],
        ["You have already worked out who on this aeroplane is going to die first.",
         "Du hast längst ausgerechnet, wer in diesem Flugzeug zuerst stirbt."],

        ["Competitive strongman", "Strongman-Wettkämpfer"],
        ["Fourth in Europe, twice. He can pick up two adults at once, and he is about to find " +
         "out that this is the least of it.",
         "Zweimal Vierter in Europa. Er kann zwei Erwachsene auf einmal hochnehmen, und gleich " +
         "wird er merken, dass das der kleinste Teil davon ist."],
        ["Carries two at a time, and nobody is too heavy. Nobody listens to him.",
         "Trägt zwei auf einmal, und niemand ist zu schwer. Niemand hört ihm zu."],
        ["Everything on this aeroplane is lighter than your opener.",
         "Alles in diesem Flugzeug ist leichter als dein Aufwärmsatz."],

        ["Retired station officer", "Brandoberinspektorin im Ruhestand"],
        ["Thirty-one years in the fire service, eleven of them on the aerodrome crew. She has " +
         "done this before, on the ground, with a hose, with a team, and with her knees.",
         "Einunddreißig Jahre bei der Feuerwehr, elf davon bei der Flughafenwache. Sie hat das " +
         "schon gemacht, am Boden, mit einem Schlauch, mit einer Mannschaft und mit ihren " +
         "Knien."],
        ["Boards with gloves and tape and lungs that last. The slowest person in the cast.",
         "Steigt mit Handschuhen, Klebeband und einer Lunge ein, die durchhält. Die langsamste " +
         "Person der Besetzung."],
        ["Open the overhead locker and look at what is actually in it.",
         "Öffne das Gepäckfach und sieh nach, was wirklich darin ist."],
        ["You have smelled this before. Nobody else on this aeroplane has.",
         "Diesen Geruch kennst du. Sonst niemand in diesem Flugzeug."],

        ["Sister of the Order of St Brigid", "Schwester vom Orden der heiligen Brigid"],
        ["Forty years of getting people to do things they do not want to do, in a voice that " +
         "has never once been raised.",
         "Vierzig Jahre darin, Menschen zu Dingen zu bringen, die sie nicht tun wollen, mit " +
         "einer Stimme, die nie ein einziges Mal laut geworden ist."],
        ["Voice ten. Cannot lift most adults. Everything she achieves, she achieves through " +
         "other people.",
         "Stimme zehn. Kann die meisten Erwachsenen nicht heben. Alles, was sie erreicht, " +
         "erreicht sie durch andere Menschen."],
        ["Recruit four helpers in one flight.", "Gewinne in einem Flug vier Helfer."],
        ["You have buried more people than anyone else on board. It has not helped.",
         "Du hast mehr Menschen begraben als alle anderen an Bord. Es hat nicht geholfen."],

        ["Energy drink athlete", "Energydrink-Athlet"],
        ["Four hundred thousand followers, a sponsorship with a taurine company, and the fastest " +
         "hands in row 9.",
         "Vierhunderttausend Follower, ein Sponsoring von einer Taurinfirma und die schnellsten " +
         "Hände in Reihe 9."],
        ["Speed ten: every step and most things cost him less. Frightens easily and cannot lift " +
         "the heavy ones.",
         "Tempo zehn: jeder Schritt und fast alles kostet ihn weniger. Erschrickt leicht und " +
         "kann die Schweren nicht heben."],
        ["Carry five people to a galley yourself, in one flight.",
         "Trag in einem Flug fünf Menschen selbst zu einer Bordküche."],
        ["This is the single greatest thing that has ever happened to your channel.",
         "Das ist das Größte, was deinem Kanal je passiert ist."],

        ["Deadheading captain", "Kapitänin auf Positionierungsflug"],
        ["Type rated on this airframe, in row 22, in a jumper, going home. It is not her " +
         "aeroplane. She is about to make it her aeroplane.",
         "Musterberechtigt auf dieser Zelle, in Reihe 22, im Pullover, auf dem Heimweg. Es ist " +
         "nicht ihr Flugzeug. Gleich macht sie es zu ihrem Flugzeug."],
        ["Starts in row 22: two rows from the aft galley, eight from the fire, and twenty from " +
         "the front.",
         "Beginnt in Reihe 22: zwei Reihen von der hinteren Bordküche, acht vom Feuer und " +
         "zwanzig von vorn."],
        ["Get the flight deck to declare an emergency inside five minutes.",
         "Bring das Cockpit dazu, binnen fünf Minuten einen Notfall zu erklären."],
        ["You have flown this approach nine hundred times. Never from row 22.",
         "Du bist diesen Anflug neunhundertmal geflogen. Nie aus Reihe 22."],

        ["Air marshal", "Flugsicherheitsbegleiter"],
        ["Seat 20A, back to the bulkhead, eleven years of watching people, and a sidearm that is " +
         "about to be of no use whatsoever.",
         "Sitz 20A, Rücken zur Trennwand, elf Jahre Menschen beobachten und eine Dienstwaffe, " +
         "die gleich überhaupt nichts nützen wird."],
        ["Strong, calm, and wearing the vest. Starts in row 20, six from the fire.",
         "Kräftig, ruhig, und trägt die Weste. Beginnt in Reihe 20, sechs vom Feuer."],
        ["Be told to sit down by three different passengers.",
         "Lass dich von drei verschiedenen Passagieren auffordern, dich hinzusetzen."],
        ["You have been watching seat 14C for an hour. For the wrong reasons.",
         "Du beobachtest Sitz 14C seit einer Stunde. Aus den falschen Gründen."],

        ["Unaccompanied minor", "Alleinreisendes Kind"],
        ["A lanyard, a plastic wallet, and a flight attendant who was supposed to be checking on " +
         "her every twenty minutes and has not, for fifty.",
         "Ein Umhängeband, eine Plastikhülle und eine Flugbegleiterin, die alle zwanzig Minuten " +
         "nach ihr sehen sollte und es seit fünfzig nicht getan hat."],
        ["Eight years old. Fast and low, cannot lift an adult, and nobody believes a word she " +
         "says.",
         "Acht Jahre alt. Schnell und tief unten, kann keinen Erwachsenen heben, und niemand " +
         "glaubt ihr ein Wort."],
        ["Get a child out of the rows and down on the floor by a door.",
         "Hol ein Kind aus den Reihen und leg es am Boden bei einer Tür ab."],
        ["The lady said she would come back and check on you. That was a long time ago.",
         "Die Frau hat gesagt, sie kommt wieder und sieht nach dir. Das ist lange her."],

        ["Retired purser", "Pursette im Ruhestand"],
        ["Thirty-eight years, four airlines, two evacuations and one thing in 1998 that she does " +
         "not talk about. Travelling as a passenger for the first time since.",
         "Achtunddreißig Jahre, vier Fluggesellschaften, zwei Evakuierungen und eine Sache von " +
         "1998, über die sie nicht spricht. Zum ersten Mal seitdem als Passagierin unterwegs."],
        ["Knows the aeroplane, the kit and how little time there is. Boards with a hood and the " +
         "tool that opens the mask panels, in row 1.",
         "Kennt das Flugzeug, die Ausrüstung und weiß, wie wenig Zeit da ist. Steigt mit einer " +
         "Rauchhaube und dem Werkzeug ein, das die Maskenklappen öffnet, in Reihe 1."],
        ["Get fifty-two people off alive in one flight.",
         "Bring in einem Flug zweiundfünfzig Menschen lebend heraus."],
        ["You know where everything is. You know it will not be enough.",
         "Du weißt, wo alles ist. Du weißt, dass es nicht reichen wird."],

        // ---------------------------------------------------------------------- the medals ---
        // How a medal is read out in the log, and the line that follows it the first time one
        // turns a card over on the roster.
        ["◆ {name} — {text}", "◆ {name} — {text}"],
        [" {who} is now available.", " {who} steht jetzt zur Verfügung."],

        ["Nine seconds of relief", "Neun Sekunden Erleichterung"],
        ["Poured something on the fire. It went out. It came back.",
         "Etwas auf das Feuer gegossen. Es ging aus. Es kam wieder."],
        ["Not the point", "Nicht der Punkt"],
        ["Thirty applications of suppressant. Thirty. The report has counted them.",
         "Dreißig Anwendungen von Löschmittel. Dreißig. Der Bericht hat sie gezählt."],
        ["Understood the problem", "Das Problem verstanden"],
        ["Closed the bin instead of fighting the flame, which is what the manual says.",
         "Das Gepäckfach geschlossen, statt die Flamme zu bekämpfen, und genau das steht im " +
         "Handbuch."],
        ["The correct answer", "Die richtige Antwort"],
        ["Got the case into a sink full of water. Nobody has ever thought of this in time.",
         "Den Koffer in ein volles Waschbecken bekommen. Darauf ist noch nie jemand " +
         "rechtzeitig gekommen."],
        ["Looked at it", "Hingesehen"],
        ["Actually opened the bin and looked at the thing that is doing all this.",
         "Tatsächlich das Gepäckfach geöffnet und sich das Ding angesehen, das das alles macht."],
        ["Held back", "Festgehalten"],
        ["Somebody you had soaked got hold of your arm. They were sitting under the fire too.",
         "Jemand, den du nass gemacht hast, hat deinen Arm gepackt. Diese Person saß auch unter " +
         "dem Feuer."],

        ["One", "Einer"],
        ["Carried one person out of the rows, which is one more than anybody else did.",
         "Einen Menschen aus den Reihen getragen, und das ist einer mehr als alle anderen."],
        ["Five", "Fünf"],
        ["Five. On your own. In a corridor full of people telling you to stop.",
         "Fünf. Allein. In einem Gang voller Menschen, die dir sagen, du sollst aufhören."],
        ["Twelve", "Zwölf"],
        ["Twelve carries. That is the physical limit and you found it.",
         "Zwölf Transporte. Das ist die körperliche Grenze, und du hast sie gefunden."],
        ["The ones who could not walk", "Die, die nicht gehen konnten"],
        ["Both wheelchair users were moved out of their rows, and both of them got off.",
         "Beide Rollstuhlfahrer wurden aus ihren Reihen geholt, und beide sind herausgekommen."],
        ["A child, forward", "Ein Kind, nach vorn"],
        ["Got one of the children out of the rows and down on the floor by a door.",
         "Eines der Kinder aus den Reihen geholt und bei einer Tür am Boden abgelegt."],
        ["Bruno", "Bruno"],
        ["The dog got out. This was not free and you knew that.",
         "Der Hund ist herausgekommen. Das war nicht umsonst, und das wusstest du."],

        ["The multiplier", "Der Multiplikator"],
        ["Recruited one other person. This is worth more than the water bottle.",
         "Einen einzigen Menschen gewonnen. Das ist mehr wert als die Wasserflasche."],
        ["A crew", "Eine Mannschaft"],
        ["Four helpers, working the cabin without being told twice.",
         "Vier Helfer, die die Kabine abarbeiten, ohne dass man es zweimal sagen muss."],
        ["You solved it", "Du hast es gelöst"],
        ["Eight helpers. This is the actual answer to the puzzle and you found it.",
         "Acht Helfer. Das ist die eigentliche Lösung des Rätsels, und du hast sie gefunden."],
        ["Delegation", "Delegation"],
        ["Other people moved more passengers than you did.",
         "Andere Menschen haben mehr Passagiere bewegt als du."],
        ["Turned the worst one round", "Den Schlimmsten umgedreht"],
        ["Recruited a passenger who was actively obstructing you.",
         "Einen Passagier gewonnen, der dich aktiv behindert hat."],

        ["Believed, and quickly", "Geglaubt, und schnell"],
        ["Got cabin crew credibility above eighty inside six minutes, which nobody manages by " +
         "talking.",
         "Die Glaubwürdigkeit bei der Kabinencrew binnen sechs Minuten über achtzig gebracht, " +
         "und das schafft niemand durch Reden."],
        ["Declared early", "Früh erklärt"],
        ["Had the flight deck declare an emergency inside five minutes, which is six minutes " +
         "before it would have happened on its own.",
         "Das Cockpit binnen fünf Minuten zu einer Notfallerklärung gebracht, also sechs " +
         "Minuten früher, als es von selbst passiert wäre."],
        ["Asked to sit down, repeatedly", "Mehrfach aufgefordert, sich hinzusetzen"],
        ["Three separate passengers told you, personally, to sit down. The cabin turned on you " +
         "before the fire did.",
         "Drei verschiedene Passagiere haben dir persönlich gesagt, du sollst dich hinsetzen. " +
         "Die Kabine hat sich vor dem Feuer gegen dich gewandt."],
        ["Three minutes of arguing", "Drei Minuten Diskussion"],
        ["Spent a hundred and eighty seconds of a fifteen minute flight in conversation.",
         "Hundertachtzig Sekunden eines fünfzehnminütigen Fluges im Gespräch verbracht."],
        ["Burned", "Verbrannt"],
        ["Took a burn. It made people believe you, which is the worst part.",
         "Eine Verbrennung abbekommen. Sie hat die Leute dazu gebracht, dir zu glauben, und das " +
         "ist der schlimmste Teil daran."],

        ["Forty", "Vierzig"],
        ["Forty people got off this aeroplane alive.",
         "Vierzig Menschen sind lebend aus diesem Flugzeug gekommen."],
        ["Forty-eight", "Achtundvierzig"],
        ["Forty-eight. This is a very good flight and you should know that.",
         "Achtundvierzig. Das ist ein sehr guter Flug, und das sollst du wissen."],
        ["Fifty-two", "Zweiundfünfzig"],
        ["Fifty-two. Almost nobody gets here.", "Zweiundfünfzig. Hierher kommt fast niemand."],
        ["Half", "Die Hälfte"],
        ["Half the cabin, or fewer. It was always going to be like this for somebody.",
         "Die halbe Kabine oder weniger. Für irgendjemanden wäre es immer so ausgegangen."],
    ]);
})(window);
