import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/lecturer/quizzes")({
  component: LecturerQuizzesLayout,
});

function LecturerQuizzesLayout() {
  return <Outlet />;
}
