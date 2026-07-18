import { createFileRoute } from "@tanstack/react-router";
import { AdminRolesPage } from "@/features/admin/pages/roles-page";

export const Route = createFileRoute("/admin/roles")({
  component: AdminRolesPage,
});
