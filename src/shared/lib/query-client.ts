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

export function resetMySubjectsQueries() {
  void queryClient.removeQueries({ queryKey: studentMySubjectsQueryKey });
  void queryClient.removeQueries({ queryKey: lecturerMySubjectsQueryKey });
}
