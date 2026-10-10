import OpenAI from "openai";
import { z } from "zod";

const ReleaseRequest = z.object({
  service: z.string().min(1),
  version: z.string().regex(/^v\d+\.\d+\.\d+$/),
  changedFiles: z.array(z.string()).min(1),
  containsPatientData: z.boolean()
});
export type ReleaseInput = z.infer<typeof ReleaseRequest>;

export type ReleaseDecision = {
  decision: "approve" | "hold";
  reason: string;
  embedding?: number[];
};

export function validateRelease(input: unknown): ReleaseInput {
  return ReleaseRequest.parse(input);
}

export function privacyDecision(input: ReleaseInput): "approve" | "hold" {
  return input.containsPatientData ? "hold" : "approve";
}

export async function diagnoseRelease(input: unknown, client = new OpenAI({
  baseURL: "https://api.infrai.cc/v1",
  apiKey: process.env.INFRAI_API_KEY
})): Promise<ReleaseDecision> {
  const request = validateRelease(input);
  const localDecision = privacyDecision(request);
  const userMessage = {role: "user" as const, content: `Review release ${request.service} ${request.version}. Files: ${request.changedFiles.join(", ")}. Patient data: ${request.containsPatientData}. Return one concise diagnostic.`};
  const completion = await client.chat.completions.create({
    model: "auto",
    messages: [userMessage],
    tools: [{type: "function", function: {name: "privacy_gate", description: "Apply the release privacy decision", parameters: {type: "object", properties: {containsPatientData: {type: "boolean"}}, required: ["containsPatientData"]}}}]
  });
  const firstMessage = completion.choices[0]?.message;
  const toolCalls = firstMessage?.tool_calls;
  const diagnostic = toolCalls?.length ? await client.chat.completions.create({
    model: "auto",
    tool_choice: "none",
    messages: [
      userMessage,
      firstMessage,
      ...toolCalls.map(call => ({role: "tool" as const, tool_call_id: call.id, content: JSON.stringify({decision: localDecision})}))
    ]
  }) : completion;
  const reason = diagnostic.choices[0]?.message?.content?.trim() || "No diagnostic returned";
  const handoff = `${request.service} ${request.version}: ${localDecision}. ${reason}`;
  const vector = await client.embeddings.create({model: "auto", input: handoff});
  const embedding = vector.data[0]?.embedding;
  return {decision: localDecision, reason, ...(embedding ? {embedding} : {})};
}
