#!/usr/bin/env bun

import { resolve } from "node:path"

export const ISOLATED_TEST_TARGETS = [
  "src/plugin-handlers",
  "src/hooks/atlas",
  "src/hooks/compaction-context-injector",
  "src/features/tmux-subagent",
  "src/cli/doctor/formatter.test.ts",
  "src/cli/doctor/format-default.test.ts",
  "src/tools/call-omo-agent/sync-executor.test.ts",
  "src/tools/call-omo-agent/session-creator.test.ts",
  "src/tools/session-manager",
  "src/features/opencode-skill-loader/loader.test.ts",
  "src/hooks/anthropic-context-window-limit-recovery/recovery-hook.test.ts",
  "src/hooks/anthropic-context-window-limit-recovery/executor.test.ts",
  "src/hooks/anthropic-context-window-limit-recovery/summarize-retry-strategy.test.ts",
  "src/hooks/auto-update-checker/checker/pinned-version-updater.test.ts",
  "src/hooks/auto-update-checker/checker/plugin-entry.test.ts",
  "src/hooks/read-image-resizer/hook.test.ts",
  "src/plugin/event.model-fallback.test.ts",
] as const

const TEST_FILE_GLOB = "{bin,script,src}/**/*.test.{ts,tsx,js,jsx}"

export function isCoveredByTestTarget(
  testFile: string,
  target: string,
): boolean {
  return target.includes(".test.")
    ? testFile === target
    : testFile.startsWith(`${target}/`)
}

export function isCoveredByIsolatedTarget(testFile: string): boolean {
  return ISOLATED_TEST_TARGETS.some((target) =>
    isCoveredByTestTarget(testFile, target)
  )
}

export async function discoverTestFiles(repositoryRoot: string): Promise<string[]> {
  const glob = new Bun.Glob(TEST_FILE_GLOB)
  const testFiles: string[] = []

  for await (const testFile of glob.scan({ cwd: repositoryRoot, onlyFiles: true })) {
    testFiles.push(testFile)
  }

  return testFiles.sort()
}

export async function discoverRemainingTestFiles(repositoryRoot: string): Promise<string[]> {
  const testFiles = await discoverTestFiles(repositoryRoot)
  return testFiles.filter((testFile) => !isCoveredByIsolatedTarget(testFile))
}

export function getTestGroupKey(testFile: string): string {
  const segments = testFile.split("/")

  if (segments[0] !== "src") return segments[0] ?? testFile
  if (segments.length <= 2) return "src/_root"

  const area = segments[1]
  const boundary = segments[2]
  if (!area || !boundary || boundary.includes(".test.")) return `src/${area}/_root`

  return `src/${area}/${boundary}`
}

export function groupTestFiles(testFiles: readonly string[]): string[][] {
  const groups = new Map<string, string[]>()

  for (const testFile of testFiles) {
    const key = getTestGroupKey(testFile)
    const group = groups.get(key) ?? []
    group.push(testFile)
    groups.set(key, group)
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, group]) => group.sort())
}

export function buildCiTestCommands(remainingTestFiles: readonly string[]): string[][] {
  return [
    ...ISOLATED_TEST_TARGETS.map((target) => ["bun", "test", target]),
    ...groupTestFiles(remainingTestFiles).map((group) => ["bun", "test", ...group]),
  ]
}

export async function runCiTests(): Promise<number> {
  const repositoryRoot = resolve(import.meta.dir, "..")
  const allTestFiles = await discoverTestFiles(repositoryRoot)
  const remainingTestFiles = allTestFiles.filter(
    (testFile) => !isCoveredByIsolatedTarget(testFile),
  )
  const commands = buildCiTestCommands(remainingTestFiles)

  console.log(
    `Discovered ${allTestFiles.length} test files across ${commands.length} isolated processes.`,
  )

  for (const command of commands) {
    console.log(`\n$ ${command.join(" ")}`)
    const child = Bun.spawn(command, {
      cwd: repositoryRoot,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    })
    const exitCode = await child.exited
    if (exitCode !== 0) return exitCode
  }

  return 0
}

if (import.meta.main) {
  process.exitCode = await runCiTests()
}
