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
          { chance: 0.5, text: "You get a little tipsy and have a hilarious night.", deltas: { happiness: 6, health: -3 } },
          { chance: 0.5, text: "You overdo it and wake up with a brutal hangover.", deltas: { happiness: -4, health: -8 } },
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
];
