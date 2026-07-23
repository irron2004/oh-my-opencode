import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import {
  buildCiTestCommands,
  discoverRemainingTestFiles,
  discoverTestFiles,
  groupTestFiles,
  ISOLATED_TEST_TARGETS,
  isCoveredByIsolatedTarget,
  isCoveredByTestTarget,
} from "./test-ci"

describe("CI test runner", () => {
  const repositoryRoot = resolve(import.meta.dir, "..")

  test("keeps mock-heavy targets in one Bun process each", async () => {
    const remainingTestFiles = await discoverRemainingTestFiles(repositoryRoot)
    const commands = buildCiTestCommands(remainingTestFiles)

    expect(commands).toEqual([
      ...ISOLATED_TEST_TARGETS.map((target) => ["bun", "test", target]),
      ...groupTestFiles(remainingTestFiles).map((group) => ["bun", "test", ...group]),
    ])
  })

  test("assigns every repository test file exactly once", async () => {
    const allTestFiles = await discoverTestFiles(repositoryRoot)
    const isolatedTestFiles = ISOLATED_TEST_TARGETS.flatMap((target) =>
      allTestFiles.filter((testFile) => isCoveredByTestTarget(testFile, target))
    )
    const remainingTestFiles = await discoverRemainingTestFiles(repositoryRoot)
    const assignedTestFiles = [...isolatedTestFiles, ...remainingTestFiles]

    expect(assignedTestFiles.length).toBe(allTestFiles.length)
    expect(new Set(assignedTestFiles).size).toBe(allTestFiles.length)
    expect(assignedTestFiles.sort()).toEqual(allTestFiles)
    expect(allTestFiles.every((testFile) => existsSync(resolve(repositoryRoot, testFile)))).toBe(true)
  })

  test("keeps every explicit isolation target live", async () => {
    const allTestFiles = await discoverTestFiles(repositoryRoot)

    for (const target of ISOLATED_TEST_TARGETS) {
      const matchingFiles = allTestFiles.filter((testFile) =>
        isCoveredByTestTarget(testFile, target)
      )

      expect(matchingFiles.length).toBeGreaterThan(0)
    }
  })
})
