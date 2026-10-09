// Root entrypoint for OpenCode V2 directory-form plugin registration.
//
// OpenCode V2 hosts (2.0.4 or later) require config plugin entries to be
// directories with an index entrypoint (`index.js`) and reject bare file paths
// ("configured plugin path must be a directory"). npm/Git package installs
// resolve via package.json `main`; this file only serves the directory form, an
// absolute path such as `"plugins": ["/path/to/opencode-power-pack"]`.
//
// The same dual V1/V2 pattern is used by the superpowers plugin:
// https://github.com/obra/superpowers
export { default } from "./.opencode/plugins/opencode-power-pack.js";
