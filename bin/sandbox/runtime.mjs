import { randomUUID } from "node:crypto";
import { spawn as nodeSpawn } from "node:child_process";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
} from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SANDBOX_RUNTIME_PACKAGE = "@anthropic-ai/sandbox-runtime";
export const SANDBOX_RUNTIME_VERSION = "0.0.73";
export const SANDBOX_EXECUTION_LEVEL = "shell-contained";

const SUPPORTED_PLATFORMS = new Set(["linux", "darwin"]);
const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const PROTECTED_ENVIRONMENT = new Set([
  "BASH_ENV",
  "ENV",
  "HOME",
  "NODE_OPTIONS",
  "PATH",
  "SHELL",
  "TMP",
  "TMPDIR",
  "TEMP",
  "ZDOTDIR",
]);
const SAFE_ENVIRONMENT = new Set([
  "COLORTERM",
  "FORCE_COLOR",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "NO_COLOR",
  "TERM",
  "TZ",
]);
let sandboxExecutionActive = false;

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function unique(values) {
  return [...new Set(values)];
}

function isEnvironmentName(name) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function assertEnvironmentName(name) {
  if (!isEnvironmentName(name)) {
    throw new Error(`Invalid environment variable name: ${name}`);
  }
  if (PROTECTED_ENVIRONMENT.has(name) || /^(?:DYLD_|LD_)/.test(name)) {
    throw new Error(`Sandbox control variable cannot be granted: ${name}`);
  }
}

export function quotePosixArgument(value) {
  if (value.includes("\0")) throw new Error("Command arguments cannot contain NUL bytes.");
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export function commandToShellString(command) {
  if (!Array.isArray(command) || command.length === 0 || command[0] === "") {
    throw new Error("sandbox exec requires a non-empty command after --.");
  }
  return command.map(quotePosixArgument).join(" ");
}

export function buildChildEnvironment({ sourceEnvironment, allowedEnvironment, workspace, runRoot }) {
  const childEnvironment = {
    HOME: path.join(runRoot, "home"),
    PATH: unique(
      (sourceEnvironment.PATH || "")
        .split(path.delimiter)
        .filter((entry) => entry && path.isAbsolute(entry))
        .map((entry) => path.resolve(entry))
        .filter((entry) => !isWithin(workspace, entry)),
    ).join(path.delimiter),
    SHELL: "/bin/sh",
    TMP: path.join(runRoot, "tmp"),
    TMPDIR: path.join(runRoot, "tmp"),
    TEMP: path.join(runRoot, "tmp"),
    XDG_CACHE_HOME: path.join(runRoot, "cache"),
    XDG_CONFIG_HOME: path.join(runRoot, "config"),
    XDG_DATA_HOME: path.join(runRoot, "data"),
  };

  for (const name of SAFE_ENVIRONMENT) {
    if (sourceEnvironment[name] !== undefined) childEnvironment[name] = sourceEnvironment[name];
  }
  for (const name of unique(allowedEnvironment)) {
    assertEnvironmentName(name);
    if (sourceEnvironment[name] === undefined) {
      throw new Error(`Requested environment variable is not set: ${name}`);
    }
    childEnvironment[name] = sourceEnvironment[name];
  }
  return childEnvironment;
}

function workspaceCredentialPaths(workspace) {
  const relativePaths = [
    ".env",
    ".env.local",
    ".aws",
    path.join(".config", "gh"),
    path.join(".config", "gcloud"),
    path.join(".docker", "config.json"),
    ".git-credentials",
    path.join(".kube", "config"),
    ".netrc",
    ".npmrc",
    ".pypirc",
    ".ssh",
  ];
  return unique([
    ...relativePaths.map((relativePath) => path.join(workspace, relativePath)),
    path.join(workspace, "**", ".env"),
    path.join(workspace, "**", ".env.*"),
    ...relativePaths.slice(2).map((relativePath) => path.join(workspace, "**", relativePath)),
  ]);
}

function credentialFiles(workspace, originalHome, additionalWorkspaceRoots = []) {
  return unique([
    path.join(originalHome, ".ssh"),
    path.join(originalHome, ".aws"),
    path.join(originalHome, ".config", "gh"),
    path.join(originalHome, ".config", "gcloud"),
    path.join(originalHome, ".docker", "config.json"),
    path.join(originalHome, ".git-credentials"),
    path.join(originalHome, ".kube", "config"),
    path.join(originalHome, ".netrc"),
    path.join(originalHome, ".npmrc"),
    path.join(originalHome, ".pypirc"),
    ...unique([workspace, ...additionalWorkspaceRoots]).flatMap(workspaceCredentialPaths),
  ]).map((filePath) => ({ path: filePath, mode: "deny" }));
}

function unsafeSharedWriteRoots(originalHome, temporaryRoot) {
  return unique([
    path.join(originalHome, ".claude", "debug"),
    path.join(originalHome, ".npm", "_logs"),
    path.join(temporaryRoot, "claude"),
    "/tmp/claude",
    "/private/tmp/claude",
  ]);
}

function protectedWritePaths(
  workspace,
  originalHome,
  temporaryRoot,
  additionalPaths = [],
  additionalWorkspaceRoots = [],
) {
  return unique([
    ...unsafeSharedWriteRoots(originalHome, temporaryRoot),
    ...workspaceCredentialPaths(workspace),
    path.join(workspace, ".agents"),
    path.join(workspace, ".claude"),
    path.join(workspace, ".codex"),
    path.join(workspace, ".git", "config"),
    path.join(workspace, ".git", "hooks"),
    path.join(workspace, ".opencode"),
    path.join(workspace, ".pi"),
    ...additionalWorkspaceRoots.flatMap(workspaceCredentialPaths),
    ...additionalPaths,
  ]);
}

export function compileSandboxExecution({
  profile,
  workspace,
  runRoot,
  sourceEnvironment,
  allowedDomains = [],
  allowedEnvironment = [],
  confirmExternalSideEffects = false,
  originalHome = os.homedir(),
  temporaryRoot = os.tmpdir(),
  platform = process.platform,
  helperPaths = {},
  readOnlySocksProxyPort,
  readDenyPaths = [path.parse(path.resolve(workspace)).root],
  readAllowPaths = [workspace, runRoot],
  additionalDenyWritePaths = [],
  additionalCredentialRoots = [],
}) {
  if (!profile?.capabilities) throw new Error("A resolved sandbox profile is required.");
  const capabilities = profile.capabilities;
  const domains = unique(allowedDomains);
  const environmentNames = unique(allowedEnvironment);

  if (domains.length > 0 && capabilities.network !== "explicit") {
    throw new Error(`Profile ${profile.name} does not permit network grants.`);
  }
  if (environmentNames.length > 0 && capabilities.credentials !== "explicit") {
    throw new Error(`Profile ${profile.name} does not permit credential grants.`);
  }
  if (capabilities.externalSideEffects === "confirm" && !confirmExternalSideEffects) {
    throw new Error(`Profile ${profile.name} requires --confirm-external-side-effects.`);
  }
  if (capabilities.externalSideEffects === "deny" && confirmExternalSideEffects) {
    throw new Error(`Profile ${profile.name} does not permit external side-effect confirmation.`);
  }
  if (profile.name === "network-read" && domains.length > 0 && !readOnlySocksProxyPort) {
    throw new Error("network-read requires a fail-closed raw-network guard.");
  }

  for (const name of environmentNames) assertEnvironmentName(name);
  const childEnvironment = buildChildEnvironment({
    sourceEnvironment,
    allowedEnvironment: environmentNames,
    workspace,
    runRoot,
  });
  const deniedEnvironment = Object.keys(sourceEnvironment)
    .filter((name) => isEnvironmentName(name) && !Object.hasOwn(childEnvironment, name))
    .map((name) => ({ name, mode: "deny" }));
  const workspaceWrites = capabilities.workspace === "write" ? [workspace] : [];
  const network = {
    allowedDomains: capabilities.network === "explicit" ? domains : [],
    deniedDomains: [],
    strictAllowlist: true,
    allowUnixSockets: [],
    allowAllUnixSockets: false,
    allowLocalBinding: false,
  };

  if (profile.name === "network-read" && domains.length > 0) {
    network.socksProxyPort = readOnlySocksProxyPort;
    network.tlsTerminate = {};
    network.filterRequest = async (request) => READ_ONLY_METHODS.has(request.method.toUpperCase())
      ? { action: "allow" }
      : { action: "deny", reason: "network-read permits only GET, HEAD, and OPTIONS" };
  }

  const runtimeConfig = {
    network,
    filesystem: {
      denyRead: unique(readDenyPaths),
      allowRead: unique(readAllowPaths),
      allowWrite: unique([...workspaceWrites, runRoot]),
      denyWrite: protectedWritePaths(
        workspace,
        originalHome,
        temporaryRoot,
        additionalDenyWritePaths,
        additionalCredentialRoots,
      ),
      allowGitConfig: false,
    },
    credentials: {
      files: credentialFiles(workspace, originalHome, additionalCredentialRoots),
      envVars: deniedEnvironment,
    },
    enableWeakerNestedSandbox: false,
    enableWeakerNetworkIsolation: false,
    allowAppleEvents: false,
    allowPty: false,
    mandatoryDenySearchDepth: 10,
    ...(helperPaths.rg ? { ripgrep: { command: helperPaths.rg } } : {}),
    ...(helperPaths.bwrap ? { bwrapPath: helperPaths.bwrap } : {}),
    ...(helperPaths.socat ? { socatPath: helperPaths.socat } : {}),
    ...(helperPaths.applySeccomp
      ? { seccomp: { applyPath: helperPaths.applySeccomp } }
      : {}),
  };

  return {
    childEnvironment,
    runtimeConfig,
    summary: {
      profile: profile.name,
      executionLevel: SANDBOX_EXECUTION_LEVEL,
      workspace: capabilities.workspace,
      network: domains.length > 0 ? "explicit" : "denied",
      credentials: environmentNames.length > 0 ? "explicit" : "denied",
      externalSideEffects: capabilities.externalSideEffects,
    },
  };
}

export async function existingSystemReadRoots(platform) {
  const candidates = [
    "/bin",
    "/sbin",
    "/usr/bin",
    "/usr/sbin",
    "/usr/lib",
    "/usr/lib64",
    "/usr/libexec",
    "/usr/share",
    "/usr/local/bin",
    "/usr/local/sbin",
    "/usr/local/lib",
    "/usr/local/lib64",
    "/usr/local/share",
    "/usr/local/go",
    "/usr/local/cuda",
    "/lib",
    "/lib64",
    "/etc/alternatives",
    "/etc/ca-certificates",
    "/etc/ssl",
    "/etc/pki",
    "/etc/hosts",
    "/etc/resolv.conf",
    "/etc/nsswitch.conf",
    "/etc/passwd",
    "/etc/group",
    "/etc/localtime",
    "/etc/os-release",
    "/etc/services",
    "/etc/protocols",
    "/dev/null",
    "/dev/zero",
    "/dev/random",
    "/dev/urandom",
    ...(platform === "linux" ? ["/proc", "/sys", "/nix/store", "/snap"] : []),
    ...(platform === "darwin" ? [
      "/System",
      "/opt/homebrew/bin",
      "/opt/homebrew/sbin",
      "/opt/homebrew/Cellar",
      "/opt/homebrew/opt",
      "/opt/homebrew/lib",
      "/opt/homebrew/share",
      "/usr/local/Homebrew",
      "/usr/local/Cellar",
      "/usr/local/opt",
    ] : []),
  ];
  const resolved = [];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      resolved.push(path.resolve(candidate), await realpath(candidate));
    } catch {
      // Optional system paths differ by platform and installation.
    }
  }
  return unique(resolved);
}

async function discoverRuntimeBundleRoots(executable, { workspace, originalHome, temporaryRoot }) {
  const roots = [];
  let current = path.dirname(executable);
  for (let depth = 0; depth <= 4; depth += 1) {
    if (
      current === path.parse(current).root
      || current === originalHome
      || current === temporaryRoot
      || isWithin(workspace, current)
    ) break;
    try {
      await Promise.any([
        access(path.join(current, "package.json")),
        access(path.join(current, "pyvenv.cfg")),
      ]);
      roots.push(current, await realpath(current));
      break;
    } catch {
      // Continue toward a bounded package or virtual-environment root.
    }
    current = path.dirname(current);
  }

  const localBin = path.join(originalHome, ".local", "bin");
  if (isWithin(localBin, executable)) {
    const localLibraries = path.join(originalHome, ".local", "lib");
    try {
      await access(localLibraries);
      roots.push(localLibraries, await realpath(localLibraries));
    } catch {
      // User-level Python libraries are optional.
    }
  }
  return unique(roots);
}

async function readFirstLine(filePath) {
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(4096);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead).toString("utf8").split(/\r?\n/, 1)[0];
  } finally {
    await handle.close();
  }
}

function splitShebangWords(value) {
  const words = [];
  let word = "";
  let quote;
  let escaped = false;
  let started = false;
  for (const character of value.trim()) {
    if (escaped) {
      word += character;
      escaped = false;
      started = true;
    } else if (character === "\\" && quote !== "'") {
      escaped = true;
      started = true;
    } else if (quote) {
      if (character === quote) quote = undefined;
      else word += character;
      started = true;
    } else if (character === "'" || character === '"') {
      quote = character;
      started = true;
    } else if (/\s/.test(character)) {
      if (started) {
        words.push(word);
        word = "";
        started = false;
      }
    } else {
      word += character;
      started = true;
    }
  }
  if (escaped || quote) return [];
  if (started) words.push(word);
  return words;
}

function envShebangCommand(arguments_) {
  let words = [...arguments_];
  const splitIndex = words.findIndex((word) => word === "-S" || word === "--split-string");
  if (splitIndex !== -1) words = splitShebangWords(words.slice(splitIndex + 1).join(" "));
  const optionsWithValues = new Set(["-u", "--unset", "-C", "--chdir"]);
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (word === "--") return words[index + 1];
    if (optionsWithValues.has(word)) {
      index += 1;
      continue;
    }
    if (word.startsWith("-") || /^[^=]+=/.test(word)) continue;
    return word;
  }
  return undefined;
}

async function executableReadRoots(executable, environmentPath, cwd, boundaries, depth = 0) {
  if (!executable) return [];
  const candidates = path.isAbsolute(executable)
    ? [executable]
    : executable.includes(path.sep)
      ? [path.resolve(cwd, executable)]
      : (environmentPath || "")
        .split(path.delimiter)
        .filter((directory) => directory && path.isAbsolute(directory))
        .map((directory) => path.join(directory, executable));
  for (const candidate of candidates) {
    try {
      const resolved = await realpath(candidate);
      const info = await stat(resolved);
      await access(resolved, 1);
      if (info.isFile()) {
        const roots = [
          path.resolve(candidate),
          resolved,
          ...await discoverRuntimeBundleRoots(resolved, boundaries),
        ];
        if (depth < 2) {
          const firstLine = await readFirstLine(resolved);
          if (firstLine.startsWith("#!")) {
            const shebang = splitShebangWords(firstLine.slice(2));
            const interpreter = shebang.length > 0 && path.basename(shebang[0]) === "env"
              ? envShebangCommand(shebang.slice(1))
              : shebang[0];
            if (interpreter) {
              const interpreterRoots = await executableReadRoots(
                interpreter,
                environmentPath,
                cwd,
                boundaries,
                depth + 1,
              );
              roots.push(...interpreterRoots);
            }
          }
        }
        return unique(roots);
      }
    } catch {
      // The child shell reports command-not-found when no candidate resolves.
    }
  }
  return [];
}

async function commandReadRoots(command, environmentPath, cwd, boundaries) {
  return executableReadRoots(command?.[0], environmentPath, cwd, boundaries);
}

async function readBoundedRegularFile(filePath, maximumSize, label) {
  const info = await lstat(filePath);
  if (!info.isFile() || info.size > maximumSize) {
    throw new Error(`${label} is not a bounded regular file: ${filePath}`);
  }
  return readFile(filePath, "utf8");
}

async function readSmallMetadataFile(filePath) {
  return readBoundedRegularFile(filePath, 8192, "Git metadata pointer");
}

async function findAncestorGitContext(start) {
  let current = start;
  while (true) {
    const marker = path.join(current, ".git");
    try {
      const info = await lstat(marker);
      if (info.isDirectory()) {
        const gitDirectory = await realpath(marker);
        return { workspace: current, gitDirectory, commonDirectory: gitDirectory };
      }
      if (info.isFile()) {
        const pointer = (await readSmallMetadataFile(marker)).trim().match(/^gitdir:\s*(.+)$/i);
        if (pointer) {
          const gitDirectory = await realpath(path.resolve(current, pointer[1]));
          let commonDirectory = gitDirectory;
          try {
            const commonPointer = (await readSmallMetadataFile(
              path.join(gitDirectory, "commondir"),
            )).trim();
            commonDirectory = await realpath(path.resolve(gitDirectory, commonPointer));
          } catch (error) {
            if (error?.code !== "ENOENT") throw error;
          }
          return { workspace: current, gitDirectory, commonDirectory };
        }
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

async function readGitModules(workspace) {
  const filePath = path.join(workspace, ".gitmodules");
  return readBoundedRegularFile(filePath, 1024 * 1024, "Submodule mapping");
}

function parseSubmoduleMappings(contents) {
  const mappings = [];
  let current;
  for (const line of contents.split(/\r?\n/)) {
    const section = line.match(/^\s*\[submodule\s+"([^"\\]+)"\]\s*$/);
    if (section) {
      current = { name: section[1] };
      mappings.push(current);
      continue;
    }
    const pathEntry = line.match(/^\s*path\s*=\s*(.+?)\s*$/i);
    if (current && pathEntry) current.path = pathEntry[1];
  }
  return mappings.filter((mapping) => mapping.path);
}

function parseCoreWorktree(contents) {
  let inCore = false;
  for (const line of contents.split(/\r?\n/)) {
    const section = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (section) {
      inCore = section[1].trim().toLowerCase() === "core";
      continue;
    }
    if (!inCore) continue;
    const entry = line.match(/^\s*worktree\s*=\s*(.+?)\s*$/i);
    if (entry && !/["'\\]/.test(entry[1])) return entry[1];
  }
  return undefined;
}

async function validateSubmoduleGitDirectory(workspace, gitDirectory) {
  const parent = await findAncestorGitContext(path.dirname(workspace));
  if (!parent) return false;
  const mappings = parseSubmoduleMappings(await readGitModules(parent.workspace));
  const mapping = mappings.find((candidate) => {
    if (path.isAbsolute(candidate.path)) return false;
    return path.resolve(parent.workspace, candidate.path) === workspace;
  });
  if (!mapping) return false;
  const modulesDirectory = path.join(parent.commonDirectory, "modules");
  const expectedDirectory = path.resolve(modulesDirectory, mapping.name);
  if (
    expectedDirectory === modulesDirectory
    || !isWithin(modulesDirectory, expectedDirectory)
    || await realpath(expectedDirectory) !== gitDirectory
  ) return false;
  const configContents = await readBoundedRegularFile(
    path.join(gitDirectory, "config"),
    1024 * 1024,
    "Submodule Git config",
  );
  const configuredWorktree = parseCoreWorktree(configContents);
  if (
    !configuredWorktree
    || await realpath(path.resolve(gitDirectory, configuredWorktree)) !== workspace
  ) return false;
  const [head, config, objects, refs] = await Promise.all([
    stat(path.join(gitDirectory, "HEAD")),
    stat(path.join(gitDirectory, "config")),
    stat(path.join(gitDirectory, "objects")),
    stat(path.join(gitDirectory, "refs")),
  ]);
  return head.isFile() && config.isFile() && objects.isDirectory() && refs.isDirectory();
}

function isCredentialPath(relativePath, directory) {
  const parts = relativePath.split(path.sep);
  const basename = parts.at(-1);
  const parent = parts.at(-2);
  if (basename === ".env" || basename.startsWith(".env.")) return true;
  if ([".git-credentials", ".netrc", ".npmrc", ".pypirc"].includes(basename)) return true;
  if (directory && [".aws", ".ssh"].includes(basename)) return true;
  if (parent === ".config" && ["gh", "gcloud"].includes(basename)) return true;
  if (parent === ".docker" && basename === "config.json") return true;
  return parent === ".kube" && basename === "config";
}

async function discoverExistingWorkspaceCredentialPaths(workspace) {
  const discovered = [];
  const pending = [workspace];
  while (pending.length > 0) {
    const directory = pending.pop();
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const candidate = path.join(directory, entry.name);
      const info = await lstat(candidate);
      if (info.isSymbolicLink()) continue;
      const relative = path.relative(workspace, candidate);
      const credential = isCredentialPath(relative, info.isDirectory());
      if (credential) discovered.push(candidate);
      if (
        info.isDirectory()
        && !credential
        && entry.name !== ".git"
      ) pending.push(candidate);
    }
  }
  return unique(discovered);
}

async function discoverExistingGitControlPaths(workspace) {
  const discovered = [];
  const workspaceDirectories = [workspace];
  const gitDirectories = [];
  while (workspaceDirectories.length > 0) {
    const directory = workspaceDirectories.pop();
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const candidate = path.join(directory, entry.name);
      const info = await lstat(candidate);
      if (info.isSymbolicLink()) continue;
      if (entry.name === ".git") {
        if (info.isFile()) discovered.push(candidate);
        else if (info.isDirectory()) gitDirectories.push(candidate);
        continue;
      }
      if (info.isFile() && entry.name === ".gitmodules") discovered.push(candidate);
      if (info.isDirectory()) workspaceDirectories.push(candidate);
    }
  }
  while (gitDirectories.length > 0) {
    const directory = gitDirectories.pop();
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const candidate = path.join(directory, entry.name);
      const info = await lstat(candidate);
      if (info.isSymbolicLink()) continue;
      if (info.isDirectory()) {
        if (entry.name === "hooks") discovered.push(candidate);
        else gitDirectories.push(candidate);
      } else if (
        info.isFile()
        && ["config", "config.worktree", "commondir", "gitdir"].includes(entry.name)
      ) discovered.push(candidate);
    }
  }
  return unique(discovered);
}

async function validateCommonGitDirectory(gitDirectory) {
  if (path.basename(gitDirectory) !== ".git" && !path.basename(gitDirectory).endsWith(".git")) {
    return false;
  }
  const [head, config, objects, refs] = await Promise.all([
    stat(path.join(gitDirectory, "HEAD")),
    stat(path.join(gitDirectory, "config")),
    stat(path.join(gitDirectory, "objects")),
    stat(path.join(gitDirectory, "refs")),
  ]);
  return head.isFile() && config.isFile() && objects.isDirectory() && refs.isDirectory();
}

async function discoverGitWorkspace(cwd) {
  let current = cwd;
  while (true) {
    const marker = path.join(current, ".git");
    let markerInfo;
    try {
      markerInfo = await lstat(marker);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    if (markerInfo?.isDirectory()) {
      const gitDirectory = await realpath(marker);
      return {
        workspace: current,
        readRoots: unique([marker, gitDirectory]),
        denyWritePaths: [
          path.join(gitDirectory, "config"),
          path.join(gitDirectory, "hooks"),
        ],
      };
    }
    if (markerInfo && !markerInfo.isFile()) {
      throw new Error(`Unsupported .git metadata marker: ${marker}`);
    }
    if (markerInfo?.isFile()) {
      const pointer = (await readSmallMetadataFile(marker)).trim().match(/^gitdir:\s*(.+)$/i);
      if (!pointer) throw new Error(`Invalid linked-worktree .git pointer: ${marker}`);
      const gitDirectory = await realpath(path.resolve(current, pointer[1]));
      const [commonResult, backlinkResult] = await Promise.allSettled([
        readSmallMetadataFile(path.join(gitDirectory, "commondir")),
        readSmallMetadataFile(path.join(gitDirectory, "gitdir")),
      ]);
      if (commonResult.status === "rejected" && backlinkResult.status === "rejected") {
        if (
          commonResult.reason?.code === "ENOENT"
          && backlinkResult.reason?.code === "ENOENT"
          && await validateSubmoduleGitDirectory(current, gitDirectory)
        ) {
          return {
            workspace: current,
            readRoots: unique([marker, gitDirectory]),
            denyWritePaths: [
              marker,
              path.join(gitDirectory, "config"),
              path.join(gitDirectory, "hooks"),
            ],
          };
        }
        throw new Error(`Untrusted submodule Git metadata relationship: ${marker}`);
      }
      if (commonResult.status !== "fulfilled" || backlinkResult.status !== "fulfilled") {
        throw new Error(`Incomplete linked-worktree metadata relationship: ${marker}`);
      }
      const commonDirectory = await realpath(path.resolve(gitDirectory, commonResult.value.trim()));
      const backlinkPath = path.resolve(gitDirectory, backlinkResult.value.trim());
      if (
        backlinkPath !== marker
        || !isWithin(path.join(commonDirectory, "worktrees"), gitDirectory)
        || !await validateCommonGitDirectory(commonDirectory)
      ) {
        throw new Error(`Untrusted linked-worktree metadata relationship: ${marker}`);
      }
      await access(path.join(commonDirectory, "HEAD"));
      return {
        workspace: current,
        readRoots: unique([marker, gitDirectory, commonDirectory]),
        denyWritePaths: [
          marker,
          path.join(gitDirectory, "config.worktree"),
          path.join(commonDirectory, "config"),
          path.join(commonDirectory, "hooks"),
        ],
      };
    }
    const parent = path.dirname(current);
    if (parent === current) return { workspace: cwd, readRoots: [], denyWritePaths: [] };
    current = parent;
  }
}

export async function assertNoExternalHardlinks(workspace) {
  const linkedFiles = new Map();
  const pending = [workspace];
  while (pending.length > 0) {
    const directory = pending.pop();
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const candidate = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      const info = await lstat(candidate);
      if (info.isDirectory()) {
        pending.push(candidate);
      } else if (info.isFile() && info.nlink > 1) {
        const key = `${info.dev}:${info.ino}`;
        const record = linkedFiles.get(key) || { expected: info.nlink, observed: 0, path: candidate };
        record.observed += 1;
        linkedFiles.set(key, record);
      }
    }
  }
  const external = [...linkedFiles.values()].find((record) => record.observed !== record.expected);
  if (external) {
    throw new Error(`Sandbox workspace contains an external hardlink: ${external.path}`);
  }
}

async function isTrustedExecutable(resolved, blockedRoots) {
  if (blockedRoots.some((root) => isWithin(root, resolved))) return false;
  let current = resolved;
  while (true) {
    const info = await stat(current);
    if (info.uid !== 0 || (info.mode & 0o022) !== 0) return false;
    const parent = path.dirname(current);
    if (parent === current) return true;
    current = parent;
  }
}

async function resolveExecutable(name, environmentPath, blockedRoots) {
  for (const directory of (environmentPath || "").split(path.delimiter)) {
    if (!directory || !path.isAbsolute(directory)) continue;
    const candidate = path.join(directory, name);
    try {
      const resolved = await realpath(candidate);
      await access(resolved, 1);
      const info = await stat(resolved);
      if (info.isFile() && await isTrustedExecutable(resolved, blockedRoots)) return resolved;
    } catch {
      // Continue looking through trusted absolute PATH entries.
    }
  }
  throw new Error(`Sandbox dependency not found in trusted host paths: ${name}`);
}

async function resolveHelperPaths(platform, environmentPath, blockedRoots) {
  if (platform !== "linux") return {};
  const [bwrap, rg, socat] = await Promise.all([
    resolveExecutable("bwrap", environmentPath, blockedRoots),
    resolveExecutable("rg", environmentPath, blockedRoots),
    resolveExecutable("socat", environmentPath, blockedRoots),
  ]);
  return { bwrap, rg, socat };
}

async function resolveSandboxRuntimeResources(platform, architecture = process.arch) {
  if (platform !== "linux") return {};
  const architectureDirectory = { x64: "x64", arm64: "arm64" }[architecture];
  if (!architectureDirectory) {
    throw new Error(`Sandbox seccomp helper is unsupported on architecture: ${architecture}`);
  }
  let current = path.dirname(fileURLToPath(import.meta.resolve(SANDBOX_RUNTIME_PACKAGE)));
  for (let depth = 0; depth <= 3; depth += 1) {
    const manifestPath = path.join(current, "package.json");
    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      if (
        manifest.name === SANDBOX_RUNTIME_PACKAGE
        && manifest.version === SANDBOX_RUNTIME_VERSION
      ) {
        const applySeccomp = await realpath(path.join(
          current,
          "vendor",
          "seccomp",
          architectureDirectory,
          "apply-seccomp",
        ));
        const info = await stat(applySeccomp);
        await access(applySeccomp, 1);
        if (!info.isFile()) throw new Error("Sandbox seccomp helper is not a regular file.");
        return { applySeccomp };
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(`Could not locate pinned ${SANDBOX_RUNTIME_PACKAGE} runtime resources.`);
}

async function createDenyProxy() {
  const server = createServer((socket) => socket.destroy());
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not bind raw-network guard.");
  return {
    port: address.port,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}

function spawnResult(spawn, argv, options, lifecycle = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(argv[0], argv.slice(1), options);
    const signalSource = lifecycle.signalSource || process;
    const killProcess = lifecycle.killProcess || process.kill.bind(process);
    const signalGraceMs = lifecycle.signalGraceMs ?? 5_000;
    let settled = false;
    let forwardedSignal;
    let escalationTimer;

    const killChildTree = (signal) => {
      try {
        if (Number.isInteger(child.pid)) killProcess(-child.pid, signal);
        else if (typeof child.kill === "function") child.kill(signal);
      } catch (error) {
        if (error?.code !== "ESRCH" && typeof child.kill === "function") child.kill(signal);
      }
    };
    const signalHandlers = new Map(["SIGHUP", "SIGINT", "SIGTERM"].map((signal) => [signal, () => {
      if (settled) return;
      forwardedSignal ||= signal;
      killChildTree(signal);
      if (settled) return;
      if (!escalationTimer) {
        escalationTimer = setTimeout(() => killChildTree("SIGKILL"), signalGraceMs);
        escalationTimer.unref?.();
      }
    }]));
    const cleanup = () => {
      if (escalationTimer) clearTimeout(escalationTimer);
      for (const [signal, handler] of signalHandlers) signalSource.removeListener(signal, handler);
    };
    for (const [signal, handler] of signalHandlers) signalSource.prependListener(signal, handler);

    child.once("error", (error) => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(error);
      }
    });
    child.once("close", (code, signal) => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve({ code, signal: signal || forwardedSignal });
      }
    });
  });
}

function signalExitCode(signal) {
  const number = os.constants.signals[signal];
  return Number.isInteger(number) ? 128 + number : 1;
}

const RUNTIME_CLEANUP_EVENTS = ["exit", "SIGINT", "SIGTERM"];

function snapshotRuntimeCleanupListeners(source) {
  return new Map(RUNTIME_CLEANUP_EVENTS.map((event) => [event, new Set(source.rawListeners(event))]));
}

function removeAddedRuntimeCleanupListeners(source, snapshot) {
  for (const event of RUNTIME_CLEANUP_EVENTS) {
    const previous = snapshot.get(event);
    for (const listener of source.rawListeners(event)) {
      const callback = listener.listener || listener;
      if (!previous.has(listener) && callback.name === "cleanupHandler") {
        source.removeListener(event, listener);
      }
    }
  }
}

async function defaultLoadRuntime() {
  return import(SANDBOX_RUNTIME_PACKAGE);
}

async function probeHostIsolation({ platform, cwd, env }) {
  if (platform === "linux") {
    const helpers = await resolveHelperPaths(platform, env.PATH, [
      cwd,
      await realpath(os.homedir()),
      await realpath(os.tmpdir()),
    ]);
    const result = await spawnResult(nodeSpawn, [
      helpers.bwrap,
      "--unshare-user",
      "--unshare-pid",
      "--unshare-net",
      "--ro-bind",
      "/",
      "/",
      "--dev",
      "/dev",
      "--proc",
      "/proc",
      "/bin/true",
    ], {
      cwd,
      detached: true,
      env: { PATH: env.PATH },
      shell: false,
      stdio: "ignore",
    });
    return result.code === 0 && !result.signal
      ? { errors: [], warnings: [] }
      : { errors: ["bubblewrap cannot create the required user and network namespaces"], warnings: [] };
  }
  const result = await spawnResult(nodeSpawn, [
    "/usr/bin/sandbox-exec",
    "-p",
    "(version 1)(allow default)",
    "/usr/bin/true",
  ], {
    cwd,
    detached: true,
    env: { PATH: env.PATH },
    shell: false,
    stdio: "ignore",
  });
  return result.code === 0 && !result.signal
    ? { errors: [], warnings: [] }
    : { errors: ["macOS sandbox-exec preflight failed"], warnings: [] };
}

export async function probeSandboxRuntime({
  loadRuntime = defaultLoadRuntime,
  platform = process.platform,
  cwd = process.cwd(),
  env = process.env,
  architecture = process.arch,
  hostProbe = probeHostIsolation,
  resourceProbe = resolveSandboxRuntimeResources,
} = {}) {
  const backend = `${SANDBOX_RUNTIME_PACKAGE}@${SANDBOX_RUNTIME_VERSION}`;
  if (!SUPPORTED_PLATFORMS.has(platform)) {
    return {
      backend,
      runnerReady: false,
      executionLevel: "advisory",
      errors: [`Unsupported platform for this adapter: ${platform}`],
      warnings: [],
    };
  }
  try {
    const { SandboxManager } = await loadRuntime();
    if (!SandboxManager.isSupportedPlatform()) {
      return {
        backend,
        runnerReady: false,
        executionLevel: "advisory",
        errors: ["Sandbox runtime does not support this host."],
        warnings: [],
      };
    }
    const dependencies = await SandboxManager.checkDependenciesAsync();
    const [host] = dependencies.errors.length === 0
      ? await Promise.all([
        hostProbe({ platform, cwd: await realpath(cwd), env }),
        resourceProbe(platform, architecture),
      ])
      : [{ errors: [], warnings: [] }];
    const errors = [...dependencies.errors, ...host.errors];
    const warnings = [...dependencies.warnings, ...host.warnings];
    return {
      backend,
      runnerReady: errors.length === 0,
      executionLevel: errors.length === 0 ? SANDBOX_EXECUTION_LEVEL : "advisory",
      errors,
      warnings,
    };
  } catch (error) {
    return {
      backend,
      runnerReady: false,
      executionLevel: "advisory",
      errors: [error.message],
      warnings: [],
    };
  }
}

async function runSandboxedCommandOnce(options, context = {}) {
  const platform = context.platform || process.platform;
  if (!SUPPORTED_PLATFORMS.has(platform)) {
    throw new Error(`Sandbox execution is unsupported on platform: ${platform}`);
  }

  const executionCwd = await realpath(context.cwd || process.cwd());
  const gitWorkspace = await discoverGitWorkspace(executionCwd);
  const workspace = gitWorkspace.workspace;
  const workspaceInfo = await stat(workspace);
  if (!workspaceInfo.isDirectory()) throw new Error("Sandbox workspace must be a directory.");
  const originalHome = await realpath(context.home || os.homedir());
  const temporaryRoot = await realpath(context.temporaryRoot || os.tmpdir());
  if (
    workspace === path.parse(workspace).root
    || workspace === originalHome
    || workspace === temporaryRoot
  ) {
    throw new Error("Refusing to use a filesystem root, home, or shared temp directory as the sandbox workspace.");
  }
  if (unsafeSharedWriteRoots(originalHome, temporaryRoot)
    .some((unsafeRoot) => isWithin(path.resolve(unsafeRoot), workspace))) {
    throw new Error("Refusing to use an upstream protected shared-write path as the sandbox workspace.");
  }
  await assertNoExternalHardlinks(workspace);
  const [existingCredentialPaths, existingGitControlPaths] = await Promise.all([
    discoverExistingWorkspaceCredentialPaths(workspace),
    discoverExistingGitControlPaths(workspace),
  ]);

  const sourceEnvironment = context.env || process.env;
  const [containmentHelpers, runtimeResources, systemReadRoots, executableReadRoots] = await Promise.all([
    context.helperPaths || resolveHelperPaths(
      platform,
      sourceEnvironment.PATH,
      [workspace, originalHome, temporaryRoot],
    ),
    resolveSandboxRuntimeResources(platform, context.architecture),
    existingSystemReadRoots(platform),
    commandReadRoots(options.command, sourceEnvironment.PATH, executionCwd, {
      workspace,
      originalHome,
      temporaryRoot,
    }),
  ]);
  const helperPaths = { ...containmentHelpers, ...runtimeResources };
  const allowedReadRoots = unique([
    ...systemReadRoots,
    ...executableReadRoots,
    ...Object.values(runtimeResources),
  ]);
  const runRoot = await realpath(await mkdtemp(path.join(temporaryRoot, "opp-sandbox-")));
  let denyProxy;
  let manager;
  let childResult;
  let operationError;

  try {
    for (const directory of ["home", "tmp", "cache", "config", "data"]) {
      await mkdir(path.join(runRoot, directory), { mode: 0o700 });
    }
    if (options.profile.name === "network-read" && options.allowedDomains.length > 0) {
      denyProxy = await createDenyProxy();
    }
    const compiled = compileSandboxExecution({
      ...options,
      workspace,
      runRoot,
      sourceEnvironment,
      originalHome,
      temporaryRoot,
      platform,
      helperPaths,
      readOnlySocksProxyPort: denyProxy?.port,
      readDenyPaths: [path.parse(workspace).root],
      readAllowPaths: unique([
        workspace,
        runRoot,
        ...gitWorkspace.readRoots,
        ...allowedReadRoots,
      ]),
      additionalDenyWritePaths: unique([
        ...gitWorkspace.denyWritePaths,
        ...existingCredentialPaths,
        ...existingGitControlPaths,
      ]),
      additionalCredentialRoots: executionCwd === workspace ? [] : [executionCwd],
    });
    context.writeError?.(
      `Sandbox: ${compiled.summary.profile}, ${compiled.summary.executionLevel}, `
      + `workspace ${compiled.summary.workspace}, network ${compiled.summary.network}\n`,
    );

    const runtime = await (context.loadRuntime || defaultLoadRuntime)();
    manager = runtime.SandboxManager;
    if (!manager.isSupportedPlatform()) throw new Error("Sandbox runtime does not support this host.");
    const runtimeConfig = runtime.SandboxRuntimeConfigSchema.parse(compiled.runtimeConfig);
    const runtimeSignalSource = context.runtimeSignalSource || process;
    const cleanupListenerSnapshot = snapshotRuntimeCleanupListeners(runtimeSignalSource);
    try {
      await manager.initialize(runtimeConfig);
    } finally {
      removeAddedRuntimeCleanupListeners(runtimeSignalSource, cleanupListenerSnapshot);
    }

    const previousTemp = process.env.CLAUDE_CODE_TMPDIR;
    process.env.CLAUDE_CODE_TMPDIR = path.join(runRoot, "tmp");
    let descriptor;
    try {
      descriptor = await manager.wrapWithSandboxArgv(
        commandToShellString(options.command),
        "/bin/sh",
        undefined,
        undefined,
        executionCwd,
        { commandId: randomUUID(), commandText: options.command[0] },
      );
    } finally {
      if (previousTemp === undefined) delete process.env.CLAUDE_CODE_TMPDIR;
      else process.env.CLAUDE_CODE_TMPDIR = previousTemp;
    }

    childResult = await spawnResult(context.spawn || nodeSpawn, descriptor.argv, {
      cwd: executionCwd,
      detached: true,
      env: compiled.childEnvironment,
      shell: false,
      stdio: "inherit",
    }, {
      signalSource: context.signalSource,
      killProcess: context.killProcess,
      signalGraceMs: context.signalGraceMs,
    });
  } catch (error) {
    operationError = error;
  }

  const cleanupErrors = [];
  if (manager) {
    try {
      await manager.reset();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (denyProxy) {
    try {
      await denyProxy.close();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  try {
    await rm(runRoot, { recursive: true, force: true });
  } catch (error) {
    cleanupErrors.push(error);
  }

  if (operationError && cleanupErrors.length > 0) {
    throw new AggregateError([operationError, ...cleanupErrors], "Sandbox execution and cleanup failed.");
  }
  if (operationError) throw operationError;
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, "Sandbox cleanup failed.");
  }
  if (childResult.signal) return signalExitCode(childResult.signal);
  return Number.isInteger(childResult.code) ? childResult.code : 1;
}

export async function runSandboxedCommand(options, context = {}) {
  if (sandboxExecutionActive) {
    throw new Error("Another sandbox command is already active in this process.");
  }
  sandboxExecutionActive = true;
  try {
    return await runSandboxedCommandOnce(options, context);
  } finally {
    sandboxExecutionActive = false;
  }
}
