import {
  KEYWORD_DETECTORS,
  CODE_BLOCK_PATTERN,
  INLINE_CODE_PATTERN,
  type KeywordDetectorType,
  MAX_KEYWORD_DETECTION_CHARS,
} from "./constants"

export interface DetectedKeyword {
  type: KeywordDetectorType
  message: string
}

function clampDetectionInput(text: string): string {
  return text.length > MAX_KEYWORD_DETECTION_CHARS
    ? text.slice(0, MAX_KEYWORD_DETECTION_CHARS)
    : text
}

export function removeCodeBlocks(text: string): string {
  return text.replace(CODE_BLOCK_PATTERN, "").replace(INLINE_CODE_PATTERN, "")
}

/**
 * Resolves message to string, handling both static strings and dynamic functions.
 */
function resolveMessage(
  message: string | ((agentName?: string, modelID?: string) => string),
  agentName?: string,
  modelID?: string
): string {
  return typeof message === "function" ? message(agentName, modelID) : message
}

export function detectKeywords(text: string, agentName?: string, modelID?: string): string[] {
  const clamped = clampDetectionInput(text)
  const textWithoutCode = removeCodeBlocks(clamped)
  return KEYWORD_DETECTORS
    .filter(({ pattern }) => pattern.test(textWithoutCode))
    .map(({ message }) => resolveMessage(message, agentName, modelID))
}

export function detectKeywordsWithType(text: string, agentName?: string, modelID?: string): DetectedKeyword[] {
  const clamped = clampDetectionInput(text)
  const textWithoutCode = removeCodeBlocks(clamped)
  return KEYWORD_DETECTORS
    .map(({ type, pattern, message }) => ({
      matches: pattern.test(textWithoutCode),
      type,
      message: resolveMessage(message, agentName, modelID),
    }))
    .filter((result) => result.matches)
    .map(({ type, message }) => ({ type, message }))
}

export function extractPromptText(
  parts: Array<{ type: string; text?: string }>
): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text || "")
    .join(" ")
}
