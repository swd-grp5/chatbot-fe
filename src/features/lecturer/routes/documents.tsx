import { createFileRoute } from "@tanstack/react-router";
import { LecturerDocumentsPage } from "@/features/lecturer/pages/documents-page";

export const Route = createFileRoute("/lecturer/documents")({
  component: LecturerDocumentsPage,
});
