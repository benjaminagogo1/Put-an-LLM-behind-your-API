import { Router } from "express";
import { inputSchema, triageSchema, fallback, stubTriage } from "../llm/schema.js";
import fs from "node:fs/promises";
import { complete } from "../llm/client.js";
import { validateOutput, quarantine } from "../llm/output.js";

const router = Router();

router.post("/triage", async (request, response) => {
  const parsed = inputSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ error: "Invalid request", fields: parsed.error.flatten().fieldErrors });
  }
  if (process.env.LLM_ENABLED === "false" || process.env.LLM_STUB === "1") {
    return response.json(process.env.LLM_STUB === "1" ? stubTriage(parsed.data.text) : fallback);
  }
  try {
    const prompt = await fs.readFile(new URL("../../prompts/triage-v1.md", import.meta.url), "utf8");
    const messages = [{ role: "system", content: prompt }, { role: "user", content: JSON.stringify({ text: parsed.data.text }) }];
    let raw = await complete(messages);
    try { return response.json(validateOutput(raw)); } catch (firstError) {
      raw = await complete([...messages, { role: "assistant", content: raw }, { role: "user", content: `Your previous answer was rejected: ${firstError.message}. Return only corrected JSON matching the schema.` }], { repair: true });
      try { return response.json(validateOutput(raw)); } catch (secondError) {
        await quarantine(parsed.data.text, raw, secondError);
        return response.status(422).json({ error: "Model output failed validation", details: "The response was quarantined for review." });
      }
    }
  } catch (error) {
    const status = error?.status ?? error?.response?.status;
    if (error?.name === "AbortError" || error?.code === "ETIMEDOUT") return response.status(504).json({ error: "LLM request timed out" });
    return response.status(status === 401 || status === 403 ? 502 : 502).json({ error: "LLM dependency unavailable" });
  }
});

export default router;
