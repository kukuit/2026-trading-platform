// lib/chat/provider.ts
import { SYSTEM_PROMPT } from './constants'

export type ClientMessage = {
  role: 'user' | 'assistant'
  content: string
}

// Message format sent to the LLM (including system prompt)
type LlmMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const CHAT_BOT_STYLE = process.env.CHAT_BOT_STYLE ?? 'groq'
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant'

function getModelConfig() {
  switch (CHAT_BOT_STYLE) {
    case 'openai':
      return {
        provider: 'openai' as const,
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4.1-mini', // or gpt-4.1 depending on budget
        apiKey: process.env.OPENAI_API_KEY,
      }
    case 'openaimini':
      return {
        provider: 'openai' as const,
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY,
      }
    case 'groq':
    default:
      return {
        provider: 'groq' as const,
        baseUrl: 'https://api.groq.com/openai/v1',
        // Supported model
        model: GROQ_MODEL,
        apiKey: process.env.GROQ_API_KEY,
      }
  }
}

/**
 * The main function to call the LLM (OpenAI / Groq)
 * -> all “instruction tuning” is handled inside SYSTEM_PROMPT & buildMessages
 */
export async function callChatModel(clientMessages: ClientMessage[]): Promise<string> {
  const { baseUrl, model, apiKey } = getModelConfig()

  if (!apiKey) {
    throw new Error('Chatbot API key is not configured (OPENAI_API_KEY or GROQ_API_KEY)')
  }

  const messages: LlmMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }, ...clientMessages]

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 256,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('LLM error:', text)
    throw new Error('The chatbot is currently busy. Please try again in a moment.')
  }

  const data = await res.json()
  const reply: string =
    data.choices?.[0]?.message?.content ??
    "Sorry, I can't answer this question right now. Please try again."

  return reply
}
