import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { getPaginationItems } from "@/shared/lib/pagination";
import { cn } from "@/shared/lib/utils";

type TablePaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
};

export function TablePagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  className,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const items = getPaginationItems(page, totalPages);

  const navButtonClass =
    "h-7 w-7 rounded-md border border-border bg-secondary text-foreground shadow-sm hover:bg-secondary/90";

  const pageButtonClass =
    "h-7 w-7 rounded-md border border-border bg-secondary text-foreground shadow-sm hover:bg-secondary/90";

  return (
    <div className={cn("flex items-center justify-end gap-1 px-3 py-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={navButtonClass}
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || page <= 0}
        aria-label="Trang trước"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-0.5 text-xs tracking-widest text-foreground/70"
            aria-hidden
          >
            …
          </span>
        ) : (
          <Button
            key={item}
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "text-xs font-semibold",
              item === page
                ? "h-7 w-7 rounded-md border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                : pageButtonClass,
            )}
            onClick={() => onPageChange(item)}
            disabled={disabled || item === page}
            aria-label={`Trang ${item + 1}`}
            aria-current={item === page ? "page" : undefined}
          >
            {item + 1}
          </Button>
        ),
      )}

      <Button
        type="button"
        variant="outline"
        size="icon"
        className={navButtonClass}
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || page >= totalPages - 1}
        aria-label="Trang sau"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
