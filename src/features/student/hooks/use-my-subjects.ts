import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMySubjects } from "@/features/student/api/student-api";
import { studentMySubjectsQueryKey } from "@/shared/lib/query-client";

export { studentMySubjectsQueryKey };

export function useStudentMySubjects(enabled = true) {
  return useQuery({
    queryKey: studentMySubjectsQueryKey,
    queryFn: fetchMySubjects,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useInvalidateStudentMySubjects() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: studentMySubjectsQueryKey });
}
