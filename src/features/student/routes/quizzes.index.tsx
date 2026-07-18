import { createFileRoute } from "@tanstack/react-router";
import { StudentQuizzesPage } from "@/features/student/pages/quizzes-page";

export const Route = createFileRoute("/quizzes/")({
  component: StudentQuizzesPage,
});
