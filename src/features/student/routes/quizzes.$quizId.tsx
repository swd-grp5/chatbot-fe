import { createFileRoute } from "@tanstack/react-router";
import { StudentQuizTakePage } from "@/features/student/pages/quiz-take-page";
import { redirectNonStudentFromStudentRoute } from "@/features/student/routes/student-route-guard";

export type StudentQuizTakeSearch = {
  attempt?: string;
};

export const Route = createFileRoute("/quizzes/$quizId")({
  beforeLoad: redirectNonStudentFromStudentRoute,
  validateSearch: (search: Record<string, unknown>): StudentQuizTakeSearch => {
    const attempt = typeof search.attempt === "string" ? search.attempt.trim() : "";
    return attempt ? { attempt } : {};
  },
  component: StudentQuizTakeRoute,
});

function StudentQuizTakeRoute() {
  const { quizId } = Route.useParams();
  const { attempt } = Route.useSearch();
  return <StudentQuizTakePage quizId={quizId} attemptId={attempt} />;
}
