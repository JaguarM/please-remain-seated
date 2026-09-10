// Items cut from Please Remain Seated on 2026-09-10. Not loaded. See cut-actions.js for the
// actions that used them; the whistle, the air horn, the megaphone and the gin each had one,
// the pillow and the sock had a soak, the umbrella flipped the bin latch from the aisle, and
// the vape did nothing at all and had an ending.

{ id: "torch", name: "Small torch", kg: 0.2, sprite: "cabin:flashlight",
          uses: null, tags: ["light", "smoke", "signal"],
          blurb: "Aluminium, unreasonably bright, a present from your father.",
          note: "In smoke you cannot see through, this is how people find the door." },

{ id: "scissors", name: "Blunt-nosed scissors", kg: 0.1, sprite: "nauvis:iron_stick",
          uses: null, tags: ["cut", "belt"],
          blurb: "The permitted length. Barely.",
          note: "Cuts a belt. Slowly. Better than fingers." },

{ id: "clipboard", name: "Clipboard", kg: 0.4, sprite: "cabin:manual",
          uses: null, tags: ["authority", "hold"],
          blurb: "A4, aluminium, with a form on it about something else entirely.",
          note: "A hi-vis vest and a clipboard together are functionally a uniform." },

{ id: "lanyard", name: "Expired conference lanyard", kg: 0.05, sprite: "nauvis:battery",
          uses: null, tags: ["authority", "wear"],
          blurb: "AVIATION SAFETY EXPO 2023 — DELEGATE. You went for the free bag.",
          note: "Nobody reads a lanyard. Everybody obeys one." },

{ id: "megaphone", name: "Collapsible megaphone", kg: 1.1, sprite: "cabin:megaphone",
          uses: null, tags: ["loud", "voice", "authority"],
          blurb: "For a protest. You have not decided which one.",
          note: "You can be heard in every row at once. Whether that helps is up to you." },

{ id: "airhorn", name: "Compressed air horn", kg: 0.4, sprite: "nauvis:grenade",
          uses: 3, tags: ["loud", "wake", "panic"],
          blurb: "Novelty. Football. A hundred and twenty decibels in a metal tube.",
          note: "Wakes the whole cabin instantly. Every single person. All at once." },

{ id: "whistle", name: "Referee's whistle", kg: 0.05, sprite: "cabin:whistle",
          uses: null, tags: ["loud", "wake", "signal"],
          blurb: "On a cord, from a school sports day you were made to run.",
          note: "Cuts through smoke and noise without starting a stampede. Usually." },

{ id: "pretzels", name: "Bag of pretzels", kg: 0.15, sprite: "cabin:pretzels",
          uses: 1, tags: ["food", "bribe", "hazard"],
          blurb: "Salted. Airside price. You have been saving them.",
          note: "You can bribe a child with these. It works. It should not, but it works." },

{ id: "carrier", name: "Soft pet carrier (empty)", kg: 0.5, sprite: "cabin:pet_carrier",
          uses: null, tags: ["bag", "carry", "rescue"],
          blurb: "Gerald refuses to travel in it, so it travels empty, which is very Gerald.",
          note: "A child or an animal fits. Carrying one in this is faster than carrying one." },

{ id: "umbrella", name: "Telescopic umbrella", kg: 0.4, sprite: "nauvis:iron_stick",
          uses: null, tags: ["reach", "pry", "hazard"],
          blurb: "Wind-proof to sixty kilometres an hour, according to the tag.",
          note: "You can reach a bin latch from the aisle without standing under it." },

{ id: "gin", name: "Four duty-free miniatures", kg: 0.4, sprite: "cabin:mini_gin",
          uses: 4, agent: "spirits", tags: ["spirits", "bribe", "hazard", "drink"],
          blurb: "Gin, whisky, rum, and one you cannot identify. Forty per cent, all of them.",
          note: "Forty per cent alcohol is sixty per cent water and one hundred per cent a mistake." },

{ id: "thermos", name: "Thermos of coffee", kg: 0.9, sprite: "cabin:coffee_pot",
          uses: 2, agent: "coffee", tags: ["drink", "hot", "douse", "refillable"], refill: "tap",
          blurb: "Filled at six this morning. Still, somehow, scalding.",
          note: "Hot liquid on a fire is a worse idea than cold liquid and a better one than gin." },

{ id: "energy", name: "Four cans of energy drink", kg: 1.4, sprite: "cabin:soda_can",
          uses: 4, agent: "soda", tags: ["drink", "douse", "sugar"],
          blurb: "Sponsored. Sugar-free. The taste is a warning.",
          note: "It is mostly water. The rest of it caramelises, which smells appalling." },

{ id: "wipes", name: "Packet of wet wipes", kg: 0.2, sprite: "nauvis:plastic_bar",
          uses: 6, agent: "wetcloth", tags: ["cloth", "mask", "douse"],
          blurb: "Aloe. Forty of them. Individually useless, collectively not.",
          note: "Six small wet things. Each one buys one person one breath." },

{ id: "sock", name: "A spare sock", kg: 0.05, sprite: "cabin:sock",
          uses: 1, tags: ["cloth", "mask", "absurd", "wettable"],
          blurb: "One. Not a pair. You have thought about why and stopped.",
          note: "Wet, over a face, a sock is exactly as good as a flannel and never feels it." },

{ id: "pillow", name: "Memory foam neck pillow", kg: 0.3, sprite: "cabin:neck_pillow",
          uses: null, tags: ["cushion", "cover", "wettable"],
          blurb: "Grey, slightly damp, the shape of a horseshoe and of regret.",
          note: "Wet, held over a mouth, it is a filter. Dry, it is fuel." },

{ id: "vape", name: "A vape that is not yours", kg: 0.06, sprite: "cabin:vape",
          uses: null, tags: ["hazard", "battery", "irony"],
          blurb: "Found in a bin at the back. Same brand as the one in the locker. Same battery.",
          note: "It does nothing. Somebody put it there and said nothing, and now you know." },
