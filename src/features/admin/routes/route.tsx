import { createFileRoute } from "@tanstack/react-router";
import { RoleGuardLayout } from "@/shared/components/layout/role-guard-layout";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return <RoleGuardLayout role="admin" />;
}
