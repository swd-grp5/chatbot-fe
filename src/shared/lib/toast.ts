export type ToastType = "success" | "error" | "info";

type ShowToast = (message: string, type: ToastType) => void;

let showToastImpl: ShowToast | null = null;

export function bindToast(show: ShowToast) {
  showToastImpl = show;
}

export function unbindToast() {
  showToastImpl = null;
}

export const toast = {
  success: (message: string) => showToastImpl?.(message, "success"),
  error: (message: string) => showToastImpl?.(message, "error"),
  info: (message: string) => showToastImpl?.(message, "info"),
};
