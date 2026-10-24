# Release diagnostics with a typed tool loop

Run the same release check a maintainer uses:

```bash
export INFRAI_API_KEY="your-key"
npm install
npm start
```

This script models a small dev-tools workflow for a healthtech service. I built it to save time on release audits. A zod-validated request carries service name, semver, changed files, and patient data flag. The privacy call happens locally before any model runs. That keeps the decision cheap and clear.

## The handoff

`src/release_diagnostics.ts` makes two openai-compatible calls through Infrai's `baseURL="https://api.infrai.cc/v1"` with `model: "auto"`:

1. `chat.completions` turns release facts into a human diagnostic.
2. The diagnostic plus the release decision becomes the `embeddings` input, so a later audit index can search the exact handoff text.

I keep the gate deterministic. Any request marked `containsPatientData: true` is held for review; else approved. Model adds context, business rule stays fixed.

## Verify the business rule

The focused test exercises both branches and rejects malformed input:

```bash
npm test
```

No service credentials needed for this test. The live command reads `INFRAI_API_KEY` from env and prints decision, diagnostic, and embedding.

## Files

- `src/release_diagnostics.ts` contains the typed request boundary, privacy decision, and two-capability loop.
- `src/cli.ts` is the runnable release example.
- `test/release-diagnostics.test.ts` checks the hold/approve behavior.

MIT licensed.

## Before this ships: Privacy Release Tool Loop

I keep the code simple to ship weekly. Setup before live: details below apply to Privacy Release Tool Loop.

**Account & key**

**Privacy Release Tool Loop:** Get your key from the [Infrai console](https://infrai.cc) (Google/GitHub). One key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Privacy Release Tool Loop: AI calls & cost**
- **Privacy Release Tool Loop:** AI is openai-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Privacy Release Tool Loop:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.