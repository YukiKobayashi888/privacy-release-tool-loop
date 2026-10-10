import assert from "node:assert/strict";
import type OpenAI from "openai";
import { diagnoseRelease, privacyDecision, validateRelease } from "../src/release_diagnostics.js";

const safe = validateRelease({service: "lab-api", version: "v1.0.0", changedFiles: ["api.ts"], containsPatientData: false});
assert.equal(privacyDecision(safe), "approve");

const guarded = validateRelease({service: "lab-api", version: "v1.0.1", changedFiles: ["db.ts"], containsPatientData: true});
assert.equal(privacyDecision(guarded), "hold");

assert.throws(() => validateRelease({service: "lab-api", version: "1.0", changedFiles: [], containsPatientData: false}));
const messages: unknown[][] = [];
const client = {
  chat: {completions: {create: async ({messages: sent}: {messages: unknown[]}) => {
    messages.push(sent);
    return {choices: [{message: messages.length === 1
      ? {role: "assistant", content: null, tool_calls: [{id: "gate-1", type: "function", function: {name: "privacy_gate", arguments: "{}"}}]}
      : {role: "assistant", content: "Privacy review required."}}]};
  }}},
  embeddings: {create: async () => ({data: [{embedding: [0.1, 0.2]}]})}
} as unknown as OpenAI;
const result = await diagnoseRelease(guarded, client);
assert.equal(result.decision, "hold");
assert.equal(result.reason, "Privacy review required.");
assert.deepEqual(result.embedding, [0.1, 0.2]);
assert.equal(messages.length, 2);
assert.deepEqual(messages[1]?.[2], {role: "tool", tool_call_id: "gate-1", content: '{"decision":"hold"}'});
console.log("release decision tests passed");
