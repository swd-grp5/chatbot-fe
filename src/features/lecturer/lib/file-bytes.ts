export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isPdfBytes(data: ArrayBuffer): boolean {
  if (data.byteLength < 4) return false;
  const view = new Uint8Array(data, 0, 4);
  return (
    view[0] === 0x25 &&
    view[1] === 0x50 &&
    view[2] === 0x44 &&
    view[3] === 0x46
  );
}

export function isZipBytes(data: ArrayBuffer): boolean {
  if (data.byteLength < 2) return false;
  const view = new Uint8Array(data, 0, 2);
  return view[0] === 0x50 && view[1] === 0x4b;
}

export function toDocxBlob(data: Blob | ArrayBuffer, mimeType?: string): Blob {
  if (data instanceof Blob) {
    if (data.type && data.type !== "application/octet-stream") return data;
    return new Blob([data], { type: mimeType ?? DOCX_MIME });
  }
  return new Blob([data], { type: mimeType ?? DOCX_MIME });
}
