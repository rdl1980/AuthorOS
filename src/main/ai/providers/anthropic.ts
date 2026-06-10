import Anthropic from '@anthropic-ai/sdk'
import { estimateCredits, type AIProvider, type CompletionInput, type CompletionOutput } from './types'

/**
 * Provider reale basato sull'SDK ufficiale Anthropic.
 * Attivato quando in Impostazioni provider='anthropic', modalità 'live' e API key presente.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic'
  readonly mode = 'live' as const
  private readonly client: Anthropic

  constructor(
    apiKey: string,
    readonly model: string = 'claude-opus-4-8'
  ) {
    this.client = new Anthropic({ apiKey })
  }

  async complete(input: CompletionInput): Promise<CompletionOutput> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: input.maxTokens,
      system: input.system,
      messages: [{ role: 'user', content: input.user }]
    })

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const promptTokens = message.usage.input_tokens
    const completionTokens = message.usage.output_tokens
    return {
      text,
      usage: { promptTokens, completionTokens, credits: estimateCredits(promptTokens, completionTokens) }
    }
  }
}
