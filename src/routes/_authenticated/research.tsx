import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell, Disclaimer } from "@/components/AppShell";
import {
  deleteResearch,
  listResearch,
  updateResearch,
  type ResearchItem,
} from "@/lib/data.functions";
import { generateResearch } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/research")({
  head: () => ({
    meta: [
      { title: "Research Assistant — Koketso AI Assistant" },
      {
        name: "description",
        content:
          "Summarise any topic or article into insights and recommendations, then edit the output yourself.",
      },
      { property: "og:title", content: "Research Assistant — Koketso AI Assistant" },
      {
        property: "og:description",
        content: "Turn topics and articles into summaries, insights and next actions you can edit.",
      },
    ],
  }),
  component: Research,
});

const DEPTHS = ["Brief", "Standard", "Deep dive"] as const;

function Research() {
  const qc = useQueryClient();
  const listFn = useServerFn(listResearch);
  const genFn = useServerFn(generateResearch);
  const updateFn = useServerFn(updateResearch);
  const deleteFn = useServerFn(deleteResearch);

  const { data: items } = useQuery({ queryKey: ["research"], queryFn: () => listFn() });

  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("My team");
  const [depth, setDepth] = useState<(typeof DEPTHS)[number]>("Standard");
  const [source, setSource] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId && items && items.length > 0) setActiveId(items[0]!.id);
  }, [items, activeId]);

  const active = (items ?? []).find((i) => i.id === activeId) ?? null;
  const invalidate = () => qc.invalidateQueries({ queryKey: ["research"] });

  const generate = useMutation({
    mutationFn: () => genFn({ data: { topic, source, audience, depth } }),
    onSuccess: (row) => {
      setTopic("");
      setSource("");
      setActiveId(row.id);
      invalidate();
      toast.success("Research drafted — review and edit anything before sharing it.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't research that topic"),
  });

  const save = useMutation({
    mutationFn: (vars: { id: string; patch: Record<string, string> }) =>
      updateFn({ data: vars as never }),
    onSuccess: () => toast.success("Saved"),
    onError: () => toast.error("Couldn't save that edit"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_r, id) => {
      if (activeId === id) setActiveId(null);
      invalidate();
    },
  });

  const patchLocal = (field: keyof ResearchItem, value: string) =>
    qc.setQueryData<ResearchItem[]>(["research"], (prev) =>
      (prev ?? []).map((row) => (row.id === activeId ? { ...row, [field]: value } : row)),
    );

  return (
    <AppShell eyebrow="Research assistant" title="Summarize, then sharpen it yourself">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="panel p-6">
          <h2 className="font-display text-xl font-semibold">New research brief</h2>
          <p className="mt-1 text-[13px] font-semibold text-muted-foreground">
            Paste an article or describe a topic. Koketso only summarizes what you give it.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <Label>Topic or question</Label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="How are mid-size firms adopting AI note-taking?"
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold outline-none focus:bg-card"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Audience</Label>
                <input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold outline-none focus:bg-card"
                />
              </div>
              <div>
                <Label>Depth</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {DEPTHS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDepth(d)}
                      className={`rounded-full px-3 py-2 text-[12px] font-bold transition-colors ${
                        depth === d ? "bg-primary text-primary-foreground" : "bg-secondary"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label>Source material (optional)</Label>
              <textarea
                value={source}
                onChange={(e) => setSource(e.target.value)}
                rows={8}
                placeholder="Paste the article, meeting notes or report you want summarized."
                className="mt-1.5 w-full resize-y rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-semibold outline-none focus:bg-card"
              />
            </div>

            <button
              onClick={() => generate.mutate()}
              disabled={generate.isPending || topic.trim().length < 3}
              className="w-full rounded-full bg-brand px-5 py-3 text-sm font-bold text-card disabled:opacity-60"
            >
              {generate.isPending ? "Reading and summarizing…" : "Generate research"}
            </button>
            <Disclaimer />
          </div>
        </section>

        <section className="space-y-5">
          <div className="panel p-5">
            <h2 className="font-display text-lg font-semibold">Saved briefs</h2>
            {(items ?? []).length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm font-semibold text-muted-foreground">
                Nothing saved yet.
              </p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {(items ?? []).map((i) => (
                  <li key={i.id}>
                    <button
                      onClick={() => setActiveId(i.id)}
                      className={`max-w-[240px] truncate rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${
                        activeId === i.id ? "bg-accent text-accent-foreground" : "bg-secondary"
                      }`}
                    >
                      {i.topic}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {active && (
            <div className="panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-semibold text-pretty">{active.topic}</h2>
                  <p className="mt-1 text-[12px] font-bold text-muted-foreground">
                    {active.depth} · for {active.audience} ·{" "}
                    {new Date(active.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  aria-label="Delete brief"
                  onClick={() => remove.mutate(active.id)}
                  className="text-foreground/40 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <Field
                  tone="bg-peach"
                  label="Summary"
                  value={active.summary ?? ""}
                  onChange={(v) => patchLocal("summary", v)}
                  onBlur={(v) => save.mutate({ id: active.id, patch: { summary: v } })}
                />
                <Field
                  tone="bg-mint"
                  label="Insights"
                  value={active.insights ?? ""}
                  onChange={(v) => patchLocal("insights", v)}
                  onBlur={(v) => save.mutate({ id: active.id, patch: { insights: v } })}
                />
                <Field
                  tone="bg-butter"
                  label="Recommendations"
                  value={active.recommendations ?? ""}
                  onChange={(v) => patchLocal("recommendations", v)}
                  onBlur={(v) => save.mutate({ id: active.id, patch: { recommendations: v } })}
                />
              </div>
              <Disclaimer className="mt-4" />
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  tone,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  tone: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: (v: string) => void;
}) {
  return (
    <div className={`rounded-2xl ${tone} p-4 ring-1 ring-border`}>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-[11px] font-bold text-foreground/50">Editable</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur(e.target.value)}
        rows={Math.min(14, Math.max(4, value.split("\n").length + 1))}
        className="mt-2 w-full resize-y rounded-xl bg-card/70 px-3.5 py-3 text-sm font-semibold leading-relaxed outline-none focus:bg-card"
      />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}
