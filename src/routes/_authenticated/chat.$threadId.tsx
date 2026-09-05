import { createFileRoute } from "@tanstack/react-router";

import { ChatThread } from "@/components/ChatWorkspace";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Conversation — Koketso AI Assistant" },
      {
        name: "description",
        content: "An ongoing conversation with your AI workplace assistant.",
      },
      { property: "og:title", content: "Conversation — Koketso AI Assistant" },
      {
        property: "og:description",
        content: "An ongoing conversation with your AI workplace assistant.",
      },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  return <ChatThread threadId={threadId} />;
}
