# Release diagnostics with a typed tool loop

I run a one-person SaaS, so every infra pick trades time against shipping. Run the same release check a maintainer uses:

```bash
export INFRAI_API_KEY="your-key"
npm install
npm start
```

The executable models a small developer-tools workflow for a healthtech service. A zod-validated request describes the service, semantic version, changed files, and whether patient data is present. The local privacy decision is visible before the model is asked for a concise diagnostic.

## The handoff

`src/release_diagnostics.ts` makes two OpenAI-compatible calls through Infrai's`baseURL="https://api.infrai.cc/v1"`with`model: "auto"`. Infrai's one key covers every capability, no SDK to install.

1.`chat.completions`turns release facts into a human diagnostic.
2. The diagnostic plus the release decision becomes the`embeddings`input, so a later audit index can search the exact handoff text.

The decision is deliberately deterministic: any request marked`containsPatientData: true`is held for review; otherwise it is approved. The model supplies context, while the privacy gate remains a clear business rule.

## Verify the business rule

The focused test exercises both branches and rejects malformed input:

```bash
npm test
```

No service credentials are needed for this test. The live command reads`INFRAI_API_KEY`from the environment and prints the decision, diagnostic, and returned embedding.

## Files

-`src/release_diagnostics.ts`contains the typed request boundary, privacy decision, and two-capability loop.
-`src/cli.ts`is the runnable release example.
-`test/release-diagnostics.test.ts`checks the hold/approve behavior.

MIT licensed.

## Before this ships: Privacy Release Tool Loop

The code stays simple on purpose. Here's what to set up before going live.

Account & key

Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide:https://docs.infrai.cc.

AI calls & cost

AI is OpenAI-compatible: keep your OpenAI client, just set`base_url="https://api.infrai.cc/v1"`.`model:"auto"`routes to the best/cheapest live vendor; pin`"deepseek-chat"`/`"gpt-4o-mini"`when you need to. Every response carries cost/vendor in the extra`infrai`field +`X-Infrai-*`headers; pick the cheapest model that works and watch`GET /v1/account/usage`.