import { Router } from "express";
import { inputSchema, triageSchema, fallback } from "../llm/schema.js";

const router = Router();

router.post("/triage", (request, response) => {
  const parsed = inputSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ error: "Invalid request", fields: parsed.error.flatten().fieldErrors });
  }
  if (process.env.LLM_ENABLED === "false" || process.env.LLM_STUB === "1") {
    return response.json(fallback);
  }
  return response.status(501).json({ error: "LLM integration is not configured yet" });
});

export default router;
