import type { ReactNode } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  if (!clientId) {
    return <>{children}</>;
  }
  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}

export function isGoogleAuthConfigured() {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
}
