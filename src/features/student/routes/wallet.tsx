import { createFileRoute } from "@tanstack/react-router";
import { StudentWalletPage } from "@/features/student/pages/wallet-page";

export const Route = createFileRoute("/wallet")({
  component: StudentWalletPage,
});
