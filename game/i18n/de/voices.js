// German: what the sixty people in the seats say.
//
// Two lines each. The first is what they say before they believe you and the second is what they
// say once they do, and the whole cast is written so that the refusals are reasonable - that is
// the point of the roster, and a translation that made them sound stupid would break the game's
// argument. So a sceptic stays articulate in German, the drunk stays funny, the magistrate stays
// pompous, and nobody is made to sound like a foreigner speaking English.
//
// Registers worth naming: the ones who address you formally use "Sie", because a stranger in a
// seat would; the children and the drunk use "du". The parenthesised lines are the narrator
// describing somebody who cannot speak, and they stay lower case in German the way they do in
// English, which is a deliberate breach of the rule for nouns and reads as a stage direction.
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    PRS.i18n.add("de", [
        ["“I have been watching you. You are the only one moving.”",
         "„Ich habe Sie beobachtet. Sie sind der Einzige, der sich bewegt.“"],
        ["“Yes. Fine. Take me. But then you go back for the others.”",
         "„Ja. Gut. Nehmen Sie mich. Aber dann gehen Sie zurück und holen die anderen.“"],

        ["“I paid for this cabin specifically so I would not be spoken to.”",
         "„Ich habe für diese Klasse genau deshalb bezahlt, damit mich niemand anspricht.“"],
        ["“Take your hands off me. I will have your name.”",
         "„Nehmen Sie die Hände weg. Ich will Ihren Namen.“"],

        ["“If there were a fire, they would have said something.”",
         "„Wenn es brennen würde, hätten sie etwas gesagt.“"],
        ["“I am not going anywhere until somebody in a uniform tells me to.”",
         "„Ich gehe nirgendwohin, bis mir das jemand in Uniform sagt.“"],

        ["“I smell it too. I thought it was the ovens.”",
         "„Ich rieche es auch. Ich dachte, es sind die Öfen.“"],
        ["“No, no - I walk. Save your arms for someone who cannot.”",
         "„Nein, nein — ich gehe. Sparen Sie Ihre Arme für jemanden, der es nicht kann.“"],

        ["“I am a paediatric nurse. Tell me what you have seen, precisely.”",
         "„Ich bin Kinderkrankenpflegerin. Sagen Sie mir genau, was Sie gesehen haben.“"],
        ["“Walk me through it while we go. I can take the next one myself.”",
         "„Erklären Sie es mir unterwegs. Den Nächsten kann ich selbst nehmen.“"],

        ["“Mate. Mate. Is it a barbecue.”", "„Alter. Alter. Ist das ein Grill.“"],
        ["“I love this. I love this so much. Where are we going.”",
         "„Ich liebe das. Ich liebe das so sehr. Wo gehen wir hin.“"],

        ["“— sorry, what? I had the noise cancelling on.”",
         "„— Entschuldigung, was? Ich hatte das Noise-Cancelling an.“"],
        ["“Oh. Oh, that is a lot of smoke. Yes. Going.”",
         "„Oh. Oh, das ist viel Rauch. Ja. Ich geh.“"],

        ["“I knew it. I said to my sister. I said this exact thing.”",
         "„Ich wusste es. Ich hab es meiner Schwester gesagt. Genau das hab ich gesagt.“"],
        ["“Don't let go don't let go don't let go—”",
         "„Nicht loslassen nicht loslassen nicht loslassen—“"],

        ["“I do industrial safety. That bin has been ticking for ten minutes.”",
         "„Ich mache Arbeitssicherheit. Das Fach tickt seit zehn Minuten.“"],
        ["“I'll walk. Then I'll come back with you and we'll do this properly.”",
         "„Ich gehe selbst. Dann komme ich mit Ihnen zurück, und wir machen das richtig.“"],

        ["“The crew are extremely relaxed. I am taking my cue from them.”",
         "„Die Crew ist ausgesprochen entspannt. Ich richte mich nach ihr.“"],
        ["“This is assault. This is textbook assault.”",
         "„Das ist Körperverletzung. Das ist lehrbuchmäßige Körperverletzung.“"],

        ["“I'm a vet. It's not the same but it's not nothing.”",
         "„Ich bin Tierärztin. Es ist nicht dasselbe, aber es ist nicht nichts.“"],
        ["“I can carry the small ones. Give me the small ones.”",
         "„Die Kleinen kann ich tragen. Geben Sie mir die Kleinen.“"],

        ["“I flew Vulcans. I know what an electrical fire smells like.”",
         "„Ich bin Vulcans geflogen. Ich weiß, wie ein Schwelbrand riecht.“"],
        ["“The hip is the problem, not the nerve. Under the arms, lad.”",
         "„Die Hüfte ist das Problem, nicht der Mut. Unter den Achseln, Junge.“"],

        ["“I'll take the row behind me if you take the row in front.”",
         "„Ich nehme die Reihe hinter mir, wenn Sie die Reihe davor nehmen.“"],
        ["“Don't carry me, I'm fine, give me someone to carry.”",
         "„Tragen Sie mich nicht, mir geht's gut, geben Sie mir jemanden zum Tragen.“"],

        ["“I have four hours of podcast left and I intend to finish them.”",
         "„Ich habe noch vier Stunden Podcast, und ich habe vor, sie zu Ende zu hören.“"],
        ["“Oh you're serious. You're actually serious.”",
         "„Oh, Sie meinen das ernst. Sie meinen das wirklich ernst.“"],

        ["“I've been posting about this for six minutes and nobody believes me either.”",
         "„Ich poste seit sechs Minuten darüber, und mir glaubt auch niemand.“"],
        ["“Are you filming? Someone should be filming.”",
         "„Filmen Sie? Irgendjemand sollte filmen.“"],

        ["“Tell me where you need me and stop asking so nicely.”",
         "„Sagen Sie mir, wo Sie mich brauchen, und hören Sie auf, so höflich zu fragen.“"],
        ["“I said stop asking nicely. Move.”",
         "„Ich sagte, hören Sie auf, höflich zu fragen. Los.“"],

        ["“Sit down. You're frightening the children.”",
         "„Setzen Sie sich. Sie machen den Kindern Angst.“"],
        ["“Get off. GET OFF. Somebody get this person off me.”",
         "„Loslassen. LOSLASSEN. Holt mir jemand diesen Menschen weg.“"],

        ["“I don't know what to do. Tell me what to do and I'll do it.”",
         "„Ich weiß nicht, was ich tun soll. Sagen Sie es mir, und ich mache es.“"],
        ["“Thank you. Thank you. I'm sorry I'm so heavy.”",
         "„Danke. Danke. Es tut mir leid, dass ich so schwer bin.“"],

        ["“Is the plane going to be okay? Mum said it's fine.”",
         "„Wird das Flugzeug okay? Mama hat gesagt, es ist alles gut.“"],
        ["“I can hold on. I'm good at holding on.”",
         "„Ich kann mich festhalten. Ich kann gut festhalten.“"],

        ["(she is two and she is asleep and she is heavier than she looks)",
         "(sie ist zwei und sie schläft und sie ist schwerer, als sie aussieht)"],
        ["(she does not wake, which is the only good news on this aeroplane)",
         "(sie wacht nicht auf, was die einzige gute Nachricht in diesem Flugzeug ist)"],

        ["“I'll tell you what's on fire. My connecting flight. Ruined.”",
         "„Ich sag Ihnen, was brennt. Mein Anschlussflug. Ruiniert.“"],
        ["“We're not doing this. We're really not doing this.”",
         "„Wir machen das nicht. Wir machen das wirklich nicht.“"],

        ["“I'm second-year medicine. Which is to say I know enough to be frightened.”",
         "„Ich bin im zweiten Semester Medizin. Das heißt, ich weiß genug, um Angst zu haben.“"],
        ["“Airway, breathing, circulation. I remember that much. Go.”",
         "„Atemweg, Atmung, Kreislauf. So viel weiß ich noch. Los.“"],

        ["“The overhead bins are certified. I sell the certification.”",
         "„Die Gepäckfächer sind zertifiziert. Ich verkaufe die Zertifizierung.“"],
        ["“…the certification is for the panel, not the contents. Oh no.”",
         "„…die Zertifizierung gilt für die Klappe, nicht für den Inhalt. Oh nein.“"],

        ["(asleep, mouth open, headphones in, one shoe off)",
         "(schläft, Mund offen, Kopfhörer drin, ein Schuh aus)"],
        ["“nnnh — are we landing — is this Faro—”",
         "„nnnh — landen wir — ist das Faro—“"],

        ["“That is fire. That is fire. WHY IS NOBODY — that is FIRE.”",
         "„Das ist Feuer. Das ist Feuer. WARUM MACHT NIEMAND — das ist FEUER.“"],
        ["“Thank God. Thank God. Someone else can see it.”",
         "„Gott sei Dank. Gott sei Dank. Noch jemand sieht es.“"],

        ["“It's the galley oven. It's always the galley oven.”",
         "„Das ist der Ofen in der Bordküche. Das ist immer der Ofen in der Bordküche.“"],
        ["“It is not the galley oven. I see that now.”",
         "„Es ist nicht der Ofen in der Bordküche. Das sehe ich jetzt.“"],

        ["“Point. Don't explain. Just point and I'll go.”",
         "„Zeigen. Nicht erklären. Einfach zeigen, dann gehe ich.“"],
        ["“Right behind you.”", "„Direkt hinter Ihnen.“"],

        ["“I have flown through worse than this and eaten the meal.”",
         "„Ich bin durch Schlimmeres geflogen und habe dabei gegessen.“"],
        ["“My handbag. I am not moving one inch without my handbag.”",
         "„Meine Handtasche. Ich rühre mich keinen Zentimeter ohne meine Handtasche.“"],

        ["(asleep against the window with a neck pillow on backwards)",
         "(schläft am Fenster, das Nackenkissen verkehrt herum)"],
        ["“WHAT. WHAT. I WAS ASLEEP.”", "„WAS. WAS. ICH HABE GESCHLAFEN.“"],

        ["“I'm an anaesthetist. Airways are literally my whole job.”",
         "„Ich bin Anästhesistin. Atemwege sind buchstäblich mein ganzer Beruf.“"],
        ["“Get me to anyone who has stopped coughing. Those are the urgent ones.”",
         "„Bringen Sie mich zu allen, die aufgehört haben zu husten. Das sind die dringenden.“"],

        ["“The man behind us said a bad word about the smoke.”",
         "„Der Mann hinter uns hat ein böses Wort über den Rauch gesagt.“"],
        ["“Am I allowed? Is it allowed to run?”",
         "„Darf ich? Ist Rennen erlaubt?“"],

        ["“If you take my son I will follow you anywhere. Not before.”",
         "„Wenn Sie meinen Sohn nehmen, folge ich Ihnen überallhin. Vorher nicht.“"],
        ["“Him first. HIM FIRST.”", "„Ihn zuerst. IHN ZUERST.“"],

        ["“We are staying together. That is the plan. That is the only plan.”",
         "„Wir bleiben zusammen. Das ist der Plan. Das ist der einzige Plan.“"],
        ["“All four of us or none of us. I mean it.”",
         "„Alle vier oder keiner. Das meine ich ernst.“"],

        ["(one, and he thinks the smoke alarm is a game)",
         "(eins, und er hält den Rauchmelder für ein Spiel)"],
        ["(he laughs, which is somehow the worst sound on the aeroplane)",
         "(er lacht, was irgendwie das schlimmste Geräusch im Flugzeug ist)"],

        ["“Is it my bag? Have I done something? Is it my bag?”",
         "„Ist es meine Tasche? Habe ich etwas gemacht? Ist es meine Tasche?“"],
        ["“It is my bag, isn't it. Oh, my dear. Oh, no.”",
         "„Es ist meine Tasche, nicht wahr. Ach du liebe Zeit. Ach nein.“"],

        ["“That's my bag up there and there is nothing in it. Nothing.”",
         "„Das ist meine Tasche da oben, und da ist nichts drin. Nichts.“"],
        ["“It was one vape. ONE. They said the battery was fine.”",
         "„Es war eine Vape. EINE. Die haben gesagt, der Akku ist in Ordnung.“"],

        ["“I can feel it through the ceiling. Put your hand up. FEEL it.”",
         "„Ich spüre es durch die Decke. Halten Sie die Hand hoch. SPÜREN Sie es.“"],
        ["“Is it hot where we're going? Is it hot there too?”",
         "„Ist es heiß da, wo wir hingehen? Ist es da auch heiß?“"],

        ["“I cannot get out of this seat quickly and we both know it.”",
         "„Ich komme nicht schnell aus diesem Sitz, und das wissen wir beide.“"],
        ["“You will hurt yourself. Get someone to take the other side.”",
         "„Sie verletzen sich. Holen Sie jemanden für die andere Seite.“"],

        ["“I counted. Twelve rows to the wing exit. I've been counting for an hour.”",
         "„Ich habe gezählt. Zwölf Reihen bis zum Notausstieg. Ich zähle seit einer Stunde.“"],
        ["“Twelve rows. I'll take the ones who can walk. You take the ones who can't.”",
         "„Zwölf Reihen. Ich nehme die, die gehen können. Sie nehmen die, die es nicht können.“"],

        ["(asleep, and he has taken something to be asleep)",
         "(schläft, und er hat etwas genommen, um zu schlafen)"],
        ["(he does not stir; his weight is entirely in your arms)",
         "(er rührt sich nicht; sein Gewicht liegt vollständig in deinen Armen)"],

        ["“Sit. Down. There are procedures and you are not one of them.”",
         "„Setzen. Sie. Sich. Es gibt Verfahren, und Sie sind keines davon.“"],
        ["“Unhand — this is — I am a magistrate, you know.”",
         "„Lassen Sie — das ist ja — ich bin Richter, müssen Sie wissen.“"],

        ["“My chair is in the hold. I have not been able to move since Gatwick.”",
         "„Mein Rollstuhl ist im Frachtraum. Seit Gatwick kann ich mich nicht bewegen.“"],
        ["“Under the knees. Yes. Like that. You've done this before.”",
         "„Unter die Knie. Ja. Genau so. Sie haben das schon gemacht.“"],

        ["“I'm cabin crew for a different airline. This is not their procedure.”",
         "„Ich bin Kabinencrew bei einer anderen Fluggesellschaft. Das ist nicht ihr Verfahren.“"],
        ["“Give me the aft. I know the aft. Go forward.”",
         "„Geben Sie mir hinten. Hinten kenne ich. Gehen Sie nach vorn.“"],

        ["“In my day we simply didn't make a fuss.”",
         "„Zu meiner Zeit hat man einfach kein Theater gemacht.“"],
        ["“Well. This is a fuss. This is quite a considerable fuss.”",
         "„Nun. Das ist Theater. Das ist ein durchaus beachtliches Theater.“"],

        ["“You are making it worse. You are making everyone panic.”",
         "„Sie machen es schlimmer. Sie versetzen alle in Panik.“"],
        ["“IF WE ALL RUSH THE FRONT WE ALL DIE. THAT'S HOW IT WORKS.”",
         "„WENN WIR ALLE NACH VORN STÜRMEN, STERBEN WIR ALLE. SO FUNKTIONIERT DAS.“"],

        ["“I've had four gins and this is the most interesting flight of my life.”",
         "„Ich hatte vier Gin, und das ist der interessanteste Flug meines Lebens.“"],
        ["“I'm dead weight, pal. I'm being honest with you. I'm dead weight.”",
         "„Ich bin totes Gewicht, Kumpel. Ich bin ehrlich zu dir. Ich bin totes Gewicht.“"],

        ["“GP. Twenty-two years. Smoke inhalation kills people who look fine.”",
         "„Hausärztin. Zweiundzwanzig Jahre. Rauchgasvergiftung tötet Menschen, die gut " +
         "aussehen.“"],
        ["“The quiet ones. Bring me the quiet ones first.”",
         "„Die Stillen. Bringen Sie mir zuerst die Stillen.“"],

        ["(asleep with an eye mask on, which he paid extra for)",
         "(schläft mit einer Schlafmaske, für die er extra bezahlt hat)"],
        ["“Is it the meal? Have I missed the meal?”",
         "„Ist es das Essen? Habe ich das Essen verpasst?“"],

        ["“I'll go if she goes. She won't go.”",
         "„Ich gehe, wenn sie geht. Sie geht nicht.“"],
        ["“She's not going. Take me. Come back for her.”",
         "„Sie geht nicht. Nehmen Sie mich. Kommen Sie für sie zurück.“"],

        ["“Sanne is being dramatic. Sanne has always been dramatic.”",
         "„Sanne ist dramatisch. Sanne war schon immer dramatisch.“"],
        ["“Sanne? SANNE? Where has she taken me?”",
         "„Sanne? SANNE? Wohin hat sie mich gebracht?“"],

        ["“I'm strong and I'm frightened. Use the first part.”",
         "„Ich bin kräftig und ich habe Angst. Nehmen Sie den ersten Teil.“"],
        ["“Who's next. Don't tell me the odds, just tell me who's next.”",
         "„Wer ist der Nächste. Sagen Sie mir nicht die Chancen, sagen Sie mir, wer der " +
         "Nächste ist.“"],

        ["(asleep with the crossword done in pen, all of it, correctly)",
         "(schläft, das Kreuzworträtsel mit Kugelschreiber gelöst, ganz, richtig)"],
        ["(she weighs almost nothing and it does not make it easier)",
         "(sie wiegt fast nichts, und es macht es nicht leichter)"],

        ["“You. Sit. You are the problem. You have been the problem all flight.”",
         "„Sie. Setzen. Sie sind das Problem. Sie sind den ganzen Flug lang das Problem " +
         "gewesen.“"],
        ["“No. NO. We land in fifteen minutes. FIFTEEN.”",
         "„Nein. NEIN. Wir landen in fünfzehn Minuten. FÜNFZEHN.“"],

        ["“I can hear it. Under the noise. It has a sound.”",
         "„Ich kann es hören. Unter dem Lärm. Es hat ein Geräusch.“"],
        ["“It does have a sound, doesn't it. You hear it too.”",
         "„Es hat ein Geräusch, nicht wahr. Sie hören es auch.“"],

        ["(a French bulldog in a bag under the seat, breathing badly)",
         "(eine französische Bulldogge in einer Tasche unter dem Sitz, atmet schlecht)"],
        ["(he does not weigh much and he will cost you thirty seconds you cannot spare)",
         "(er wiegt nicht viel und er kostet dich dreißig Sekunden, die du nicht hast)"],

        ["“Would you please sit down. Would you please just sit down.”",
         "„Würden Sie sich bitte hinsetzen. Würden Sie sich bitte einfach hinsetzen.“"],
        ["“I have asked you nicely eleven times. Eleven.”",
         "„Ich habe Sie elfmal höflich gebeten. Elfmal.“"],

        ["“I'm a first officer. Off duty. Deadheading. Not my aeroplane.”",
         "„Ich bin Erster Offizier. Dienstfrei. Positionierungsflug. Nicht mein Flugzeug.“"],
        ["“It is my aeroplane, isn't it. Damn it. All right.”",
         "„Es ist mein Flugzeug, nicht wahr. Verdammt. Also gut.“"],

        ["“I teach year fives. I can move eleven children in ninety seconds.”",
         "„Ich unterrichte fünfte Klassen. Ich kriege elf Kinder in neunzig Sekunden bewegt.“"],
        ["“Hands on shoulders, in a line, no talking. Watch.”",
         "„Hände auf die Schultern, in einer Reihe, nicht reden. Sehen Sie zu.“"],

        ["“WOOO. Hey. Hey. Is that a fire? That's a fire.”",
         "„WUUU. Hey. Hey. Ist das ein Feuer? Das ist ein Feuer.“"],
        ["“This is the best thing that has ever happened to me.”",
         "„Das ist das Beste, was mir je passiert ist.“"],

        ["“I cannot walk, my dear. I have not been able to walk since March.”",
         "„Ich kann nicht gehen, mein Lieber. Ich kann seit März nicht mehr gehen.“"],
        ["“Slowly. Slowly. You are doing very well.”",
         "„Langsam. Langsam. Sie machen das sehr gut.“"],

        // ------------------------------------------------------ what the cabin says when idle ---
        ["“They'd tell us. They'd have to tell us.”",
         "„Sie würden es uns sagen. Sie müssten es uns sagen.“"],
        ["“It's the ovens. They always do this on the descent.”",
         "„Das sind die Öfen. Die machen das im Sinkflug immer.“"],
        ["“I'm not getting up until the sign goes off.”",
         "„Ich stehe nicht auf, bevor das Zeichen ausgeht.“"],
        ["“If it were serious there'd be an announcement.”",
         "„Wenn es ernst wäre, gäbe es eine Durchsage.“"],
        ["“The crew are still doing the trolley. Look. The trolley.”",
         "„Die Crew macht noch den Wagen. Sehen Sie. Den Wagen.“"],
        ["“Fifteen minutes. We can all sit still for fifteen minutes.”",
         "„Fünfzehn Minuten. Fünfzehn Minuten können wir alle stillsitzen.“"],
        ["“Is somebody vaping? Somebody's vaping.”",
         "„Dampft da jemand? Da dampft jemand.“"],
        ["“My connection is in fifty minutes and this is not helping.”",
         "„Mein Anschluss geht in fünfzig Minuten, und das hilft nicht.“"],
        ["“Please sit down. You're making it worse for everyone.”",
         "„Bitte setzen Sie sich. Sie machen es für alle schlimmer.“"],
        ["“It's a hot brake. That's a hot brake smell. That's all that is.”",
         "„Das ist eine heiße Bremse. Das riecht nach heißer Bremse. Mehr ist das nicht.“"],
        ["“I've flown this route ninety times. Ninety.”",
         "„Ich bin diese Strecke neunzigmal geflogen. Neunzigmal.“"],
        ["“Why is it always the person in the middle seat.”",
         "„Warum ist es immer der in der Mitte.“"],

        // ------------------------------------------------------- and what it says far too late ---
        ["“Why did nobody say anything?”", "„Warum hat niemand etwas gesagt?“"],
        ["“You were saying something. Earlier. You were saying something.”",
         "„Sie haben etwas gesagt. Vorhin. Sie haben etwas gesagt.“"],
        ["“Why is the ceiling grey. Why is the ceiling GREY.”",
         "„Warum ist die Decke grau. Warum ist die Decke GRAU.“"],
        ["“Is there an announcement? There should be an announcement.”",
         "„Gibt es eine Durchsage? Es müsste eine Durchsage geben.“"],
        ["“I can't — I can't get a breath. I can't get a breath.”",
         "„Ich kann nicht — ich krieg keine Luft. Ich krieg keine Luft.“"],
        ["“Tell my — no. No, I'll tell them myself. We're landing. We're landing.”",
         "„Sagen Sie meiner — nein. Nein, ich sage es ihr selbst. Wir landen. Wir landen.“"],
        ["“What do we do? WHAT DO WE DO?”", "„Was machen wir? WAS MACHEN WIR?“"],
        ["“I'm sorry. I'm sorry. I'm sorry I said that to you.”",
         "„Es tut mir leid. Es tut mir leid. Es tut mir leid, dass ich das zu Ihnen gesagt habe.“"],
    ]);
})(window);
