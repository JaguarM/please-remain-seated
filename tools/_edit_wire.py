import io

def read(p): return io.open(p, encoding='utf-8').read()
def write(p, t): io.open(p, 'w', encoding='utf-8', newline='\n').write(t)

def edit(path, pairs):
    t = read(path)
    for old, new in pairs:
        assert old in t, (path, old[:70])
        t = t.replace(old, new, 1)
    write(path, t)

# ---- evidence is worth something once ----------------------------------------------------------
edit('game/data/actions-fire.js', [
 ('''          when: (S) => nearFire(S) && !!slot(S, "phone"),''',
  '''          when: (S) => nearFire(S) && !!slot(S, "phone") && !S.flags.havePhoto,'''),
 ('''              S.credibility = Math.min(100, S.credibility + 4);
              return "You point at it. You do not explain. " + n + " people look where you are " +''',
  '''              return "You point at it. You do not explain. " + n + " people look where you are " +'''),
])
edit('game/data/actions-crew.js', [
 ('''        { id: "crew.call_button_hold", deck: "crew", tags: ["social"], danger: "neutral",
          label: "Hold the call button down", cost: 14,''',
  '''        { id: "crew.call_button_hold", deck: "crew", tags: ["social"], danger: "neutral",
          label: "Hold the call button down", cost: 14, once: true,'''),
 ('''          targets: near,
          when: (S, t) => worth(S, t.c, 30),
          label: (S, t) => "Tell " + t.c.name + " about the bin",''',
  '''          targets: near,
          when: (S, t) => S.crewPhase < 2 && worth(S, t.c, 30),
          label: (S, t) => "Tell " + t.c.name + " about the bin",'''),
 ('''          when: (S) => !!S.flags.havePhoto,
          label: (S, t) => "Show " + t.c.name + " the photograph",
          detail: "Evidence beats an account of evidence every time.",
          cost: 10,
          run(S, t) {
              cred(S, 26);''',
  '''          when: (S, t) => !!S.flags.havePhoto && !t.c.shownPhoto,
          label: (S, t) => "Show " + t.c.name + " the photograph",
          detail: "Evidence beats an account of evidence every time.",
          cost: 10,
          run(S, t) {
              t.c.shownPhoto = true;
              cred(S, 26);'''),
 ('''          when: (S) => S.player.burns > 12,
          label: (S, t) => "Show " + t.c.name + " your hand",
          cost: 8,
          run(S, t) {
              cred(S, 22);''',
  '''          when: (S, t) => S.player.burns > 12 && !t.c.shownBurn,
          label: (S, t) => "Show " + t.c.name + " your hand",
          cost: 8,
          run(S, t) {
              t.c.shownBurn = true;
              cred(S, 22);'''),
 ('''        { id: "crew.lead", deck: "crew", tags: ["social"], danger: "good",
          targets: near,
          label: (S, t) => "Take " + t.c.name + " to the bin",''',
  '''        { id: "crew.lead", deck: "crew", tags: ["social"], danger: "good",
          targets: near,
          when: (S, t) => !t.c.hasSeenIt,
          label: (S, t) => "Take " + t.c.name + " to the bin",'''),
 ('''          when: (S, t) => worth(S, t.c, 50),
          label: (S, t) => "Ask " + t.c.name + " to make an announcement",''',
  '''          when: (S, t) => !S.flags.crewPA && worth(S, t.c, 50),
          label: (S, t) => "Ask " + t.c.name + " to make an announcement",'''),
 ('''              if (ask(S, t.c, 50)) {
                  S.cabinAwareness = Math.min(100, S.cabinAwareness + 30);''',
  '''              if (ask(S, t.c, 50)) {
                  st.setFlag(S, "crewPA");
                  S.cabinAwareness = Math.min(100, S.cabinAwareness + 30);'''),
 ('''          detail: "The two people who can put this aeroplane on the ground do not know yet.",''',
  '''          detail: "The two people who can put this aeroplane on the ground do not know yet. " +
                  "Told, they get it down sooner, and sooner is ninety seconds you do not get.",'''),
])
edit('game/data/actions-people.js', [
 ('''            run(S, c) {
                const roll = say(S, c.p, "there is a fire", { awareness: 22 });
                S.credibility = Math.min(100, S.credibility + (roll.ok ? 3 : 1));
                if (roll.ok) {
                    c.p.trust = Math.min(100, c.p.trust + 18);''',
  '''            run(S, c) {
                const was = c.p.trust;
                const roll = say(S, c.p, "there is a fire", { awareness: 22 });
                if (roll.ok) {
                    c.p.trust = Math.min(100, c.p.trust + 18);
                    // Turning somebody is worth something to the room. Telling a believer is not.
                    if (was <= 30) S.credibility = Math.min(100, S.credibility + 3);'''),
 ('''            run(S, c) {
                const roll = say(S, c.p, "look", { bonus: 30, awareness: 30 });
                c.p.trust = Math.min(100, c.p.trust + 30);
                S.credibility = Math.min(100, S.credibility + 4);''',
  '''            run(S, c) {
                const was = c.p.trust;
                say(S, c.p, "look", { bonus: 30, awareness: 30 });
                c.p.trust = Math.min(100, c.p.trust + 30);
                if (was <= 30) S.credibility = Math.min(100, S.credibility + 4);'''),
 # carrying and crawling are exclusive
 ('''    function pickUp(S, p) {
        p.state = "carried";
        p.carriedBy = "player";
        p.belted = false;
        p.x = S.player.x; p.y = S.player.y;
        S.player.carrying.push(p.id);
        st.reindex(S);''',
  '''    function pickUp(S, p) {
        p.state = "carried";
        p.carriedBy = "player";
        p.belted = false;
        p.x = S.player.x; p.y = S.player.y;
        S.player.carrying.push(p.id);
        S.player.crouching = false;
        st.reindex(S);'''),
 ('''            run(S, c) {
                S.player.dragging = c.p.id;
                c.p.state = "carried";
                c.p.carriedBy = "player";
                st.reindex(S);''',
  '''            run(S, c) {
                S.player.dragging = c.p.id;
                S.player.crouching = false;
                c.p.state = "carried";
                c.p.carriedBy = "player";
                st.reindex(S);'''),
])
edit('game/data/actions-extra.js', [
 ('''          run(S, c) {
              c.p.state = "carried";
              c.p.carriedBy = "player";
              c.p.belted = false;
              S.player.carrying.push(c.p.id);
              st.reindex(S);''',
  '''          run(S, c) {
              c.p.state = "carried";
              c.p.carriedBy = "player";
              c.p.belted = false;
              S.player.carrying.push(c.p.id);
              S.player.crouching = false;
              st.reindex(S);'''),
 # one action for "it is lithium", and it does everything the two used to
 ('''        { id: "extra.crew_water", deck: "crew", tags: ["social"], danger: "good",
          targets: (S) => PRS.crew.adjacentCrew(S).map((c) => ({ key: c.id, c: c })),
          when: (S) => !!S.flags.wilburSaid || S.fire.core.exposed,
          label: (S, t) => "Tell " + t.c.name + " to use water, not the halon",
          detail: "Halon does the flame. Water does the cell. Only one of those comes back.",
          cost: 20,
          run(S, t) {
              st.setFlag(S, "crewUseWater");
              S.credibility = Math.min(100, S.credibility + 16);
              S.fire.core.rate *= 0.72;
              return { text: "“Water. Keep putting water on it and don't stop.” " + t.c.name +
                  " hesitates for exactly as long as it takes to remember that this is in the " +
                  "manual and that they read it in February.", kind: "great" };
          } },''',
  '''        { id: "extra.crew_water", deck: "crew", tags: ["social"], danger: "good",
          targets: (S) => PRS.crew.adjacentCrew(S).map((c) => ({ key: c.id, c: c })),
          when: (S) => (!!S.flags.wilburSaid || S.fire.core.exposed) && !S.flags.crewUseWater,
          label: (S, t) => "Tell " + t.c.name + " it is a lithium battery: water, not halon",
          detail: "There is a specific drill for this and it is not the drill they are doing. " +
                  "You only know it because you looked, or because Wilbur told you.",
          cost: 20,
          run(S, t) {
              st.setFlag(S, "crewUseWater");
              S.credibility = Math.min(100, S.credibility + 20);
              S.fire.core.rate *= 0.72;
              PRS.crew.setPhase(S, Math.max(S.crewPhase, 3));
              return { text: "“Lithium?” Everything in " + t.c.name + "'s training reorders " +
                  "itself in about a second and a half. “Water. Not the BCF. Water, and keep " +
                  "putting water on it.” Which is right, and which the next cell is going to " +
                  "notice.", kind: "great" };
          } },'''),
])
edit('game/data/actions-move.js', [
 ('''            label: (S) => S.player.crouching ? "Stand back up" : "Get down and crawl",
            detail: "The smoke is at the ceiling. The air is at the floor. It is not a close call.",
            when: (S) => true,
            cost: 5,''',
  '''            label: (S) => S.player.crouching ? "Stand back up" : "Get down and crawl",
            detail: "The smoke is at the ceiling and the air is at the floor. Down there you " +
                    "breathe less than half of it, and every step takes half again as long.",
            when: (S) => !S.player.carrying.length && !S.player.dragging,
            cost: 5,'''),
])

# ---- the sim: recruiting is seen, medics treat on the way ---------------------------------------
edit('game/sim/pax.js', [
 ('''        p.belted = false;
        S.stats.helpersRecruited++;
        PRS.state.log(S, p.name + " is helping. " + (reason || ""), "great");''',
  '''        p.belted = false;
        S.stats.helpersRecruited++;
        // Somebody getting up to help is the cabin seeing that something is worth helping with.
        S.credibility = Math.min(100, S.credibility + 3);
        PRS.state.log(S, p.name + " is helping. " + (reason || ""), "great");'''),
 ('''                S.stats.helperSaves = (S.stats.helperSaves || 0) + 1;
                PRS.state.log(S, p.name + " gets " + t.name + " to " +
                    cabin.safeZoneName(zoneX) + ". You did not have to be there.", "good");''',
  '''                S.stats.helperSaves = (S.stats.helperSaves || 0) + 1;
                // A recruited doctor, nurse or vet has a look at the airway on the way, which is
                // the difference between "treated" and "serious" on the manifest.
                const medic = p.traits.indexOf("medical") >= 0;
                if (medic) t.smokeDose = Math.max(0, t.smokeDose - 20);
                PRS.state.log(S, p.name + " gets " + t.name + " to " +
                    cabin.safeZoneName(zoneX) + (medic ? ", breathing better than they were."
                                                       : ". You did not have to be there."), "good");'''),
])
edit('game/sim/crew.js', [
 ('''        { id: 4, name: "Declared",
          desc: "The flight deck knows. There is an emergency and it has a number." },''',
  '''        { id: 4, name: "Declared",
          desc: "The flight deck knows. The descent steepens: a runway sooner, ninety seconds fewer." },'''),
])
print("ok")
