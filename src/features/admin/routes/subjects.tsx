import { createFileRoute } from "@tanstack/react-router";
import { AdminSubjectsPage } from "@/features/admin/pages/subjects-page";

export const Route = createFileRoute("/admin/subjects")({
  component: AdminSubjectsPage,
});
