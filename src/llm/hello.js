import OpenAI from "openai";

const required = ["LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL,
  timeout: 30_000,
  maxRetries: 0,
});

const response = await client.chat.completions.create({
  model: process.env.LLM_MODEL,
  temperature: 0,
  messages: [{ role: "user", content: "Reply with exactly the word: ready" }],
});

console.log(response.choices[0]?.message?.content?.trim() ?? "");
