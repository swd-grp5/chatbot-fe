import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/wallet")({
  component: WalletLayout,
});

function WalletLayout() {
  return <Outlet />;
}
