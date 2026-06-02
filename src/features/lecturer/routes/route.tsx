import { createFileRoute } from "@tanstack/react-router";
import { RoleGuardLayout } from "@/shared/components/layout/role-guard-layout";

export const Route = createFileRoute("/lecturer")({
  component: LecturerLayout,
});

function LecturerLayout() {
  return <RoleGuardLayout role="lecturer" />;
}
