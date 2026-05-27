import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.REPO || process.cwd();
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SENTENCE_END = /[.!?"'\)\]]$/;

function parse(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  const fm = {};
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const i = line.indexOf(":");
      if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return { fm, body: m ? m[2] : md, hasFrontmatter: !!m };
}

const norm = (s) => s.replace(/\s+/g, " ").trim();

const skillsDir = join(REPO, "skills");
const names = readdirSync(skillsDir).filter((n) =>
  existsSync(join(skillsDir, n, "SKILL.md"))
);

for (const name of names) {
  const skill = parse(readFileSync(join(skillsDir, name, "SKILL.md"), "utf8"));
  const cmdPath = join(REPO, "commands", `${name}.md`);

  test(`${name}: SKILL.md frontmatter`, () => {
    assert.ok(skill.hasFrontmatter, "has YAML frontmatter");
    assert.equal(skill.fm.name, name, "name matches the directory");
    assert.match(skill.fm.name ?? "", NAME_RE, "name matches the slug regex");
    const d = skill.fm.description ?? "";
    assert.ok(d.length >= 1 && d.length <= 1024, `description length 1..1024 (is ${d.length})`);
    assert.ok((skill.fm.license ?? "").length > 0, "license present");
  });

  test(`${name}: SKILL.md body under 500 lines`, () => {
    assert.ok(skill.body.split(/\r?\n/).length < 500);
  });

  test(`${name}: command in sync with SKILL.md`, () => {
    assert.ok(existsSync(cmdPath), `commands/${name}.md exists`);
    const cmd = parse(readFileSync(cmdPath, "utf8"));
    assert.equal(cmd.fm.description, skill.fm.description, "description identical skill<->command");
    assert.ok(norm(cmd.body).includes(norm(skill.body)), "command inlines the SKILL.md body");
    assert.match(cmd.body, /\$ARGUMENTS\s*$/, "command ends with $ARGUMENTS");
  });

  test(`${name}: descriptions not truncated`, () => {
    assert.match((skill.fm.description ?? "").trim(), SENTENCE_END, "SKILL.md description not truncated");
    const cmd = parse(readFileSync(cmdPath, "utf8"));
    assert.match((cmd.fm.description ?? "").trim(), SENTENCE_END, "command description not truncated");
  });
}
