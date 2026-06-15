import { createFileRoute } from "@tanstack/react-router";
import { WalletCheckoutPage } from "@/features/student/pages/wallet-checkout-page";

export const Route = createFileRoute("/wallet/checkout")({
  component: WalletCheckoutPage,
  validateSearch: (search) => search as Record<string, string>,
});
