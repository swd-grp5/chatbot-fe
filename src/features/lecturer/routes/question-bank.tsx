import { createFileRoute } from "@tanstack/react-router";
import { LecturerQuestionBankPage } from "@/features/lecturer/pages/question-bank-page";

export const Route = createFileRoute("/lecturer/question-bank")({
  component: LecturerQuestionBankPage,
});
