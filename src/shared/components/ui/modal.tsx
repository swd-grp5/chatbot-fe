import * as React from "react";

import { cn } from "@/shared/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";

export const MODAL_OVERLAY_CLASS = "bg-black/30";

type ModalContentProps = React.ComponentPropsWithoutRef<typeof DialogContent>;

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  ModalContentProps
>(({ overlayClassName, ...props }, ref) => (
  <DialogContent
    ref={ref}
    overlayClassName={cn(MODAL_OVERLAY_CLASS, overlayClassName)}
    {...props}
  />
));
ModalContent.displayName = "ModalContent";

export {
  Dialog as Modal,
  DialogClose as ModalClose,
  DialogDescription as ModalDescription,
  DialogFooter as ModalFooter,
  DialogHeader as ModalHeader,
  DialogTitle as ModalTitle,
  DialogTrigger as ModalTrigger,
  ModalContent,
};
