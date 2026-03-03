# Makefile build vs copy in oh-my-open-code project

Purpose: Document why a copy-only Makefile approach is insufficient, why dist artifacts are needed, and how to structure a Makefile-driven workflow that orchestrates bun commands without replacing compile steps.

## Step 2: Full documentation content

### 1) Why copy-only via Makefile is insufficient in this project
- Copy-only strategies neglect the actual compilation, bundling, and typechecking required by the codebase.
- The project relies on Bun-based tooling and TypeScript/Bun build steps that emit artifacts in dist; simply copying files cannot guarantee correct builds or runtime parity.
- Build artifacts must be reproducible across environments, not just present in source trees.

### 2) Why dist artifacts are required
- Dist contains the compiled/bundled outputs that the runtime expects to execute, package, or install.
- Relying on dist ensures stable entry points (CLI, bin, and runtime modules) that do not require a full dev environment to run.
- Dist enables predictable distribution and reduces platform-specific edge cases during consumption.

### 3) package.json files field impact (dist, bin, postinstall.mjs)
- files: The files field controls what is published to npm; include dist and bin so built artifacts and CLI wrappers are shipped.
- dist: The compiled distribution directory. If not published, consumers will receive only source files and cannot run the built output.
- bin: Maps CLI entry points to the executable scripts in dist; ensures `npm install` exposes the expected CLI commands.
- postinstall.mjs: If present, can run postinstall steps (e.g., performing a local build or installing additional assets). It can fail in environments without Bun or with restricted network access, so guard or condition its execution.

### 4) Recommended approach: Makefile orchestrates bun commands, does not replace compile
- The Makefile should orchestrate Bun-based commands (build, test, install-local) and coordinate steps that produce dist, rather than bypass or replace them.
- The Makefile should not attempt to compile by copying; it should trigger the actual compile steps and then collect artifacts as needed for distribution.
- This preserves reproducibility and avoids diverging environments between development and production.

### 5) Suggested targets
- make build: invokes Bun-based build to produce dist artifacts.
- make test-target: runs tests against the built/distributed outputs (where applicable).
- make install-local: installs local dependencies using Bun or npm as appropriate, ensuring the local environment matches the distribution requirements.

### 6) Troubleshooting note
- The current environment may fail on resolution or type-check of @opencode-ai/sdk, due to module resolution or type definitions.
- Ensure Bun and the required Node.js/npm tooling are installed, and that dependencies are properly installed before attempting builds.
- If resolution fails, fall back to a minimal local build path or adjust type resolution in tsconfig.json as a debugging step.

### 7) Decision summary
- YES: Use a Makefile-driven orchestration to coordinate bun commands for build/test/install-local.
- NO: Do not rely solely on copying dist artifacts; this is fragile and impedes reproducible builds.
- YES: Publish dist and bin via package.json files field to enable correct distribution of built artifacts.
- NO: Do not ship nonessential dev-only files in published packages; ensure files field includes only necessary outputs.

## Decision matrix (YES/NO)
- Use Makefile orchestration: YES
- Copy-only dist: NO
- Publish dist via package.json: YES
- Ship postinstall logic that may fail in restricted environments: CAUTION/NO (guarded)
