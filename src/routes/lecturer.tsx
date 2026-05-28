import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useRole } from "@/lib/use-role";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/lecturer")({
  component: LecturerLayout,
});

function LecturerLayout() {
  const { loading, isLecturer } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isLecturer) navigate({ to: "/" });
  }, [loading, isLecturer, navigate]);

  if (loading || !isLecturer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <Outlet />;
}
