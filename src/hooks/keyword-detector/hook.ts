import type { PluginInput } from "@opencode-ai/plugin"
import { detectKeywordsWithType, extractPromptText } from "./detector"
import { isPlannerAgent } from "./constants"
import type { KeywordDetectorType } from "./constants"
import { log } from "../../shared"
import {
  isSystemDirective,
  removeSystemReminders,
} from "../../shared/system-directive"
import {
  getMainSessionID,
  getSessionAgent,
  subagentSessions,
} from "../../features/claude-code-session-state"
import type { ContextCollector } from "../../features/context-injector"

const MAX_TRACKED_SESSIONS = 500
const injectedModesBySession = new Map<string, Set<KeywordDetectorType>>()

export function _resetKeywordDetectorForTesting(): void {
  injectedModesBySession.clear()
}

function getInjectedModes(sessionID: string): Set<KeywordDetectorType> {
  const existing = injectedModesBySession.get(sessionID)
  if (existing) {
    return existing
  }

  if (injectedModesBySession.size >= MAX_TRACKED_SESSIONS) {
    const oldestKey = injectedModesBySession.keys().next().value as string | undefined
    if (oldestKey) {
      injectedModesBySession.delete(oldestKey)
    }
  }

  const set = new Set<KeywordDetectorType>()
  injectedModesBySession.set(sessionID, set)
  return set
}

export function createKeywordDetectorHook(ctx: PluginInput, _collector?: ContextCollector) {
  return {
    "chat.message": async (
      input: {
        sessionID: string
        agent?: string
        model?: { providerID: string; modelID: string }
        messageID?: string
      },
      output: {
        message: Record<string, unknown>
        parts: Array<{ type: string; text?: string; [key: string]: unknown }>
      }
    ): Promise<void> => {
      const promptText = extractPromptText(output.parts)

      if (isSystemDirective(promptText)) {
        log(`[keyword-detector] Skipping system directive message`, { sessionID: input.sessionID })
        return
      }

      const currentAgent = getSessionAgent(input.sessionID) ?? input.agent

      // Remove system-reminder content to prevent automated system messages from triggering mode keywords
      const cleanText = removeSystemReminders(promptText)

      const isSlashCommandMessage = cleanText.trimStart().startsWith("/")
      if (isSlashCommandMessage) {
        return
      }

      const modelID = input.model?.modelID
      let detectedKeywords = detectKeywordsWithType(cleanText, currentAgent, modelID)

      if (isPlannerAgent(currentAgent)) {
        detectedKeywords = detectedKeywords.filter((k) => k.type !== "ultrawork")
      }

      if (detectedKeywords.length === 0) {
        return
      }

      // Skip keyword detection for background task sessions to prevent mode injection
      // (e.g., [analyze-mode]) which incorrectly triggers Prometheus restrictions
      const isBackgroundTaskSession = subagentSessions.has(input.sessionID)
      if (isBackgroundTaskSession) {
        return
      }

      const mainSessionID = getMainSessionID()
      const isNonMainSession = mainSessionID && input.sessionID !== mainSessionID

      if (isNonMainSession) {
        detectedKeywords = detectedKeywords.filter((k) => k.type === "ultrawork" || k.type === "ultra-research")
        if (detectedKeywords.length === 0) {
          log(`[keyword-detector] Skipping non-ultrawork/non-ultra-research keywords in non-main session`, {
            sessionID: input.sessionID,
            mainSessionID,
          })
          return
        }
      }

      const hasUltrawork = detectedKeywords.some((k) => k.type === "ultrawork")
      const hasUltraResearch = detectedKeywords.some((k) => k.type === "ultra-research")

      if (hasUltraResearch) {
        detectedKeywords = detectedKeywords.filter((k) => k.type !== "search" && k.type !== "analyze")
      }

      const textPartIndex = output.parts.findIndex((p) => p.type === "text" && p.text !== undefined)
      if (textPartIndex === -1) {
        log(`[keyword-detector] No text part found, skipping injection`, { sessionID: input.sessionID })
        return
      }

      const alreadyInjected = getInjectedModes(input.sessionID)
      const toInject = detectedKeywords.filter((k) => !alreadyInjected.has(k.type))
      if (toInject.length === 0) {
        return
      }

      const injectUltrawork = toInject.some((k) => k.type === "ultrawork")
      const injectUltraResearch = toInject.some((k) => k.type === "ultra-research")

      if (injectUltrawork) {
        log(`[keyword-detector] Ultrawork mode activated`, { sessionID: input.sessionID })

        if (output.message.variant === undefined) {
          output.message.variant = "max"
        }

        ctx.client.tui
          .showToast({
            body: {
              title: "Ultrawork Mode Activated",
              message: "Maximum precision engaged. All agents at your disposal.",
              variant: "success" as const,
              duration: 3000,
            },
          })
          .catch((err) =>
            log(`[keyword-detector] Failed to show toast`, {
              error: err,
              sessionID: input.sessionID,
            })
          )
      }

      if (injectUltraResearch) {
        log(`[keyword-detector] Ultra research mode activated`, { sessionID: input.sessionID })

        if (output.message.variant === undefined) {
          output.message.variant = "max"
        }

        ctx.client.tui
          .showToast({
            body: {
              title: "Ultra Research Mode Activated",
              message: "Research orchestration engaged. Diverge, audit evidence, and converge.",
              variant: "success" as const,
              duration: 3000,
            },
          })
          .catch((err) =>
            log(`[keyword-detector] Failed to show toast`, {
              error: err,
              sessionID: input.sessionID,
            })
          )
      }

      const allMessages = toInject.map((k) => k.message).join("\n\n")
      const originalText = output.parts[textPartIndex].text ?? ""

      output.parts[textPartIndex].text = `${allMessages}\n\n---\n\n${originalText}`

      for (const k of toInject) {
        alreadyInjected.add(k.type)
      }

      log(`[keyword-detector] Detected ${toInject.length} keywords`, {
        sessionID: input.sessionID,
        types: toInject.map((k) => k.type),
      })
    },
  }
}
