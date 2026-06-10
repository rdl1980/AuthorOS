import { estimateCredits, estimateTokens, type AIProvider, type CompletionInput, type CompletionOutput } from './types'

interface ChatCompletion {
  choices: { message: { content: string | null } }[]
  usage?: { prompt_tokens: number; completion_tokens: number }
}

/**
 * Provider OpenAI via HTTP (Chat Completions). Implementazione minimale: l'utente
 * sceglie OpenAI come provider e fornisce la propria API key (Epic 22 / US-18.3).
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  readonly mode = 'live' as const

  constructor(
    private readonly apiKey: string,
    readonly model: string = 'gpt-4o'
  ) {}

  async complete(input: CompletionInput): Promise<CompletionOutput> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: input.maxTokens,
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: input.user }
        ]
      })
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 300)}`)
    }

    const data = (await res.json()) as ChatCompletion
    const text = data.choices[0]?.message?.content ?? ''
    const promptTokens = data.usage?.prompt_tokens ?? estimateTokens(input.system + input.user)
    const completionTokens = data.usage?.completion_tokens ?? estimateTokens(text)
    return {
      text,
      usage: { promptTokens, completionTokens, credits: estimateCredits(promptTokens, completionTokens) }
    }
  }
}
