import { createFileRoute } from "@tanstack/react-router";
import { AdminStudentsPage } from "@/features/admin/pages/students-page";

export const Route = createFileRoute("/admin/users")({
  component: AdminStudentsPage,
});
