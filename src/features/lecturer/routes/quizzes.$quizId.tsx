import { createFileRoute } from "@tanstack/react-router";
import { LecturerQuizEditPage } from "@/features/lecturer/pages/quiz-edit-page";

export const Route = createFileRoute("/lecturer/quizzes/$quizId")({
  component: LecturerQuizEditRoute,
});

function LecturerQuizEditRoute() {
  const { quizId } = Route.useParams();
  return <LecturerQuizEditPage quizId={quizId} />;
}
