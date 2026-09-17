// Career system: job listings gated by education/smarts/age, applying,
// automatic salary + promotion/firing risk each year, quitting.

const JOBS = [
  { id: "fast_food", title: "Fast Food Worker", category: "Service", minEducation: "none", minSmarts: 0, minAge: 15, salary: 17000 },
  { id: "cashier", title: "Grocery Cashier", category: "Service", minEducation: "none", minSmarts: 0, minAge: 16, salary: 19000 },
  { id: "dog_walker", title: "Professional Dog Walker", category: "Service", minEducation: "none", minSmarts: 10, minAge: 15, salary: 21000 },
  { id: "office_assistant", title: "Office Assistant", category: "Office", minEducation: "high_grad", minSmarts: 35, minAge: 18, salary: 29000 },
  { id: "sales_associate", title: "Sales Associate", category: "Office", minEducation: "high_grad", minSmarts: 30, minAge: 18, salary: 31000 },
  { id: "line_cook", title: "Line Cook", category: "Service", minEducation: "high_grad", minSmarts: 25, minAge: 18, salary: 27000 },
  { id: "truck_driver", title: "Truck Driver", category: "Trade", minEducation: "high_grad", minSmarts: 30, minAge: 21, salary: 42000 },
  { id: "electrician", title: "Electrician", category: "Trade", minEducation: "high_grad", minSmarts: 45, minAge: 20, salary: 52000 },
  { id: "accountant", title: "Accountant", category: "Business", minEducation: "college_grad", minSmarts: 55, minAge: 22, salary: 55000, preferredMajor: "business" },
  { id: "software_dev", title: "Software Developer", category: "Tech", minEducation: "college_grad", minSmarts: 70, minAge: 22, salary: 78000, preferredMajor: "computer_science" },
  { id: "civil_engineer", title: "Civil Engineer", category: "Engineering", minEducation: "college_grad", minSmarts: 68, minAge: 22, salary: 72000, preferredMajor: "engineering" },
  { id: "teacher", title: "Teacher", category: "Education", minEducation: "college_grad", minSmarts: 55, minAge: 22, salary: 46000, preferredMajor: "education" },
  { id: "nurse", title: "Nurse", category: "Medical", minEducation: "college_grad", minSmarts: 60, minAge: 22, salary: 61000, preferredMajor: "biology" },
  { id: "art_director", title: "Art Director", category: "Creative", minEducation: "college_grad", minSmarts: 40, minAge: 22, salary: 58000, preferredMajor: "art" },
  { id: "professional_taste_tester", title: "Professional Nacho Taste-Tester", category: "Absurd", minEducation: "college_grad", minSmarts: 20, minAge: 22, salary: 39000, preferredMajor: "culinary" },
  { id: "lawyer", title: "Lawyer", category: "Legal", minEducation: "grad_grad", minSmarts: 80, minAge: 25, salary: 98000, preferredMajor: "law_prelaw" },
  { id: "doctor", title: "Doctor", category: "Medical", minEducation: "grad_grad", minSmarts: 85, minAge: 26, salary: 155000, preferredMajor: "biology" },
  { id: "cto", title: "Chief Technology Officer", category: "Tech", minEducation: "grad_grad", minSmarts: 85, minAge: 30, salary: 210000, preferredMajor: "computer_science" },
];

const EDU_RANK = { none: 0, elementary: 0, middle: 0, high: 0, dropout: 0, high_grad: 1, college: 1, dropout_college: 1, college_grad: 2, grad: 2, grad_grad: 3 };

function meetsJobRequirements(character, job) {
  const eduRank = EDU_RANK[character.education.stage] ?? 0;
  const reqRank = EDU_RANK[job.minEducation] ?? 0;
  return (
    character.age >= job.minAge &&
    character.stats.smarts >= job.minSmarts &&
    eduRank >= reqRank
  );
}

function openJobActivity(character) {
  if (!character || !character.alive) return;

  if (character.jail.yearsLeft > 0) {
    logEvent(character, character.age, `${character.name} can't exactly job-hunt from behind bars.`);
    renderGame();
    return;
  }

  if (character.career.job) {
    const job = character.career.job;
    openChoiceModal(
      `You work as a ${job.title}, earning $${job.salary.toLocaleString()}/yr.`,
      [
        { label: "Ask for a raise", action: "raise" },
        { label: "Work extra hard", action: "grind" },
        { label: "Quit", action: "quit" },
        { label: "Never mind", action: "cancel" },
      ],
      (choice) => {
        if (choice.action === "raise") {
          const chance = 0.25 + character.stats.smarts / 300 + character.career.yearsAtJob * 0.03;
          if (Math.random() < chance) {
            const bump = Math.round(job.salary * (0.05 + Math.random() * 0.1));
            job.salary += bump;
            character.stats.happiness = clampStat(character.stats.happiness + 6);
            logEvent(character, character.age, `${character.name} got a raise! Now earning $${job.salary.toLocaleString()}/yr.`);
          } else {
            character.stats.happiness = clampStat(character.stats.happiness - 4);
            logEvent(character, character.age, `${character.name} asked for a raise and got turned down flat.`);
          }
        } else if (choice.action === "grind") {
          character.stats.happiness = clampStat(character.stats.happiness - 5);
          character.stats.smarts = clampStat(character.stats.smarts + 2);
          character.money += Math.round(job.salary * 0.02);
          logEvent(character, character.age, `${character.name} worked overtime and pocketed a little extra.`);
        } else if (choice.action === "quit") {
          logEvent(character, character.age, `${character.name} quit the ${job.title} job on the spot.`);
          character.career.job = null;
          character.career.yearsAtJob = 0;
        } else {
          return;
        }
        renderGame();
      }
    );
    return;
  }

  const listings = JOBS.filter((j) => meetsJobRequirements(character, j));
  if (listings.length === 0) {
    logEvent(character, character.age, `${character.name} checked job listings but doesn't qualify for anything yet.`);
    renderGame();
    return;
  }

  openChoiceModal(
    "Job listings you qualify for:",
    [
      ...listings.map((j) => ({
        label: `${j.title} — $${j.salary.toLocaleString()}/yr`,
        action: "apply",
        job: j,
      })),
      { label: "Not right now", action: "cancel" },
    ],
    (choice) => {
      if (choice.action !== "apply") return;
      const job = choice.job;
      let chance = 0.4 + (character.stats.smarts - job.minSmarts) / 200 + character.stats.looks / 400;
      if (job.preferredMajor && character.education.major === job.preferredMajor) chance += 0.2;
      chance = Math.max(0.1, Math.min(0.95, chance));

      if (Math.random() < chance) {
        character.career.job = { ...job };
        character.career.yearsAtJob = 0;
        character.stats.happiness = clampStat(character.stats.happiness + 8);
        logEvent(character, character.age, `${character.name} got hired as a ${job.title}!`);
      } else {
        character.stats.happiness = clampStat(character.stats.happiness - 3);
        logEvent(character, character.age, `${character.name} interviewed for ${job.title} but didn't get it.`);
      }
      renderGame();
    }
  );
}

// Runs automatically at the start of every age-up while employed: pays
// salary, and rolls a small chance of a promotion or getting fired.
function runCareerYear(character) {
  const job = character.career.job;
  if (!job) return;

  character.career.yearsAtJob += 1;
  character.money += job.salary;
  logEvent(character, character.age, `${character.name} earned $${job.salary.toLocaleString()} working as a ${job.title}.`);

  if (character.stats.happiness < 15 && Math.random() < 0.2) {
    logEvent(character, character.age, `${character.name} was fired from the ${job.title} job for poor performance.`);
    character.career.job = null;
    character.career.yearsAtJob = 0;
    return;
  }

  if (character.career.yearsAtJob >= 3 && Math.random() < 0.08) {
    const bump = Math.round(job.salary * 0.15);
    job.salary += bump;
    character.stats.happiness = clampStat(character.stats.happiness + 5);
    logEvent(character, character.age, `${character.name} was promoted! Salary bumped to $${job.salary.toLocaleString()}/yr.`);
    character.career.yearsAtJob = 0;
  }
}
