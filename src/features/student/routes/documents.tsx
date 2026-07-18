import { createFileRoute } from "@tanstack/react-router";
import { StudentDocumentsPage } from "@/features/student/pages/documents-page";
import { redirectNonStudentFromStudentRoute } from "@/features/student/routes/student-route-guard";

export type StudentDocumentsSearch = {
  subject?: string;
};

export const Route = createFileRoute("/documents")({
  beforeLoad: redirectNonStudentFromStudentRoute,
  validateSearch: (search: Record<string, unknown>): StudentDocumentsSearch => {
    const subject = typeof search.subject === "string" ? search.subject.trim() : "";
    return subject ? { subject } : {};
  },
  component: StudentDocumentsPage,
});
