import { createFileRoute } from "@tanstack/react-router";
import { StudentSubscriptionsPage } from "@/features/student/pages/subscriptions-page";

export const Route = createFileRoute("/subscriptions")({
  component: StudentSubscriptionsPage,
});
