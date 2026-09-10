// Cut from Please Remain Seated on 2026-09-10, on the rule that nothing stays unless it can
// help. None of this is loaded by index.html. It is kept because some of it is good writing
// and a future version might want a joke back. To restore one, paste it into the deck it
// came from (the file is named above each group) and run node tools/coverage.js.
//
// Worth a second look: the air horn, the megaphone, the gin, the neck pillow and the sock,
// Shout FIRE and its diminishing returns, the trolley barrier, the safety card, the lie,
// taping a man into his seat, the call button pressed forty times, the flight deck door,
// and the second vape in the lavatory bin, which had an ending of its own (cut-endings.js).


// ============================================================ from game/data/actions-fire.js

{ id: "fire.stand_between", deck: "fire", tags: ["fire"], danger: "bad",
          label: "Stand between the fire and the people", cost: 20,
          detail: "Your body is a heat shield. It is not a very good one.",
          when: (S) => nearFire(S) && st.paxAt(S, S.player.x, S.player.y).length +
                       cabin.neighbours(S.player.x, S.player.y)
                            .reduce((n, [x, y]) => n + st.paxAt(S, x, y).length, 0) > 0,
          run(S) {
              S.player.burns += 14;
              S.player.smokeDose += 5;
              for (const [x, y] of cabin.neighbours(S.player.x, S.player.y)) {
                  for (const p of st.paxAt(S, x, y)) p.burns = Math.max(0, p.burns - 6);
              }
              S.credibility = Math.min(100, S.credibility + 8);
              return { text: "You put yourself between the locker and the row behind it and stay " +
                       "there. It works, in the sense that the heat has to go through you first.",
                       kind: "bad" };
          } },

{ id: "fire.shout", deck: "fire", tags: ["fire", "social"], danger: "bad",
          label: "Shout FIRE",
          detail: (S) => (S.counts["fire.shout"] || 0) === 0
              ? "It will work. That is the problem with it."
              : "You have already shouted it. It is worth less every time.",
          cost: (S) => 8 + (S.counts["fire.shout"] || 0) * 14,
          when: (S) => (S.counts["fire.shout"] || 0) < 3,
          run(S) {
              const n = S.counts["fire.shout"] || 0;
              const heard = 1 / (1 + n * 2.5);
              S.cabinAwareness = Math.min(100, S.cabinAwareness + 34 * heard);
              S.cabinPanic = Math.min(100, S.cabinPanic + 26 * heard);
              S.credibility = Math.min(100, S.credibility + 8 * heard);
              for (const p of S.pax) p.awareness = Math.min(100, p.awareness + 26 * heard);
              PRS.audio.play("alarm");
              if (n === 0) {
                  return { text: "You shout the word. Sixty people hear it at once and about " +
                      "forty of them stand up at the same time, in an aisle that is fifty " +
                      "centimetres wide, facing the wrong way.", kind: "bad" };
              }
              return { text: "You shout it again. A cabin that has already heard a man shout " +
                  "FIRE has decided what it thinks about the man, and it does not revisit that " +
                  "on the second hearing.", kind: "bad" };
          } },

{ id: "fire.packs", deck: "fire", tags: ["fire", "cabin"],
          label: (S) => S.fire.packsHigh ? "Ask for the packs back to normal"
                                         : "Ask for the air conditioning on high",
          detail: "More air moves the smoke out faster and feeds the fire. Pick your problem.",
          when: (S) => S.crewPhase >= 2 &&
                       S.clock.elapsed - (S.flags.packsAt === undefined ? -999 : S.flags.packsAt) > 90,
          cost: 18,
          run(S) {
              st.setFlag(S, "packsAt", S.clock.elapsed);
              S.fire.packsHigh = !S.fire.packsHigh;
              if (S.fire.packsHigh) {
                  return { text: "The packs go to high. The noise in the cabin doubles, the smoke " +
                           "layer visibly lifts, and the fire gets a great deal more interested.",
                           kind: "neutral" };
              }
              return { text: "The packs come back. The smoke settles lower and stops moving, and " +
                       "the fire calms down about as much as a fire ever does.", kind: "neutral" };
          } },

{ id: "fire.umbrella", item: "umbrella", deck: "fire", tags: ["fire", "reach"],
          label: "Reach the bin latch with the umbrella", cost: 9,
          detail: "From the aisle, without standing under a locker that is on fire.",
          when: (S) => !!slot(S, "umbrella") && Math.abs(S.player.x - S.fire.core.x) <= 2,
          run(S) {
              const key = cabin.binKey(S.fire.core.x, "left");
              if (S.cabinFlags.binsOpen[key]) {
                  delete S.cabinFlags.binsOpen[key];
                  delete S.fire.binOpen[key];
                  F.starve(S.fire, S.fire.core.x, S.fire.core.y, 0.8);
                  return { text: "You hook the latch with the umbrella and swing the locker shut " +
                           "from two metres away, with your face nowhere near it.", kind: "good" };
              }
              S.cabinFlags.binsOpen[key] = true;
              S.fire.binOpen[key] = true;
              S.fire.core.exposed = true;
              S.player.lookedAtFire = true;
              S.credibility = Math.min(100, S.credibility + 20);
              return { text: "You flip the latch with the umbrella from the aisle and the locker " +
                       "drops open. Everybody in four rows can now see it, which is the point.",
                       kind: "great" };
          } },

{ id: "fire.crash_axe", item: "crash_axe", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Open the panel with the crash axe", cost: 24,
          detail: "There is fire behind the sidewall and you cannot reach it through the sidewall.",
          when: (S) => nearFire(S) && !!slot(S, "crash_axe"),
          run(S) {
              const t = hot(S);
              F.apply(S.fire, t.x, t.y, "smother", 0.6, 0);
              S.fire.fuel[cabin.idx(t.x, t.y)] *= 0.6;
              st.setFlag(S, "panelOpen");
              return { text: "Four swings and the sidewall panel comes off. Behind it there is " +
                       "insulation, a loom, and a great deal of orange you had not been able to " +
                       "see. Now you can put something on it.", kind: "good" };
          } },

{ id: "fire.cushion_to_lav", deck: "fire", tags: ["fire", "carry"], danger: "good",
          label: "Put the burning cushion in the lavatory", cost: 26,
          when: (S) => S.flags.holdingCushion,
          run(S) {
              const r = A.route(S, cabin.AFT_GALLEY_X, 7);
              if (r) A.travel(S, r);
              st.setFlag(S, "holdingCushion", false);
              return { text: "You put a burning seat cushion in a lavatory and shut the door on " +
                       "it. It is a small metal room with a smoke detector and no people in it, " +
                       "which makes it the best place on this aeroplane for a fire.", kind: "good" };
          } },

{ id: "fire.halon_bursts", item: "halon_bottle", deck: "fire", tags: ["fire", "hands"], danger: "good",
          label: "Halon, in short bursts", cost: 20,
          detail: "Make the bottle last. A trained person does it this way.",
          when: (S) => nearFire(S) && haveCharged(S, "halon_bottle") &&
                       (st.hasPerk(S, "firecraft") || st.hasPerk(S, "knows_kit")),
          run(S) {
              const s = slot(S, "halon_bottle");
              s.uses = Math.max(0, s.uses - 0.34);
              const t = hot(S);
              F.apply(S.fire, t.x, t.y, "halon", 0.7, 0.5);
              S.stats.agentsUsed++;
              PRS.audio.play("halon");
              return { text: "Three one-second bursts at the base, sweeping. A third of a bottle " +
                       "and the same result as the whole bottle.", kind: "good" };
          } },

{ id: "fire.wet_carpet", item: (S) => S.flags.bagFull ? "binbag" : "water_big", deck: "fire", tags: ["fire"], danger: "good",
          label: "Soak the carpet across the aisle", cost: 12,
          detail: "A firebreak across the whole cabin, at the one tile everything has to cross.",
          when: (S) => S.player.y === cabin.AISLE_Y &&
                       (haveCharged(S, "water_big") || S.flags.bagFull),
          run(S) {
              if (S.flags.bagFull) S.flags.bagFull = false;
              else st.useCharge(S, slot(S, "water_big"));
              for (let y = 1; y <= 7; y++) {
                  const i = cabin.idx(S.player.x, y);
                  S.fire.suppress[i] = Math.min(100, S.fire.suppress[i] + 34);
              }
              S.stats.agentsUsed++;
              return { text: "You lay a wet line all the way across the cabin at row " +
                       (cabin.rowAt(S.player.x) || "?") + ". The fire will get past it. It will " +
                       "take four times as long.", kind: "good" };
          } },


// ============================================================ from game/data/actions-people.js

{
            id: "people.unbuckle", deck: "people", tags: ["hands", "fiddly"],
            targets: (S) => reach(S).filter((c) => c.p.belted),
            label: (S, c) => "Unbuckle " + who(c),
            cost: 6,
            run(S, c) { c.p.belted = false;
                        return "The buckle comes up. " + c.p.name + " is loose."; },
        },

{
            id: "people.cut_belt", item: (S) => { const s = st.inventoryHas(S, "cut"); return s ? s.id : null; }, deck: "people", tags: ["hands"],
            targets: (S) => reach(S).filter((c) => c.p.belted),
            when: (S) => !!st.inventoryHas(S, "cut"),
            label: (S, c) => "Cut " + who(c) + "'s seatbelt",
            detail: "Two seconds instead of six, and it cannot be done up again.",
            cost: 3,
            run(S, c) { c.p.belted = false;
                        return "You cut the belt off " + c.p.name + ". Nobody is putting them " +
                               "back in that seat now."; },
        },

{
            id: "people.brace", deck: "people", tags: ["social"], danger: "good",
            targets: (S) => reach(S).filter((c) => !c.p.braced),
            label: (S, c) => "Show " + who(c) + " the brace position",
            detail: "Head down, hands over, feet back. It is worth doing and it is on the card.",
            cost: 14,
            run(S, c) {
                c.p.braced = true;
                c.p.panic = Math.max(0, c.p.panic - 12);
                return { text: c.p.name + " gets into the brace position properly, which almost " +
                    "nobody on any aeroplane ever does. It is worth about four seconds of smoke.",
                    kind: "good" };
            },
        },

{
            id: "people.lie", deck: "people", tags: ["social"], danger: "neutral",
            targets: reachAwake,
            label: (S, c) => "Tell " + who(c) + " the crew asked you to move them",
            detail: "It is not true. It works about half the time and it costs you later.",
            cost: 12,
            run(S, c) {
                const roll = say(S, c.p, "the crew asked me", { bonus: 26 });
                if (roll.ok) {
                    c.p.trust = Math.min(100, c.p.trust + 26);
                    c.p.belted = false;
                    c.p.state = c.p.state === "seated" ? "standing" : c.p.state;
                    st.setFlag(S, "toldALie");
                    return { text: "“Oh — well, if the crew said.” " + c.p.name + " is out of " +
                        "the seat in four seconds, which is faster than the truth has managed " +
                        "all afternoon.", kind: "good" };
                }
                c.p.trust -= 20;
                S.credibility = Math.max(0, S.credibility - 6);
                return { text: "“I'll wait for them to tell me themselves, thank you.” That is " +
                    "going to be harder next time.", kind: "bad" };
            },
        },

{
            id: "people.truth", deck: "people", tags: ["social"],
            targets: reachAwake,
            label: (S, c) => "Tell " + who(c) + " exactly how bad it is",
            detail: "No softening. The number of cells, the smoke, the time.",
            cost: 20,
            run(S, c) {
                const roll = say(S, c.p, "the truth", { bonus: st.hasPerk(S, "reads_fire") ? 22 : 4,
                                                        awareness: 34 });
                c.p.panic = Math.min(100, c.p.panic + 22);
                if (roll.ok) {
                    c.p.trust = Math.min(100, c.p.trust + 34);
                    return { text: c.p.name + " takes it. Actually takes it. “What do you want me " +
                        "to do.”", kind: "great" };
                }
                return { text: c.p.name + " does not want it and you have just made them much " +
                    "more frightened without making them any more useful.", kind: "bad" };
            },
        },

{
            id: "people.shout_at", deck: "people", tags: ["social"], danger: "bad",
            targets: reachAwake,
            label: (S, c) => "Shout at " + who(c),
            cost: 7,
            run(S, c) {
                const roll = say(S, c.p, "MOVE", { bonus: -10, awareness: 24 });
                c.p.panic = Math.min(100, c.p.panic + 20);
                S.cabinPanic = Math.min(100, S.cabinPanic + 4);
                if (roll.ok) {
                    c.p.belted = false;
                    c.p.state = P.looseState(c.p);
                    return { text: c.p.name + " gets up because you shouted, which will work " +
                        "exactly once.", kind: "plain" };
                }
                c.p.trust -= 14;
                return { text: c.p.name + " shouts back. Three other people join in on their side.",
                         kind: "bad" };
            },
        },

{
            id: "people.threaten", deck: "people", tags: ["social"], danger: "bad",
            targets: reachAwake,
            label: (S, c) => "Threaten " + who(c),
            when: (S, c) => c.p.traits.indexOf("hostile") >= 0 || S.player.panic > 60,
            cost: 10,
            run(S, c) {
                const roll = say(S, c.p, "threat", { bonus: st.hasPerk(S, "authority") ? 30 : -14 });
                if (roll.ok) {
                    c.p.belted = false;
                    c.p.state = P.looseState(c.p);
                    return { text: c.p.name + " believes you, gets up, and is going to describe " +
                        "you very accurately to an investigator in about six weeks.", kind: "plain" };
                }
                c.p.trust -= 30;
                S.credibility = Math.max(0, S.credibility - 8);
                return { text: c.p.name + " calls for the cabin crew. Loudly. By name.", kind: "bad" };
            },
        },

{
            id: "people.tape_to_seat", item: "tape", deck: "people", tags: ["social", "fiddly"], danger: "bad",
            targets: (S) => reachAwake(S).filter((c) => c.p.state === "aisle"),
            when: (S) => !!st.slotOf(S, "tape") && st.slotOf(S, "tape").uses > 0,
            label: (S, c) => "Tape " + who(c) + " into a seat",
            cost: 24,
            run(S, c) {
                st.useCharge(S, st.slotOf(S, "tape"));
                const p = c.p;
                p.state = "seated"; p.x = p.homeX; p.y = p.homeY; p.belted = true;
                p.trust = -60;
                delete S.cabinFlags.aisleBlocked[p.homeX];
                st.reindex(S);
                S.credibility = Math.max(0, S.credibility - 10);
                return { text: "You duct tape a member of the public into seat " + p.seat + ". " +
                    "The aisle is clear. There is going to be a paragraph about this.", kind: "bad" };
            },
        },

{
            id: "people.give_torch", item: "torch", deck: "people", tags: ["hands"],
            targets: reachAwake,
            when: (S) => !!st.slotOf(S, "torch"),
            label: (S, c) => "Give " + who(c) + " the torch",
            detail: "Somebody at the front needs to be able to see the door.",
            cost: 6,
            run(S, c) {
                c.p.trust = Math.min(100, c.p.trust + 25);
                st.setFlag(S, "torchGiven");
                return c.p.name + " has the torch. When the smoke gets to the floor there is now " +
                    "one light in this cabin that is pointing at a door.";
            },
        },

{
            id: "people.give_gin", item: "gin", deck: "people", tags: ["hands"],
            targets: reachAwake,
            when: (S) => { const s = st.slotOf(S, "gin"); return s && s.uses > 0; },
            label: (S, c) => "Give " + who(c) + " a miniature",
            detail: "It is a terrible idea and it will absolutely work.",
            cost: 6,
            run(S, c) {
                st.useCharge(S, st.slotOf(S, "gin"));
                c.p.panic = Math.max(0, c.p.panic - 34);
                c.p.trust = Math.min(100, c.p.trust + 28);
                c.p.awareness = Math.max(0, c.p.awareness - 10);
                return c.p.name + " drinks fifty millilitres of gin at eleven thousand feet and " +
                    "becomes noticeably easier to work with and noticeably worse at everything.";
            },
        },

{
            id: "people.give_pretzels", item: "pretzels", deck: "people", tags: ["hands"],
            targets: (S) => reachAwake(S).filter((c) => P.isChild(c.p)),
            when: (S) => { const s = st.slotOf(S, "pretzels"); return s && s.uses > 0; },
            label: (S, c) => "Give " + who(c) + " the pretzels",
            cost: 5,
            run(S, c) {
                st.useCharge(S, st.slotOf(S, "pretzels"));
                c.p.trust = 90;
                c.p.panic = Math.max(0, c.p.panic - 40);
                return { text: c.p.name + " will now follow you anywhere in the world. It cost a " +
                    "bag of pretzels. Nothing else in this game has this exchange rate.",
                    kind: "good" };
            },
        },

{
            id: "people.thank_helper", deck: "people", tags: ["social"],
            targets: (S) => reach(S).filter((c) => c.p.helper),
            label: (S, c) => "Tell " + who(c) + " they are doing well",
            detail: "It costs eight seconds and it is not nothing.",
            cost: 8,
            run(S, c) {
                c.p.trust = Math.min(100, c.p.trust + 15);
                c.p.panic = Math.max(0, c.p.panic - 18);
                c.p.taskLeft = Math.max(0, (c.p.taskLeft || 0) - 5);
                return c.p.name + " does not answer. " + c.p.name + " nods once and goes back " +
                    "for the next one, slightly faster.";
            },
        },

{
            id: "people.point_at_it", deck: "people", tags: ["social"],
            targets: reachAwake,
            label: (S, c) => "Make " + who(c) + " look at the bin",
            detail: "Physically turn their head if you have to.",
            cost: 11,
            run(S, c) {
                const visible = PRS.fire.worst(S.fire) > 12;
                c.p.awareness = Math.min(100, c.p.awareness + (visible ? 40 : 14));
                if (visible) {
                    c.p.trust = Math.min(100, c.p.trust + 25);
                    return { text: c.p.name + " sees it. There is a particular noise a person " +
                        "makes and " + c.p.name + " makes it.", kind: "good" };
                }
                return c.p.name + " looks at the bin. The bin looks like a bin.";
            },
        },


// ============================================================ from game/data/actions-extra.js

{ id: "people.delegate", deck: "people", tags: ["social"], danger: "good",
          targets: (S) => st.reachable(S)
              .filter((p) => !p.helper && p.state !== "down" && p.state !== "secured")
              .map((p) => ({ key: p.id, p: p })),
          label: (S, c) => "Put " + c.p.name + " in charge instead of you",
          detail: "Hand the whole thing over. Some people are better at it than you are.",
          cost: 16,
          run(S, c) {
              if (P.convince(S, c.p, 4).ok) {
                  P.recruit(S, c.p, "You have handed the whole thing over.");
                  return { text: "“You do it. You're better at this than me.” " + c.p.name +
                      " looks at you, and takes it, and is better at it than you.", kind: "great" };
              }
              return { text: c.p.name + " says no. It is the correct answer and it does not help.",
                       kind: "bad" };
          } },

{ id: "extra.crew_seatbelt", deck: "crew", tags: ["social"],
          targets: (S) => PRS.crew.adjacentCrew(S).map((c) => ({ key: c.id, c: c })),
          when: (S) => S.cabinFlags.beltSignOn && S.crewPhase >= 3,
          label: (S, t) => "Ask " + t.c.name + " to have the seatbelt sign turned off",
          detail: "Forty people are sitting down because of a light.",
          cost: 22,
          run(S, t) {
              S.cabinFlags.beltSignOn = false;
              for (const p of S.pax) if (p.state === "seated") p.belted = false;
              return { text: "The sign goes off with a chime and about forty people who have " +
                  "been waiting for permission stand up at once. This is either the best or the " +
                  "worst thing you have done and you will find out in nine minutes.",
                  kind: "neutral" };
          } },

{ id: "extra.clear_exit_row", deck: "cabin", tags: ["social"], danger: "good",
          label: "Clear the overwing exit row", cost: 26,
          detail: "The one clear column across the middle of this aeroplane, and there are " +
                  "bags in it.",
          when: (S) => Math.abs(S.player.x - cabin.OVERWING_X) <= 1 && !S.flags.exitRowClear,
          run(S) {
              st.setFlag(S, "exitRowClear");
              delete S.cabinFlags.aisleBlocked[cabin.OVERWING_X];
              return { text: "Four bags, a coat and a pushchair out of the overwing row and over " +
                  "the seat backs. The middle of this aeroplane is a floor you can cross again.",
                  kind: "great" };
          } },


// ============================================================ from game/data/actions-crew.js

{ id: "crew.call_button", deck: "crew", tags: ["social"],
          label: "Press the call button", cost: 3,
          detail: (S) => { const n = S.counts["crew.call_button"] || 0;
                           return n ? "You have pressed it " + n + " times." : "Ding."; },
          when: (S) => cabin.rowAt(S.player.x) !== null || S.player.y !== cabin.AISLE_Y,
          run(S) {
              const n = (S.counts["crew.call_button"] || 0) + 1;
              PRS.audio.play("beltSign");
              cred(S, n < 6 ? 2 : 0.2);
              if (n === 1) return "Ding. A light comes on above your head and nothing else " +
                  "happens at all.";
              if (n < 5) return "Ding. Two lights. Three lights. The crew are still at the trolley.";
              if (n < 12) return "Ding. Somebody four rows back tuts.";
              if (n < 25) return "Ding. Yasmin Aboud looks down the cabin at your light, and then " +
                  "at the trolley, and then at your light.";
              if (n < 40) return { text: "Ding. The purser has now seen the light " + n + " times " +
                  "and has formed a view about the sort of person you are.", kind: "bad" };
              return { text: "Ding. That is " + n + " presses of a call button on an aeroplane " +
                  "that is on fire. It is going to be in the transcript.", kind: "bad" };
          } },

{ id: "crew.follow", deck: "crew", tags: ["move"],
          targets: near,
          label: (S, t) => "Stay with " + t.c.name,
          detail: "Where the crew go, the equipment goes.",
          cost: 10,
          run(S, t) {
              A.moveTo(S, t.c.x, cabin.AISLE_Y);
              return "You stay on " + t.c.name + "'s shoulder. They do not like it and they do " +
                  "not stop you.";
          } },

{ id: "crew.cockpit", deck: "crew", tags: ["social"], danger: "good",
          label: "Get into the flight deck",
          detail: "You are type rated on this aeroplane. They will open it for you.",
          when: (S) => st.hasPerk(S, "flight_deck") && S.player.x <= 1 && !S.flags.cockpitOpened,
          cost: 40,
          run(S) {
              st.setFlag(S, "cockpitOpened");
              C.setPhase(S, 4, "Deadheading captain admitted to the flight deck.");
              return { text: "The interphone, then the code, then the door. Two people who have " +
                  "been flying an aeroplane for nine minutes with no idea what is happening " +
                  "behind them turn round and look at you.", kind: "great" };
          } },

{ id: "crew.mayday", deck: "crew", tags: ["social"], danger: "good",
          label: "Tell the flight deck to declare and get it down",
          when: (S) => S.flags.cockpitOpened && !S.flags.maydayCalled,
          cost: 30,
          run(S) {
              st.setFlag(S, "maydayCalled");
              const cut = Math.min(S.clock.remaining - 45, 150);
              if (cut > 0) { S.clock.remaining -= cut; S.clock.total -= cut; }
              return { text: "“Mayday, mayday, mayday, smoke in the cabin, request immediate " +
                  "descent and the longest runway you have.” You have just taken " +
                  Math.round(cut) + " seconds off this flight, and the fire has not agreed to " +
                  "take " + Math.round(cut) + " seconds off anything.", kind: "great" };
          } },

{ id: "crew.ask_lights", deck: "crew", tags: ["social"],
          targets: near,
          when: (S) => !S.cabinFlags.lightsUp,
          label: (S, t) => "Ask " + t.c.name + " to put the cabin lights up",
          cost: 12,
          run(S, t) {
              if (ask(S, t.c, 24)) {
                  S.cabinFlags.lightsUp = true;
                  return { text: "The cabin lights go to full. Everybody can suddenly see the " +
                      "smoke they had been managing not to see.", kind: "good" };
              }
              return { text: "“We dim for landing.”", kind: "bad" };
          } },

{ id: "crew.purser", deck: "crew", tags: ["social"],
          label: "Ask for the purser by name",
          detail: "Ingrid Halloway. Thirty-one years on the type. She is the one who can decide.",
          when: (S) => S.crewPhase < 4,
          cost: 24,
          run(S) {
              const p = C.byId(S, "purser");
              if (ask(S, p, 34, 10)) {
                  p.x = S.player.x; p.y = cabin.AISLE_Y;
                  cred(S, 20);
                  return { text: "Ingrid Halloway comes down the aisle at a speed that is not a " +
                      "walk and is not a run and is a thing cabin crew are trained to do.",
                      kind: "good" };
              }
              return { text: "“The purser is dealing with something.” The purser is at the front " +
                  "of the aeroplane, dealing with something.", kind: "bad" };
          } },

{ id: "crew.ask_ice", deck: "crew", tags: ["social"],
          targets: near,
          when: (S) => !S.flags.haveIce,
          label: (S, t) => "Ask " + t.c.name + " for the ice bucket",
          detail: "It is the one thing on the trolley that is worth having.",
          cost: 12,
          run(S, t) {
              if (ask(S, t.c, 20)) {
                  st.setFlag(S, "haveIce");
                  return { text: "Three litres of ice and water, handed over without a single " +
                      "question, because ice is not equipment. Ice is service.", kind: "good" };
              }
              return { text: "“We've finished the service.”", kind: "bad" };
          } },


// ============================================================ from game/data/actions-cabin.js

{ id: "cabin.fill_sink", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Fill the sink and jam the drain", cost: 12,
          detail: "So there is a full sink here when you come back with something on fire.",
          when: (S) => atLav(S) && !S.flags.sinkFull,
          run(S) {
              st.setFlag(S, "sinkFull");
              return { text: "You jam the drain with a paper towel and hold the tap. The basin " +
                  "fills. It is nine centimetres of standing water in a metal bowl and it is the " +
                  "most useful object on this aeroplane.", kind: "great" };
          } },

{ id: "cabin.lav_bin", deck: "cabin", tags: ["reveal", "hands"],
          label: "Look in the lavatory waste bin", cost: 7,
          when: (S) => atLav(S) && !S.flags.lookedInBin,
          once: true,
          run(S) {
              st.setFlag(S, "lookedInBin");
              st.setFlag(S, "vapeFoundAt", Math.round(S.clock.elapsed));
              st.give(S, "vape");
              PRS.state.note(S, "A second personal vaporiser, of the same make and with the same " +
                  "cell type as the source unit, was recovered from the aft lavatory waste bin.");
              return { text: "Paper towels, a nappy, and — under both — a vape pen. Same brand as " +
                  "the one in the locker. Same battery. Somebody stood in this cubicle at some " +
                  "point in the last four hours, used it, panicked, and put it in the bin, and it " +
                  "has been sitting eleven rows from the fire ever since.\n\nYou put it in your " +
                  "pocket. You do not entirely know why.", kind: "great" };
          } },

{ id: "cabin.galley_halon", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Take the BCF bottle off the galley bulkhead", cost: 18,
          when: (S) => atGalley(S) && !slot(S, "halon_bottle") &&
                       S.crew.some((c) => c.halon > 0) && S.crewPhase < 3,
          run(S) {
              for (const c of S.crew) if (c.halon > 0) { c.halon--; break; }
              S.inventory.push({ id: "halon_bottle", uses: 1, spent: false, item: {
                  id: "halon_bottle", name: "BCF halon extinguisher", kg: 3.2,
                  sprite: "cabin:extinguisher", uses: 1, agent: "halon",
                  tags: ["extinguisher", "halon"], blurb: "Taken, not given.",
                  note: "One discharge. It knocks a flame flat." } });
              S.credibility = Math.max(0, S.credibility - 10);
              return { text: "You take the halon off the bulkhead. There are two on this " +
                  "aeroplane, there is now one where the crew think there are two, and that is " +
                  "going to matter in about four minutes.", kind: "bad" };
          } },

{ id: "cabin.trolley_barrier", deck: "cabin", tags: ["hands"], danger: "neutral",
          label: "Push the trolley across the aisle at the fire", cost: 24,
          detail: "A steel wall between the fire and everybody forward of it.",
          when: (S) => S.cabinFlags.cartOut && Math.abs(S.player.x - S.cabinFlags.cartX) <= 1,
          run(S) {
              const x = Math.max(cabin.FWD_ROWS.x0, S.fire.core.x - 1);
              delete S.cabinFlags.aisleBlocked[S.cabinFlags.cartX];
              S.cabinFlags.cartX = x;
              S.cabinFlags.aisleBlocked[x] = 9999;
              for (let y = 1; y <= 7; y++) S.fire.suppress[cabin.idx(x, y)] += 20;
              return { text: "You wedge the trolley across the aisle one row forward of the fire " +
                  "and put the brake on. It is a firebreak and it is also, now, a wall you " +
                  "cannot get past either.", kind: "neutral" };
          } },

{ id: "cabin.open_bin_here", deck: "cabin", tags: ["reveal", "hands"],
          label: (S) => "Open the bins above row " + cabin.rowAt(S.player.x),
          detail: "Blankets, coats, and somebody's duty free.",
          when: (S) => inRow(S) && !S.cabinFlags.binsOpen[cabin.binKey(S.player.x, "left")],
          cost: 7,
          run(S) {
              const key = cabin.binKey(S.player.x, "left");
              S.cabinFlags.binsOpen[key] = true;
              S.fire.binOpen[key] = true;
              const hot = S.fire.heat[cabin.idx(S.player.x, 3)];
              if (hot > 25) {
                  S.player.burns += 8;
                  return { text: "The locker comes open and so does a lot of heat. This is the " +
                      "wrong row to have done that in.", kind: "bad" };
              }
              return "Two coats, a wax jacket, four cabin bags and a blanket in a bag. Nothing " +
                  "on fire. You have also just given the whole run of lockers a bit more air.";
          } },

{ id: "cabin.safety_card", deck: "cabin", tags: ["reveal", "look"],
          label: "Read the safety card. Actually read it.", cost: 16,
          once: true,
          when: (S) => inRow(S),
          run(S) {
              st.setFlag(S, "readCard");
              return { text: "Brace position. Exits, four, with the row numbers. Masks, and the " +
                  "fact that you have to pull them to start them. Life vest, under the seat, do " +
                  "not inflate inside. Floor path lighting. And in the corner, in a box, the " +
                  "manual release for the oxygen panel.\n\nSixteen seconds. Every single thing on " +
                  "it is true and useful and you have never read one before.", kind: "good" };
          } },

{ id: "cabin.floor_lights", deck: "cabin", tags: ["reveal", "hands"],
          label: "Find the floor path lighting", cost: 8,
          when: (S) => S.player.y === cabin.AISLE_Y && PRS.fire.totalSmoke(S.fire) > 20,
          run(S) {
              st.setFlag(S, "foundFloorLights");
              return { text: "There is a line of small lights along the aisle floor and it goes " +
                  "all the way to a door. In smoke you cannot see through it is the only " +
                  "navigation in this aeroplane and it has been there the whole time.",
                  kind: "good" };
          } },

{ id: "cabin.count_hands", deck: "cabin", tags: ["reveal", "look"], danger: "good",
          label: "Count the hands that went up", cost: 12,
          when: (S) => !!S.flags.usedPA && !S.flags.countedHands,
          run(S) {
              st.setFlag(S, "countedHands");
              const need = S.pax.filter((p) => PRS.pax.needsCarrying(p) && p.state !== "secured");
              const rows = need.map((p) => p.seat).slice(0, 12);
              return { text: "Eleven hands. They are in " + PRS.util.listSentence(rows) + ". " +
                  "You now know exactly who cannot get themselves off this aeroplane, which is " +
                  "the single most valuable piece of information available and it took twelve " +
                  "seconds.", kind: "great" };
          } },

{ id: "cabin.megaphone", item: "megaphone", deck: "cabin", tags: ["social"], danger: "neutral",
          label: "Address the cabin through the megaphone", cost: 16,
          when: (S) => !!slot(S, "megaphone"),
          run(S) {
              S.cabinAwareness = Math.min(100, S.cabinAwareness + 38);
              S.cabinPanic = Math.min(100, S.cabinPanic + 18);
              S.credibility = Math.min(100, S.credibility + 12);
              for (const p of S.pax) {
                  p.awareness = Math.min(100, p.awareness + 30);
                  p.trust = Math.min(100, p.trust + 8);
              }
              return { text: "You stand on a seat and address sixty-one people through a " +
                  "collapsible megaphone that you brought onto an aeroplane. Nobody, in the " +
                  "whole subsequent inquiry, is able to explain why you had it.", kind: "neutral" };
          } },

{ id: "cabin.close_bins", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Go along and close every open bin", cost: 30,
          detail: "Air is what it is short of. Take the air away from all of them.",
          when: (S) => Object.keys(S.cabinFlags.binsOpen).length > 1,
          run(S) {
              const n = Object.keys(S.cabinFlags.binsOpen).length;
              S.cabinFlags.binsOpen = {};
              S.fire.binOpen = {};
              F.starve(S.fire, S.fire.core.x, S.fire.core.y, 0.6);
              return { text: "You go down the cabin shutting " + n + " lockers. The run of bins is " +
                  "a closed box again, and a closed box burns slower.", kind: "good" };
          } },

{ id: "cabin.lav_door", deck: "cabin", tags: ["hands"], danger: "good",
          label: "Shut the lavatory door on it", cost: 6,
          detail: "A small metal room with a fire in it and nobody in it.",
          when: (S) => atLav(S) && (S.flags.caseInLav || S.flags.holdingCushion),
          run(S) {
              st.setFlag(S, "lavClosed");
              if (S.flags.holdingCushion) st.setFlag(S, "holdingCushion", false);
              for (let y = 1; y <= 7; y++) {
                  const i = cabin.idx(cabin.AFT_GALLEY_X, y);
                  S.fire.smoke[i] *= 0.6;
              }
              return { text: "You shut the door. Whatever happens in there now happens in a " +
                  "ninety-centimetre metal box that was designed by people who assumed somebody " +
                  "would eventually set fire to it.", kind: "good" };
          } },

{ id: "cabin.galley_ice", deck: "cabin", tags: ["hands"],
          label: "Take the ice from the galley", cost: 10,
          when: (S) => atGalley(S) && !S.flags.haveIce,
          run(S) {
              st.setFlag(S, "haveIce");
              return "Three litres of ice, water and four small bottles of tonic, in a steel bin " +
                  "with a handle. Nobody stops you because nobody guards ice.";
          } },

{ id: "cabin.galley_jug", deck: "cabin", tags: ["hands"],
          label: "Fill a galley jug with water", cost: 12,
          when: (S) => atGalley(S) && !S.flags.haveJug,
          run(S) {
              st.setFlag(S, "haveJug");
              return "Two litres in a steel jug with a spout, which is a much better shape for " +
                  "putting water into a locker than a bottle is.";
          } },


// ============================================================ from game/data/actions-self.js

{ id: "self.hood_off", item: "hood", deck: "self", tags: ["self"], danger: "bad",
          label: "Take the smoke hood off", cost: 8,
          detail: "So that people can hear what you are saying to them.",
          when: (S) => st.wearing(S, "hood"),
          run(S) {
              S.player.wearing.hood = false;
              return { text: "You pull the hood off so somebody can hear you. It is a reasonable " +
                  "trade and it is a trade.", kind: "bad" };
          } },

{ id: "self.lanyard", item: "lanyard", deck: "self", tags: ["self"],
          label: "Put the lanyard on", cost: 5,
          when: (S) => have(S, "lanyard") && !st.wearing(S, "lanyard"),
          run(S) {
              S.player.wearing.lanyard = true;
              return "AVIATION SAFETY EXPO 2023 — DELEGATE, round your neck, face out. Nobody is " +
                  "going to read it and everybody is going to see it.";
          } },

{ id: "self.brace", deck: "self", tags: ["self"], danger: "good",
          label: "Brace", cost: 10,
          when: (S) => S.clock.remaining < 200 && !S.player.braced,
          run(S) {
              S.player.braced = true;
              return { text: "Head down, hands over the back of it, feet back behind your knees. " +
                  "It is the last thing on the list and there is not much list left.", kind: "good" };
          } },

{ id: "self.torch_on", item: "torch", deck: "self", tags: ["self"], danger: "good",
          label: "Turn the torch on", cost: 4,
          when: (S) => have(S, "torch") && !S.flags.torchOn,
          run(S) {
              st.setFlag(S, "torchOn");
              return { text: "The beam goes about a metre into the smoke and stops dead, which " +
                  "tells you more about the smoke than anything else has.", kind: "good" };
          } },

{ id: "self.hold_breath", deck: "self", tags: ["self"],
          label: "Hold your breath and go through it", cost: 14,
          detail: "Fourteen seconds of not breathing. It is a real technique.",
          when: (S) => smokeHere(S) > 25,
          run(S) {
              S.player.smokeDose = Math.max(0, S.player.smokeDose - 8);
              S.player.stamina = Math.max(0, S.player.stamina - 20);
              return "You take one breath from as low as you can get and hold it. Fourteen " +
                  "seconds is a very long time when you have been running.";
          } },


// ============================================================ from game/data/actions-move.js

{
            id: "move.over_seats",
            deck: "move",
            tags: ["move"],
            label: "Go over the seat backs",
            detail: "Along the tops of the seats, over everybody's heads, aft.",
            when: (S) => S.player.y !== cabin.AISLE_Y || Object.keys(S.cabinFlags.aisleBlocked).length > 0,
            cost: (S) => 16 + (S.player.carrying.length ? 22 : 0),
            run(S) {
                const dir = S.fire.core.x > S.player.x ? 1 : -1;
                let moved = 0;
                for (let n = 0; n < 3; n++) {
                    const x = S.player.x + dir;
                    if (!cabin.inBounds(x, S.player.y) || cabin.solid(x, S.player.y)) break;
                    A.moveTo(S, x, S.player.y);
                    moved++;
                }
                S.cabinPanic = Math.min(100, S.cabinPanic + 3);
                S.counts["move.over_seats"] = (S.counts["move.over_seats"] || 0) + moved;
                if (!moved) return "There is nowhere to go along the tops of the seats.";
                return "You go over the seat backs, " + moved + " rows, standing on armrests and " +
                       "somebody's shoulder. Two people shout. " + arrival(S);
            },
        },

{
            id: "move.under_seats",
            deck: "move",
            tags: ["move"],
            label: "Go under the seats",
            detail: "On your front, along the floor, under the whole row. You are small enough.",
            when: (S) => st.hasPerk(S, "small") || st.hasPerk(S, "under_the_smoke"),
            cost: (S) => 9,
            run(S) {
                const dir = S.fire.core.x > S.player.x ? 1 : -1;
                let moved = 0;
                for (let n = 0; n < 4; n++) {
                    const x = S.player.x + dir;
                    if (!cabin.inBounds(x, S.player.y) || cabin.solid(x, S.player.y)) break;
                    A.moveTo(S, x, S.player.y);
                    moved++;
                }
                return "You go under the seats on your front, past " + moved + " rows of ankles, " +
                       "in air nobody else on this aeroplane can reach. " + arrival(S);
            },
        },

{
            id: "move.push_through",
            deck: "move",
            tags: ["move", "social"],
            label: "Push through the people in the aisle",
            detail: "Shoulder first. It works. It costs you something with the cabin.",
            when: (S) => {
                for (const x in S.cabinFlags.aisleBlocked) {
                    if (S.cabinFlags.aisleBlocked[x] < 9999) return true;
                }
                return false;
            },
            cost: 14,
            run(S) {
                let cleared = 0;
                for (const x in S.cabinFlags.aisleBlocked) {
                    if (S.cabinFlags.aisleBlocked[x] >= 9999) continue;
                    if (Math.abs(Number(x) - S.player.x) <= 2) {
                        delete S.cabinFlags.aisleBlocked[x];
                        cleared++;
                    }
                }
                S.cabinPanic = Math.min(100, S.cabinPanic + 6);
                S.credibility = Math.max(0, S.credibility - 4);
                if (!cleared) return "You shoulder past two people who do not move much.";
                return "You put a shoulder into it and go through. Somebody's bag goes over. " +
                       "Two people are now shouting at you and one of them is right.";
            },
        },


// ============================================================ from game/data/actions-items.js

{ id: "items.airhorn", item: "airhorn", deck: "items", tags: ["loud"], danger: "bad",
          label: "Sound the air horn", cost: 5,
          detail: "One hundred and twenty decibels. Everybody wakes up. Everybody.",
          when: (S) => have(S, "airhorn") && slot(S, "airhorn").uses > 0,
          run(S) {
              st.useCharge(S, slot(S, "airhorn"));
              PRS.audio.play("alarm");
              let woken = 0;
              for (const p of S.pax) {
                  if (p.state === "asleep") { p.state = "seated"; woken++; }
                  p.awareness = Math.min(100, p.awareness + 42);
                  p.panic = Math.min(100, p.panic + 26);
                  p.traits = p.traits.filter((t) => t !== "headphones");
              }
              S.cabinAwareness = Math.min(100, S.cabinAwareness + 44);
              S.cabinPanic = Math.min(100, S.cabinPanic + 32);
              S.credibility = Math.max(0, S.credibility - 6);
              return { text: "You let off an air horn in a pressurised cabin. " + woken +
                  " people wake up instantly, sixty-one people find out at the same moment that " +
                  "something is wrong, and every one of them stands up in a corridor that fits " +
                  "one.", kind: "neutral" };
          } },

{ id: "items.whistle", item: "whistle", deck: "items", tags: ["loud"], danger: "good",
          label: "Blow the whistle", cost: 4,
          detail: "It cuts through smoke and noise and it does not start a stampede.",
          when: (S) => have(S, "whistle"),
          run(S) {
              PRS.audio.play("alarm");
              for (const p of st.withinEarshot(S, 4)) {
                  p.awareness = Math.min(100, p.awareness + 18);
              }
              S.credibility = Math.min(100, S.credibility + 4);
              return "Three short blasts. Everybody within four rows looks at exactly one place, " +
                  "which is you, which is what you wanted.";
          } },

{ id: "items.carrier_child", item: "carrier", deck: "items", tags: ["carry"], danger: "good",
          targets: (S) => st.reachable(S).filter((p) => PRS.pax.isChild(p) || PRS.pax.isPet(p))
                                          .map((p) => ({ key: p.id, p: p })),
          when: (S) => have(S, "carrier") && S.player.carrying.length < S.derived.maxCarry,
          label: (S, c) => "Put " + c.p.name + " in the pet carrier",
          detail: "It has a strap. It goes over your shoulder. Both your hands come back.",
          cost: 14,
          run(S, c) {
              c.p.state = "carried";
              c.p.carriedBy = "player";
              c.p.inCarrier = true;
              S.player.carrying.push(c.p.id);
              st.reindex(S);
              return { text: c.p.name + " goes into a soft pet carrier and over your shoulder, " +
                  "and you have both hands free for the first time since this started.",
                  kind: "great" };
          } },

{ id: "items.tape_seat", item: "tape", deck: "items", tags: ["fiddly"],
          label: "Tape a route marker on the seat backs", cost: 18,
          detail: "A strip of tape every row so somebody in smoke can follow it forward.",
          when: (S) => have(S, "tape") && !S.flags.tapeTrail,
          run(S) {
              st.useCharge(S, slot(S, "tape"), 2);
              st.setFlag(S, "tapeTrail");
              for (const p of S.pax) p.knowsRows = true;
              return { text: "You run a strip of duct tape along the aisle seat backs, one per " +
                  "row, all the way to the forward cross-aisle. In smoke you cannot see through, " +
                  "a hand can follow that.", kind: "great" };
          } },

{ id: "items.soak_pillow", item: "pillow", deck: "items", tags: ["hands"], danger: "good",
          label: "Soak the neck pillow", cost: 10,
          detail: "Memory foam holds a surprising amount of water and makes a real filter.",
          when: (S) => atLav(S) && have(S, "pillow") && !slot(S, "pillow").wet,
          run(S) {
              slot(S, "pillow").wet = true;
              S.player.wearing.pillow = true;
              return { text: "Sixty pounds of memory foam neck pillow, held under a tap until it " +
                  "stops taking any more, then over your face. You look like a person in the " +
                  "worst photograph ever taken and you are breathing filtered air.", kind: "good" };
          } },

{ id: "items.pry_panel", item: "multitool", deck: "items", tags: ["fiddly"], danger: "good",
          label: "Get the sidewall panel off with the multi-tool", cost: 26,
          when: (S) => have(S, "multitool") && cabin.rowAt(S.player.x) !== null &&
                       S.fire.intensity[cabin.idx(S.player.x, S.player.y)] > 4 &&
                       !S.flags.panelOpen,
          run(S) {
              st.setFlag(S, "panelOpen");
              const i = cabin.idx(S.player.x, S.player.y);
              S.fire.fuel[i] *= 0.7;
              return { text: "Four fasteners, a quarter turn each, and the panel comes off in " +
                  "your hands. Behind it is where the fire has actually been going, which is " +
                  "sideways, along the insulation, at about a row a minute.", kind: "great" };
          } },

{ id: "items.cut_seat", item: (S) => { const s = st.inventoryHas(S, "cut"); return s ? s.id : null; }, deck: "items", tags: ["fiddly"],
          label: "Cut the seat cover open", cost: 16,
          detail: "To get at the foam and pull the burning part out of the middle of it.",
          when: (S) => !!st.inventoryHas(S, "cut") &&
                       S.fire.intensity[cabin.idx(S.player.x, S.player.y)] > 10,
          run(S) {
              const i = cabin.idx(S.player.x, S.player.y);
              S.fire.fuel[i] *= 0.5;
              S.fire.intensity[i] *= 0.7;
              S.player.burns += st.wearing(S, "gloves") ? 3 : 12;
              return { text: "You cut the dress cover off and pull the burning core of the " +
                  "cushion out in handfuls. It is the most direct thing you have done all day.",
                  kind: "good" };
          } },

{ id: "items.tape_door", item: "tape", deck: "items", tags: ["fiddly"],
          label: "Tape the lavatory door shut", cost: 16,
          when: (S) => have(S, "tape") && !!S.flags.lavClosed && !S.flags.lavTaped,
          run(S) {
              st.useCharge(S, slot(S, "tape"));
              st.setFlag(S, "lavTaped");
              for (let y = 1; y <= 7; y++) S.fire.smoke[cabin.idx(cabin.AFT_GALLEY_X, y)] *= 0.7;
              return { text: "You tape the seam of the lavatory door all the way round. The smoke " +
                  "stops coming out of it, which is not the same as the fire stopping, and it is " +
                  "worth about ninety seconds to everybody in the last six rows.", kind: "good" };
          } },


// ============================================================ from game/data/actions-loot.js

{
            id: "loot.take_anyway", deck: "people", tags: ["reveal", "hands"], danger: "bad",
            targets: (S) => revealed(S).filter((c) => c.p.state !== "down" && inReach(S, c.p)),
            label: (S, c) => "Take the " + short(c.item.name) + " off " + c.p.name + " anyway",
            detail: "Faster than asking. It costs you with them and with everybody watching.",
            cost: 6,
            run(S, c) {
                st.give(S, c.p.carries);
                c.p.carries = null;
                c.p.trust -= 45;
                c.p.panic = Math.min(100, c.p.panic + 20);
                S.credibility = Math.max(0, S.credibility - 8);
                S.cabinPanic = Math.min(100, S.cabinPanic + 5);
                return { text: "You take it out of a stranger's hands on an aeroplane. Four " +
                    "people see you do it and none of them know why.", kind: "bad" };
            },
        },

{
            id: "loot.seat_pocket", deck: "cabin", tags: ["reveal", "hands"],
            label: (S) => "Go through the seat pockets in row " + cabin.rowAt(S.player.x),
            detail: "Six of them. A safety card, a sick bag, and sometimes something.",
            when: (S) => cabin.rowAt(S.player.x) !== null &&
                         !S.flags["pocket" + S.player.x],
            cost: 9,
            run(S) {
                st.setFlag(S, "pocket" + S.player.x);
                const got = takeFromStash(S, "pocket");
                if (!got) {
                    return "Safety cards, three sick bags, an in-flight magazine and a boarding " +
                        "pass for a flight in 2023. The safety card is the only one of those " +
                        "that would have helped and you have already read it.";
                }
                return { text: "Somebody left " + article(got.name) + " in a seat pocket. " +
                    got.note, kind: "good" };
            },
        },

{
            id: "loot.under_seat", deck: "cabin", tags: ["reveal", "hands"],
            label: (S) => "Look under the seats in row " + cabin.rowAt(S.player.x),
            detail: "Life vests, shoes, and whatever went down there at the start of the flight.",
            when: (S) => cabin.rowAt(S.player.x) !== null && !S.flags["under" + S.player.x],
            cost: 11,
            run(S) {
                st.setFlag(S, "under" + S.player.x);
                const got = takeFromStash(S, "underseat");
                if (!got) {
                    return "Six life vests in six pouches, a shoe, and a very great deal of dust. " +
                        "You are on your hands and knees, which is where the good air is, so this " +
                        "was not entirely wasted.";
                }
                return { text: "Under one of the seats: " + article(got.name) + ". " + got.note,
                         kind: "good" };
            },
        },

{
            id: "loot.lav_cabinet", deck: "cabin", tags: ["reveal", "hands"],
            label: "Open the cabinet over the lavatory basin",
            detail: "There is one. There is always one and it is never locked.",
            when: (S) => cabin.kindAt(S.player.x, S.player.y) === "lav" && !S.flags.lavCabinet,
            cost: 10,
            run(S) {
                st.setFlag(S, "lavCabinet");
                const got = takeFromStash(S, "galley");
                if (!got) {
                    return "Paper towels, hand cream, and a roll of blue paper that is going to " +
                        "be wet in about nine seconds.";
                }
                return { text: "Behind the mirror: " + article(got.name) + ". " + got.note,
                         kind: "good" };
            },
        },
