import { createFileRoute, Outlet } from "@tanstack/react-router";
import { redirectNonStudentFromStudentRoute } from "@/features/student/routes/student-route-guard";

export const Route = createFileRoute("/quizzes")({
  beforeLoad: redirectNonStudentFromStudentRoute,
  component: StudentQuizzesLayout,
});

function StudentQuizzesLayout() {
  return <Outlet />;
}
