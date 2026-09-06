import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import { AppShell, Disclaimer } from "@/components/AppShell";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { supabase } from "@/integrations/supabase/client";
import {
  createThread,
  deleteThread,
  getThreadMessages,
  listThreads,
} from "@/lib/data.functions";

const SUGGESTIONS = [
  "Draft a polite follow-up on an overdue deliverable",
  "Turn these rough notes into a status update for my manager",
  "Help me prioritise five competing deadlines this week",
];

export function useThreadsQuery() {
  const fn = useServerFn(listThreads);
  return useQuery({ queryKey: ["threads"], queryFn: () => fn() });
}

export function useNewThread() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fn = useServerFn(createThread);
  return useMutation({
    mutationFn: () => fn(),
    onSuccess: (thread) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    },
    onError: () => toast.error("Couldn't start a new conversation"),
  });
}

export function ThreadList({ activeId }: { activeId?: string }) {
  const qc = useQueryClient();
  const { data: threads } = useThreadsQuery();
  const removeFn = useServerFn(deleteThread);
  const navigate = useNavigate();

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      if (activeId === id) navigate({ to: "/chat" });
    },
  });

  if (!threads || threads.length === 0) {
    return (
      <p className="mt-4 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm font-semibold text-muted-foreground">
        No conversations yet.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      {threads.map((t) => (
        <li
          key={t.id}
          className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 ${
            activeId === t.id ? "bg-lavender ring-1 ring-border" : "bg-secondary"
          }`}
        >
          <Link
            to="/chat/$threadId"
            params={{ threadId: t.id }}
            className="min-w-0 flex-1 truncate text-[13px] font-bold"
          >
            {t.title}
          </Link>
          <button
            aria-label="Delete conversation"
            onClick={() => remove.mutate(t.id)}
            className="shrink-0 text-foreground/40 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ChatLanding() {
  const newThread = useNewThread();
  return (
    <AppShell
      eyebrow="Workplace chat"
      title="Ask Koketso anything about your work"
      action={
        <button
          onClick={() => newThread.mutate()}
          disabled={newThread.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-[13px] font-bold text-card disabled:opacity-60"
        >
          <Plus className="size-4" /> New chat
        </button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <section className="panel p-6">
          <h2 className="font-display text-xl font-semibold">Conversations</h2>
          <ThreadList />
        </section>
        <section className="panel p-6">
          <h2 className="font-display text-xl font-semibold">Start with a prompt</h2>
          <p className="mt-1 text-[13px] font-semibold text-muted-foreground">
            Open a new chat, then paste one of these to get going.
          </p>
          <ul className="mt-4 space-y-2.5">
            {SUGGESTIONS.map((s) => (
              <li key={s} className="rounded-2xl bg-peach px-4 py-3 text-sm font-semibold ring-1 ring-border">
                {s}
              </li>
            ))}
          </ul>
          <Disclaimer className="mt-5" />
        </section>
      </div>
    </AppShell>
  );
}

export function ChatThread({ threadId }: { threadId: string }) {
  const qc = useQueryClient();
  const newThread = useNewThread();
  const messagesFn = useServerFn(getThreadMessages);
  const { data, isLoading, error } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => messagesFn({ data: { threadId } }),
  });

  const initial = useMemo<UIMessage[]>(
    () =>
      (data?.messages ?? []).map((m) => ({
        id: m.id,
        role: m.role === "assistant" ? "assistant" : "user",
        parts: [{ type: "text", text: m.content }],
      })) as UIMessage[],
    [data],
  );

  if (error) {
    return (
      <AppShell eyebrow="Workplace chat" title="Conversation unavailable">
        <p className="panel p-6 text-sm font-semibold text-muted-foreground">
          We couldn't open that conversation.{" "}
          <Link to="/chat" className="font-bold text-brand">
            Back to chats
          </Link>
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      eyebrow="Workplace chat"
      title={data?.thread.title ?? "Conversation"}
      action={
        <button
          onClick={() => newThread.mutate()}
          disabled={newThread.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-[13px] font-bold text-card disabled:opacity-60"
        >
          <Plus className="size-4" /> New chat
        </button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)]">
        <section className="panel order-2 p-6 lg:order-1">
          <h2 className="font-display text-lg font-semibold">Conversations</h2>
          <ThreadList activeId={threadId} />
          <Disclaimer className="mt-5" />
        </section>

        <section className="panel order-1 flex min-h-[70vh] flex-col p-6 lg:order-2">
          {isLoading ? (
            <p className="text-sm font-semibold text-muted-foreground">Loading conversation…</p>
          ) : (
            <ChatPanel
              threadId={threadId}
              initialMessages={initial}
              onFinish={() => {
                qc.invalidateQueries({ queryKey: ["threads"] });
                qc.invalidateQueries({ queryKey: ["thread", threadId] });
              }}
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}

function ChatPanel({
  threadId,
  initialMessages,
  onFinish,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onFinish: () => void;
}) {
  const [input, setInput] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const voice = useSpeechRecognition({
    onFinalText: (text) =>
      setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text)),
    onError: (message) => toast.error(message),
  });

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { threadId },
        fetch: async (url, options) => {
          const { data } = await supabase.auth.getSession();
          const headers = new Headers(options?.headers as HeadersInit | undefined);
          if (data.session?.access_token) {
            headers.set("Authorization", `Bearer ${data.session.access_token}`);
          }
          return fetch(url as string, { ...options, headers });
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onFinish,
    onError: (e) => toast.error(e.message || "The assistant couldn't reply. Try again."),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm font-semibold text-muted-foreground">
            Ask about planning, drafting, summarising or thinking a problem through.
          </p>
        )}
        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("")
            .trim();
          if (!text) return null;
          const mine = m.role === "user";
          return (
            <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm font-semibold leading-relaxed ring-1 ring-border ${
                  mine ? "bg-brand-soft" : "bg-secondary"
                }`}
              >
                {text}
              </div>
            </div>
          );
        })}
        {status === "submitted" && (
          <p className="text-[13px] font-bold text-muted-foreground">Koketso is thinking…</p>
        )}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = input.trim();
          if (!value || busy) return;
          setInput("");
          void sendMessage({ text: value });
        }}
        className="mt-4 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          placeholder="Message Koketso…"
          className="min-w-0 flex-1 resize-y rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-semibold outline-none focus:bg-card"
        />
        <button
          type="submit"
          disabled={busy || input.trim().length === 0}
          className="shrink-0 rounded-full bg-brand px-5 py-3 text-sm font-bold text-card disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </>
  );
}
