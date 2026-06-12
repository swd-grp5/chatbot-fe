import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { ToastType } from "@/shared/lib/toast";

type ToastProps = {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
  duration?: number;
};

const typeConfig: Record<
  ToastType,
  { icon: string; iconClass: string; progressClass: string }
> = {
  success: {
    icon: "✓",
    iconClass: "bg-green-500",
    progressClass: "bg-green-500",
  },
  error: {
    icon: "!",
    iconClass: "bg-red-500",
    progressClass: "bg-red-500",
  },
  info: {
    icon: "i",
    iconClass: "bg-blue-500",
    progressClass: "bg-blue-500",
  },
};

export function Toast({ id, message, type, onClose, duration = 4000 }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const remainingMsRef = useRef(duration);
  const config = typeConfig[type];

  useEffect(() => {
    if (isHovered) return;

    const startTime = Date.now();
    const startRemaining = remainingMsRef.current;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, startRemaining - elapsed);
      remainingMsRef.current = remaining;
      setProgress((remaining / duration) * 100);

      if (remaining <= 0) {
        clearInterval(interval);
        onClose(id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [id, onClose, duration, isHovered]);

  return (
    <div
      className="animate-toast-slide-in relative min-w-[200px] max-w-[320px] overflow-hidden rounded-lg bg-card text-card-foreground shadow-lg"
      role="alert"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-3 px-3 py-2.5 pr-8">
        <div
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
            config.iconClass,
          )}
        >
          {config.icon}
        </div>
        <span className="flex-1 text-[13px] leading-tight">{message}</span>
      </div>

      <button
        type="button"
        onClick={() => onClose(id)}
        className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Đóng thông báo"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="h-1 bg-border">
        <div
          className={cn("h-full transition-all duration-100 ease-linear", config.progressClass)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
