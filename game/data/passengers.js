// The souls on board. Sixty-one of them, and one is you.
//
// Every passenger is the `pax` sprite with three colours swapped, so the roster is data and the
// art cannot drift. What makes them different is `kg`, which decides how long a carry takes,
// `traits`, which decide whether a carry is possible at all, and what they say, which decides
// whether you want to.
//
// The seats are not random. Rows 12 to 18 are full, because that is where the fire is and a game
// about triage needs the hard choices next to each other, and the front third is thin, because
// somebody has to be easy to save or the player never learns that saving is possible.
//
// Traits and what they cost you
// -----------------------------
//   asleep      starts unconscious to the world; wakes slowly and badly
//   headphones  cannot hear you at all until you touch them
//   sceptic     needs twice the credibility to believe a word of it
//   hostile     actively obstructs; will put you back in your seat if it can
//   helpful     the ones who become helpers, which is the only way this goes well
//   child       light, fast, and terrified
//   infant      cannot be persuaded, only carried, and comes with a parent who will not leave
//   elderly     cannot walk unaided; a carry or nothing
//   immobile    a wheelchair user with no chair on board; a carry or nothing
//   large       a carry needs two people or a very strong one
//   drunk       will not stand, will not stay put, finds it funny
//   nervous     panics early and blocks the aisle
//   medical     a doctor, a nurse, a vet; can be recruited to treat casualties
//   crew        deadheading or off-duty; can be recruited to do crew things
//   pet         not a person and does not count, which the game will argue with you about
(function (global) {
    "use strict";
    const PRS = global.PRS = global.PRS || {};

    const SKIN = {
        a: "#f2d0b4", b: "#e5b791", c: "#d9a279", d: "#c08a5e",
        e: "#a06b42", f: "#7d4f2e", g: "#5c3a20", h: "#3f2717",
    };
    const HAIR = {
        black: "#1d1712", dark: "#2b2118", brown: "#4a3220", chestnut: "#6b4423",
        auburn: "#8a3b1e", ginger: "#b8541f", blond: "#d9b16a", platinum: "#e8dcc0",
        grey: "#9aa0a6", white: "#dfe3e6", dyed: "#c0397a", teal: "#2f8f8a",
        bald: "#c9a17c", cap: "#26303f",
    };
    const SHIRT = {
        navy: "#25355c", denim: "#4a5a86", steel: "#4f5a68", olive: "#4f5a32",
        rust: "#8a4526", crimson: "#8e2b2b", plum: "#5a2f5e", teal: "#25605f",
        mustard: "#9a7420", cream: "#c9c0aa", white: "#d8dbe0", grey: "#6b7280",
        pink: "#b8617f", forest: "#2c5137", tan: "#9a7f5a", black: "#232630",
        hivis: "#c9a227", tracksuit: "#2f3f7a", suit: "#1c2130", scrubs: "#3f7d8a",
    };

    // name, seat, kg, hair, skin, shirt, traits, one thing they say, one thing they say when you
    // put your hands on them.
    const ROSTER = [
        ["Marguerite Okonjo", "1A", 64, "black", "g", "cream", ["helpful"],
         "“I have been watching you. You are the only one moving.”",
         "“Yes. Fine. Take me. But then you go back for the others.”"],
        ["Bernard Halliwell", "1C", 88, "grey", "a", "suit", ["sceptic", "hostile"],
         "“I paid for this cabin specifically so I would not be spoken to.”",
         "“Take your hands off me. I will have your name.”"],
        ["Astrid Vollmer", "1D", 59, "platinum", "a", "white", ["sceptic"],
         "“If there were a fire, they would have said something.”",
         "“I am not going anywhere until somebody in a uniform tells me to.”"],
        ["Yusuf Demirtas", "2B", 81, "dark", "d", "denim", ["helpful"],
         "“I smell it too. I thought it was the ovens.”",
         "“No, no - I walk. Save your arms for someone who cannot.”"],
        ["Rosalind Achebe", "3A", 66, "black", "f", "plum", ["medical", "helpful"],
         "“I am a paediatric nurse. Tell me what you have seen, precisely.”",
         "“Walk me through it while we go. I can take the next one myself.”"],
        ["Denny Prosser", "3F", 94, "brown", "b", "tracksuit", ["drunk"],
         "“Mate. Mate. Is it a barbecue.”",
         "“I love this. I love this so much. Where are we going.”"],
        ["Hyun-woo Park", "4C", 74, "black", "c", "grey", ["headphones"],
         "“— sorry, what? I had the noise cancelling on.”",
         "“Oh. Oh, that is a lot of smoke. Yes. Going.”"],
        ["Ivy Nakagawa", "4D", 61, "black", "b", "pink", ["nervous"],
         "“I knew it. I said to my sister. I said this exact thing.”",
         "“Don't let go don't let go don't let go—”"],
        ["Grover Batts", "5B", 108, "bald", "b", "hivis", ["large", "helpful"],
         "“I do industrial safety. That bin has been ticking for ten minutes.”",
         "“I'll walk. Then I'll come back with you and we'll do this properly.”"],
        ["Simone Bertrand", "5E", 57, "auburn", "a", "crimson", ["sceptic"],
         "“The crew are extremely relaxed. I am taking my cue from them.”",
         "“This is assault. This is textbook assault.”"],
        ["Nadia Farouk", "6F", 63, "black", "e", "teal", ["medical"],
         "“I'm a vet. It's not the same but it's not nothing.”",
         "“I can carry the small ones. Give me the small ones.”"],
        ["Wilbur Ansty", "7C", 86, "white", "a", "tan", ["elderly"],
         "“I flew Vulcans. I know what an electrical fire smells like.”",
         "“The hip is the problem, not the nerve. Under the arms, lad.”"],
        ["Priya Vashisht", "7D", 68, "black", "d", "mustard", ["helpful"],
         "“I'll take the row behind me if you take the row in front.”",
         "“Don't carry me, I'm fine, give me someone to carry.”"],
        ["Cassius Odum", "8B", 77, "black", "g", "navy", ["sceptic", "headphones"],
         "“I have four hours of podcast left and I intend to finish them.”",
         "“Oh you're serious. You're actually serious.”"],
        ["Lark Pettibone", "8E", 52, "dyed", "a", "black", ["nervous"],
         "“I've been posting about this for six minutes and nobody believes me either.”",
         "“Are you filming? Someone should be filming.”"],
        ["Constance Mbeki", "9A", 70, "black", "f", "forest", ["helpful"],
         "“Tell me where you need me and stop asking so nicely.”",
         "“I said stop asking nicely. Move.”"],
        ["Reg Thorpe", "9F", 91, "grey", "b", "olive", ["hostile", "sceptic"],
         "“Sit down. You're frightening the children.”",
         "“Get off. GET OFF. Somebody get this person off me.”"],
        ["Anneke Visser", "10C", 65, "blond", "a", "denim", [],
         "“I don't know what to do. Tell me what to do and I'll do it.”",
         "“Thank you. Thank you. I'm sorry I'm so heavy.”"],
        ["Bram Visser", "10D", 24, "blond", "a", "cream", ["child"],
         "“Is the plane going to be okay? Mum said it's fine.”",
         "“I can hold on. I'm good at holding on.”"],
        ["Fenna Visser", "10E", 7, "blond", "a", "pink", ["infant"],
         "(she is two and she is asleep and she is heavier than she looks)",
         "(she does not wake, which is the only good news on this aeroplane)"],
        ["Osgood Trill", "11A", 83, "chestnut", "b", "rust", ["drunk", "hostile"],
         "“I'll tell you what's on fire. My connecting flight. Ruined.”",
         "“We're not doing this. We're really not doing this.”"],
        ["Maribel Cruz", "11B", 60, "black", "d", "white", ["helpful", "medical"],
         "“I'm second-year medicine. Which is to say I know enough to be frightened.”",
         "“Airway, breathing, circulation. I remember that much. Go.”"],
        ["Kwabena Asare", "11F", 88, "black", "g", "suit", ["sceptic"],
         "“The overhead bins are certified. I sell the certification.”",
         "“…the certification is for the panel, not the contents. Oh no.”"],
        ["Junie Marsh", "12A", 55, "ginger", "a", "mustard", ["asleep"],
         "(asleep, mouth open, headphones in, one shoe off)",
         "“nnnh — are we landing — is this Faro—”"],
        ["Marisol Quintero", "12C", 64, "dark", "d", "crimson", ["nervous"],
         "“That is fire. That is fire. WHY IS NOBODY — that is FIRE.”",
         "“Thank God. Thank God. Someone else can see it.”"],
        ["Petra Halvorsen", "12D", 72, "platinum", "a", "steel", ["sceptic"],
         "“It's the galley oven. It's always the galley oven.”",
         "“It is not the galley oven. I see that now.”"],
        ["Ade Balogun", "12E", 85, "black", "g", "denim", ["helpful"],
         "“Point. Don't explain. Just point and I'll go.”",
         "“Right behind you.”"],
        ["Winnifred Sloe", "12F", 58, "white", "a", "plum", ["elderly", "sceptic"],
         "“I have flown through worse than this and eaten the meal.”",
         "“My handbag. I am not moving one inch without my handbag.”"],
        ["Dermot Leahy", "13A", 90, "brown", "a", "olive", ["headphones", "asleep"],
         "(asleep against the window with a neck pillow on backwards)",
         "“WHAT. WHAT. I WAS ASLEEP.”"],
        ["Sunita Rao", "13B", 62, "black", "d", "teal", ["medical", "helpful"],
         "“I'm an anaesthetist. Airways are literally my whole job.”",
         "“Get me to anyone who has stopped coughing. Those are the urgent ones.”"],
        ["Milo Fenwick", "13C", 31, "brown", "a", "cream", ["child"],
         "“The man behind us said a bad word about the smoke.”",
         "“Am I allowed? Is it allowed to run?”"],
        ["Blythe Fenwick", "13D", 69, "chestnut", "a", "pink", [],
         "“If you take my son I will follow you anywhere. Not before.”",
         "“Him first. HIM FIRST.”"],
        ["Gideon Fenwick", "13E", 92, "brown", "a", "navy", ["hostile"],
         "“We are staying together. That is the plan. That is the only plan.”",
         "“All four of us or none of us. I mean it.”"],
        ["Otis Fenwick", "13F", 12, "brown", "a", "mustard", ["infant"],
         "(one, and he thinks the smoke alarm is a game)",
         "(he laughs, which is somehow the worst sound on the aeroplane)"],
        ["Vera Lundqvist", "14A", 67, "grey", "a", "cream", ["elderly"],
         "“Is it my bag? Have I done something? Is it my bag?”",
         "“It is my bag, isn't it. Oh, my dear. Oh, no.”"],
        ["Chip Vanterpool", "14C", 80, "brown", "b", "black", ["hostile", "sceptic"],
         "“That's my bag up there and there is nothing in it. Nothing.”",
         "“It was one vape. ONE. They said the battery was fine.”"],
        ["Georgina Ash", "14D", 63, "auburn", "a", "forest", ["nervous"],
         "“I can feel it through the ceiling. Put your hand up. FEEL it.”",
         "“Is it hot where we're going? Is it hot there too?”"],
        ["Bo Kristiansen", "14E", 97, "blond", "a", "steel", ["large"],
         "“I cannot get out of this seat quickly and we both know it.”",
         "“You will hurt yourself. Get someone to take the other side.”"],
        ["Fatoumata Sy", "14F", 61, "black", "g", "mustard", ["helpful"],
         "“I counted. Twelve rows to the wing exit. I've been counting for an hour.”",
         "“Twelve rows. I'll take the ones who can walk. You take the ones who can't.”"],
        ["Lionel Ferreira", "15A", 84, "grey", "c", "denim", ["asleep", "elderly"],
         "(asleep, and he has taken something to be asleep)",
         "(he does not stir; his weight is entirely in your arms)"],
        ["Duncan Threlfall", "15C", 87, "grey", "a", "suit", ["hostile"],
         "“Sit. Down. There are procedures and you are not one of them.”",
         "“Unhand — this is — I am a magistrate, you know.”"],
        ["Aiko Sorensen", "15D", 58, "black", "b", "white", ["immobile"],
         "“My chair is in the hold. I have not been able to move since Gatwick.”",
         "“Under the knees. Yes. Like that. You've done this before.”"],
        ["Emeka Nwosu", "15E", 82, "black", "g", "olive", ["helpful", "crew"],
         "“I'm cabin crew for a different airline. This is not their procedure.”",
         "“Give me the aft. I know the aft. Go forward.”"],
        ["Trudy Vane", "15F", 71, "white", "a", "plum", ["sceptic", "elderly"],
         "“In my day we simply didn't make a fuss.”",
         "“Well. This is a fuss. This is quite a considerable fuss.”"],
        ["Bettina Roth", "16C", 66, "brown", "a", "crimson", ["nervous", "hostile"],
         "“You are making it worse. You are making everyone panic.”",
         "“IF WE ALL RUSH THE FRONT WE ALL DIE. THAT'S HOW IT WORKS.”"],
        ["Solly Grubb", "16D", 101, "bald", "b", "rust", ["large", "drunk"],
         "“I've had four gins and this is the most interesting flight of my life.”",
         "“I'm dead weight, pal. I'm being honest with you. I'm dead weight.”"],
        ["Amara Diallo", "17B", 64, "black", "g", "white", ["helpful", "medical"],
         "“GP. Twenty-two years. Smoke inhalation kills people who look fine.”",
         "“The quiet ones. Bring me the quiet ones first.”"],
        ["Norbert Klee", "17E", 74, "grey", "a", "grey", ["asleep", "headphones"],
         "(asleep with an eye mask on, which he paid extra for)",
         "“Is it the meal? Have I missed the meal?”"],
        ["Sanne de Vries", "18A", 60, "blond", "a", "denim", [],
         "“I'll go if she goes. She won't go.”",
         "“She's not going. Take me. Come back for her.”"],
        ["Iris Colbeck", "18B", 68, "white", "a", "forest", ["elderly", "sceptic"],
         "“Sanne is being dramatic. Sanne has always been dramatic.”",
         "“Sanne? SANNE? Where has she taken me?”"],
        ["Tariq Halabi", "19C", 80, "black", "e", "navy", ["helpful"],
         "“I'm strong and I'm frightened. Use the first part.”",
         "“Who's next. Don't tell me the odds, just tell me who's next.”"],
        ["Peggy Stoat", "19F", 56, "white", "a", "mustard", ["elderly", "asleep"],
         "(asleep with the crossword done in pen, all of it, correctly)",
         "(she weighs almost nothing and it does not make it easier)"],
        ["Yevgeni Sobol", "20D", 93, "dark", "b", "steel", ["hostile", "drunk"],
         "“You. Sit. You are the problem. You have been the problem all flight.”",
         "“No. NO. We land in fifteen minutes. FIFTEEN.”"],
        ["Delphine Mercier", "21A", 62, "chestnut", "a", "pink", ["nervous"],
         "“I can hear it. Under the noise. It has a sound.”",
         "“It does have a sound, doesn't it. You hear it too.”"],
        ["Bruno", "21B", 9, "brown", "a", "tan", ["pet"],
         "(a French bulldog in a bag under the seat, breathing badly)",
         "(he does not weigh much and he will cost you thirty seconds you cannot spare)"],
        ["Harriet Pomfret", "21F", 73, "grey", "a", "plum", ["sceptic", "hostile"],
         "“Would you please sit down. Would you please just sit down.”",
         "“I have asked you nicely eleven times. Eleven.”"],
        ["Stellan Aas", "22C", 86, "blond", "a", "olive", ["crew"],
         "“I'm a first officer. Off duty. Deadheading. Not my aeroplane.”",
         "“It is my aeroplane, isn't it. Damn it. All right.”"],
        ["Noor Rahimi", "22E", 65, "black", "e", "teal", ["helpful"],
         "“I teach year fives. I can move eleven children in ninety seconds.”",
         "“Hands on shoulders, in a line, no talking. Watch.”"],
        ["Gus Peabody", "23B", 77, "ginger", "a", "denim", ["drunk", "headphones"],
         "“WOOO. Hey. Hey. Is that a fire? That's a fire.”",
         "“This is the best thing that has ever happened to me.”"],
        ["Odette Ruus", "23E", 69, "white", "a", "cream", ["elderly", "immobile"],
         "“I cannot walk, my dear. I have not been able to walk since March.”",
         "“Slowly. Slowly. You are doing very well.”"],
    ];

    // The crew. Not passengers: they have a procedure, and the procedure is in crew.js.
    const CREW = [
        { id: "fa1", name: "Yasmin Aboud", role: "Cabin crew, aft", sprite: "crew",
          seat: "aft", hair: "#3a2c1e", skin: SKIN.e, shirt: "#20304e",
          line: "“Sir. Madam. Whoever you are. Please take your seat.”" },
        { id: "fa2", name: "Callum Reidy", role: "Cabin crew, forward", sprite: "crew",
          seat: "fwd", hair: "#6b4423", skin: SKIN.a, shirt: "#20304e",
          line: "“We're aware of a smell. It's being looked at. Please sit down.”" },
        { id: "purser", name: "Ingrid Halloway", role: "Purser", sprite: "purser",
          seat: "fwd", hair: "#9aa0a6", skin: SKIN.b, shirt: "#141c30",
          line: "“I have thirty-one years on this aircraft type. Sit down.”" },
    ];

    // Six ways to be a passenger who will not move, cycled when someone has nothing specific to
    // say. The point of them is that they are all reasonable.
    const AMBIENT = [
        "“They'd tell us. They'd have to tell us.”",
        "“It's the ovens. They always do this on the descent.”",
        "“I'm not getting up until the sign goes off.”",
        "“If it were serious there'd be an announcement.”",
        "“The crew are still doing the trolley. Look. The trolley.”",
        "“Fifteen minutes. We can all sit still for fifteen minutes.”",
        "“Is somebody vaping? Somebody's vaping.”",
        "“My connection is in fifty minutes and this is not helping.”",
        "“Please sit down. You're making it worse for everyone.”",
        "“It's a hot brake. That's a hot brake smell. That's all that is.”",
        "“I've flown this route ninety times. Ninety.”",
        "“Why is it always the person in the middle seat.”",
    ];

    // What they say once it is undeniable and far too late.
    const LATE = [
        "“Why did nobody say anything?”",
        "“You were saying something. Earlier. You were saying something.”",
        "“Why is the ceiling grey. Why is the ceiling GREY.”",
        "“Is there an announcement? There should be an announcement.”",
        "“I can't — I can't get a breath. I can't get a breath.”",
        "“Tell my — no. No, I'll tell them myself. We're landing. We're landing.”",
        "“What do we do? WHAT DO WE DO?”",
        "“I'm sorry. I'm sorry. I'm sorry I said that to you.”",
    ];

    PRS.data = PRS.data || {};
    PRS.data.passengers = { SKIN, HAIR, SHIRT, ROSTER, CREW, AMBIENT, LATE };
})(window);
