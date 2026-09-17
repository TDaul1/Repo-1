// Event library (Phase 2 starter set). Purely data: id, an age window,
// a selection weight, optional prerequisites, and 1+ choices whose
// outcomes are themselves weighted. The engine (engine.js) knows nothing
// about any specific event — growing this list is the only thing needed
// to add content.
//
// Event shape:
//   id            unique string
//   minAge/maxAge inclusive age window this event can fire in
//   weight        relative selection likelihood among eligible events
//   repeatable    if false (default), fires at most once per character
//   requires(c)   optional predicate on the character; filters eligibility
//   prompt        narrative text shown when the event fires
//   choices       array of { label, outcomes } — outcomes are
//                 weighted (chance sums to ~1) and each carries optional
//                 deltas (health/happiness/smarts/looks/money), flags to
//                 set, and a schedule {eventId, inYears} for a follow-up.
//   outcomes      used instead of `choices` for a flavor event with no
//                 decision — resolved automatically and just logged.

const EVENTS = [
  {
    id: "toddler_first_steps",
    minAge: 1,
    maxAge: 2,
    weight: 6,
    prompt: "You took your first wobbly steps today!",
    choices: [
      {
        label: "Keep going!",
        outcomes: [
          { chance: 0.8, text: "You toddle across the room and everyone cheers.", deltas: { happiness: 6 } },
          { chance: 0.2, text: "You trip and bump your head, but you're okay.", deltas: { happiness: -2, health: -2 } },
        ],
      },
    ],
  },
  {
    id: "toddler_sibling_fight",
    minAge: 2,
    maxAge: 5,
    weight: 5,
    requires: (c) => c.flags.hasSibling,
    prompt: "Your sibling won't share a toy, and you're furious.",
    choices: [
      {
        label: "Bite them",
        outcomes: [
          { chance: 1, text: "You bite your sibling. You get put in time-out, but the toy is yours.", deltas: { happiness: 2, smarts: -1 } },
        ],
      },
      {
        label: "Ask nicely",
        outcomes: [
          { chance: 0.5, text: "They actually share. You feel proud of yourself.", deltas: { happiness: 4, smarts: 1 } },
          { chance: 0.5, text: "They say no anyway. You cry about it.", deltas: { happiness: -3 } },
        ],
      },
    ],
  },
  {
    id: "child_bee_sting",
    minAge: 4,
    maxAge: 9,
    weight: 4,
    prompt: "A bee stings you while you're playing outside!",
    choices: [
      {
        label: "Cry for help",
        outcomes: [
          { chance: 0.7, text: "Your parents rush over and comfort you.", deltas: { happiness: 3, health: -2 } },
          { chance: 0.3, text: "No one hears you. You feel scared and alone.", deltas: { happiness: -8, health: -3 } },
        ],
      },
      {
        label: "Tough it out",
        outcomes: [
          { chance: 1, text: "You pull out the stinger yourself. A badge of honor.", deltas: { happiness: 2, health: -3, looks: -1 } },
        ],
      },
    ],
  },
  {
    id: "child_stray_dog",
    minAge: 5,
    maxAge: 11,
    weight: 4,
    prompt: "You find a stray dog wandering near your house.",
    choices: [
      {
        label: "Bring it home",
        outcomes: [
          { chance: 1, text: "Your family agrees to keep it! You name it yourself.", deltas: { happiness: 8 }, flags: { hasPet: true } },
        ],
      },
      {
        label: "Try to find its owner",
        outcomes: [
          { chance: 0.5, text: "You track down the owner, who's overjoyed. You feel great about it.", deltas: { happiness: 5, smarts: 2 } },
          { chance: 0.5, text: "No one claims it, and it wanders off. You feel a little sad.", deltas: { happiness: -2 } },
        ],
      },
      {
        label: "Walk away",
        outcomes: [
          { chance: 1, text: "You leave the dog be and continue on your way.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "child_pet_lost",
    minAge: 8,
    maxAge: 16,
    weight: 5,
    requires: (c) => c.flags.hasPet,
    prompt: "Your pet passed away today.",
    choices: [
      {
        label: "Cry it out",
        outcomes: [
          { chance: 1, text: "You spend the day crying, but it helps you process it.", deltas: { happiness: -10, health: -1 }, flags: { hasPet: false } },
        ],
      },
      {
        label: "Bury it and move on",
        outcomes: [
          { chance: 1, text: "You give it a proper burial in the backyard.", deltas: { happiness: -6 }, flags: { hasPet: false } },
        ],
      },
    ],
  },
  {
    id: "child_report_card",
    minAge: 6,
    maxAge: 13,
    weight: 7,
    repeatable: true,
    prompt: "Report cards are out. Finals are coming up.",
    choices: [
      {
        label: "Study hard",
        outcomes: [
          { chance: 0.75, text: "Your grades come back great. Your parents are proud.", deltas: { smarts: 5, happiness: 3 } },
          { chance: 0.25, text: "You studied, but still bombed the test. Frustrating.", deltas: { smarts: 1, happiness: -3 } },
        ],
      },
      {
        label: "Slack off",
        outcomes: [
          { chance: 0.4, text: "You got lucky and passed anyway.", deltas: { happiness: 4 } },
          { chance: 0.6, text: "Your grades slip and you get grounded.", deltas: { smarts: -2, happiness: -5 } },
        ],
      },
    ],
  },
  {
    id: "child_bully",
    minAge: 7,
    maxAge: 13,
    weight: 4,
    prompt: "A bully at school starts picking on you.",
    choices: [
      {
        label: "Fight back",
        outcomes: [
          { chance: 0.5, text: "You stand your ground and they back off. Respect earned.", deltas: { happiness: 5, looks: -2 } },
          { chance: 0.5, text: "You get in trouble with the principal too.", deltas: { happiness: -4, smarts: -1 } },
        ],
      },
      {
        label: "Tell a teacher",
        outcomes: [
          { chance: 0.7, text: "The teacher handles it and the bullying stops.", deltas: { happiness: 4 } },
          { chance: 0.3, text: "The bully finds out you told and it gets worse for a while.", deltas: { happiness: -6 } },
        ],
      },
      {
        label: "Ignore it",
        outcomes: [
          { chance: 1, text: "You keep your head down. It's rough, but it passes eventually.", deltas: { happiness: -3 } },
        ],
      },
    ],
  },
  {
    id: "teen_first_crush",
    minAge: 13,
    maxAge: 17,
    weight: 5,
    prompt: "You've developed a big crush on someone at school.",
    choices: [
      {
        label: "Ask them out",
        outcomes: [
          { chance: 0.45, text: "They say yes! You're on cloud nine.", deltas: { happiness: 10 } },
          { chance: 0.55, text: "They turn you down gently. It stings.", deltas: { happiness: -6 } },
        ],
      },
      {
        label: "Admire from afar",
        outcomes: [
          { chance: 1, text: "You keep it to yourself. Safe, but a little lonely.", deltas: { happiness: -1 } },
        ],
      },
    ],
  },
  {
    id: "teen_party_invite",
    minAge: 14,
    maxAge: 18,
    weight: 5,
    repeatable: true,
    prompt: "You're invited to a party this weekend.",
    choices: [
      {
        label: "Go and have fun",
        outcomes: [
          { chance: 0.8, text: "You have a blast dancing and meeting people.", deltas: { happiness: 7 } },
          { chance: 0.2, text: "The party gets busted by the cops. You sneak out just in time.", deltas: { happiness: 2, smarts: 1 } },
        ],
      },
      {
        label: "Sneak some alcohol",
        outcomes: [
          { chance: 0.5, text: "You get a little tipsy and have a hilarious night.", deltas: { happiness: 6, health: -3 }, condition: { id: "alcohol_addiction", severity: 4 } },
          { chance: 0.5, text: "You overdo it and wake up with a brutal hangover.", deltas: { happiness: -4, health: -8 }, condition: { id: "alcohol_addiction", severity: 8 } },
        ],
      },
      {
        label: "Stay home",
        outcomes: [
          { chance: 1, text: "You skip it and get some rest instead.", deltas: { health: 2 } },
        ],
      },
    ],
  },
  {
    id: "teen_shoplift",
    minAge: 13,
    maxAge: 18,
    weight: 3,
    prompt: "A friend dares you to shoplift a candy bar from the corner store.",
    choices: [
      {
        label: "Do it",
        outcomes: [
          {
            chance: 0.55,
            text: "You slip it into your pocket and walk out clean.",
            deltas: { happiness: 3, money: 0 },
          },
          {
            chance: 0.45,
            text: "The clerk catches you red-handed and calls the police.",
            deltas: { happiness: -10 },
            flags: { arrested: true, hasRecord: true },
            schedule: { eventId: "teen_released_from_juvie", inYears: 1 },
          },
        ],
      },
      {
        label: "Walk away",
        outcomes: [
          { chance: 1, text: "You tell your friend that's a terrible idea and leave.", deltas: { happiness: 1, smarts: 1 } },
        ],
      },
    ],
  },
  {
    id: "teen_released_from_juvie",
    minAge: 13,
    maxAge: 19,
    weight: 0, // never chosen randomly — only ever arrives via schedule
    requires: (c) => c.flags.arrested,
    prompt: "You spent a year in juvenile detention. You're finally released.",
    outcomes: [
      { chance: 1, text: "It was a hard year, but you're out now — and wiser for it.", deltas: { happiness: -5, smarts: 2 }, flags: { arrested: false } },
    ],
  },
  {
    id: "teen_part_time_job",
    minAge: 15,
    maxAge: 19,
    weight: 5,
    requires: (c) => !c.flags.hasPartTimeJob,
    prompt: "The store down the street is hiring part-time help after school.",
    choices: [
      {
        label: "Take the job",
        outcomes: [
          { chance: 1, text: "You start working weekends. It's not glamorous, but the money's nice.", deltas: { happiness: 2, money: 400 }, flags: { hasPartTimeJob: true } },
        ],
      },
      {
        label: "Pass — enjoy being a kid",
        outcomes: [
          { chance: 1, text: "You decide free time is worth more than a paycheck right now.", deltas: { happiness: 3 } },
        ],
      },
    ],
  },
  {
    id: "adult_car_trouble",
    minAge: 20,
    maxAge: 65,
    weight: 4,
    repeatable: true,
    prompt: "Your car breaks down unexpectedly.",
    choices: [
      {
        label: "Pay for repairs",
        outcomes: [
          { chance: 1, text: "You get it fixed properly. Ouch, the bill.", deltas: { money: -600, happiness: -1 } },
        ],
      },
      {
        label: "Ignore it and hope for the best",
        outcomes: [
          { chance: 0.4, text: "It somehow keeps running. Lucky you.", deltas: {} },
          { chance: 0.6, text: "It breaks down again, worse this time, and stresses you out.", deltas: { happiness: -6 } },
        ],
      },
    ],
  },
  {
    id: "adult_health_scare",
    minAge: 25,
    maxAge: 75,
    weight: 4,
    repeatable: true,
    prompt: "You've been feeling off lately — something isn't right.",
    choices: [
      {
        label: "See a doctor",
        outcomes: [
          { chance: 1, text: "Turns out it was minor and easily treated. Relief washes over you.", deltas: { health: 8, money: -150 } },
        ],
      },
      {
        label: "Ignore the symptoms",
        outcomes: [
          { chance: 0.5, text: "It clears up on its own after a while.", deltas: { health: 1 } },
          { chance: 0.5, text: "It gets worse from being untreated.", deltas: { health: -10 } },
        ],
      },
    ],
  },
  {
    id: "adult_lottery_ticket",
    minAge: 18,
    maxAge: 99,
    weight: 3,
    repeatable: true,
    prompt: "A gas station clerk asks if you want to buy a lottery ticket.",
    choices: [
      {
        label: "Buy one",
        outcomes: [
          { chance: 0.02, text: "JACKPOT! You win big!", deltas: { money: 25000, happiness: 15 } },
          { chance: 0.18, text: "You win a small prize. Not bad!", deltas: { money: 40, happiness: 2 } },
          { chance: 0.8, text: "No luck this time.", deltas: { money: -5 } },
        ],
      },
      {
        label: "Skip it",
        outcomes: [
          { chance: 1, text: "You save your money instead.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "midlife_crisis",
    minAge: 40,
    maxAge: 55,
    weight: 4,
    prompt: "You catch yourself wondering what you've really done with your life.",
    choices: [
      {
        label: "Buy something impulsive",
        outcomes: [
          { chance: 1, text: "You splurge on something ridiculous. It feels great, briefly.", deltas: { money: -3000, happiness: 8 } },
        ],
      },
      {
        label: "Take up a new hobby",
        outcomes: [
          { chance: 1, text: "You throw yourself into learning something new. It's grounding.", deltas: { happiness: 6, smarts: 3 } },
        ],
      },
      {
        label: "Push the feeling aside",
        outcomes: [
          { chance: 1, text: "You bury yourself in routine and try not to think about it.", deltas: { happiness: -3 } },
        ],
      },
    ],
  },
  {
    id: "senior_grandkid_visit",
    minAge: 60,
    maxAge: 99,
    weight: 4,
    repeatable: true,
    prompt: "Family comes to visit for the weekend.",
    choices: [
      {
        label: "Spoil them rotten",
        outcomes: [
          { chance: 1, text: "You shower them with gifts and treats. Their laughter fills the house.", deltas: { money: -200, happiness: 8 } },
        ],
      },
      {
        label: "Tell them old stories",
        outcomes: [
          { chance: 1, text: "You share stories from your youth. Everyone listens, captivated.", deltas: { happiness: 6 } },
        ],
      },
    ],
  },
  {
    id: "senior_fall",
    minAge: 70,
    maxAge: 99,
    weight: 4,
    repeatable: true,
    prompt: "You lose your footing on the stairs and take a hard fall.",
    choices: [
      {
        label: "Call for help right away",
        outcomes: [
          { chance: 0.8, text: "Help arrives quickly and you're treated before it gets serious.", deltas: { health: -5, money: -300 } },
          { chance: 0.2, text: "It was more serious than it looked, even with quick treatment.", deltas: { health: -15, money: -800 } },
        ],
      },
      {
        label: "Try to get up on your own",
        outcomes: [
          { chance: 0.4, text: "You're shaken but manage to get up fine.", deltas: { health: -3 } },
          { chance: 0.6, text: "You've seriously hurt yourself trying to move too soon.", deltas: { health: -20 } },
        ],
      },
    ],
  },
  {
    id: "any_age_found_money",
    minAge: 5,
    maxAge: 99,
    weight: 2,
    repeatable: true,
    prompt: "You spot a $20 bill lying on the sidewalk.",
    choices: [
      {
        label: "Keep it",
        outcomes: [
          { chance: 1, text: "Finders keepers. You pocket it with a grin.", deltas: { money: 20, happiness: 2 } },
        ],
      },
      {
        label: "Try to find who dropped it",
        outcomes: [
          { chance: 0.3, text: "You track down the owner, who's incredibly grateful.", deltas: { happiness: 5 } },
          { chance: 0.7, text: "No one claims it. You keep it after all.", deltas: { money: 20, happiness: 1 } },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------
  // Extra flavor events — a lot of these are absurd on purpose, but
  // every outcome still moves real numbers. Volume and variety here
  // is the point: more entries means fewer repeat playthroughs.
  // ---------------------------------------------------------------

  {
    id: "child_imaginary_friend",
    minAge: 3,
    maxAge: 7,
    weight: 4,
    prompt: "You've made an imaginary friend named Glorbo who only you can see.",
    choices: [
      {
        label: "Introduce Glorbo to everyone",
        outcomes: [
          { chance: 0.6, text: "Your family finds it adorable and plays along.", deltas: { happiness: 6 } },
          { chance: 0.4, text: "Your teacher gets a little concerned and calls home.", deltas: { happiness: 2, smarts: -1 } },
        ],
      },
      {
        label: "Keep Glorbo a secret",
        outcomes: [
          { chance: 1, text: "You and Glorbo have many private adventures. Nobody suspects a thing.", deltas: { happiness: 4, smarts: 1 } },
        ],
      },
    ],
  },
  {
    id: "child_eats_paste",
    minAge: 4,
    maxAge: 8,
    weight: 3,
    prompt: "There's a tub of school glue on the table and, honestly, it kind of looks delicious.",
    choices: [
      {
        label: "Eat it",
        outcomes: [
          { chance: 1, text: "It tastes terrible and your stomach hurts for a day. Lesson learned.", deltas: { health: -4, happiness: -2, smarts: 1 } },
        ],
      },
      {
        label: "Resist the urge",
        outcomes: [
          { chance: 1, text: "You show remarkable self-control for a small child.", deltas: { smarts: 1 } },
        ],
      },
    ],
  },
  {
    id: "child_talent_show",
    minAge: 7,
    maxAge: 12,
    weight: 4,
    repeatable: true,
    prompt: "The school talent show is coming up. Sign up?",
    choices: [
      {
        label: "Do a magic act",
        outcomes: [
          { chance: 0.5, text: "The trick actually works! You get a standing ovation.", deltas: { happiness: 10, looks: 2 } },
          { chance: 0.5, text: "The trick spectacularly fails in front of the whole school.", deltas: { happiness: -8, looks: -2 } },
        ],
      },
      {
        label: "Sing a song",
        outcomes: [
          { chance: 0.5, text: "You nail every note. People are genuinely impressed.", deltas: { happiness: 8, looks: 1 } },
          { chance: 0.5, text: "You forget the words halfway through. Mortifying.", deltas: { happiness: -6 } },
        ],
      },
      {
        label: "Skip it",
        outcomes: [
          { chance: 1, text: "You watch from the audience instead. Safe choice.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "teen_garage_band",
    minAge: 14,
    maxAge: 18,
    weight: 4,
    prompt: "Some classmates want you to join their garage band as lead kazoo.",
    choices: [
      {
        label: "Join the band",
        outcomes: [
          { chance: 0.5, text: "You actually get pretty good. You play a school dance and it goes great.", deltas: { happiness: 9, looks: 2, smarts: 1 } },
          { chance: 0.5, text: "The band breaks up after one disastrous rehearsal.", deltas: { happiness: -2 } },
        ],
      },
      {
        label: "Politely decline",
        outcomes: [
          { chance: 1, text: "You decide kazoo isn't really your instrument.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "teen_viral_video",
    minAge: 13,
    maxAge: 19,
    weight: 3,
    repeatable: true,
    prompt: "You film yourself attempting a ridiculous internet challenge.",
    choices: [
      {
        label: "Post it online",
        outcomes: [
          { chance: 0.25, text: "It goes viral! Strangers recognize you at the mall for weeks.", deltas: { happiness: 12, looks: 3, money: 200 } },
          { chance: 0.35, text: "It gets a modest number of views. Mildly gratifying.", deltas: { happiness: 3 } },
          { chance: 0.4, text: "You injure yourself on camera and it becomes a cautionary meme instead.", deltas: { happiness: -5, health: -6, looks: -2 } },
        ],
      },
      {
        label: "Keep it to yourself",
        outcomes: [
          { chance: 1, text: "You decide some things are better left unposted.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "teen_extreme_couponing",
    minAge: 15,
    maxAge: 19,
    weight: 2,
    prompt: "You discover the world of extreme couponing and become oddly obsessed.",
    choices: [
      {
        label: "Go all in",
        outcomes: [
          { chance: 0.6, text: "You walk out of the store with a cart of goods for almost nothing. Legendary.", deltas: { money: 150, happiness: 4, smarts: 2 } },
          { chance: 0.4, text: "The cashier rejects half your coupons and a line forms behind you. Humiliating.", deltas: { happiness: -4 } },
        ],
      },
      {
        label: "It's not worth the hassle",
        outcomes: [
          { chance: 1, text: "You pay full price like a normal person.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "any_age_alien_encounter",
    minAge: 8,
    maxAge: 99,
    weight: 1,
    repeatable: true,
    prompt: "While walking home at night, a bright light and a low hum stop you in your tracks.",
    choices: [
      {
        label: "Investigate the light",
        outcomes: [
          { chance: 0.3, text: "It was just a delivery drone. Anticlimactic, but at least you're not abducted.", deltas: { smarts: 1 } },
          { chance: 0.3, text: "You genuinely cannot explain what you saw. It changes how you see the universe.", deltas: { happiness: 6, smarts: 3 } },
          { chance: 0.4, text: "You lose two hours of memory and wake up in a nearby field. Deeply unsettling.", deltas: { happiness: -8, health: -5 } },
        ],
      },
      {
        label: "Run the other way",
        outcomes: [
          { chance: 1, text: "You sprint home and lock every door. Some mysteries aren't worth solving.", deltas: { happiness: -1, health: -1 } },
        ],
      },
    ],
  },
  {
    id: "any_age_cursed_taco_truck",
    minAge: 12,
    maxAge: 99,
    weight: 2,
    repeatable: true,
    prompt: "A taco truck appears on a corner you swear wasn't there yesterday. The menu is written in a language you don't recognize, except the prices.",
    choices: [
      {
        label: "Order the mystery special",
        outcomes: [
          { chance: 0.4, text: "Best taco of your life. You think about it for years.", deltas: { happiness: 10, health: 2 } },
          { chance: 0.35, text: "Your stomach is furious with you for the next three days.", deltas: { health: -10, happiness: -3, money: -20 } },
          { chance: 0.25, text: "You briefly see colors that don't exist, then it passes. You decide not to think about it.", deltas: { happiness: 5, smarts: -2 } },
        ],
      },
      {
        label: "Stick with the regular menu",
        outcomes: [
          { chance: 1, text: "Solid, unremarkable tacos. Probably for the best.", deltas: { happiness: 2, money: -10 } },
        ],
      },
    ],
  },
  {
    id: "any_age_reality_tv_scout",
    minAge: 18,
    maxAge: 55,
    weight: 2,
    prompt: "A talent scout for a reality TV show approaches you in a coffee shop, insisting you have 'main character energy.'",
    choices: [
      {
        label: "Sign up for the show",
        outcomes: [
          { chance: 0.3, text: "You become a minor celebrity. It's chaotic but the checks clear.", deltas: { happiness: 8, looks: 4, money: 5000 } },
          { chance: 0.4, text: "You're cast as the villain edit. The internet has opinions about you for a year.", deltas: { happiness: -6, looks: 2, money: 1500 } },
          { chance: 0.3, text: "The show gets cancelled after two episodes. You got a free hotel stay out of it, at least.", deltas: { happiness: -1, money: 300 } },
        ],
      },
      {
        label: "Politely decline",
        outcomes: [
          { chance: 1, text: "You finish your coffee in peace.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "any_age_psychic_hotline",
    minAge: 16,
    maxAge: 99,
    weight: 2,
    repeatable: true,
    prompt: "A late-night infomercial for a psychic hotline is oddly compelling tonight.",
    choices: [
      {
        label: "Call the psychic hotline ($30)",
        outcomes: [
          { chance: 0.5, text: "The 'psychic' says something so specific about your life it genuinely rattles you.", deltas: { happiness: 3, smarts: -1, money: -30 } },
          { chance: 0.5, text: "It's obviously a scam. You feel a little silly, and $30 poorer.", deltas: { happiness: -2, money: -30 } },
        ],
      },
      {
        label: "Turn off the TV",
        outcomes: [
          { chance: 1, text: "You go to bed like a rational adult.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "any_age_escaped_zoo_animal",
    minAge: 10,
    maxAge: 99,
    weight: 1,
    repeatable: true,
    prompt: "Local news reports a llama has escaped the zoo and is currently sprinting down your street.",
    choices: [
      {
        label: "Try to help catch it",
        outcomes: [
          { chance: 0.4, text: "You corner the llama with a bag of lettuce. Local news interviews you as a hero.", deltas: { happiness: 8, looks: 1, money: 100 } },
          { chance: 0.6, text: "The llama spits directly in your face in front of a crowd.", deltas: { happiness: -5, looks: -1 } },
        ],
      },
      {
        label: "Film it for social media instead",
        outcomes: [
          { chance: 1, text: "Your video gets a decent number of views. Journalism, of a sort.", deltas: { happiness: 3, money: 20 } },
        ],
      },
    ],
  },
  {
    id: "any_age_neighbor_cult",
    minAge: 18,
    maxAge: 99,
    weight: 1,
    prompt: "Your neighbor invites you to a 'wellness retreat' that has some distinctly cult-like flyers taped around the block.",
    choices: [
      {
        label: "Go check it out",
        outcomes: [
          { chance: 0.5, text: "It's actually just yoga and overpriced smoothies. Relaxing, if a bit much.", deltas: { happiness: 5, health: 3, money: -60 } },
          { chance: 0.5, text: "It gets weird fast and you leave the second they mention the 'sacred vow.'", deltas: { happiness: -3, smarts: 2 } },
        ],
      },
      {
        label: "Firmly decline",
        outcomes: [
          { chance: 1, text: "You wave politely and lock your door a little extra that night.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "any_age_karaoke_disaster",
    minAge: 16,
    maxAge: 99,
    weight: 3,
    repeatable: true,
    prompt: "It's karaoke night and your friends are chanting your name.",
    choices: [
      {
        label: "Go for it",
        outcomes: [
          { chance: 0.4, text: "You bring the house down. People are still talking about it the next week.", deltas: { happiness: 10, looks: 2 } },
          { chance: 0.35, text: "It's mediocre but everyone's having fun anyway.", deltas: { happiness: 4 } },
          { chance: 0.25, text: "You forget the words, the mic screeches feedback, and you sit down in silence.", deltas: { happiness: -6, looks: -1 } },
        ],
      },
      {
        label: "Stay in your seat",
        outcomes: [
          { chance: 1, text: "You clap for everyone else and nurse your drink.", deltas: { happiness: 1 } },
        ],
      },
    ],
  },
  {
    id: "any_age_competitive_eating",
    minAge: 16,
    maxAge: 70,
    weight: 2,
    repeatable: true,
    prompt: "There's a competitive hot dog eating contest at the county fair with a cash prize.",
    choices: [
      {
        label: "Enter the contest",
        outcomes: [
          { chance: 0.3, text: "You win! Twenty-two hot dogs in ten minutes. A new personal record.", deltas: { money: 500, happiness: 8, health: -8 } },
          { chance: 0.7, text: "You place a distant fourth and deeply regret hot dog number twelve.", deltas: { health: -12, happiness: -3 } },
        ],
      },
      {
        label: "Watch from the sidelines",
        outcomes: [
          { chance: 1, text: "You cheer on the competitors and eat a normal, reasonable lunch.", deltas: { happiness: 2 } },
        ],
      },
    ],
  },
  {
    id: "any_age_guerrilla_gardening",
    minAge: 20,
    maxAge: 90,
    weight: 2,
    prompt: "You've developed a strange nighttime hobby: planting flowers in neglected public medians without permission.",
    choices: [
      {
        label: "Keep doing it",
        outcomes: [
          { chance: 0.6, text: "The neighborhood starts to notice and genuinely appreciates the mystery gardener.", deltas: { happiness: 7, smarts: 1 } },
          { chance: 0.4, text: "The city sends someone to rip it all out and post 'no unauthorized landscaping' signs.", deltas: { happiness: -3, money: -50 } },
        ],
      },
      {
        label: "Stop while you're ahead",
        outcomes: [
          { chance: 1, text: "You retire your trowel with dignity intact.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "any_age_mistaken_identity",
    minAge: 14,
    maxAge: 99,
    weight: 2,
    repeatable: true,
    prompt: "A stranger runs up to you at the grocery store insisting you're a famous person you've never heard of.",
    choices: [
      {
        label: "Play along",
        outcomes: [
          { chance: 0.5, text: "You sign an autograph as 'not that person' and they still seem thrilled.", deltas: { happiness: 6, looks: 1 } },
          { chance: 0.5, text: "They ask for a very specific favor 'the celebrity' apparently owes them. Awkward.", deltas: { happiness: -3 } },
        ],
      },
      {
        label: "Correct them immediately",
        outcomes: [
          { chance: 1, text: "They apologize, embarrassed, and hurry off.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "any_age_doomsday_prepper_phase",
    minAge: 25,
    maxAge: 80,
    weight: 1,
    prompt: "You fall down an internet rabbit hole and decide you need a fully stocked emergency bunker. Immediately.",
    choices: [
      {
        label: "Buy a year's worth of canned goods",
        outcomes: [
          { chance: 1, text: "Your pantry is now absurd, but you do feel weirdly prepared for anything.", deltas: { money: -1200, happiness: 3, smarts: 1 } },
        ],
      },
      {
        label: "Sleep on it",
        outcomes: [
          { chance: 1, text: "By morning the urge has mostly passed. Mostly.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "any_age_time_capsule",
    minAge: 25,
    maxAge: 99,
    weight: 2,
    prompt: "While cleaning, you find a time capsule you buried as a kid and completely forgot about.",
    choices: [
      {
        label: "Open it",
        outcomes: [
          { chance: 0.5, text: "A letter from your younger self is oddly moving. You tear up a little.", deltas: { happiness: 8, smarts: 1 } },
          { chance: 0.5, text: "It's mostly just a rock and a melted candy bar. Still kind of nice.", deltas: { happiness: 3 } },
        ],
      },
      {
        label: "Save it for later",
        outcomes: [
          { chance: 1, text: "You put it back on the shelf, unopened, for future-you to deal with.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "any_age_vending_machine_jam",
    minAge: 10,
    maxAge: 99,
    weight: 3,
    repeatable: true,
    prompt: "The vending machine eats your money and the snack gets stuck, dangling tragically behind the glass.",
    choices: [
      {
        label: "Shake the machine",
        outcomes: [
          { chance: 0.5, text: "The snack falls! Victory, and a bonus snack tumbles out too.", deltas: { happiness: 4, money: 2 } },
          { chance: 0.5, text: "The machine tips slightly and an alarm goes off. You leave quickly.", deltas: { happiness: -3 } },
        ],
      },
      {
        label: "Accept the loss",
        outcomes: [
          { chance: 1, text: "You walk away $2 poorer and wiser about vending machines.", deltas: { money: -2, happiness: -1 } },
        ],
      },
    ],
  },
  {
    id: "adult_unpaid_mascot_internship",
    minAge: 18,
    maxAge: 28,
    weight: 2,
    requires: (c) => !c.career.job,
    prompt: "A local minor-league baseball team is 'hiring' an unpaid intern to wear the team mascot costume.",
    choices: [
      {
        label: "Take the mascot gig",
        outcomes: [
          { chance: 0.6, text: "You become a local legend inside a giant foam peanut costume. Surprisingly fun.", deltas: { happiness: 9, health: -3 } },
          { chance: 0.4, text: "You pass out from heatstroke inside the costume during the seventh inning.", deltas: { happiness: -4, health: -10 } },
        ],
      },
      {
        label: "Pass on the 'opportunity'",
        outcomes: [
          { chance: 1, text: "You decide your dignity is worth more than free hot dogs.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "adult_neighborhood_watch_drama",
    minAge: 25,
    maxAge: 75,
    weight: 2,
    prompt: "You're nominated to lead the neighborhood watch group, which is somehow more political than expected.",
    choices: [
      {
        label: "Accept the position",
        outcomes: [
          { chance: 0.5, text: "You bring the neighborhood together and actually reduce package theft. Local hero.", deltas: { happiness: 7, smarts: 1 } },
          { chance: 0.5, text: "A dispute over a fence line spirals into a genuine neighborhood feud.", deltas: { happiness: -6 } },
        ],
      },
      {
        label: "Decline",
        outcomes: [
          { chance: 1, text: "You let someone else deal with the politics of suburban fences.", deltas: {} },
        ],
      },
    ],
  },
  {
    id: "senior_talent_rediscovered",
    minAge: 65,
    maxAge: 99,
    weight: 2,
    prompt: "At a retirement community event, you casually mention you used to paint. Someone insists you enter the community art show.",
    choices: [
      {
        label: "Enter the art show",
        outcomes: [
          { chance: 0.5, text: "You win first place. Framed ribbon and everything. You feel sixteen again.", deltas: { happiness: 10, smarts: 1 } },
          { chance: 0.5, text: "You place respectably, but Gerald's watercolor of a lighthouse wins again. Rigged, probably.", deltas: { happiness: 2 } },
        ],
      },
      {
        label: "Keep painting as a private hobby",
        outcomes: [
          { chance: 1, text: "You paint quietly for yourself, which turns out to be plenty rewarding.", deltas: { happiness: 5 } },
        ],
      },
    ],
  },
  {
    id: "senior_grandchild_prank",
    minAge: 65,
    maxAge: 99,
    weight: 2,
    repeatable: true,
    requires: (c) => c.relationships.some((r) => r.type === "Child" || r.type === "Sibling"),
    prompt: "A younger relative teaches you a 'harmless' internet prank to play on the rest of the family.",
    choices: [
      {
        label: "Pull the prank",
        outcomes: [
          { chance: 0.55, text: "It lands perfectly. The whole family is still laughing about it at dinner.", deltas: { happiness: 9 } },
          { chance: 0.45, text: "Nobody gets the joke and you have to explain a meme to five confused relatives.", deltas: { happiness: -2 } },
        ],
      },
      {
        label: "Stick to classic dad jokes",
        outcomes: [
          { chance: 1, text: "Reliable groans all around. A safer bet.", deltas: { happiness: 3 } },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------
  // Criminal-life events — only surface for characters with a gang
  // affiliation, a criminal record, or heat on them, tying the random
  // event pool back into the crime system (crime.js/prison.js).
  // ---------------------------------------------------------------

  {
    id: "gang_rival_confrontation",
    minAge: 18,
    maxAge: 75,
    weight: 3,
    repeatable: true,
    requires: (c) => !!c.criminal.gang,
    prompt: "A rival crew corners you outside your usual spot. This could go badly.",
    choices: [
      {
        label: "Stand your ground",
        outcomes: [
          { chance: 0.5, text: "You hold your own and they back off. Word gets around.", deltas: { happiness: 6, heat: 5 } },
          { chance: 0.5, text: "It turns into a brawl and you come out worse for it.", deltas: { health: -18, happiness: -6, heat: 8 } },
        ],
      },
      {
        label: "Talk your way out",
        outcomes: [
          { chance: 0.5, text: "You keep it cool and defuse the situation entirely.", deltas: { smarts: 1 } },
          { chance: 0.5, text: "They don't buy it. You get shoved around a little before it's over.", deltas: { health: -8, happiness: -4 } },
        ],
      },
      {
        label: "Run",
        outcomes: [
          { chance: 0.7, text: "You get out of there before it escalates.", deltas: { happiness: -2 } },
          { chance: 0.3, text: "They catch you two blocks down.", deltas: { health: -12, happiness: -6 } },
        ],
      },
    ],
  },
  {
    id: "heat_detective_snooping",
    minAge: 18,
    maxAge: 90,
    weight: 3,
    repeatable: true,
    requires: (c) => c.criminal.heat >= 50,
    prompt: "A detective has been asking your neighbors quiet questions about you.",
    choices: [
      {
        label: "Lay low for a while",
        outcomes: [
          { chance: 1, text: "You keep your head down and let the attention fade.", deltas: { heat: -20, happiness: -2 } },
        ],
      },
      {
        label: "Confront the detective directly",
        outcomes: [
          { chance: 0.4, text: "You convince them they're barking up the wrong tree. For now.", deltas: { heat: -10, smarts: 1 } },
          { chance: 0.6, text: "It goes badly — now they're even more interested in you.", deltas: { heat: 15, happiness: -5 } },
        ],
      },
      {
        label: "Ignore it",
        outcomes: [
          { chance: 1, text: "You decide not to think about it. Probably fine.", deltas: { heat: 5 } },
        ],
      },
    ],
  },
  {
    id: "gang_loyalty_test",
    minAge: 18,
    maxAge: 75,
    weight: 2,
    repeatable: true,
    requires: (c) => !!c.criminal.gang,
    prompt: "Your crew wants you to take the fall for a job that went wrong. It would prove your loyalty.",
    choices: [
      {
        label: "Take the fall",
        outcomes: [
          {
            chance: 1,
            text: "You take the charge without naming names. The crew won't forget it — but the judge doesn't go easy.",
            deltas: { happiness: -8 },
            flags: {},
            schedule: { eventId: "gang_loyalty_payoff", inYears: 2 },
          },
        ],
      },
      {
        label: "Refuse",
        outcomes: [
          { chance: 1, text: "You refuse. The crew's trust in you takes a real hit.", deltas: { happiness: -3, heat: -5 } },
        ],
      },
    ],
  },
  {
    id: "gang_loyalty_payoff",
    minAge: 18,
    maxAge: 77,
    weight: 0,
    requires: (c) => !!c.criminal.gang,
    prompt: "Word finally comes down: the crew hasn't forgotten who took the fall for them.",
    outcomes: [
      { chance: 1, text: "A envelope of cash shows up as thanks, no questions asked.", deltas: { money: 5000, happiness: 8 } },
    ],
  },
  {
    id: "record_background_check",
    minAge: 18,
    maxAge: 70,
    weight: 3,
    repeatable: true,
    requires: (c) => c.flags.hasRecord && !c.career.job,
    prompt: "A promising job offer quietly falls through after a background check turns up your record.",
    outcomes: [
      { chance: 1, text: "Nobody says it outright, but you know exactly why the offer disappeared.", deltas: { happiness: -6 } },
    ],
  },
  {
    id: "fugitive_close_call",
    minAge: 18,
    maxAge: 90,
    weight: 3,
    repeatable: true,
    requires: (c) => c.jail.isFugitive,
    prompt: "A police cruiser slows down behind you, and for a second you're sure this is it.",
    choices: [
      {
        label: "Stay calm and keep walking",
        outcomes: [
          { chance: 0.75, text: "It rolls past. Not this time.", deltas: { happiness: -3 } },
          { chance: 0.25, text: "It pulls over just ahead of you, lights flashing.", deltas: { happiness: -10, heat: 15 } },
        ],
      },
      {
        label: "Duck into the nearest building",
        outcomes: [
          { chance: 0.6, text: "You disappear into a crowded store and lose them.", deltas: { happiness: -2 } },
          { chance: 0.4, text: "Ducking away like that draws exactly the attention you didn't want.", deltas: { heat: 10 } },
        ],
      },
    ],
  },

  // ===================================================================
  // Systems-integration batch: events that read and write the deeper
  // simulation layer (conditions, marriage, business, investments,
  // skills, fame, reputation, morality, personality) so the world
  // feels connected rather than a flat list of random pops.
  // ===================================================================

  // ---------------- Toddler / early childhood ----------------
  {
    id: "toddler_potty_training",
    minAge: 2,
    maxAge: 3,
    weight: 3,
    prompt: "Potty training is... a process.",
    choices: [
      {
        label: "Power through it",
        outcomes: [
          { chance: 0.7, text: "Success! A proud milestone for the whole family.", deltas: { happiness: 4, discipline: 3 } },
          { chance: 0.3, text: "It's a rough week for everyone involved.", deltas: { happiness: -2 } },
        ],
      },
    ],
  },
  {
    id: "toddler_first_word",
    minAge: 1,
    maxAge: 2,
    weight: 5,
    prompt: "You say your first word.",
    outcomes: [
      { chance: 0.5, text: "It's \"mama\" (or \"dada\"). Tears of joy.", deltas: { happiness: 5 } },
      { chance: 0.5, text: "It's an oddly specific word nobody expected. Everyone's a little confused, but delighted.", deltas: { happiness: 6, smarts: 1 } },
    ],
  },
  {
    id: "child_learn_instrument",
    minAge: 6,
    maxAge: 12,
    weight: 4,
    prompt: "Your parents offer to sign you up for music lessons.",
    choices: [
      {
        label: "Take piano lessons",
        outcomes: [{ chance: 1, text: "You start learning piano. Scales are tedious, but you're getting the hang of it.", deltas: { smarts: 1 } }],
      },
      {
        label: "Take guitar lessons",
        outcomes: [{ chance: 1, text: "You start learning guitar. Your fingertips hurt for weeks.", deltas: { happiness: 2 } }],
      },
      {
        label: "No thanks",
        outcomes: [{ chance: 1, text: "You'd rather spend the time playing outside.", deltas: { athleticism: 1 } }],
      },
    ],
  },
  {
    id: "child_joins_sports_team",
    minAge: 7,
    maxAge: 13,
    weight: 5,
    prompt: "There's a youth sports team recruiting at school.",
    choices: [
      {
        label: "Sign up",
        outcomes: [
          { chance: 1, text: "You join the team. It's exhausting, but you're making friends and getting stronger.", deltas: { athleticism: 5, socialSkill: 3, happiness: 3 } },
        ],
      },
      {
        label: "Skip it",
        outcomes: [{ chance: 1, text: "Not really your thing. You find other ways to spend the afternoon.", deltas: {} }],
      },
    ],
  },
  {
    id: "child_science_fair",
    minAge: 8,
    maxAge: 13,
    weight: 4,
    repeatable: true,
    prompt: "The school science fair is coming up.",
    choices: [
      {
        label: "Build an ambitious project",
        outcomes: [
          { chance: 0.5, text: "It actually works! You win a ribbon and a lot of respect.", deltas: { smarts: 5, happiness: 6 } },
          { chance: 0.5, text: "It doesn't quite work on presentation day, but you learned a ton.", deltas: { smarts: 3, happiness: -2 } },
        ],
      },
      {
        label: "Do the bare minimum",
        outcomes: [{ chance: 1, text: "A baking soda volcano. Reliable, unspectacular.", deltas: { smarts: 1 } }],
      },
    ],
  },

  // ---------------- Teen years (deeper) ----------------
  {
    id: "teen_first_job_interview_nerves",
    minAge: 15,
    maxAge: 18,
    weight: 3,
    requires: (c) => !c.career.job,
    prompt: "You have your very first job interview and you're a nervous wreck.",
    choices: [
      {
        label: "Prepare thoroughly",
        outcomes: [
          { chance: 1, text: "You walk in ready for anything. The confidence shows.", deltas: { socialSkill: 3, discipline: 2 } },
        ],
      },
      {
        label: "Wing it",
        outcomes: [
          { chance: 0.5, text: "Somehow it goes fine anyway.", deltas: { happiness: 2 } },
          { chance: 0.5, text: "It's an awkward 20 minutes you'd like to forget.", deltas: { happiness: -4 } },
        ],
      },
    ],
  },
  {
    id: "teen_cyberbullying",
    minAge: 13,
    maxAge: 18,
    weight: 3,
    prompt: "Someone at school starts spreading nasty rumors about you online.",
    choices: [
      {
        label: "Confront them directly",
        outcomes: [
          { chance: 0.5, text: "They back down and even apologize. Didn't expect that.", deltas: { happiness: 4, socialSkill: 2 } },
          { chance: 0.5, text: "It escalates into a bigger mess online.", deltas: { happiness: -10, mentalHealth: -8 } },
        ],
      },
      {
        label: "Tell a trusted adult",
        outcomes: [
          { chance: 0.7, text: "The school steps in and it gets handled properly.", deltas: { happiness: 3, mentalHealth: 4 } },
          { chance: 0.3, text: "It takes a while to actually resolve.", deltas: { happiness: -3 } },
        ],
      },
      {
        label: "Just endure it quietly",
        outcomes: [
          { chance: 1, text: "You tough it out alone. It weighs on you more than you let on.", deltas: { happiness: -8, mentalHealth: -10, stress: 10 }, condition: { id: "anxiety", severity: 12 } },
        ],
      },
    ],
  },
  {
    id: "teen_prom",
    minAge: 16,
    maxAge: 18,
    weight: 4,
    prompt: "Prom is coming up.",
    choices: [
      {
        label: "Ask your crush",
        outcomes: [
          { chance: 0.45, text: "They say yes! A night to remember.", deltas: { happiness: 15, socialSkill: 2 } },
          { chance: 0.55, text: "They say no. Ouch — but you go with friends instead and still have fun.", deltas: { happiness: -3 } },
        ],
      },
      {
        label: "Go with friends, no pressure",
        outcomes: [{ chance: 1, text: "A genuinely fun, low-key night.", deltas: { happiness: 8, socialSkill: 2 } }],
      },
      {
        label: "Skip it entirely",
        outcomes: [{ chance: 1, text: "You spend the night doing something you actually enjoy instead.", deltas: { happiness: 2 } }],
      },
    ],
  },
  {
    id: "teen_college_app_stress",
    minAge: 16,
    maxAge: 18,
    weight: 4,
    requires: (c) => c.education.stage === "high",
    prompt: "College application season is in full swing, and the pressure is real.",
    choices: [
      {
        label: "Grind through applications",
        outcomes: [
          { chance: 1, text: "You get everything submitted on time, but you're running on fumes.", deltas: { smarts: 3, stress: 15, mentalHealth: -5 } },
        ],
      },
      {
        label: "Pace yourself and ask for help",
        outcomes: [
          { chance: 1, text: "A counselor helps you get organized. Much less stressful than it could have been.", deltas: { stress: 3, socialSkill: 2 } },
        ],
      },
    ],
  },
  {
    id: "teen_first_car_accident",
    minAge: 16,
    maxAge: 19,
    weight: 2,
    requires: (c) => c.assets.some((a) => a.kind === "car"),
    prompt: "You're a new driver, and a fender-bender happens in a parking lot.",
    choices: [
      {
        label: "Exchange info and handle it properly",
        outcomes: [
          { chance: 1, text: "It's handled cleanly, if a little embarrassingly.", deltas: { money: -400, happiness: -3 } },
        ],
      },
      {
        label: "Panic and drive off",
        outcomes: [
          { chance: 0.4, text: "Nobody saw. You got away with it, but you feel guilty.", deltas: { morality: -8 } },
          { chance: 0.6, text: "There were cameras. This gets expensive and complicated fast.", deltas: { money: -1500, happiness: -10 }, flags: { hasRecord: true } },
        ],
      },
    ],
  },

  // ---------------- Adult: work, stress, burnout ----------------
  {
    id: "adult_work_crunch",
    minAge: 22,
    maxAge: 65,
    weight: 4,
    repeatable: true,
    requires: (c) => !!c.career.job,
    prompt: "Your job is demanding serious overtime this month for a big deadline.",
    choices: [
      {
        label: "Grind it out",
        outcomes: [
          { chance: 1, text: "You deliver, and it's noticed — but at a real personal cost.", deltas: { money: 800, stress: 18, mentalHealth: -6 }, condition: { id: "burnout", severity: 10 } },
        ],
      },
      {
        label: "Set a boundary",
        outcomes: [
          { chance: 0.6, text: "Your manager respects it. Crisis averted without burning out.", deltas: { happiness: 4 } },
          { chance: 0.4, text: "It doesn't go over well, but you don't regret protecting your time.", deltas: { happiness: -2, reputation: -3 } },
        ],
      },
    ],
  },
  {
    id: "adult_workplace_recognition",
    minAge: 22,
    maxAge: 65,
    weight: 3,
    repeatable: true,
    requires: (c) => !!c.career.job,
    prompt: "You're nominated for an employee recognition award.",
    outcomes: [
      { chance: 0.5, text: "You win! A nice plaque and a genuine confidence boost.", deltas: { happiness: 8, reputation: 5 } },
      { chance: 0.5, text: "You don't win, but being nominated still feels good.", deltas: { happiness: 3 } },
    ],
  },
  {
    id: "adult_office_politics",
    minAge: 22,
    maxAge: 65,
    weight: 3,
    repeatable: true,
    requires: (c) => !!c.career.job,
    prompt: "A coworker tries to pull you into some messy office politics.",
    choices: [
      {
        label: "Stay neutral",
        outcomes: [{ chance: 1, text: "You keep your head down. Smart move.", deltas: { stress: -2 } }],
      },
      {
        label: "Take a side",
        outcomes: [
          { chance: 0.5, text: "Your side comes out on top. Useful allies now.", deltas: { reputation: 6 } },
          { chance: 0.5, text: "The other side wins. Awkward for a while.", deltas: { reputation: -6, happiness: -4 } },
        ],
      },
    ],
  },
  {
    id: "adult_mentor_offer",
    minAge: 24,
    maxAge: 60,
    weight: 3,
    requires: (c) => !!c.career.job,
    prompt: "A senior figure at work offers to mentor you.",
    choices: [
      {
        label: "Accept",
        outcomes: [{ chance: 1, text: "You learn a ton and build a genuinely valuable relationship.", deltas: { smarts: 4, socialSkill: 3, happiness: 4 } }],
      },
      {
        label: "Politely decline",
        outcomes: [{ chance: 1, text: "You'd rather figure things out your own way.", deltas: {} }],
      },
    ],
  },

  // ---------------- Health / conditions ----------------
  {
    id: "adult_persistent_back_pain",
    minAge: 25,
    maxAge: 70,
    weight: 3,
    repeatable: true,
    prompt: "Your back has been bothering you for weeks now.",
    choices: [
      {
        label: "See a specialist",
        outcomes: [
          { chance: 1, text: "Physical therapy helps a lot. Worth the cost.", deltas: { money: -400, health: 6 } },
        ],
      },
      {
        label: "Push through it",
        outcomes: [
          { chance: 0.5, text: "It resolves on its own eventually.", deltas: { health: -2 } },
          { chance: 0.5, text: "It becomes a real, lasting problem.", deltas: { health: -5 }, condition: { id: "back_injury", severity: 30 } },
        ],
      },
    ],
  },
  {
    id: "adult_prescribed_painkillers",
    minAge: 20,
    maxAge: 75,
    weight: 2,
    requires: (c) => c.conditions.some((cond) => cond.category === "injury" || cond.id === "back_injury"),
    prompt: "A doctor prescribes painkillers for your injury. They work a little too well.",
    choices: [
      {
        label: "Take exactly as prescribed",
        outcomes: [{ chance: 1, text: "You're careful about it and taper off without issue.", deltas: { health: 8 } }],
      },
      {
        label: "Take a little extra when it's bad",
        outcomes: [
          { chance: 1, text: "Just this once turns into a pattern faster than you expected.", deltas: { happiness: 3 }, condition: { id: "drug_addiction", severity: 15 } },
        ],
      },
    ],
  },
  {
    id: "adult_annual_physical",
    minAge: 30,
    maxAge: 90,
    weight: 4,
    repeatable: true,
    prompt: "It's time for your annual physical.",
    choices: [
      {
        label: "Go get checked out",
        outcomes: [
          { chance: 0.75, text: "Clean bill of health. Good news.", deltas: { happiness: 2, money: -80 } },
          { chance: 0.25, text: "The doctor catches something early that needed attention.", deltas: { money: -300, health: 5 } },
        ],
      },
      {
        label: "Skip it, you feel fine",
        outcomes: [
          { chance: 0.8, text: "Nothing comes of skipping it, this time.", deltas: {} },
          { chance: 0.2, text: "Something that could've been caught early goes unnoticed a while longer.", deltas: { health: -8 }, condition: { id: "hypertension", severity: 20 } },
        ],
      },
    ],
  },
  {
    id: "adult_casino_night",
    minAge: 21,
    maxAge: 90,
    weight: 3,
    repeatable: true,
    prompt: "Some friends invite you to a casino night.",
    choices: [
      {
        label: "Play it safe with a small budget",
        outcomes: [
          { chance: 0.5, text: "You come out slightly ahead. Fun night.", deltas: { money: 150, happiness: 5 } },
          { chance: 0.5, text: "You lose your budget but had fun anyway.", deltas: { money: -150, happiness: 2 } },
        ],
      },
      {
        label: "Go big",
        outcomes: [
          { chance: 0.3, text: "You hit a huge win! The rush is incredible.", deltas: { money: 4000, happiness: 12 }, condition: { id: "gambling_addiction", severity: 10 } },
          { chance: 0.7, text: "You lose big and chase your losses most of the night.", deltas: { money: -2500, happiness: -8 }, condition: { id: "gambling_addiction", severity: 18 } },
        ],
      },
    ],
  },
  {
    id: "adult_mental_health_checkin",
    minAge: 18,
    maxAge: 90,
    weight: 3,
    repeatable: true,
    requires: (c) => c.stats.stress >= 55,
    prompt: "You've been feeling overwhelmed lately. Stress is taking a real toll.",
    choices: [
      {
        label: "Talk to someone",
        outcomes: [{ chance: 1, text: "It helps more than you expected. You feel lighter.", deltas: { stress: -20, mentalHealth: 10 } }],
      },
      {
        label: "Push through alone",
        outcomes: [
          { chance: 0.5, text: "You manage, barely.", deltas: { stress: -5 } },
          { chance: 0.5, text: "It catches up with you.", deltas: { happiness: -10 }, condition: { id: "depression", severity: 20 } },
        ],
      },
    ],
  },

  // ---------------- Marriage / family life ----------------
  {
    id: "married_anniversary",
    minAge: 20,
    maxAge: 95,
    weight: 4,
    repeatable: true,
    requires: (c) => c.married,
    prompt: "Your wedding anniversary is coming up.",
    choices: [
      {
        label: "Plan something special",
        outcomes: [
          { chance: 1, text: "A genuinely lovely evening together. Worth every penny.", deltas: { happiness: 10, money: -300 } },
        ],
      },
      {
        label: "Let it slide by quietly",
        outcomes: [
          { chance: 0.5, text: "Your spouse doesn't seem to mind.", deltas: {} },
          { chance: 0.5, text: "Your spouse is quietly hurt you forgot.", deltas: { happiness: -6 } },
        ],
      },
    ],
  },
  {
    id: "married_disagreement",
    minAge: 20,
    maxAge: 95,
    weight: 4,
    repeatable: true,
    requires: (c) => c.married,
    prompt: "You and your spouse have a serious disagreement about money.",
    choices: [
      {
        label: "Talk it through calmly",
        outcomes: [{ chance: 1, text: "You work it out together. Feels good to communicate well.", deltas: { happiness: 4 } }],
      },
      {
        label: "Let it turn into a fight",
        outcomes: [{ chance: 1, text: "It gets heated. You both say things you don't fully mean.", deltas: { happiness: -8, stress: 10 } }],
      },
    ],
  },
  {
    id: "parent_child_milestone",
    minAge: 20,
    maxAge: 90,
    weight: 4,
    repeatable: true,
    requires: (c) => c.relationships.some((r) => r.type === "Child" && r.alive && r.age >= 1 && r.age <= 17),
    prompt: "Your child hits a big milestone this year (first day of school, a big recital, you name it).",
    outcomes: [
      { chance: 1, text: "You're there for it, and it means everything.", deltas: { happiness: 8 } },
    ],
  },
  {
    id: "parent_teen_rebellion",
    minAge: 30,
    maxAge: 90,
    weight: 3,
    repeatable: true,
    requires: (c) => c.relationships.some((r) => r.type === "Child" && r.alive && r.age >= 13 && r.age <= 18),
    prompt: "Your teenager is going through a serious rebellious phase.",
    choices: [
      {
        label: "Set firm boundaries",
        outcomes: [
          { chance: 0.6, text: "It's tense, but it works out in the end.", deltas: { stress: 8 } },
          { chance: 0.4, text: "It just makes things worse for now.", deltas: { stress: 12, happiness: -6 } },
        ],
      },
      {
        label: "Give them space",
        outcomes: [
          { chance: 0.6, text: "They come around on their own.", deltas: { happiness: 3 } },
          { chance: 0.4, text: "Things spiral a bit before they improve.", deltas: { stress: 10, happiness: -4 } },
        ],
      },
    ],
  },
  {
    id: "sibling_reconnect",
    minAge: 25,
    maxAge: 90,
    weight: 2,
    repeatable: true,
    requires: (c) => c.relationships.some((r) => r.type === "Sibling" && r.alive),
    prompt: "Your sibling reaches out wanting to reconnect after a while of drifting apart.",
    choices: [
      {
        label: "Make time for it",
        outcomes: [{ chance: 1, text: "It's like no time passed at all. Genuinely nice.", deltas: { happiness: 6 } }],
      },
      {
        label: "You're too busy right now",
        outcomes: [{ chance: 1, text: "You mean to follow up later. You're not sure you will.", deltas: { happiness: -2 } }],
      },
    ],
  },

  // ---------------- Finance / investing ----------------
  {
    id: "adult_hot_stock_tip",
    minAge: 20,
    maxAge: 80,
    weight: 3,
    repeatable: true,
    prompt: "A friend swears they have a can't-miss stock tip.",
    choices: [
      {
        label: "Ignore it",
        outcomes: [{ chance: 1, text: "You've heard this one before. Pass.", deltas: {} }],
      },
      {
        label: "Put some money in",
        outcomes: [
          { chance: 0.35, text: "It actually pays off nicely!", deltas: { money: 2500, happiness: 5 } },
          { chance: 0.65, text: "It tanks. Lesson learned about 'sure things.'", deltas: { money: -1200, happiness: -5 } },
        ],
      },
    ],
  },
  {
    id: "adult_investment_scam",
    minAge: 25,
    maxAge: 85,
    weight: 2,
    repeatable: true,
    prompt: "You get an unsolicited call about a 'guaranteed' investment opportunity.",
    choices: [
      {
        label: "Hang up immediately",
        outcomes: [{ chance: 1, text: "Good instinct. Definitely a scam.", deltas: { smarts: 1 } }],
      },
      {
        label: "Hear them out",
        outcomes: [
          { chance: 0.2, text: "Somehow it's actually legitimate. Small profit.", deltas: { money: 500 } },
          { chance: 0.8, text: "It's a scam, and you're out real money before you realize it.", deltas: { money: -3000, happiness: -8, stress: 10 } },
        ],
      },
    ],
  },
  {
    id: "adult_identity_theft_victim",
    minAge: 20,
    maxAge: 90,
    weight: 2,
    repeatable: true,
    prompt: "You get an alert: someone opened a credit card in your name.",
    choices: [
      {
        label: "Deal with it immediately",
        outcomes: [{ chance: 1, text: "A stressful few days on the phone with banks, but it gets resolved.", deltas: { money: -200, stress: 15 } }],
      },
      {
        label: "Put it off",
        outcomes: [{ chance: 1, text: "It gets significantly worse and more expensive to fix.", deltas: { money: -1800, stress: 25, mentalHealth: -8 } }],
      },
    ],
  },
  {
    id: "adult_side_hustle",
    minAge: 18,
    maxAge: 70,
    weight: 3,
    repeatable: true,
    prompt: "You have an idea for a small side hustle in your free time.",
    choices: [
      {
        label: "Give it a shot",
        outcomes: [
          { chance: 0.5, text: "It actually brings in decent extra income.", deltas: { money: randInt(300, 1500), happiness: 4 } },
          { chance: 0.5, text: "It fizzles out after a few months, but it was worth trying.", deltas: { money: -100, smarts: 1 } },
        ],
      },
      {
        label: "Too busy for it right now",
        outcomes: [{ chance: 1, text: "Maybe another time.", deltas: {} }],
      },
    ],
  },

  // ---------------- Fame / reputation / morality ----------------
  {
    id: "any_age_good_samaritan",
    minAge: 12,
    maxAge: 99,
    weight: 3,
    repeatable: true,
    prompt: "You witness someone drop their wallet, stuffed with cash, without noticing.",
    choices: [
      {
        label: "Return it immediately",
        outcomes: [
          { chance: 1, text: "They're overwhelmed with gratitude. Feels genuinely good.", deltas: { happiness: 8, morality: 10, reputation: 5 } },
        ],
      },
      {
        label: "Keep the cash, return the wallet",
        outcomes: [
          { chance: 1, text: "Best of both worlds, you tell yourself.", deltas: { money: 80, morality: -5 } },
        ],
      },
      {
        label: "Keep the whole thing",
        outcomes: [
          { chance: 1, text: "Finders keepers. You don't feel great about it, though.", deltas: { money: 150, morality: -12, happiness: -2 } },
        ],
      },
    ],
  },
  {
    id: "any_age_local_news_feature",
    minAge: 16,
    maxAge: 99,
    weight: 2,
    repeatable: true,
    requires: (c) => c.fame >= 15,
    prompt: "A local news outlet wants to do a short feature on you.",
    choices: [
      {
        label: "Say yes",
        outcomes: [{ chance: 1, text: "It airs, and your name gets a little more recognizable around town.", deltas: { fame: 8, happiness: 4 } }],
      },
      {
        label: "Decline, too much attention",
        outcomes: [{ chance: 1, text: "You'd rather keep a low profile.", deltas: {} }],
      },
    ],
  },
  {
    id: "any_age_public_scandal",
    minAge: 18,
    maxAge: 90,
    weight: 2,
    requires: (c) => c.fame >= 40,
    prompt: "An old, embarrassing story about you surfaces online and starts spreading.",
    choices: [
      {
        label: "Address it head-on",
        outcomes: [
          { chance: 0.6, text: "Owning it earns you some respect. It blows over.", deltas: { fame: -5, reputation: 6 } },
          { chance: 0.4, text: "It doesn't land well. The story keeps circulating.", deltas: { fame: -10, reputation: -10, happiness: -8 } },
        ],
      },
      {
        label: "Say nothing and wait it out",
        outcomes: [
          { chance: 0.5, text: "It fades on its own eventually.", deltas: { happiness: -3 } },
          { chance: 0.5, text: "The silence is read as guilt. It gets worse.", deltas: { reputation: -12, happiness: -6 } },
        ],
      },
    ],
  },
  {
    id: "any_age_charity_drive",
    minAge: 16,
    maxAge: 95,
    weight: 3,
    repeatable: true,
    prompt: "A local charity drive is asking for donations.",
    choices: [
      {
        label: "Donate generously",
        outcomes: [{ chance: 1, text: "It feels good to give back, even if the wallet's a little lighter.", deltas: { money: -200, happiness: 6, morality: 8, reputation: 3 } }],
      },
      {
        label: "Donate a token amount",
        outcomes: [{ chance: 1, text: "Something is better than nothing.", deltas: { money: -20, morality: 2 } }],
      },
      {
        label: "Walk past",
        outcomes: [{ chance: 1, text: "Not today.", deltas: {} }],
      },
    ],
  },

  // ---------------- Elder years (deeper) ----------------
  {
    id: "senior_retirement_decision",
    minAge: 60,
    maxAge: 75,
    weight: 4,
    requires: (c) => !!c.career.job,
    prompt: "You're eligible to retire. Do you?",
    choices: [
      {
        label: "Retire now",
        outcomes: [
          { chance: 1, text: "You leave the workforce behind. A huge adjustment, but a relief too.", deltas: { happiness: 10, stress: -20 }, flags: {} },
        ],
      },
      {
        label: "Keep working",
        outcomes: [{ chance: 1, text: "You're not ready to slow down just yet.", deltas: { stress: 3 } }],
      },
    ],
  },
  {
    id: "senior_reflects_on_life",
    minAge: 70,
    maxAge: 99,
    weight: 3,
    repeatable: true,
    prompt: "You find yourself thinking back on the shape of your whole life.",
    choices: [
      {
        label: "Feel at peace with it",
        outcomes: [{ chance: 1, text: "Whatever came, you made the most of it. That's enough.", deltas: { happiness: 8, mentalHealth: 6 } }],
      },
      {
        label: "Wish you'd done things differently",
        outcomes: [{ chance: 1, text: "Some regrets settle in and don't quite leave.", deltas: { happiness: -5, mentalHealth: -4 } }],
      },
    ],
  },
  {
    id: "senior_estate_planning",
    minAge: 65,
    maxAge: 99,
    weight: 3,
    prompt: "A lawyer suggests it's time to get your affairs in order.",
    choices: [
      {
        label: "Write a will",
        outcomes: [{ chance: 1, text: "It's a strange thing to plan for, but it brings real peace of mind.", deltas: { money: -500, mentalHealth: 6 } }],
      },
      {
        label: "Put it off",
        outcomes: [{ chance: 1, text: "You'll get to it eventually. Probably.", deltas: {} }],
      },
    ],
  },
  {
    id: "senior_volunteer_work",
    minAge: 60,
    maxAge: 99,
    weight: 3,
    repeatable: true,
    prompt: "A local community center is looking for volunteers.",
    choices: [
      {
        label: "Volunteer regularly",
        outcomes: [{ chance: 1, text: "It gives your week real structure and purpose.", deltas: { happiness: 8, reputation: 4, mentalHealth: 5 } }],
      },
      {
        label: "Not interested",
        outcomes: [{ chance: 1, text: "You'd rather spend the time on your own hobbies.", deltas: {} }],
      },
    ],
  },

  // ---------------- Miscellaneous / weird (more, per request) ----------------
  {
    id: "any_age_flat_tire",
    minAge: 18,
    maxAge: 90,
    weight: 3,
    repeatable: true,
    requires: (c) => c.assets.some((a) => a.kind === "car"),
    prompt: "You get a flat tire on the way somewhere important.",
    choices: [
      {
        label: "Change it yourself",
        outcomes: [
          { chance: 0.7, text: "You handle it like a pro and get back on the road.", deltas: { discipline: 2, happiness: 1 } },
          { chance: 0.3, text: "You make it worse trying to DIY it and have to call for help anyway.", deltas: { money: -150, happiness: -4 } },
        ],
      },
      {
        label: "Call for roadside assistance",
        outcomes: [{ chance: 1, text: "It costs a bit but gets handled properly.", deltas: { money: -90 } }],
      },
    ],
  },
  {
    id: "any_age_neighbor_dispute",
    minAge: 20,
    maxAge: 95,
    weight: 3,
    repeatable: true,
    prompt: "A dispute with a neighbor over noise/parking/a fence line boils over.",
    choices: [
      {
        label: "Try to resolve it amicably",
        outcomes: [
          { chance: 0.6, text: "You work it out over coffee. Neighbors again.", deltas: { happiness: 3, socialSkill: 2 } },
          { chance: 0.4, text: "It doesn't fully resolve, but at least it's civil now.", deltas: { happiness: -1 } },
        ],
      },
      {
        label: "Escalate it",
        outcomes: [
          { chance: 1, text: "It turns into a whole thing with letters and, at one point, the HOA.", deltas: { happiness: -8, stress: 12, money: -200 } },
        ],
      },
    ],
  },
  {
    id: "any_age_mystery_package",
    minAge: 10,
    maxAge: 99,
    weight: 2,
    repeatable: true,
    prompt: "A package you don't remember ordering shows up on your doorstep.",
    choices: [
      {
        label: "Open it",
        outcomes: [
          { chance: 0.4, text: "It's a wrong delivery — a genuinely nice item, actually. You keep it.", deltas: { happiness: 5 } },
          { chance: 0.3, text: "It's from a relative, a surprise gift. Sweet.", deltas: { happiness: 6 } },
          { chance: 0.3, text: "It's just cat food. You don't have a cat.", deltas: { happiness: 1 } },
        ],
      },
      {
        label: "Return it unopened",
        outcomes: [{ chance: 1, text: "Better safe than sorry, you figure.", deltas: {} }],
      },
    ],
  },
  {
    id: "any_age_escape_room",
    minAge: 12,
    maxAge: 90,
    weight: 3,
    repeatable: true,
    prompt: "Friends invite you to try an escape room.",
    choices: [
      {
        label: "Go all in",
        outcomes: [
          { chance: 0.5, text: "Your group escapes with two minutes to spare. Glorious.", deltas: { happiness: 8, smarts: 2, socialSkill: 2 } },
          { chance: 0.5, text: "You don't escape in time, but it was a blast anyway.", deltas: { happiness: 4 } },
        ],
      },
    ],
  },
  {
    id: "any_age_road_trip",
    minAge: 16,
    maxAge: 80,
    weight: 3,
    repeatable: true,
    requires: (c) => c.assets.some((a) => a.kind === "car"),
    prompt: "You and some friends decide on a spontaneous road trip.",
    choices: [
      {
        label: "Go for it",
        outcomes: [
          { chance: 0.8, text: "One of the best trips of your life so far.", deltas: { happiness: 12, money: -300 } },
          { chance: 0.2, text: "The car breaks down halfway. An adventure, technically.", deltas: { happiness: 2, money: -600 } },
        ],
      },
      {
        label: "Can't get away right now",
        outcomes: [{ chance: 1, text: "Maybe next time.", deltas: { happiness: -1 } }],
      },
    ],
  },
  {
    id: "any_age_weird_dream",
    minAge: 8,
    maxAge: 99,
    weight: 2,
    repeatable: true,
    prompt: "You have an unusually vivid, strange dream that sticks with you all day.",
    outcomes: [
      { chance: 0.5, text: "You can't stop thinking about what it might mean.", deltas: { happiness: 1 } },
      { chance: 0.5, text: "You write it down. It might make a great story someday.", deltas: { smarts: 1 } },
    ],
  },
  {
    id: "any_age_class_reunion",
    minAge: 30,
    maxAge: 90,
    weight: 2,
    repeatable: true,
    prompt: "You get an invitation to a school reunion.",
    choices: [
      {
        label: "Go",
        outcomes: [
          { chance: 0.6, text: "It's genuinely great catching up with old faces.", deltas: { happiness: 8, socialSkill: 2 } },
          { chance: 0.4, text: "It's a little awkward comparing notes on where everyone ended up.", deltas: { happiness: -3 } },
        ],
      },
      {
        label: "Skip it",
        outcomes: [{ chance: 1, text: "Some things are better left in the past.", deltas: {} }],
      },
    ],
  },
  {
    id: "any_age_home_renovation_disaster",
    minAge: 25,
    maxAge: 90,
    weight: 2,
    repeatable: true,
    requires: (c) => c.assets.some((a) => a.kind === "house"),
    prompt: "You decide to tackle a DIY home renovation project.",
    choices: [
      {
        label: "Go for it",
        outcomes: [
          { chance: 0.4, text: "It turns out surprisingly well. You're proud of the work.", deltas: { happiness: 8, discipline: 3 } },
          { chance: 0.6, text: "You have to call in a professional to fix your fix.", deltas: { money: -800, happiness: -4 } },
        ],
      },
      {
        label: "Hire a professional from the start",
        outcomes: [{ chance: 1, text: "Costs more upfront but it's done right.", deltas: { money: -1200, happiness: 4 } }],
      },
    ],
  },
  {
    id: "any_age_pet_adoption",
    minAge: 18,
    maxAge: 90,
    weight: 3,
    repeatable: true,
    requires: (c) => !c.flags.hasPet,
    prompt: "You visit an animal shelter, just to look, definitely just to look.",
    choices: [
      {
        label: "Adopt a pet",
        outcomes: [{ chance: 1, text: "You leave with a new best friend.", deltas: { happiness: 12, money: -150 }, flags: { hasPet: true } }],
      },
      {
        label: "Just looking, really",
        outcomes: [{ chance: 1, text: "You leave empty-handed, but it was nice seeing all the animals.", deltas: { happiness: 2 } }],
      },
    ],
  },
  {
    id: "adult_pet_vet_bill",
    minAge: 18,
    maxAge: 90,
    weight: 3,
    repeatable: true,
    requires: (c) => c.flags.hasPet,
    prompt: "Your pet needs an unexpected trip to the vet.",
    choices: [
      {
        label: "Pay for the best care",
        outcomes: [{ chance: 1, text: "Expensive, but your pet is going to be just fine.", deltas: { money: -600, happiness: 4 } }],
      },
      {
        label: "Go with the basic treatment",
        outcomes: [{ chance: 1, text: "It does the job for less.", deltas: { money: -200 } }],
      },
    ],
  },
  {
    id: "any_age_haircut_disaster",
    minAge: 10,
    maxAge: 90,
    weight: 3,
    repeatable: true,
    prompt: "You try a new hairstylist for a change.",
    choices: [
      {
        label: "Go bold",
        outcomes: [
          { chance: 0.5, text: "It's a great look! Compliments all week.", deltas: { looks: 5, happiness: 5 } },
          { chance: 0.5, text: "It's... not great. Hats become a wardrobe staple for a while.", deltas: { looks: -6, happiness: -4 } },
        ],
      },
      {
        label: "Play it safe",
        outcomes: [{ chance: 1, text: "A reliable trim. No surprises.", deltas: {} }],
      },
    ],
  },
  {
    id: "any_age_sudden_windfall_bill",
    minAge: 18,
    maxAge: 90,
    weight: 2,
    repeatable: true,
    prompt: "An old subscription you forgot to cancel has been quietly charging you for years.",
    outcomes: [
      { chance: 1, text: "You finally notice and cancel it, wincing at the total.", deltas: { money: -randInt(200, 900), happiness: -3 } },
    ],
  },
  {
    id: "any_age_good_deed_snowball",
    minAge: 16,
    maxAge: 95,
    weight: 2,
    repeatable: true,
    requires: (c) => c.morality >= 40,
    prompt: "Your reputation for kindness has started to precede you around town.",
    outcomes: [
      { chance: 1, text: "A stranger does you an unprompted favor, just paying it forward.", deltas: { happiness: 6, reputation: 4 } },
    ],
  },
  {
    id: "any_age_karma_catches_up",
    minAge: 16,
    maxAge: 95,
    weight: 2,
    repeatable: true,
    requires: (c) => c.morality <= -40,
    prompt: "Word has gotten around about the kind of person you are, and people are starting to keep their distance.",
    outcomes: [
      { chance: 1, text: "A few relationships cool off without much explanation.", deltas: { happiness: -5, reputation: -6 } },
    ],
  },
  {
    id: "any_age_talent_show_rivalry",
    minAge: 10,
    maxAge: 20,
    weight: 2,
    requires: (c) => Object.values(c.skills).some((v) => v >= 30),
    prompt: "Another kid with a rival talent starts a friendly (or not-so-friendly) rivalry with you.",
    choices: [
      {
        label: "Lean into the rivalry",
        outcomes: [
          { chance: 0.5, text: "It pushes you to get genuinely better, faster.", deltas: { discipline: 4, happiness: 2 } },
          { chance: 0.5, text: "It gets a little too intense and stops being fun for a while.", deltas: { happiness: -4, stress: 6 } },
        ],
      },
      {
        label: "Stay focused on your own thing",
        outcomes: [{ chance: 1, text: "You don't let it get to you.", deltas: { discipline: 2 } }],
      },
    ],
  },
  {
    id: "any_age_deja_vu_moment",
    minAge: 10,
    maxAge: 99,
    weight: 1,
    repeatable: true,
    prompt: "You have an overwhelming sense of déjà vu about a completely ordinary moment.",
    outcomes: [
      { chance: 1, text: "It passes as quickly as it came, but it sticks with you for the rest of the day.", deltas: { happiness: 1 } },
    ],
  },
  {
    id: "adult_coworker_becomes_friend",
    minAge: 20,
    maxAge: 65,
    weight: 3,
    repeatable: true,
    requires: (c) => !!c.career.job,
    prompt: "A coworker invites you out after work, and it turns into a real friendship.",
    outcomes: [
      { chance: 1, text: "Work feels a lot less like just work these days.", deltas: { happiness: 5, socialSkill: 2 } },
    ],
  },
  {
    id: "any_age_power_outage",
    minAge: 8,
    maxAge: 99,
    weight: 2,
    repeatable: true,
    prompt: "A storm knocks the power out for the whole neighborhood.",
    choices: [
      {
        label: "Make the best of it",
        outcomes: [{ chance: 1, text: "Candles, board games, good company. Surprisingly nice, actually.", deltas: { happiness: 5 } }],
      },
      {
        label: "Complain the whole time",
        outcomes: [{ chance: 1, text: "It's just an inconvenient, annoying night.", deltas: { happiness: -2 } }],
      },
    ],
  },
];
