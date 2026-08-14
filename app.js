const copyButtons = document.querySelectorAll("[data-copy]");

for (const button of copyButtons) {
  button.addEventListener("click", async () => {
    const value = button.dataset.copy;
    const status = button.closest(".terminal-shell")?.querySelector(".copy-status");

    try {
      await navigator.clipboard.writeText(value);
      if (status) status.textContent = "Command copied to clipboard.";
      const label = button.querySelector("b") ?? button;
      const original = label.textContent;
      label.textContent = "Copied";
      window.setTimeout(() => {
        label.textContent = original;
        if (status) status.textContent = "";
      }, 1800);
    } catch {
      if (status) status.textContent = "Copy failed. Select the command manually.";
    }
  });
}

const filter = document.querySelector("#skill-filter");
const skills = [...document.querySelectorAll("[data-skill]")];
const filterStatus = document.querySelector("#filter-status");
const skillGroups = [...document.querySelectorAll(".skill-reference-group")];
const filterEmpty = document.querySelector("#skill-filter-empty");

filter?.addEventListener("input", () => {
  const query = filter.value.trim().toLowerCase();
  let visible = 0;

  for (const skill of skills) {
    const matches = skill.dataset.skill.includes(query);
    skill.hidden = !matches;
    if (matches) visible += 1;
  }

  for (const group of skillGroups) {
    group.hidden = !group.querySelector("[data-skill]:not([hidden])");
  }

  if (filterEmpty) filterEmpty.hidden = visible !== 0;

  filterStatus.textContent = query
    ? `Showing ${visible} matching ${visible === 1 ? "skill" : "skills"}`
    : `Showing all ${skills.length} skills`;
});

function alignHashTarget() {
  if (!window.location.hash) return;
  const id = decodeURIComponent(window.location.hash.slice(1));
  const target = document.getElementById(id);
  if (!target) return;

  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  target.scrollIntoView({ block: "start" });
  root.style.scrollBehavior = previousBehavior;
}

if (window.location.hash) {
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  fontsReady.then(() => window.requestAnimationFrame(alignHashTarget));
}

window.addEventListener("hashchange", () => window.requestAnimationFrame(alignHashTarget));
