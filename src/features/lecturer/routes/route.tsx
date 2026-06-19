import { createFileRoute } from "@tanstack/react-router";
import { RoleGuardLayout } from "@/shared/components/layout/role-guard-layout";
import { redirectNonLecturerFromLecturerRoute } from "@/features/lecturer/routes/lecturer-route-guard";

export const Route = createFileRoute("/lecturer")({
  beforeLoad: redirectNonLecturerFromLecturerRoute,
  component: LecturerLayout,
});

function LecturerLayout() {
  return <RoleGuardLayout role="lecturer" />;
}
