import { createFileRoute, Link } from "@tanstack/react-router";
import mark from "@/assets/koketso-mark.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Koketso — AI Research & Productivity Assistant" },
      {
        name: "description",
        content:
          "Plan your day, summarize any topic and think out loud with an AI workplace assistant — in one calm, professional workspace.",
      },
      { property: "og:title", content: "Koketso — AI Research & Productivity Assistant" },
      {
        property: "og:description",
        content:
          "Plan your day, summarize any topic and think out loud with an AI workplace assistant.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    tag: "Planner",
    tone: "bg-peach",
    title: "Schedules that respect your energy",
    body: "Describe the week you're walking into. Koketso returns a prioritised, time-blocked plan you can edit line by line.",
  },
  {
    tag: "Research",
    tone: "bg-mint",
    title: "Summaries with a point of view",
    body: "Paste an article or name a topic and get a summary, the insights that matter, and three concrete next actions.",
  },
  {
    tag: "Chat",
    tone: "bg-lav",
    title: "A colleague who never runs out of patience",
    body: "Threaded conversations for drafting, unblocking and thinking through work problems, saved to your account.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2.5">
          <img src={mark} alt="Koketso" width={40} height={40} className="size-10 rounded-2xl" />
          <span className="font-display text-xl font-semibold">Koketso</span>
        </div>
        <Link
          to="/auth"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="grid items-center gap-10 py-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:py-20">
          <div className="min-w-0">
            <p className="text-sm font-bold text-brand">AI research & productivity assistant</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] text-balance sm:text-5xl md:text-6xl">
              Do the work that matters, with less of the shuffling.
            </h1>
            <p className="mt-5 max-w-xl text-base font-semibold text-pretty text-muted-foreground sm:text-lg">
              Koketso plans your day, researches your topics and answers your questions — then hands
              every draft back to you, fully editable.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/auth"
                className="rounded-full bg-brand px-6 py-3 text-sm font-bold text-card transition-transform hover:-translate-y-0.5"
              >
                Create your workspace
              </Link>
              <span className="text-[13px] font-bold text-muted-foreground">
                Free to try · your data stays in your account
              </span>
            </div>
          </div>

          <div className="panel min-w-0 p-6">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Tuesday, this week
            </p>
            <div className="mt-4 space-y-3">
              {[
                { t: "Draft Q3 research brief", time: "09:00", tone: "bg-brand-soft" },
                { t: "Summarise competitor launch", time: "11:00", tone: "bg-accent-soft" },
                { t: "Team sync + follow-ups", time: "14:00", tone: "bg-butter" },
              ].map((row) => (
                <div
                  key={row.t}
                  className={`flex items-center justify-between gap-3 rounded-2xl ${row.tone} px-4 py-3`}
                >
                  <span className="min-w-0 truncate text-sm font-bold">{row.t}</span>
                  <span className="shrink-0 text-[13px] font-bold text-foreground/60">
                    {row.time}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[11px] font-semibold text-muted-foreground">
              Example output. Every plan is editable before you commit to it.
            </p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.tag} className="panel flex flex-col p-6">
              <span
                className={`inline-flex w-fit rounded-full ${f.tone} px-3 py-1 text-[11px] font-bold uppercase tracking-wide`}
              >
                {f.tag}
              </span>
              <h2 className="mt-4 font-display text-xl font-semibold leading-snug">{f.title}</h2>
              <p className="mt-2 text-sm font-semibold text-pretty text-muted-foreground">
                {f.body}
              </p>
            </article>
          ))}
        </section>

        <section className="panel mt-14 flex flex-col gap-4 p-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold">Built to be checked</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-pretty text-muted-foreground">
              Koketso can be wrong. It never invents sources on purpose, it tells you when it is
              unsure, and every output it produces is yours to edit, reject or rewrite. You stay
              accountable for the decision.
            </p>
          </div>
          <Link
            to="/auth"
            className="shrink-0 rounded-full bg-primary px-6 py-3 text-center text-sm font-bold text-primary-foreground"
          >
            Get started
          </Link>
        </section>
      </main>
    </div>
  );
}
