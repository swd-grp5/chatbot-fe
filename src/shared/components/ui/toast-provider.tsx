import { useCallback, useEffect, useState, type ReactNode } from "react";
import { bindToast, unbindToast, type ToastType } from "@/shared/lib/toast";
import { Toast } from "@/shared/components/ui/toast";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

let lastToastTime = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType) => {
    const currentTime = Date.now();
    if (currentTime - lastToastTime < 2000) {
      return;
    }

    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    lastToastTime = currentTime;
  }, []);

  useEffect(() => {
    bindToast(showToast);
    return () => unbindToast();
  }, [showToast]);

  return (
    <>
      {children}
      <div className="fixed right-4 top-4 z-9999 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={removeToast}
          />
        ))}
      </div>
    </>
  );
}
