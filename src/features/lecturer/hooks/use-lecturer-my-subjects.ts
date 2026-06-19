import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLecturerMySubjects } from "@/features/lecturer/api/subject-api";
import { lecturerMySubjectsQueryKey } from "@/shared/lib/query-client";

export { lecturerMySubjectsQueryKey };

export function useLecturerMySubjects(enabled = true) {
  return useQuery({
    queryKey: lecturerMySubjectsQueryKey,
    queryFn: fetchLecturerMySubjects,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useInvalidateLecturerMySubjects() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: lecturerMySubjectsQueryKey });
}
