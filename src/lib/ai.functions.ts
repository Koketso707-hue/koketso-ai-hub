import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { streamText } from "ai";
import { z } from "zod";

const RESPONSIBLE_AI_SYSTEM =
  "You are Koketso, an AI research and productivity assistant for working professionals. " +
  "Be concise, concrete and practical. Never invent statistics, citations, quotes or sources; " +
  "when you are uncertain say so plainly and describe how the reader could verify it. " +
  "Do not give medical, legal or financial advice as if it were professional counsel.";

async function runGateway(system: string, prompt: string) {
  const { createLovableAiGatewayProvider, requireGatewayKey, CHAT_MODEL, GATEWAY_PROVIDER_OPTIONS } =
    await import("./ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(requireGatewayKey());
  const result = streamText({
    model: gateway(CHAT_MODEL),
    system,
    prompt,
    providerOptions: GATEWAY_PROVIDER_OPTIONS as unknown as Record<
      string,
      Record<string, unknown>
    >,
  });
  return await result.text;
}

function section(text: string, name: string) {
  const re = new RegExp(`###\\s*${name}\\s*([\\s\\S]*?)(?=###\\s*[A-Z]|$)`, "i");
  return (text.match(re)?.[1] ?? "").trim();
}

/* --------------------------- research assistant --------------------------- */

export const generateResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        topic: z.string().trim().min(3).max(200),
        source: z.string().trim().max(12000).optional().default(""),
        audience: z.string().trim().max(120).optional().default("My team"),
        depth: z.enum(["Brief", "Standard", "Deep dive"]).default("Standard"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const prompt = [
      `TOPIC: ${data.topic}`,
      `AUDIENCE: ${data.audience}`,
      `DEPTH: ${data.depth}`,
      data.source ? `SOURCE MATERIAL (summarise only what is here):\n${data.source}` : "",
      "",
      "Respond in exactly this structure, using markdown bullet points inside each section:",
      "### SUMMARY",
      "3-6 bullets capturing what matters.",
      "### INSIGHTS",
      "3-4 bullets on patterns, tensions or risks, each with a short 'why it matters'.",
      "### RECOMMENDATIONS",
      "3 bullets, each a concrete next action the audience can take this week.",
    ]
      .filter(Boolean)
      .join("\n");

    const text = await runGateway(RESPONSIBLE_AI_SYSTEM, prompt);

    const summary = section(text, "SUMMARY") || text;
    const insights = section(text, "INSIGHTS");
    const recommendations = section(text, "RECOMMENDATIONS");

    const { data: row, error } = await context.supabase
      .from("research_items")
      .insert({
        user_id: context.userId,
        topic: data.topic,
        prompt,
        audience: data.audience,
        depth: data.depth,
        summary,
        insights,
        recommendations,
      })
      .select(
        "id, topic, prompt, audience, depth, summary, insights, recommendations, created_at",
      )
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ------------------------------ plan generator ----------------------------- */

const planTask = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().max(40).default("Focus"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  start_time: z.string().max(8).optional().nullable(),
  end_time: z.string().max(8).optional().nullable(),
  day_offset: z.number().int().min(0).max(6).default(0),
  notes: z.string().max(400).optional().nullable(),
});

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        goals: z.string().trim().min(3).max(4000),
        horizon: z.enum(["day", "week"]).default("day"),
        workingHours: z.string().trim().max(60).default("09:00-17:00"),
        startDate: z.string().min(8).max(10),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const prompt = [
      `Build a prioritised ${data.horizon === "day" ? "single-day" : "5 working day"} schedule.`,
      `START DATE: ${data.startDate}`,
      `WORKING HOURS: ${data.workingHours}`,
      `GOALS AND CONTEXT FROM THE USER:\n${data.goals}`,
      "",
      "Rules: highest-impact deep work early; group shallow work; never overlap time blocks;",
      `use day_offset 0 only${data.horizon === "week" ? ", up to 4 for later days" : ""}.`,
      "Return ONLY a JSON array (no prose, no code fence) of objects with keys:",
      'title, category, priority ("high"|"medium"|"low"), start_time ("HH:MM"), end_time ("HH:MM"), day_offset, notes.',
      "Maximum 10 items.",
    ].join("\n");

    const text = await runGateway(RESPONSIBLE_AI_SYSTEM, prompt);
    const jsonText = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);

    let parsed: z.infer<typeof planTask>[];
    try {
      parsed = z.array(planTask).max(10).parse(JSON.parse(jsonText));
    } catch {
      throw new Error("The assistant returned an unreadable plan. Try rephrasing your goals.");
    }

    const base = new Date(`${data.startDate}T00:00:00Z`);
    const rows = parsed.map((t, i) => {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() + (data.horizon === "week" ? t.day_offset : 0));
      return {
        user_id: context.userId,
        title: t.title,
        notes: t.notes ?? null,
        priority: t.priority,
        category: t.category,
        scheduled_date: d.toISOString().slice(0, 10),
        start_time: t.start_time ?? null,
        end_time: t.end_time ?? null,
        position: i,
      };
    });

    const { error } = await context.supabase.from("tasks").insert(rows);
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });
