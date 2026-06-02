import { useEffect, useRef, useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";

const GOOGLE_BUTTON_MAX_WIDTH = 400;

type GoogleSignInButtonProps = {
  onSuccess: (response: CredentialResponse) => void;
  onError: () => void;
  useOneTap?: boolean;
};

export function GoogleSignInButton({ onSuccess, onError, useOneTap = true }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(GOOGLE_BUTTON_MAX_WIDTH);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const width = Math.floor(el.getBoundingClientRect().width);
      setButtonWidth(Math.min(Math.max(width, 240), GOOGLE_BUTTON_MAX_WIDTH));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full [&>div]:!w-full [&>div>div]:!w-full">
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        useOneTap={useOneTap}
        theme="outline"
        size="large"
        text="signin_with"
        shape="rectangular"
        width={buttonWidth}
      />
    </div>
  );
}
