import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";

export type DocumentsViewMode = "table" | "cards";

type DocumentsViewToggleProps = {
  value: DocumentsViewMode;
  onChange: (value: DocumentsViewMode) => void;
  disabled?: boolean;
};

export function DocumentsViewToggle({ value, onChange, disabled }: DocumentsViewToggleProps) {
  return (
    <div className="flex items-center rounded-md border border-border p-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0",
              value === "table" && "bg-secondary text-foreground",
            )}
            onClick={() => onChange("table")}
            disabled={disabled}
            aria-pressed={value === "table"}
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Danh sách</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0",
              value === "cards" && "bg-secondary text-foreground",
            )}
            onClick={() => onChange("cards")}
            disabled={disabled}
            aria-pressed={value === "cards"}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Thẻ xem trước</TooltipContent>
      </Tooltip>
    </div>
  );
}
