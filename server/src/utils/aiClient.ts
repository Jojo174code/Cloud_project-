import fetch from 'node-fetch';

/**
 * Simple wrapper around an LLM provider (e.g., OpenAI, Anthropic, LiteLLM).
 * Configuration is driven by environment variables so the same code works with
 * different back‑ends.
 */
export interface AiResponse {
  content: string;
}

export interface AiRequest {
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export const callAi = async (payload: AiRequest): Promise<AiResponse> => {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || payload.model;
  const { model: _ignoredModel, ...rest } = payload;

  if (!apiKey) {
    throw new Error('AI_API_KEY not set');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, ...rest }),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`AI request failed: ${response.status} ${txt}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content ?? '';
  return { content };
};
