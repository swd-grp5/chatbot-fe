import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** Chiều cao hiển thị (px). Ảnh header đã render 2x để không bị mờ khi thu nhỏ. */
  height?: number;
};

export function Logo({ className, height = 48 }: LogoProps) {
  return (
    <img
      src="/logo-header.png"
      alt="EduBuddy"
      height={height}
      decoding="async"
      className={cn("w-auto max-w-none object-contain", className)}
      style={{ height, width: "auto" }}
    />
  );
}
