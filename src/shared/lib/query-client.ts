import { QueryClient } from "@tanstack/react-query";

export const studentMySubjectsQueryKey = ["student", "my-subjects"] as const;
export const lecturerMySubjectsQueryKey = ["lecturer", "my-subjects"] as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

/** Hủy + xóa cache môn học — tránh refetch bằng token/role mới khi còn observer cũ. */
export function resetMySubjectsQueries() {
  void queryClient.cancelQueries({ queryKey: studentMySubjectsQueryKey });
  void queryClient.cancelQueries({ queryKey: lecturerMySubjectsQueryKey });
  queryClient.removeQueries({ queryKey: studentMySubjectsQueryKey, exact: true });
  queryClient.removeQueries({ queryKey: lecturerMySubjectsQueryKey, exact: true });
}
