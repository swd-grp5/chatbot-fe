import { createFileRoute } from "@tanstack/react-router";
import { AdminSubscriptionsPage } from "@/features/admin/pages/subscriptions-page";

export const Route = createFileRoute("/admin/subscriptions")({
  component: AdminSubscriptionsPage,
});
