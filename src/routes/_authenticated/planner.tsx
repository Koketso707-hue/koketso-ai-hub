import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell, Disclaimer, useTasksQuery } from "@/components/AppShell";
import { createTask, deleteTask, updateTask, type Task } from "@/lib/data.functions";
import { generatePlan } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Planner — Koketso AI Assistant" },
      {
        name: "description",
        content:
          "Generate prioritised daily or weekly schedules with AI, then edit every block yourself.",
      },
      { property: "og:title", content: "Planner — Koketso AI Assistant" },
      {
        property: "og:description",
        content: "Generate prioritised daily or weekly schedules with AI, then edit every block.",
      },
    ],
  }),
  component: Planner;
});

const PRIORITY_TONE: Record<string, string> = {
  high: "bg-brand-soft",
  medium: "bg-butter",
  low: "bg-accent-soft",
};

function Planner() {
  const qc = useQueryClient();
  const { data: tasks } = useTasksQuery();
  const genFn = useServerFn(generatePlan);
  const createFn = useServerFn(createTask);
  const updateFn = useServerFn(updateTask);
  const deleteFn = useServerFn(deleteTask);

  const [goals, setGoals] = useState("");
  const [horizon, setHorizon] = useState<"day" | "week">("day");
  const [hours, setHours] = useState("09:00-17:00");
  const [newTitle, setNewTitle] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const generate = useMutation({
    mutationFn: () =>
      genFn({
        data: {
          goals,
          horizon,
          workingHours: hours,
          startDate: new Date().toISOString().slice(0, 10),
        },
      }),
    onSuccess: (res) => {
      setGoals("");
      invalidate();
      toast.success(`${res.inserted} blocks added — edit anything that doesn't fit.`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't build that plan"),
  });

  const add = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title: newTitle.trim(),
          priority: "medium",
          category: "Focus",
          scheduled_date: new Date().toISOString().slice(0, 10),
        },
      }),
    onSuccess: () => {
      setNewTitle("");
      invalidate();
    },
    onError: () => toast.error("Couldn't add that task"),
  });

  const patch = useMutation({
    mutationFn: (vars: { id: string; patch: Record<string, unknown> }) =>
      updateFn({ data: vars as never }),
    onSuccess: invalidate,
    onError: () => toast.error("Couldn't save that change"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: invalidate,
  });

  const groups = groupByDate(tasks ?? []);

  return (
    <AppShell eyebrow="Task planner" title="Plan the work, then reshape it">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="panel p-6">
          <h2 className="font-display text-xl font-semibold">Generate a schedule</h2>
          <p className="mt-1 text-[13px] font-semibold text-muted-foreground">
            Structured prompt — the more context you give, the better the ranking.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <Label>Horizon</Label>
              <div className="mt-1.5 flex gap-2">
                {(["day", "week"] as const).map((h) => (
                  <button
                    key={h}
                    onClick={() => setHorizon(h)}
                    className={`rounded-full px-4 py-2 text-[13px] font-bold capitalize transition-colors ${
                      horizon === h ? "bg-primary text-primary-foreground" : "bg-secondary"
                    }`}
                  >
                    {h === "day" ? "Today" : "This week"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Working hours</Label>
              <input
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold outline-none focus:bg-card"
              />
            </div>

            <div>
              <Label>Goals, deadlines and constraints</Label>
              <textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                rows={7}
                placeholder={
                  "Finish the Q3 research brief (due Thursday), review two design docs, prep Friday's client demo. I have standup at 09:30 and no meetings after 15:00."
                }
                className="mt-1.5 w-full resize-y rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-semibold outline-none focus:bg-card"
              />
            </div>

            <button
              onClick={() => generate.mutate()}
              disabled={generate.isPending || goals.trim().length < 3}
              className="w-full rounded-full bg-brand px-5 py-3 text-sm font-bold text-card disabled:opacity-60"
            >
              {generate.isPending ? "Thinking through your day…" : "Build my schedule"}
            </button>
            <Disclaimer />
          </div>
        </section>

        <section className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Your schedule</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newTitle.trim()) add.mutate();
              }}
              className="flex min-w-0 flex-1 gap-2 sm:max-w-xs"
            >
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Add a task"
                className="min-w-0 flex-1 rounded-xl border border-border bg-secondary px-3 py-2 text-[13px] font-semibold outline-none focus:bg-card"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-primary px-3 py-2 text-[13px] font-bold text-primary-foreground"
              >
                Add
              </button>
            </form>
          </div>

          {groups.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm font-semibold text-muted-foreground">
              Nothing scheduled yet. Describe your goals and let Koketso lay out the day.
            </p>
          ) : (
            <div className="mt-5 space-y-6">
              {groups.map(([date, rows]) => (
                <div key={date}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {rows.map((t) => (
                      <li
                        key={t.id}
                        className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl ${
                          PRIORITY_TONE[t.priority] ?? "bg-secondary"
                        } px-4 py-3`}
                      >
                        <button
                          aria-label={t.done ? "Mark as not done" : "Mark as done"}
                          onClick={() => patch.mutate({ id: t.id, patch: { done: !t.done } })}
                          className={`grid size-6 shrink-0 place-items-center rounded-full ring-1 ring-border ${
                            t.done ? "bg-primary text-primary-foreground" : "bg-card"
                          }`}
                        >
                          {t.done && <Check className="size-3.5" />}
                        </button>
                        <div className="min-w-0">
                          <input
                            value={t.title}
                            onChange={(e) =>
                              qc.setQueryData<Task[]>(["tasks"], (prev) =>
                                (prev ?? []).map((row) =>
                                  row.id === t.id ? { ...row, title: e.target.value } : row,
                                ),
                              )
                            }
                            onBlur={(e) =>
                              patch.mutate({ id: t.id, patch: { title: e.target.value.trim() } })
                            }
                            className={`w-full truncate bg-transparent text-sm font-bold outline-none ${
                              t.done ? "line-through opacity-60" : ""
                            }`}
                          />
                          <p className="text-[12px] font-bold text-foreground/60">
                            {t.category}
                            {t.start_time
                              ? ` · ${t.start_time.slice(0, 5)}${
                                  t.end_time ? `–${t.end_time.slice(0, 5)}` : ""
                                }`
                              : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <select
                            value={t.priority}
                            onChange={(e) =>
                              patch.mutate({ id: t.id, patch: { priority: e.target.value } })
                            }
                            className="rounded-full bg-card px-2 py-1 text-[11px] font-bold uppercase outline-none ring-1 ring-border"
                          >
                            <option value="high">High</option>
                            <option value="medium">Med</option>
                            <option value="low">Low</option>
                          </select>
                          <button
                            aria-label="Delete task"
                            onClick={() => remove.mutate(t.id)}
                            className="text-foreground/40 hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

function groupByDate(tasks: Task[]) {
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    const list = map.get(t.scheduled_date) ?? [];
    list.push(t);
    map.set(t.scheduled_date, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}
