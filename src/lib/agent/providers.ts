/**
 * LLM Provider Abstraction with Automatic Fallback
 *
 * Provider chain: OpenAI -> Groq
 *
 * Both APIs are OpenAI-compatible (same request/response shape).
 * When OpenAI returns 429 (rate limited) or 503 (unavailable), the orchestrator
 * automatically retries with Groq. Conversation history is preserved in the
 * DB regardless of which provider responds.
 *
 * To add a new provider: add an entry to PROVIDER_CHAIN.
 */

import type { ChatMessage, GroqToolDefinition, GroqApiResponse } from "./types"

export type ProviderName = "groq" | "openai"

interface ProviderConfig {
  name:   ProviderName
  label:  string
  url:    string
  model:  string
  apiKey: string
}

const PROVIDER_CHAIN: Omit<ProviderConfig, "apiKey">[] = [
  {
    name:  "openai",
    label: `OpenAI (${process.env.OPENAI_MODEL ?? "gpt-4o-mini"})`,
    url:   "https://api.openai.com/v1/chat/completions",
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  },
  {
    name:  "groq",
    label: `Groq (${process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile"})`,
    url:   "https://api.groq.com/openai/v1/chat/completions",
    model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  },
]

/** HTTP status codes that indicate the provider is temporarily unavailable. */
const FALLBACK_STATUSES = new Set([429, 502, 503, 529])

// ─── Public API ───────────────────────────────────────────────────────────────

export interface LLMCallResult {
  response: GroqApiResponse
  provider: ProviderName
}

export interface ApiKeys {
  groq?:   string
  openai?: string
}

/**
 * Call the first available provider. If it is rate-limited or unavailable,
 * fall through to the next one. Throws only when ALL providers are exhausted.
 */
export async function callLLMWithFallback(
  messages:  ChatMessage[],
  tools:     GroqToolDefinition[],
  apiKeys:   ApiKeys,
): Promise<LLMCallResult> {
  // Build the active chain — only providers that have a key configured
  const chain: ProviderConfig[] = PROVIDER_CHAIN
    .filter((p) => !!apiKeys[p.name])
    .map((p)   => ({ ...p, apiKey: apiKeys[p.name]! }))

  if (chain.length === 0) {
    throw new AllProvidersExhaustedError(
      "No LLM providers are configured. Set OPENAI_API_KEY or GROQ_API_KEY.",
    )
  }

  let lastError: string | undefined

  for (const provider of chain) {
    try {
      const response = await callProvider(provider, messages, tools)

      if (provider !== chain[0]) {
        console.info(`[providers] Fallback active — using ${provider.label}`)
      }

      // Log token usage when available (both OpenAI and Groq return usage)
      if (response.usage) {
        const { prompt_tokens, completion_tokens, total_tokens } = response.usage
        console.info(
          `[providers] ${provider.label} — tokens: prompt=${prompt_tokens} completion=${completion_tokens} total=${total_tokens}`,
        )
      }

      return { response, provider: provider.name }
    } catch (err) {
      if (err instanceof ProviderUnavailableError) {
        console.warn(`[providers] ${provider.label} unavailable (${err.message}), trying next…`)
        lastError = err.message
        continue
      }
      // Unexpected error — propagate immediately, don't try next provider
      throw err
    }
  }

  throw new AllProvidersExhaustedError(
    `All LLM providers are rate-limited or unavailable. Last error: ${lastError}`,
  )
}

// ─── Internal: single provider call ──────────────────────────────────────────

async function callProvider(
  provider: ProviderConfig,
  messages: ChatMessage[],
  tools:    GroqToolDefinition[],
): Promise<GroqApiResponse> {
  const res = await fetch(provider.url, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model:       provider.model,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens:  Number(process.env.AI_MAX_TOKENS ?? process.env.GROQ_MAX_TOKENS ?? 1024),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    if (FALLBACK_STATUSES.has(res.status)) {
      throw new ProviderUnavailableError(
        `${provider.label} returned ${res.status}: ${body.slice(0, 120)}`,
      )
    }
    throw new Error(`${provider.label} API error ${res.status}: ${body.slice(0, 200)}`)
  }

  return res.json() as Promise<GroqApiResponse>
}

// ─── Typed errors ─────────────────────────────────────────────────────────────

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProviderUnavailableError"
  }
}

export class AllProvidersExhaustedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AllProvidersExhaustedError"
  }
}
