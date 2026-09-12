// German: the things you can hold and the clothes you can fly in.
//
// An item name is read in three places - on a card under an icon, in the middle of a sentence
// ("Du reichst Odette das Handtuch"), and behind an article the grammar rule in this file
// works out. So the names here are plain nominative singulars with their gender obvious, and
// the gender table at the bottom is what makes "ein Inhalator" and "eine Rauchhaube" come out
// right rather than an English guess at a German article.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    PRS.i18n.add("de", [
        // ---------------------------------------------------------------------------- items ---
        ["Bottle of water", "Wasserflasche"],
        ["Three good pours. The lavatory tap fills it again in nine seconds.",
         "Drei ordentliche Güsse. Der Wasserhahn im WC füllt sie in neun Sekunden wieder auf."],

        ["Phone", "Handy"],
        ["Photograph the fire and people believe you. Show them and they believe you faster.",
         "Fotografiere das Feuer, und die Leute glauben dir. Zeig es ihnen, und sie glauben dir " +
         "schneller."],

        ["Travel blanket", "Reisedecke"],
        ["Never runs out. Soak it in a lavatory and it becomes the second best thing here.",
         "Geht nie aus. Tränke sie im WC, und sie wird zum zweitbesten Gegenstand hier."],

        ["Damp travel towel", "Feuchtes Reisehandtuch"],
        ["Smothers without spreading, and tied over a face it buys somebody a minute.",
         "Erstickt, ohne zu verteilen, und über ein Gesicht gebunden kauft es jemandem eine " +
         "Minute."],

        ["Smoke hood", "Rauchhaube"],
        ["Fifteen minutes of not breathing smoke. Fifteen minutes is the whole game.",
         "Fünfzehn Minuten, in denen du keinen Rauch atmest. Fünfzehn Minuten sind das ganze " +
         "Spiel."],

        ["Swimming goggles", "Schwimmbrille"],
        ["Eyes open in smoke that shuts everyone else's: it does not slow you, and it frightens " +
         "you less.",
         "Offene Augen in Rauch, der alle anderen blind macht: er bremst dich nicht, und er " +
         "macht dir weniger Angst."],

        ["Multi-tool that should not have got through security",
         "Multitool, das die Kontrolle nicht hätte passieren dürfen"],
        ["Cuts a seatbelt in two seconds instead of unbuckling it in six, and opens the oxygen " +
         "mask panels.",
         "Schneidet einen Gurt in zwei Sekunden durch, statt ihn in sechs zu öffnen, und kriegt " +
         "die Klappen der Sauerstoffmasken auf."],

        ["First aid kit", "Erste-Hilfe-Kasten"],
        ["Burn gel is the difference between a passenger who walks and one you carry.",
         "Brandgel ist der Unterschied zwischen einem Passagier, der geht, und einem, den du " +
         "trägst."],

        ["Luggage strap", "Gepäckgurt"],
        ["Under the arms and buckled at the back, dragging somebody has a handle: half again as " +
         "fast, and it works on people you cannot lift.",
         "Unter den Achseln durch und hinten geschlossen, hat das Ziehen einen Griff: halb so " +
         "lang wieder dazu an Tempo, und es geht bei Menschen, die du nicht heben kannst."],

        ["Welding gloves", "Schweißerhandschuhe"],
        ["You can touch things that are on fire. This turns out to be most things.",
         "Du kannst Dinge anfassen, die brennen. Das sind, wie sich zeigt, die meisten Dinge."],

        ["Roll of duct tape", "Rolle Klebeband"],
        ["Seals the bin shut, and seals the vents in a row.",
         "Klebt das Gepäckfach zu, und klebt die Düsen einer ganzen Reihe zu."],

        ["Inhaler", "Inhalator"],
        ["Puts a set of lungs back in the game. Yours, or somebody who has stopped coughing.",
         "Bringt eine Lunge zurück ins Spiel. Deine, oder die von jemandem, der aufgehört hat " +
         "zu husten."],

        ["Hi-vis vest", "Warnweste"],
        ["People obey a hi-vis vest. People have always obeyed a hi-vis vest.",
         "Menschen gehorchen einer Warnweste. Menschen haben einer Warnweste immer gehorcht."],

        ["Roll of bin liners", "Rolle Müllsäcke"],
        ["The biggest volume of water you can move in one trip. Fiddly. Worth it.",
         "Die größte Menge Wasser, die du in einem Gang bewegen kannst. Fummelig. Lohnt sich."],

        ["BCF halon extinguisher", "BCF-Halonlöscher"],
        ["One discharge. It works on the flame, which is not the fire.",
         "Eine Entladung. Er wirkt auf die Flamme, und die ist nicht das Feuer."],

        ["Water extinguisher", "Wasserlöscher"],
        ["Nine litres under pressure, two discharges, and it weighs as much as a child.",
         "Neun Liter unter Druck, zwei Entladungen, und er wiegt so viel wie ein Kind."],

        // ------------------------------------------------------------------------- the outfits ---
        ["Gym kit and trainers", "Sportsachen und Laufschuhe"],
        ["You were going to run at the other end. Shorts, a technical top, and the only shoes on " +
         "this aeroplane you can actually sprint in.",
         "Du wolltest am anderen Ende laufen gehen. Shorts, ein Funktionsshirt und die einzigen " +
         "Schuhe in diesem Flugzeug, in denen man wirklich sprinten kann."],
        ["Fastest in the cabin. Nobody in shorts has ever been believed about anything.",
         "Die Schnellste in der Kabine. Noch nie hat jemand in Shorts irgendetwas geglaubt " +
         "bekommen."],

        ["The suit you flew in", "Der Anzug, in dem du geflogen bist"],
        ["There is a meeting at four. There is not going to be a meeting at four. The jacket is " +
         "on the hook by the door and the tie is still done up.",
         "Um vier ist ein Termin. Um vier wird kein Termin sein. Das Sakko hängt am Haken bei " +
         "der Tür, und die Krawatte sitzt noch."],
        ["People do what a suit says. A suit cannot climb over a row of seats.",
         "Menschen tun, was ein Anzug sagt. Ein Anzug kommt nicht über eine Sitzreihe."],

        ["Work clothes", "Arbeitskleidung"],
        ["Steel toecaps, sleeves rolled, and hands that have already been burned once this year.",
         "Stahlkappen, hochgekrempelte Ärmel und Hände, die dieses Jahr schon einmal verbrannt " +
         "sind."],
        ["You can pick things up and people assume you are allowed to. Slow.",
         "Du kannst Dinge anfassen, und die Leute nehmen an, dass du das darfst. Langsam."],

        ["Dressed for a long flight", "Angezogen für einen langen Flug"],
        ["Fleece, compression socks, an eye mask pushed up onto your forehead since somewhere " +
         "over the Alps.",
         "Fleecejacke, Kompressionsstrümpfe, eine Schlafmaske, die seit irgendwo über den Alpen " +
         "auf der Stirn sitzt."],
        ["Nothing frightens you and you cannot lift anybody. Layers are a filter.",
         "Nichts macht dir Angst, und heben kannst du niemanden. Schichten sind ein Filter."],

        ["Straight off a hill", "Direkt vom Berg"],
        ["Boots, a hardshell, and a week at altitude that has left you with lungs that are going " +
         "to matter in about four minutes.",
         "Bergschuhe, eine Hardshell und eine Woche in der Höhe, die dir eine Lunge gelassen " +
         "hat, auf die es in etwa vier Minuten ankommen wird."],
        ["You will still be standing up when everybody else is on the floor.",
         "Du stehst noch, wenn alle anderen am Boden sind."],

        ["Shorts and flip-flops", "Shorts und Flip-Flops"],
        ["It was thirty-one degrees when you got on. You have not thought about your feet once " +
         "and you are going to think about them a great deal shortly.",
         "Es waren einunddreißig Grad, als du eingestiegen bist. Du hast kein einziges Mal an " +
         "deine Füße gedacht, und gleich wirst du sehr viel an sie denken."],
        ["Quick, cheerful, and about to walk through something hot in flip-flops.",
         "Schnell, gut gelaunt und kurz davor, in Flip-Flops durch etwas Heißes zu laufen."],
    ]);

    // ------------------------------------------------------------------------------ grammar ---
    //
    // "a smoke hood" is decided by the spelling in English and by the noun in German, so the
    // English rule cannot be carried over: it would produce "ein Rauchhaube". This is the gender
    // of every thing that can be picked up, keyed on the German name, and the two places that
    // print an article - "{who} has {what}" and "In the second drawer down: {what}" - are both
    // accusative, which is where the masculine changes and the other two do not.
    const GENDER = {
        "Wasserflasche": "f", "Handy": "n", "Reisedecke": "f", "Feuchtes Reisehandtuch": "n",
        "Rauchhaube": "f", "Schwimmbrille": "f", "Erste-Hilfe-Kasten": "m", "Gepäckgurt": "m",
        "Schweißerhandschuhe": "p", "Rolle Klebeband": "f", "Inhalator": "m", "Warnweste": "f",
        "Rolle Müllsäcke": "f", "BCF-Halonlöscher": "m", "Wasserlöscher": "m",
        "Multitool, das die Kontrolle nicht hätte passieren dürfen": "n",
    };
    const ACCUSATIVE = { m: "einen ", f: "eine ", n: "ein ", p: "" };

    PRS.i18n.grammar("de", {
        /** "eine Rauchhaube", "einen Inhalator", "Schweißerhandschuhe". */
        article(name) {
            const head = String(name).split(",")[0].trim();
            const g = GENDER[head] || GENDER[String(name).trim()];
            if (!g) return name;              // something the table has not met: leave it bare
            return ACCUSATIVE[g] + head;
        },

        /**
         * The short form for a button. German compounds do not shorten by dropping words the way
         * "Multi-tool that should not have got through security" does, so the rule is the first
         * clause and nothing else.
         */
        short(name) {
            return String(name).split(",")[0].trim();
        },
    });
})(window);
