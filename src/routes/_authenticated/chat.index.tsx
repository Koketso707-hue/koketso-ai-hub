import { createFileRoute } from "@tanstack/react-router";

import { ChatLanding } from "@/components/ChatWorkspace";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "AI Chat — Koketso AI Assistant" },
      {
        name: "description",
        content:
          "Chat with an AI workplace assistant across saved conversations for drafting, planning and problem solving.",
      },
      { property: "og:title", content: "AI Chat — Koketso AI Assistant" },
      {
        property: "og:description",
        content: "An interactive AI workplace assistant with saved conversation threads.",
      },
    ],
  }),
  component: ChatLanding,
});
