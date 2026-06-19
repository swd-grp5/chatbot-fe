import { createFileRoute } from "@tanstack/react-router";
import { LecturerDocumentsPage } from "@/features/lecturer/pages/documents-page";

export type LecturerDocumentsSearch = {
  subject?: string;
};

export const Route = createFileRoute("/lecturer/documents")({
  validateSearch: (search: Record<string, unknown>): LecturerDocumentsSearch => {
    const subject = typeof search.subject === "string" ? search.subject.trim() : "";
    return subject ? { subject } : {};
  },
  component: LecturerDocumentsPage,
});
