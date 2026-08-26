import fs from "node:fs/promises";
import path from "node:path";
import { triageSchema } from "./schema.js";

export function parseOutput(raw) {
  const text = String(raw ?? "").replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const start = text.indexOf("{"); const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Model output did not contain a JSON object");
  return JSON.parse(text.slice(start, end + 1));
}

export function validateOutput(raw) {
  const parsed = triageSchema.safeParse(parseOutput(raw));
  if (!parsed.success) throw new Error(parsed.error.message);
  return parsed.data;
}

export async function quarantine(input, raw, error) {
  const file = path.resolve("logs/quarantine.jsonl");
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, `${JSON.stringify({ timestamp: new Date().toISOString(), prompt_version: "triage-v1", input, raw: String(raw ?? ""), error: String(error?.message ?? error) })}\n`);
}
