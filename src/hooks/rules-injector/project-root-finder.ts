import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { PROJECT_MARKERS } from "./constants";

/**
 * Find project root by walking up from startPath.
 * Checks for PROJECT_MARKERS (.git, pyproject.toml, package.json, etc.)
 *
 * @param startPath - Starting path to search from (file or directory)
 * @param stopAt - Optional highest directory to inspect before stopping
 * @returns Project root path or null if not found
 */
export function findProjectRoot(
  startPath: string,
  stopAt?: string
): string | null {
  let current: string;
  const resolvedStop = stopAt ? resolve(stopAt) : undefined;

  try {
    const stat = statSync(startPath);
    current = stat.isDirectory() ? startPath : dirname(startPath);
  } catch {
    current = dirname(startPath);
  }

  while (true) {
    for (const marker of PROJECT_MARKERS) {
      const markerPath = join(current, marker);
      if (existsSync(markerPath)) {
        return current;
      }
    }

    if (resolvedStop && resolve(current) === resolvedStop) {
      return null;
    }

    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}
