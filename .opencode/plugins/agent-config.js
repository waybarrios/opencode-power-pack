import { readFileSync } from "fs";
import path from "path";

const AGENT_NAMES = ["code-explorer", "code-architect", "code-reviewer"];
const READ_ONLY_PERMISSION = {
  "*": "deny",
  read: {
    "*": "allow",
    "*.env": "deny",
    "*.env.*": "deny",
    "*.env.example": "allow",
  },
  glob: "allow",
  grep: "allow",
  list: "allow",
  edit: "deny",
  task: "deny",
  webfetch: "deny",
  websearch: "deny",
  external_directory: "deny",
};
const REVIEW_BASH_PERMISSION = {
  "*": "deny",
  "git status*": "allow",
  "git diff*": "allow",
  "git show*": "allow",
  "git log*": "allow",
  "git blame*": "allow",
  "git rev-parse*": "allow",
  "git merge-base*": "allow",
  "git ls-files*": "allow",
  "git *--output*": "deny",
  "git *--ext-diff*": "deny",
  "git *>*": "deny",
};

function readSkill(skillsDir, name) {
  const source = readFileSync(path.join(skillsDir, name, "SKILL.md"), "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`Invalid frontmatter in ${name}/SKILL.md`);

  const description = match[1]
    .split(/\r?\n/)
    .find((line) => line.startsWith("description:"))
    ?.slice("description:".length)
    .trim();
  if (!description) throw new Error(`Missing description in ${name}/SKILL.md`);

  return { description, prompt: match[2].trim() };
}

export function loadAgentConfigs(skillsDir) {
  return Object.fromEntries(AGENT_NAMES.map((name) => {
    const skill = readSkill(skillsDir, name);
    const permission = name === "code-reviewer"
      ? { ...READ_ONLY_PERMISSION, bash: REVIEW_BASH_PERMISSION }
      : { ...READ_ONLY_PERMISSION, bash: "deny" };

    return [name, {
      ...skill,
      mode: "subagent",
      permission,
    }];
  }));
}
