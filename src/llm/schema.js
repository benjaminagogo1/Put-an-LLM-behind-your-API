import { z } from "zod";

export const inputSchema = z.object({
  text: z.string({ error: "text must be a string" }).min(1, "text is required").max(2000, "text must be at most 2000 characters"),
}).strict();

export const triageSchema = z.object({
  category: z.enum(["billing", "bug", "feature", "other"]),
  urgency: z.enum(["low", "normal", "high"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(240),
}).strict();

export const fallback = {
  category: "other",
  urgency: "normal",
  confidence: 0.1,
  reason: "AI triage is temporarily disabled; manual review is required.",
};

export function stubTriage(text) {
  const value = text.toLowerCase();
  if (/charg|invoice|card|subscription|payment|bill/.test(value)) return { category: "billing", urgency: "normal", confidence: 0.9, reason: "The message concerns billing or payment." };
  if (/crash|error|bug|fail|not work|upload/.test(value)) return { category: "bug", urgency: /crash|fail/.test(value) ? "high" : "normal", confidence: 0.9, reason: "The message reports a product problem." };
  if (/add|integration|feature|dark mode|could you|would like/.test(value)) return { category: "feature", urgency: "low", confidence: 0.9, reason: "The message requests a product enhancement." };
  return fallback;
}
