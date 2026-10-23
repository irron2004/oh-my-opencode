export const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g
export const INLINE_CODE_PATTERN = /`[^`]+`/g

export type KeywordDetectorType = "ultrawork" | "search" | "ultra-research" | "analyze"

export const MAX_KEYWORD_DETECTION_CHARS = 20_000

// Re-export from submodules
export { isPlannerAgent, getUltraworkMessage } from "./ultrawork"
export { SEARCH_PATTERN, SEARCH_MESSAGE } from "./search"
export { ULTRA_RESEARCH_PATTERN, ULTRA_RESEARCH_MESSAGE } from "./ultra-research"
export { ANALYZE_PATTERN, ANALYZE_MESSAGE } from "./analyze"

import { getUltraworkMessage } from "./ultrawork"
import { SEARCH_PATTERN, SEARCH_MESSAGE } from "./search"
import { ULTRA_RESEARCH_PATTERN, ULTRA_RESEARCH_MESSAGE } from "./ultra-research"
import { ANALYZE_PATTERN, ANALYZE_MESSAGE } from "./analyze"

export type KeywordDetector = {
  type: KeywordDetectorType
  pattern: RegExp
  message: string | ((agentName?: string, modelID?: string) => string)
}

export const KEYWORD_DETECTORS: KeywordDetector[] = [
  {
    type: "ultrawork",
    pattern: /\b(ultrawork|ulw)\b/i,
    message: getUltraworkMessage,
  } satisfies KeywordDetector,
  {
    type: "search",
    pattern: SEARCH_PATTERN,
    message: SEARCH_MESSAGE,
  } satisfies KeywordDetector,
  {
    type: "ultra-research",
    pattern: ULTRA_RESEARCH_PATTERN,
    message: ULTRA_RESEARCH_MESSAGE,
  } satisfies KeywordDetector,
  {
    type: "analyze",
    pattern: ANALYZE_PATTERN,
    message: ANALYZE_MESSAGE,
  } satisfies KeywordDetector,
]
