import { createFileRoute } from "@tanstack/react-router";
import { AdminAIConfigPage } from "@/features/admin/pages/ai-config-page";

export const Route = createFileRoute("/admin/ai-config")({
  component: AdminAIConfigPage,
});
