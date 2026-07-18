import { apiFetch } from "@/shared/lib/api-client";
import type { SubjectOption } from "@/features/lecturer/api/subject-api";

export async function fetchMySubjects() {
  const rows = await apiFetch<SubjectOption[]>("/students/my-subjects");
  return [...rows].sort((a, b) => a.code.localeCompare(b.code));
}
