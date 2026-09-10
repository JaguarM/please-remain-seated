// The ending and the medals that went with the cuts of 2026-09-10. Not loaded.

// ---- endings.js: the second vape ----
{
            id: "second_vape",
            title: "THE OTHER ONE",
            when: (S, R) => !!PRS.state.slotOf(S, "vape"),
            text(S, R) {
                return "In your pocket, when they took your coat off you on the taxiway, there " +
                    "was a vape pen.\n\nIt is not yours. You found it in the waste bin of the " +
                    "aft lavatory " + PRS.util.mmss(S.flags.vapeFoundAt || 0) + " into the " +
                    "descent and you put it in your pocket without deciding to, the way you " +
                    "pick up a thing that should not be where it is.\n\nIt is the same make as " +
                    "the one in the locker. The same cell, from the same batch, sold in the same " +
                    "airside shop in the same terminal. Somebody used it in that cubicle, an hour " +
                    "out, got frightened by how hot it was getting, and put it in a bin eleven " +
                    "rows from the one that was already going.\n\nThey did not say anything. " +
                    "They are on the taxiway too, in a foil blanket, being handed a cup of tea, " +
                    "and they are never going to say anything.\n\n" + R.secured + " souls " +
                    "secured. " + R.tally.unhurt + " walked off. " + R.lost + " not accounted " +
                    "for.\n\nThe investigator will log the second unit as an incidental " +
                    "recovery and it will appear once, in an appendix, in a list of items found " +
                    "in the cabin, between a paperback and a single shoe.";
            },
        },

// ---- medals.js ----
{ id: "found_vape", name: "The other one",
          text: "Found a second vape, of the same make and with the same cell, in the aft " +
                "lavatory bin, eleven rows from the fire. Somebody put it there and said nothing.",
          when: (S) => !!PRS.state.slotOf(S, "vape") },

// ---- medals.js ----
{ id: "call_button", name: "Forty times",
          text: "Pressed the call button forty times. It was heard. It was ignored.",
          when: (S) => has(S, "crew.call_button") >= 40 },

// ---- medals.js ----
{ id: "flight_deck", name: "Through the door",
          text: "Got into the flight deck. Almost nobody gets into the flight deck.",
          when: (S) => S.flags.cockpitOpened },
