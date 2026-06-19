import { createFileRoute } from "@tanstack/react-router";
import { StudentDocumentsPage } from "@/features/student/pages/documents-page";
import { redirectNonStudentFromStudentRoute } from "@/features/student/routes/student-route-guard";

export const Route = createFileRoute("/documents")({
  beforeLoad: redirectNonStudentFromStudentRoute,
  component: StudentDocumentsPage,
});
