import { createFileRoute } from "@tanstack/react-router";
import { AdminLecturersPage } from "@/features/admin/pages/lecturers-page";

export const Route = createFileRoute("/admin/lecturers")({
  component: AdminLecturersPage,
});
