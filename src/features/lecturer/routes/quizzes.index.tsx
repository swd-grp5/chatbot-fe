import { createFileRoute } from "@tanstack/react-router";
import { LecturerQuizzesPage } from "@/features/lecturer/pages/quizzes-page";

export const Route = createFileRoute("/lecturer/quizzes/")({
  component: LecturerQuizzesPage,
});
