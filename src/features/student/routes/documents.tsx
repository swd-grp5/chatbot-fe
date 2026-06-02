import { createFileRoute } from "@tanstack/react-router";
import { StudentDocumentsPage } from "@/features/student/pages/documents-page";

export const Route = createFileRoute("/documents")({
  component: StudentDocumentsPage,
});
