// Education system. Stage advances automatically with age (checked once
// per age-up from main.js); the School activity button offers whatever
// decision makes sense for the character's current stage.

const SCHOOL_STAGES = {
  elementary: { minAge: 5, maxAge: 10, label: "Elementary School" },
  middle: { minAge: 11, maxAge: 13, label: "Middle School" },
  high: { minAge: 14, maxAge: 17, label: "High School" },
};

const COLLEGE_MAJORS = [
  { id: "undeclared", label: "Undeclared", minSmarts: 0, tuition: 8000 },
  { id: "business", label: "Business", minSmarts: 40, tuition: 12000 },
  { id: "computer_science", label: "Computer Science", minSmarts: 60, tuition: 14000 },
  { id: "engineering", label: "Engineering", minSmarts: 65, tuition: 15000 },
  { id: "biology", label: "Biology (Pre-Med)", minSmarts: 65, tuition: 16000 },
  { id: "art", label: "Fine Art", minSmarts: 20, tuition: 9000 },
  { id: "education", label: "Education", minSmarts: 45, tuition: 9000 },
  { id: "law_prelaw", label: "Pre-Law", minSmarts: 60, tuition: 13000 },
  { id: "culinary", label: "Competitive Nacho Studies", minSmarts: 15, tuition: 7000 },
];

// Advances education.stage purely off age, called at the start of every
// age-up before any activity/event choices are offered.
function advanceEducation(character) {
  const edu = character.education;
  const age = character.age;

  if (edu.dropout) return;

  if (edu.stage === "none" && age >= SCHOOL_STAGES.elementary.minAge) {
    edu.stage = "elementary";
    logEvent(character, age, `${character.name} started elementary school.`);
  } else if (edu.stage === "elementary" && age > SCHOOL_STAGES.elementary.maxAge) {
    edu.stage = "middle";
    logEvent(character, age, `${character.name} moved up to middle school.`);
  } else if (edu.stage === "middle" && age > SCHOOL_STAGES.middle.maxAge) {
    edu.stage = "high";
    logEvent(character, age, `${character.name} started high school.`);
  } else if (edu.stage === "high" && age > SCHOOL_STAGES.high.maxAge) {
    edu.stage = "high_grad";
    if (edu.gpa >= 60) {
      logEvent(character, age, `${character.name} graduated high school with a ${edu.gpa}% GPA.`);
    } else {
      logEvent(character, age, `${character.name} barely scraped by and graduated high school.`);
    }
  } else if (edu.stage === "college") {
    edu.yearsInStage += 1;
    if (edu.yearsInStage >= 4) {
      edu.stage = "college_grad";
      logEvent(character, age, `${character.name} graduated college with a degree in ${majorLabel(edu.major)}!`);
      character.stats.smarts = clampStat(character.stats.smarts + 8);
    }
  } else if (edu.stage === "grad") {
    edu.yearsInStage += 1;
    if (edu.yearsInStage >= 2) {
      edu.stage = "grad_grad";
      logEvent(character, age, `${character.name} earned a graduate degree in ${majorLabel(edu.major)}.`);
      character.stats.smarts = clampStat(character.stats.smarts + 10);
    }
  }
}

function majorLabel(id) {
  const m = COLLEGE_MAJORS.find((x) => x.id === id);
  return m ? m.label : "General Studies";
}

function openSchoolActivity(character) {
  if (!character || !character.alive) return;
  const edu = character.education;

  if (edu.stage === "none") {
    logEvent(character, character.age, `${character.name} is too young for school.`);
    renderGame();
    return;
  }

  if (["elementary", "middle", "high"].includes(edu.stage)) {
    openChoiceModal(
      `${SCHOOL_STAGES[edu.stage].label} — how's it going?`,
      [
        { label: "Study hard", action: "study" },
        { label: "Slack off", action: "slack" },
        ...(character.age >= 16 && edu.stage === "high" ? [{ label: "Drop out", action: "dropout" }] : []),
        { label: "Never mind", action: "cancel" },
      ],
      (choice) => {
        if (choice.action === "study") {
          const gain = randInt(2, 6);
          edu.gpa = clampStat(edu.gpa + gain);
          character.stats.smarts = clampStat(character.stats.smarts + randInt(1, 3));
          character.stats.happiness = clampStat(character.stats.happiness - 1);
          logEvent(character, character.age, `${character.name} hit the books hard. GPA is now ${edu.gpa}%.`);
        } else if (choice.action === "slack") {
          edu.gpa = clampStat(edu.gpa - randInt(2, 8));
          character.stats.happiness = clampStat(character.stats.happiness + randInt(2, 5));
          logEvent(character, character.age, `${character.name} slacked off all semester. GPA dropped to ${edu.gpa}%.`);
        } else if (choice.action === "dropout") {
          edu.dropout = true;
          edu.stage = "dropout";
          character.flags.hasRecord = character.flags.hasRecord || false;
          character.stats.happiness = clampStat(character.stats.happiness + 5);
          character.stats.smarts = clampStat(character.stats.smarts - 5);
          logEvent(character, character.age, `${character.name} dropped out of high school. Bold move.`);
        } else {
          return;
        }
        renderGame();
      }
    );
    return;
  }

  if (edu.stage === "high_grad" || edu.stage === "dropout") {
    if (edu.stage === "dropout") {
      logEvent(character, character.age, `${character.name} can't go to college without a diploma.`);
      renderGame();
      return;
    }
    const options = COLLEGE_MAJORS.filter((m) => character.stats.smarts >= m.minSmarts).map((m) => ({
      label: `${m.label} — $${m.tuition.toLocaleString()}/yr`,
      action: "enroll",
      major: m,
    }));
    openChoiceModal(
      "Ready to apply to college? Pick a major:",
      [...options, { label: "Not right now", action: "cancel" }],
      (choice) => {
        if (choice.action !== "enroll") return;
        if (character.money < choice.major.tuition) {
          logEvent(character, character.age, `${character.name} couldn't afford tuition for ${choice.major.label}. Maybe next year.`);
          renderGame();
          return;
        }
        character.money -= choice.major.tuition;
        edu.stage = "college";
        edu.major = choice.major.id;
        edu.yearsInStage = 0;
        logEvent(character, character.age, `${character.name} enrolled in college to study ${choice.major.label}.`);
        renderGame();
      }
    );
    return;
  }

  if (edu.stage === "college") {
    openChoiceModal(
      `Studying ${majorLabel(edu.major)}, year ${edu.yearsInStage + 1} of 4.`,
      [
        { label: "Study hard", action: "study" },
        { label: "Party instead", action: "party" },
        { label: "Drop out", action: "dropout" },
        { label: "Never mind", action: "cancel" },
      ],
      (choice) => {
        if (choice.action === "study") {
          edu.gpa = clampStat(edu.gpa + randInt(2, 6));
          character.stats.smarts = clampStat(character.stats.smarts + randInt(1, 4));
          logEvent(character, character.age, `${character.name} pulled an all-nighter at the library. GPA: ${edu.gpa}%.`);
        } else if (choice.action === "party") {
          edu.gpa = clampStat(edu.gpa - randInt(3, 9));
          character.stats.happiness = clampStat(character.stats.happiness + randInt(4, 9));
          logEvent(character, character.age, `${character.name} partied instead of studying. Worth it? GPA: ${edu.gpa}%.`);
        } else if (choice.action === "dropout") {
          edu.dropout = true;
          edu.stage = "dropout_college";
          logEvent(character, character.age, `${character.name} dropped out of college to "find themselves."`);
        } else {
          return;
        }
        renderGame();
      }
    );
    return;
  }

  if (edu.stage === "college_grad") {
    openChoiceModal(
      "You have a college degree. Consider grad school?",
      [
        { label: "Apply to grad school ($20,000/yr)", action: "grad" },
        { label: "Enter the workforce", action: "cancel" },
      ],
      (choice) => {
        if (choice.action !== "grad") return;
        if (character.money < 20000) {
          logEvent(character, character.age, `${character.name} can't afford grad school right now.`);
          renderGame();
          return;
        }
        character.money -= 20000;
        edu.stage = "grad";
        edu.yearsInStage = 0;
        logEvent(character, character.age, `${character.name} started grad school in ${majorLabel(edu.major)}.`);
        renderGame();
      }
    );
    return;
  }

  logEvent(character, character.age, `${character.name} has no further schooling to pursue right now.`);
  renderGame();
}
