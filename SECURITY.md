# Security Policy

## Supported versions

Security fixes are applied to the latest published release and the `main`
branch. Older releases should be upgraded before reporting a version-specific
problem.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting flow for this repository:

<https://github.com/waybarrios/opencode-power-pack/security/advisories/new>

Include the affected version, host agent and operating system, reproduction
steps, expected security boundary, observed behavior, and any minimal proof of
concept needed to validate the report. Do not include real credentials,
personal data, or secrets.

Please do not open a public issue for an undisclosed vulnerability. You can
expect an initial acknowledgement within seven days. We will coordinate
validation, remediation, release timing, and public disclosure through the
private advisory.

## Scope

Reports about sandbox boundary bypasses, credential exposure, unsafe package
installation, plugin loading, or workflow permission escalation are in scope.
The sandbox runner is currently documented as `shell-contained`; unrelated
host-native tools are not claimed to be isolated until host adapters land.
