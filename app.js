const copyButtons = document.querySelectorAll("[data-copy]");

for (const button of copyButtons) {
  button.addEventListener("click", async () => {
    const source = button.dataset.copyTarget
      ? document.getElementById(button.dataset.copyTarget)
      : null;
    const value = source?.textContent.trim() || button.dataset.copy;
    const copyLabel = button.dataset.copyLabel ?? "Command";
    const status = button.closest(".terminal-shell")?.querySelector(".copy-status");

    try {
      if (!value) throw new Error("No copyable content was found.");
      await navigator.clipboard.writeText(value);
      if (status) status.textContent = `${copyLabel} copied to clipboard.`;
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

const installTabs = [...document.querySelectorAll('[role="tab"][aria-controls]')];

function selectInstallTab(selectedTab, moveFocus = false) {
  for (const tab of installTabs) {
    const selected = tab === selectedTab;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute("aria-controls"));
    if (panel) panel.hidden = !selected;
  }

  if (moveFocus) selectedTab.focus();
}

for (const [index, tab] of installTabs.entries()) {
  tab.addEventListener("click", () => selectInstallTab(tab));
  tab.addEventListener("keydown", (event) => {
    let targetIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") targetIndex = (index + 1) % installTabs.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") targetIndex = (index - 1 + installTabs.length) % installTabs.length;
    if (event.key === "Home") targetIndex = 0;
    if (event.key === "End") targetIndex = installTabs.length - 1;
    if (targetIndex === undefined) return;
    event.preventDefault();
    selectInstallTab(installTabs[targetIndex], true);
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
