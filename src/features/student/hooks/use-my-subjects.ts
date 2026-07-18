import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMySubjects } from "@/features/student/api/student-api";
import { getApiSession } from "@/features/auth/lib/auth-session";
import { studentMySubjectsQueryKey } from "@/shared/lib/query-client";

export { studentMySubjectsQueryKey };

export function useStudentMySubjects(enabled = true) {
  return useQuery({
    queryKey: studentMySubjectsQueryKey,
    queryFn: async () => {
      const role = getApiSession()?.user.role;
      if (role && role !== "STUDENT") {
        return [];
      }
      return fetchMySubjects();
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useInvalidateStudentMySubjects() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: studentMySubjectsQueryKey });
}
