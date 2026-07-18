import { createFileRoute } from "@tanstack/react-router";
import { ChatPage } from "@/features/student/pages/chat-page";
import { redirectNonStudentFromStudentRoute } from "@/features/student/routes/student-route-guard";

export const Route = createFileRoute("/")({
  beforeLoad: redirectNonStudentFromStudentRoute,
  component: ChatPage,
});
