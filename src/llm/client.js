import OpenAI from "openai";

const timeoutMs = 30_000;
const maxAttempts = 3;

function retryable(error) {
  const status = error?.status ?? error?.response?.status;
  return error?.name === "AbortError" || error?.code === "ETIMEDOUT" || status === 429 || (status >= 500 && status <= 599);
}

function retryAfterMs(error) {
  const value = error?.headers?.get?.("retry-after") ?? error?.headers?.["retry-after"];
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

export async function complete(messages, { repair = false } = {}) {
  const client = new OpenAI({ apiKey: process.env.LLM_API_KEY, baseURL: process.env.LLM_BASE_URL, timeout: timeoutMs, maxRetries: 0 });
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const started = Date.now();
    try {
      const result = await client.chat.completions.create({ model: process.env.LLM_MODEL, temperature: 0, messages });
      const usage = result.usage ?? {};
      console.log(JSON.stringify({ event: "llm_call", prompt_version: "triage-v1", model: process.env.LLM_MODEL, input_tokens: usage.prompt_tokens ?? 0, output_tokens: usage.completion_tokens ?? 0, duration_ms: Date.now() - started, repair }));
      return result.choices?.[0]?.message?.content ?? "";
    } catch (error) {
      lastError = error;
      if (!retryable(error) || attempt === maxAttempts) throw error;
      const delay = retryAfterMs(error) ?? (2 ** (attempt - 1)) * 1000 + Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
