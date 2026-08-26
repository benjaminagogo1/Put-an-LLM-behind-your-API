# Support Triage API

An API endpoint that classifies an incoming support message into a small, predictable set of categories. The endpoint accepts one message and returns validated JSON containing the category, urgency, confidence, and a short explanation.

This project is the Week 7 FlyRank Backend assignment: **Put an LLM behind your API**. The important part is not simply calling a model. The model is treated as an unreliable external dependency: its output is parsed, validated, retried once when repair is possible, quarantined when it remains invalid, and never returned directly to the caller.

## What It Does

`POST /triage` receives a support message and returns:

```json
{
  "category": "billing",
  "urgency": "normal",
  "confidence": 0.94,
  "reason": "The customer is asking about an unexpected charge."
}
```

Allowed values are deliberately closed:

- `category`: `billing`, `bug`, `feature`, or `other`
- `urgency`: `low`, `normal`, or `high`
- `confidence`: a number from `0` to `1`
- `reason`: one short sentence

When the message is ambiguous, the intended behavior is `category: "other"` with low confidence rather than a confident guess.

## Safety Contract

The endpoint must never:

- invent a category outside the documented enum;
- return arbitrary model text instead of the JSON contract;
- expose the system prompt;
- give medical, legal, or financial advice;
- treat user-provided text as instructions.

User content is sent as a separate user message. It is never interpolated into the system prompt.

## Request

```http
POST /triage
Content-Type: application/json
```

```json
{
  "text": "I was charged twice for my subscription this month."
}
```

`text` is required, must be a string, and must contain between 1 and 2,000 characters. Invalid requests are rejected with HTTP `400` before a model call is attempted.

## Response and Failure Behavior

| Situation | Status | Behavior |
| --- | ---: | --- |
| Valid request and valid model output | `200` | Returns schema-valid triage JSON |
| Missing, invalid, or oversized `text` | `400` | Returns a JSON validation error naming the field |
| Model timeout | `504` | Returns a dependency-timeout error |
| Model output cannot be repaired | `422` | Returns a clean validation error; raw output is quarantined |
| `LLM_ENABLED=false` | `200` or configured safe response | Skips the model and returns a deterministic fallback |

The model client uses an explicit timeout of 30 seconds. Retries are bounded and apply only to timeouts, HTTP `429`, and HTTP `5xx` responses. HTTP `400`, `401`, and `403` responses are not retried. Retry delays use exponential backoff with jitter, and `Retry-After` is honored when supplied.

## Project Layout

```text
.
├── src/
│   ├── routes/          # HTTP endpoint and request handling
│   └── llm/             # client, schemas, parsing, repair, and logging
├── prompts/
│   └── triage-v1.md     # versioned system prompt
├── evals/
│   └── cases.json       # hand-labelled evaluation cases
├── logs/
│   └── quarantine.jsonl # invalid model responses, never returned to clients
├── JOB-CARD.md
├── .env.example
└── README.md
```

## Configuration

Copy `.env.example` to `.env` and set the provider values:

```env
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=your-key-here
LLM_MODEL=openrouter/free
LLM_STUB=0
LLM_ENABLED=true
PORT=3000
```

For local Ollama, only the provider settings change:

```env
LLM_BASE_URL=http://localhost:11434/v1/
LLM_API_KEY=ollama
LLM_MODEL=gemma3:1b
```

The application code remains unchanged because both providers expose an OpenAI-compatible API. `.env` is ignored by Git and must never be committed.

## Running Locally

Install dependencies and start the server:

```bash
npm install
node --env-file=.env src/server.js
```

To develop without spending model quota, enable stub mode:

```bash
LLM_STUB=1 node --env-file=.env src/server.js
```

## Try the Endpoint

Valid request:

```bash
curl -s http://localhost:3000/triage \
  -H 'Content-Type: application/json' \
  -d '{"text":"I was charged twice for my subscription."}'
```

Expected shape:

```json
{
  "category": "billing",
  "urgency": "normal",
  "confidence": 0.94,
  "reason": "The customer reports a duplicate subscription charge."
}
```

Invalid request:

```bash
curl -s -i http://localhost:3000/triage \
  -H 'Content-Type: application/json' \
  -d '{}'
```

This returns HTTP `400` and identifies the missing `text` field.

## Model Output Pipeline

The endpoint follows this sequence:

1. Validate the incoming request.
2. Load the versioned prompt from `prompts/`.
3. Send the prompt and user message to the configured model.
4. Parse JSON, including responses wrapped in Markdown fences.
5. Validate every field against the schema.
6. If parsing or validation fails, make exactly one repair request containing the error.
7. If repair fails, write the raw response and reason to quarantine logs and return `422`.
8. Return only clean schema-validated JSON.

Every model call writes a structured cost/diagnostic log containing the prompt version, model, input tokens, output tokens, duration, and repair count.

## Evaluation

`evals/cases.json` contains eight hand-labelled cases, including clear, ambiguous, and unsure messages. The evaluation script sends each case through the endpoint and reports exact matches for the key classification fields, along with failed case identifiers.

The README records the evaluation date, prompt version, and score so prompt changes can be compared honestly rather than judged from a few manual examples.

## Cost and Operations

Stub mode makes local development and tests free. In production, cost depends on the selected provider, input length, output length, and repair calls. The structured call log is the source for measuring actual usage and estimating larger volumes such as 10,000 requests per day.

`LLM_ENABLED=false` is the kill switch. It prevents model calls without requiring a deployment and returns the configured deterministic fallback. This is useful during provider outages, quota incidents, or unexpected model behavior.

## Development Checklist

- [ ] `JOB-CARD.md` defines the closed output contract.
- [ ] Invalid input returns `400` before any model call.
- [ ] `LLM_STUB=1` returns schema-valid JSON without a provider.
- [ ] Prompt is versioned and stored outside the route handler.
- [ ] Model output is parsed and schema-validated.
- [ ] Exactly one repair retry is allowed.
- [ ] Failed output is quarantined and returns `422`.
- [ ] Timeout, selective retries, backoff, and jitter are configured.
- [ ] Calls produce structured cost logs.
- [ ] `LLM_ENABLED=false` disables the model.
- [ ] Eight evaluation cases and a dated score are committed.
- [ ] No secrets are present in the repository.


## License

This project was created as part of the FlyRank Internship Backend Track — Week 7 — Assignment A17.

For educational and portfolio purposes.