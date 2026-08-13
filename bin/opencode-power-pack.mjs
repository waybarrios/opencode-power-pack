#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = `OpenCode Power Pack selective skill installer

Usage:
  npx @waybarrios/opencode-power-pack list
  npx @waybarrios/opencode-power-pack install <skill...> [options]
  npx @waybarrios/opencode-power-pack install --profile <name> [options]
  npx @waybarrios/opencode-power-pack install --all [options]

Options:
  --profile <name>  Install a curated profile. Repeatable.
  --all             Install every bundled skill.
  --project         Install into ./.agents/skills for this repository.
  --global          Install into ~/.agents/skills. This is the default.
  --force           Replace an existing skill directory with rollback on failure.
  --dry-run         Show what would change without writing files.
  -h, --help        Show this help.

The .agents/skills location is shared by Codex, OpenCode, and Pi.`;

async function pathExists(target) {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export async function resolveProjectRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (await pathExists(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("--project requires running inside a Git repository.");
    }
    current = parent;
  }
}

export async function loadCatalog(packageRoot = PACKAGE_ROOT) {
  const source = await readFile(path.join(packageRoot, "skillsets.json"), "utf8");
  return JSON.parse(source);
}

export async function discoverSkills(packageRoot = PACKAGE_ROOT) {
  const skillsRoot = path.join(packageRoot, "skills");
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(skillsRoot, entry.name, "SKILL.md");
    if (!(await pathExists(skillFile))) continue;
    const source = await readFile(skillFile, "utf8");
    const description = source
      .match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]
      .split(/\r?\n/)
      .find((line) => line.startsWith("description:"))
      ?.slice("description:".length)
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2");
    skills.push({ name: entry.name, description: description || "" });
  }

  return skills.sort((left, right) => left.name.localeCompare(right.name));
}

export function resolveSelection({ skillNames = [], profileNames = [], all = false }, catalog, availableNames) {
  const available = new Set(availableNames);
  const selected = new Set(all ? availableNames : skillNames);

  for (const profileName of profileNames) {
    const profile = catalog.profiles[profileName];
    if (!profile) {
      throw new Error(`Unknown profile: ${profileName}`);
    }
    for (const skillName of profile.skills) selected.add(skillName);
  }

  if (selected.size === 0) {
    throw new Error("Choose at least one skill, profile, or --all.");
  }

  const pending = [...selected];
  while (pending.length > 0) {
    const skillName = pending.pop();
    if (!available.has(skillName)) {
      throw new Error(`Unknown skill: ${skillName}`);
    }
    for (const dependency of catalog.dependencies[skillName] || []) {
      if (!selected.has(dependency)) {
        selected.add(dependency);
        pending.push(dependency);
      }
    }
  }

  return [...selected].sort((left, right) => left.localeCompare(right));
}

async function replaceDirectoryWithRollback(source, destination, force, packageRoot) {
  const parent = path.dirname(destination);
  const name = path.basename(destination);
  const lock = `${destination}.opp-lock`;
  try {
    await mkdir(lock);
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(
        `Another installation is updating ${name}. If no installer is running, remove ${lock}.`,
      );
    }
    throw error;
  }

  let stagingRoot;
  let staged;
  let backup;
  let operationError;
  const warnings = [];

  try {
    stagingRoot = await mkdtemp(path.join(parent, `.opp-${name}-`));
    staged = path.join(stagingRoot, name);
    await cp(source, staged, { recursive: true, errorOnExist: true, force: false });
    await cp(path.join(packageRoot, "UPSTREAMS.json"), path.join(staged, "UPSTREAMS.json"));
    await cp(
      path.join(packageRoot, "THIRD_PARTY_NOTICES.md"),
      path.join(staged, "THIRD_PARTY_NOTICES.md"),
    );
    await cp(path.join(packageRoot, "LICENSES"), path.join(staged, "LICENSES"), { recursive: true });
    if (force && await pathExists(destination)) {
      backup = path.join(parent, `.opp-backup-${name}-${randomUUID()}`);
      await rename(destination, backup);
    }

    try {
      await rename(staged, destination);
    } catch (error) {
      if (backup && !(await pathExists(destination))) {
        try {
          await rename(backup, destination);
          backup = undefined;
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            [
              `Could not promote ${name} or restore its backup at ${backup}.`,
              `Promotion failed: ${error.message}`,
              `Rollback failed: ${rollbackError.message}`,
            ].join(" "),
          );
        }
      }
      throw error;
    }

    if (backup) {
      try {
        await rm(backup, { recursive: true, force: true });
      } catch (error) {
        warnings.push(`Installed ${name}, but could not remove backup ${backup}: ${error.message}`);
      }
    }
  } catch (error) {
    operationError = error;
  }

  if (stagingRoot) {
    try {
      await rm(stagingRoot, { recursive: true, force: true });
    } catch (error) {
      if (operationError) {
        operationError = new AggregateError(
          [operationError, error],
          `Installation and staging cleanup both failed for ${name}.`,
        );
      } else {
        warnings.push(`Installed ${name}, but could not remove staging directory ${stagingRoot}: ${error.message}`);
      }
    }
  }

  try {
    await rm(lock, { recursive: true, force: true });
  } catch (error) {
    if (operationError) {
      operationError = new AggregateError(
        [operationError, error],
        `Installation and lock cleanup both failed for ${name}. Lock: ${lock}`,
      );
    } else {
      warnings.push(`Installed ${name}, but could not remove lock ${lock}: ${error.message}`);
    }
  }

  if (operationError) throw operationError;
  return warnings;
}

export async function installSkills({
  skillNames,
  destination,
  force = false,
  dryRun = false,
  packageRoot = PACKAGE_ROOT,
}) {
  if (!dryRun) await mkdir(destination, { recursive: true });
  const results = [];

  for (const skillName of skillNames) {
    const source = path.join(packageRoot, "skills", skillName);
    const target = path.join(destination, skillName);
    const exists = await pathExists(target);

    if (exists && !force) {
      results.push({ name: skillName, status: "skipped" });
      continue;
    }
    if (dryRun) {
      results.push({ name: skillName, status: exists ? "would-update" : "would-install" });
      continue;
    }

    const warnings = await replaceDirectoryWithRollback(source, target, force, packageRoot);
    results.push({
      name: skillName,
      status: exists ? "updated" : "installed",
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  }

  return results;
}

function parseInstallArgs(args) {
  const options = {
    skillNames: [],
    profileNames: [],
    all: false,
    force: false,
    dryRun: false,
    scope: "global",
  };
  let explicitScope;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--profile") {
      const profileName = args[index + 1];
      if (!profileName || profileName.startsWith("-")) {
        throw new Error("--profile requires a profile name.");
      }
      options.profileNames.push(profileName);
      index += 1;
    } else if (value === "--all") {
      options.all = true;
    } else if (value === "--force") {
      options.force = true;
    } else if (value === "--dry-run") {
      options.dryRun = true;
    } else if (value === "--project" || value === "--global") {
      const scope = value.slice(2);
      if (explicitScope && explicitScope !== scope) {
        throw new Error("Choose only one of --project or --global.");
      }
      explicitScope = scope;
      options.scope = scope;
    } else if (value === "--help" || value === "-h") {
      options.help = true;
    } else if (value.startsWith("-")) {
      throw new Error(`Unknown option: ${value}`);
    } else {
      options.skillNames.push(value);
    }
  }

  return options;
}

function printCatalog(catalog, skills, write) {
  write("Profiles:\n");
  for (const [name, profile] of Object.entries(catalog.profiles)) {
    write(`  ${name.padEnd(16)} ${profile.description}\n`);
  }
  write("\nSkills:\n");
  for (const skill of skills) {
    write(`  ${skill.name.padEnd(42)} ${skill.description}\n`);
  }
}

export async function main(args = process.argv.slice(2), context = {}) {
  const write = context.write || ((text) => process.stdout.write(text));
  const cwd = context.cwd || process.cwd();
  const home = context.home || os.homedir();
  const packageRoot = context.packageRoot || PACKAGE_ROOT;
  const [command = "help", ...rest] = args;

  if (command === "help" || command === "--help" || command === "-h") {
    write(`${USAGE}\n`);
    return 0;
  }

  const catalog = await loadCatalog(packageRoot);
  const skills = await discoverSkills(packageRoot);

  if (command === "list") {
    if (rest.length > 0) throw new Error(`Unknown list option: ${rest[0]}`);
    printCatalog(catalog, skills, write);
    return 0;
  }
  if (command !== "install") throw new Error(`Unknown command: ${command}`);

  const options = parseInstallArgs(rest);
  if (options.help) {
    write(`${USAGE}\n`);
    return 0;
  }
  const selected = resolveSelection(options, catalog, skills.map((skill) => skill.name));
  const destination = options.scope === "project"
    ? path.join(await resolveProjectRoot(cwd), ".agents", "skills")
    : path.join(home, ".agents", "skills");
  const results = await installSkills({
    skillNames: selected,
    destination,
    force: options.force,
    dryRun: options.dryRun,
    packageRoot,
  });

  write(`${options.dryRun ? "Plan for" : "Selected"} ${results.length} skill(s) in ${destination}\n`);
  for (const result of results) {
    write(`  ${result.status.padEnd(13)} ${result.name}\n`);
    for (const warning of result.warnings || []) write(`  warning       ${warning}\n`);
  }
  if (!options.dryRun) {
    write("Restart your agent if the new skills do not appear automatically.\n");
  }
  return 0;
}

export function isDirectInvocation(argvEntry, moduleUrl = import.meta.url) {
  if (!argvEntry) return false;
  try {
    return fileURLToPath(moduleUrl) === realpathSync(argvEntry);
  } catch {
    return false;
  }
}

const invokedDirectly = isDirectInvocation(process.argv[1]);

if (invokedDirectly) {
  main().catch((error) => {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  });
}
