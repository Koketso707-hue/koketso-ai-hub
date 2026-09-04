import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AppShell, Disclaimer, useProfileQuery, useTasksQuery } from "@/components/AppShell";
import { listResearch, listThreads } from "@/lib/data.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Koketso AI Assistant" },
      {
        name: "description",
        content: "Your day at a glance: priorities, recent research and open conversations.",
      },
      { property: "og:title", content: "Dashboard — Koketso AI Assistant" },
      {
        property: "og:description",
        content: "Your day at a glance: priorities, recent research and open conversations.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useProfileQuery();
  const { data: tasks } = useTasksQuery();
  const researchFn = useServerFn(listResearch);
  const threadsFn = useServerFn(listThreads);
  const { data: research } = useQuery({ queryKey: ["research"], queryFn: () => researchFn() });
  const { data: threads } = useQuery({ queryKey: ["threads"], queryFn: () => threadsFn() });

  const today = new Date().toISOString().slice(0, 10);
  const all = tasks ?? [];
  const todays = all.filter((t) => t.scheduled_date === today);
  const done = todays.filter((t) => t.done).length;
  const highPriority = all.filter((t) => !t.done && t.priority === "high").slice(0, 4);
  const name = profile?.display_name ?? profile?.email?.split("@")[0] ?? "there";

  return (
    <AppShell eyebrow={longDate()} title={`Good to see you, ${name}`}>
      <div className="grid gap-5 lg:grid-cols-3">
        <Stat tone="bg-peach" label="Scheduled today" value={String(todays.length)} />
        <Stat tone="bg-mint" label="Completed today" value={`${done}/${todays.length || 0}`} />
        <Stat tone="bg-butter" label="Research saved" value={String(research?.length ?? 0)} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Top priorities</h2>
            <Link to="/planner" className="text-[13px] font-bold text-brand">
              Open planner
            </Link>
          </div>
          {highPriority.length === 0 ? (
            <Empty
              body="No high-priority work queued. Generate a schedule and Koketso will rank it for you."
              cta="Plan my day"
              to="/planner"
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {highPriority.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{t.title}</span>
                    <span className="block text-[12px] font-bold text-muted-foreground">
                      {t.category} · {t.scheduled_date}
                      {t.start_time ? ` · ${t.start_time.slice(0, 5)}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold uppercase">
                    High
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-5">
          <section className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">Recent research</h2>
              <Link to="/research" className="text-[13px] font-bold text-brand">
                All
              </Link>
            </div>
            {(research ?? []).length === 0 ? (
              <Empty body="Nothing researched yet." cta="Research a topic" to="/research" />
            ) : (
              <ul className="mt-4 space-y-2">
                {(research ?? []).slice(0, 4).map((r) => (
                  <li key={r.id} className="rounded-2xl bg-secondary px-4 py-3">
                    <p className="truncate text-sm font-bold">{r.topic}</p>
                    <p className="text-[12px] font-bold text-muted-foreground">
                      {r.depth} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">Conversations</h2>
              <Link to="/chat" className="text-[13px] font-bold text-brand">
                Open chat
              </Link>
            </div>
            {(threads ?? []).length === 0 ? (
              <Empty body="No conversations yet." cta="Ask something" to="/chat" />
            ) : (
              <ul className="mt-4 space-y-2">
                {(threads ?? []).slice(0, 4).map((t) => (
                  <li key={t.id} className="truncate rounded-2xl bg-secondary px-4 py-3 text-sm font-bold">
                    {t.title}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <Disclaimer className="mt-6" />
    </AppShell>
  );
}

function Stat({ tone, label, value }: { tone: string; label: string; value: string }) {
  return (
    <div className={`rounded-3xl ${tone} p-6 ring-1 ring-border`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-4xl font-semibold leading-none">{value}</p>
    </div>
  );
}

function Empty({ body, cta, to }: { body: string; cta: string; to: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border px-4 py-6 text-center">
      <p className="text-sm font-semibold text-pretty text-muted-foreground">{body}</p>
      <Link
        to={to}
        className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground"
      >
        {cta}
      </Link>
    </div>
  );
}

function longDate() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
