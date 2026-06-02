import { createFileRoute } from "@tanstack/react-router";
import { ChatPage } from "@/features/student/pages/chat-page";

export const Route = createFileRoute("/")({
  component: ChatPage,
});
