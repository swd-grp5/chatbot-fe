import { createFileRoute } from "@tanstack/react-router";
import { StudentQuizzesPage } from "@/features/student/pages/quizzes-page";
import { redirectNonStudentFromStudentRoute } from "@/features/student/routes/student-route-guard";

export const Route = createFileRoute("/quizzes")({
  beforeLoad: redirectNonStudentFromStudentRoute,
  component: StudentQuizzesPage,
});
