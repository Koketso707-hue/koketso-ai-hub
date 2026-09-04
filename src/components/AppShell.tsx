import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

import mark from "@/assets/koketso-mark.png";
import { supabase } from "@/integrations/supabase/client";
import { getProfile, listTasks } from "@/lib/data.functions";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", dot: "bg-brand" },
  { to: "/planner", label: "Planner", dot: "bg-accent" },
  { to: "/research", label: "Research", dot: "bg-gold" },
  { to: "/chat", label: "Chat", dot: "bg-lav-deep" },
] as const;

export function useProfileQuery() {
  const fn = useServerFn(getProfile);
  return useQuery({ queryKey: ["profile"], queryFn: () => fn() });
}

export function useTasksQuery() {
  const fn = useServerFn(listTasks);
  return useQuery({ queryKey: ["tasks"], queryFn: () => fn() });
}

export function AppShell({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfileQuery();
  const { data: tasks } = useTasksQuery();

  const today = new Date().toISOString().slice(0, 10);
  const openToday = (tasks ?? []).filter((t) => t.scheduled_date === today && !t.done).length;
  const name = profile?.display_name ?? profile?.email?.split("@")[0] ?? "there";
  const initial = name.slice(0, 1).toUpperCase();

  const signOut = useMutation({
    mutationFn: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
    },
    onSuccess: () => navigate({ to: "/auth", replace: true }),
  });

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
              active
                ? "bg-brand-soft text-foreground"
                : "text-foreground/70 hover:bg-secondary hover:text-foreground",
            )}
          >
            <span className={cn("size-2 rounded-full", item.dot)} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarBody = (
    <>
      <Link to="/dashboard" className="flex items-center gap-2.5 px-1">
        <img src={mark} alt="Koketso" width={36} height={36} className="size-9 rounded-2xl" />
        <span className="min-w-0">
          <span className="block font-display text-lg font-semibold leading-none">Koketso</span>
          <span className="block text-[11px] font-bold text-muted-foreground">
            AI Research Assistant
          </span>
        </span>
      </Link>

      <div className="mt-8 rounded-2xl bg-peach p-4 ring-1 ring-border">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Focus</p>
        <p className="mt-1 font-display text-2xl font-semibold leading-tight">
          {openToday} {openToday === 1 ? "task" : "tasks"}
        </p>
        <p className="mt-0.5 text-[13px] font-semibold text-foreground/70">ready in your queue</p>
      </div>

      <div className="mt-8">{nav}</div>

      <div className="mt-auto space-y-3 pt-8">
        <div className="rounded-2xl bg-butter p-4 ring-1 ring-border">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Responsible AI
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-pretty text-foreground/70">
            Koketso drafts and summarizes. You verify and stay accountable for every decision.
          </p>
        </div>
        <button
          onClick={() => signOut.mutate()}
          className="w-full rounded-xl px-3 py-2 text-left text-[13px] font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/70 px-5 py-6 lg:flex">
        {sidebarBody}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex w-72 flex-col border-r border-border bg-card px-5 py-6">
            <button
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground"
            >
              <X className="size-5" />
            </button>
            {sidebarBody}
          </aside>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 pb-5 pt-6 sm:px-8 sm:pt-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              className="grid size-10 shrink-0 place-items-center rounded-2xl bg-card ring-1 ring-border lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-muted-foreground">{eyebrow}</p>
              <h1 className="mt-1 truncate font-display text-2xl font-semibold leading-tight sm:text-3xl">
                {title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {action}
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent font-display text-lg font-semibold text-accent-foreground">
              {initial}
            </div>
          </div>
        </header>
        <div className="px-4 pb-10 sm:px-8">{children}</div>
      </main>
    </div>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] font-semibold text-pretty text-muted-foreground", className)}>
      AI can make mistakes. Review every schedule, summary and recommendation before acting on it —
      you stay accountable for the decision.
    </p>
  );
}
