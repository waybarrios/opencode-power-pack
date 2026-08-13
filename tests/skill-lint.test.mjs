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

const skillsDir = join(REPO, "skills");
const names = readdirSync(skillsDir).filter((n) =>
  existsSync(join(skillsDir, n, "SKILL.md"))
);
let catalogMetadataCharacters = 0;

for (const name of names) {
  const skill = parse(readFileSync(join(skillsDir, name, "SKILL.md"), "utf8"));

  test(`${name}: SKILL.md frontmatter`, () => {
    assert.ok(skill.hasFrontmatter, "has YAML frontmatter");
    assert.equal(skill.fm.name, name, "name matches the directory");
    assert.match(skill.fm.name ?? "", NAME_RE, "name matches the slug regex");
    const d = skill.fm.description ?? "";
    assert.ok(d.length >= 1 && d.length <= 600, `description length 1..600 (is ${d.length})`);
    assert.ok((skill.fm.license ?? "").length > 0, "license present");
  });

  catalogMetadataCharacters += name.length + (skill.fm.description ?? "").length;

  test(`${name}: SKILL.md body under 500 lines`, () => {
    assert.ok(skill.body.split(/\r?\n/).length < 500);
  });

  test(`${name}: descriptions not truncated`, () => {
    assert.match((skill.fm.description ?? "").trim(), SENTENCE_END, "SKILL.md description not truncated");
  });

  test(`${name}: no duplicated block`, () => {
    const check = (label, text) => {
      const seen = new Set();
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.replace(/\s+$/, "");
        if (line.trim().length >= 50) {
          assert.ok(!seen.has(line), `${label} repeats a line verbatim: "${line.slice(0, 60)}..."`);
          seen.add(line);
        }
      }
    };
    check("SKILL.md", readFileSync(join(skillsDir, name, "SKILL.md"), "utf8"));
  });
}

test("skill catalog stays within the phase-one routing budget", () => {
  assert.ok(
    catalogMetadataCharacters <= 15_500,
    `name and description metadata is ${catalogMetadataCharacters} characters (budget 15500)`,
  );
});
