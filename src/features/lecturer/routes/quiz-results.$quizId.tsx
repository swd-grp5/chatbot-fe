import { createFileRoute } from "@tanstack/react-router";
import { LecturerQuizResultsPage } from "@/features/lecturer/pages/quiz-results-page";

export const Route = createFileRoute("/lecturer/quiz-results/$quizId")({
  component: LecturerQuizResultsRoute,
});

function LecturerQuizResultsRoute() {
  const { quizId } = Route.useParams();
  return <LecturerQuizResultsPage quizId={quizId} />;
}
