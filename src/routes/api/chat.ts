import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM_PROMPT =
  "You are Koketso, an AI workplace assistant for professionals. You help with planning, " +
  "prioritising, drafting, summarising and thinking through work problems. Be concise and " +
  "practical, use short markdown structure, and ask one clarifying question when the request " +
  "is ambiguous. Never invent statistics, citations, quotes or sources; state uncertainty " +
  "plainly and say how the user could verify anything important.";

function textOf(message: UIMessage) {
  return (message.parts ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as { messages?: unknown; threadId?: unknown };
        const messages = body.messages;
        const threadId = typeof body.threadId === "string" ? body.threadId : null;
        if (!Array.isArray(messages) || !threadId) {
          return new Response("messages and threadId are required", { status: 400 });
        }

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${token}` } },
          },
        );

        const { data: userData } = await supabase.auth.getUser(token);
        const user = userData?.user;
        if (!user) return new Response("Unauthorized", { status: 401 });

        const { data: thread } = await supabase
          .from("chat_threads")
          .select("id, title")
          .eq("id", threadId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!thread) return new Response("Conversation not found", { status: 404 });

        const uiMessages = messages as UIMessage[];
        const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
        const lastUserText = lastUser ? textOf(lastUser) : "";

        if (lastUserText) {
          await supabase.from("chat_messages").insert({
            thread_id: threadId,
            user_id: user.id,
            role: "user",
            content: lastUserText,
            client_id: lastUser?.id ?? null,
          });
          const patch: Record<string, string> = { updated_at: new Date().toISOString() };
          if (thread["title"] === "New conversation") {
            patch.title = lastUserText.slice(0, 60);
          }
          await supabase.from("chat_threads").update(patch).eq("id", threadId);
        }

        const { createLovableAiGatewayProvider, requireGatewayKey, CHAT_MODEL, GATEWAY_PROVIDER_OPTIONS } =
          await import("@/lib/ai-gateway.server");

        let gatewayKey: string;
        try {
          gatewayKey = requireGatewayKey();
        } catch {
          return new Response("AI is not configured for this app.", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(gatewayKey);
        const result = streamText({
          model: gateway(CHAT_MODEL),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(uiMessages),
          providerOptions: GATEWAY_PROVIDER_OPTIONS as never,
          onError: ({ error }) => console.error("chat stream error", error),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: uiMessages,
          onFinish: async ({ responseMessage }) => {
            const content = textOf(responseMessage);
            if (!content) return;
            const { error } = await supabase.from("chat_messages").insert({
              thread_id: threadId,
              user_id: user.id,
              role: "assistant",
              content,
              client_id: responseMessage.id ?? null,
            });
            if (error) console.error("failed to persist assistant message", error);
          },
        });
      },
    },
  },
});
