import { isZipBytes, toDocxBlob } from "@/features/lecturer/lib/file-bytes";

type RenderOptions = {
  compact?: boolean;
  ignoreFonts?: boolean;
  renderHeaders?: boolean;
  renderFooters?: boolean;
};

async function renderOnce(
  blob: Blob,
  bodyContainer: HTMLElement,
  styleContainer: HTMLElement,
  options: RenderOptions,
) {
  const { renderAsync } = await import("docx-preview");
  const compact = options.compact ?? false;

  bodyContainer.replaceChildren();
  styleContainer.replaceChildren();

  await renderAsync(blob, bodyContainer, styleContainer, {
    className: "docx",
    inWrapper: true,
    breakPages: true,
    renderHeaders: options.renderHeaders ?? true,
    renderFooters: options.renderFooters ?? true,
    renderFootnotes: true,
    renderEndnotes: true,
    useBase64URL: true,
    ignoreWidth: compact,
    ignoreHeight: compact,
    ignoreFonts: options.ignoreFonts ?? false,
    ignoreLastRenderedPageBreak: false,
    trimXmlDeclaration: true,
  });
}

export async function renderDocxPreview(
  data: Blob | ArrayBuffer,
  bodyContainer: HTMLElement,
  styleContainer: HTMLElement,
  compact = false,
) {
  const blob = toDocxBlob(data);
  const buffer =
    data instanceof ArrayBuffer ? data : await data.arrayBuffer().catch(() => null);

  if (buffer && !isZipBytes(buffer)) {
    throw new Error("File is not a valid DOCX archive");
  }

  try {
    await renderOnce(blob, bodyContainer, styleContainer, { compact });
  } catch {
    await renderOnce(blob, bodyContainer, styleContainer, {
      compact,
      ignoreFonts: true,
      renderHeaders: false,
      renderFooters: false,
    });
  }
}
