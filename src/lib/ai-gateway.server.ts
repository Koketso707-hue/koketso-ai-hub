import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const CHAT_MODEL = "openai/gpt-5.6-sol";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

export function requireGatewayKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

/** GPT-5.6 on chat completions must disable reasoning explicitly. */
export const GATEWAY_PROVIDER_OPTIONS = {
  lovable: { reasoningEffort: "none", max_completion_tokens: 2000 },
} as const;
