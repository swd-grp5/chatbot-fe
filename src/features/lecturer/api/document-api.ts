import { apiFetch, apiFetchBlob, apiUpload } from "@/shared/lib/api-client";
import type { Doc, DocStatus } from "@/shared/lib/mock-data";

export const ALLOWED_UPLOAD_EXTENSIONS = new Set(["pdf", "docx", "txt"]);

export type ApiDocumentStatus = "UPLOADED" | "PROCESSING" | "INDEXED" | "FAILED";

export const DOCUMENT_STATUS_OPTIONS: { value: ApiDocumentStatus; label: string }[] = [
  { value: "UPLOADED", label: "Mới upload" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "INDEXED", label: "Sẵn sàng" },
  { value: "FAILED", label: "Lỗi" },
];

export type ApiDocumentType = "PDF" | "DOCX" | "PPTX" | "TXT" | "OTHER";

export const DOCUMENT_TYPE_OPTIONS: { value: ApiDocumentType; label: string }[] = [
  { value: "PDF", label: "PDF" },
  { value: "DOCX", label: "DOCX" },
  { value: "PPTX", label: "PPTX" },
  { value: "TXT", label: "TXT" },
  { value: "OTHER", label: "OTHER" },
];

export type DocumentFileResponse = {
  id: string;
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  createdAt: string;
};

export type DocumentResponse = {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  title: string;
  description: string | null;
  documentType: ApiDocumentType;
  status: ApiDocumentStatus;
  totalPages: number;
  totalChunks: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  files: DocumentFileResponse[];
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

export const apiStatusToDocStatus: Record<ApiDocumentStatus, DocStatus> = {
  UPLOADED: "uploaded",
  PROCESSING: "processing",
  INDEXED: "indexed",
  FAILED: "failed",
};

const typeMap: Record<ApiDocumentType, Doc["type"]> = {
  PDF: "pdf",
  DOCX: "docx",
  PPTX: "pptx",
  TXT: "txt",
  OTHER: "pdf",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function mapDocumentResponse(doc: DocumentResponse): Doc {
  const file = doc.files[0];
  const size = file ? formatFileSize(file.fileSize) : "—";
  const fileName = file?.originalFileName;
  const name = doc.title || fileName || "—";

  return {
    id: doc.id,
    name,
    title: doc.title,
    description: doc.description,
    type: typeMap[doc.documentType] ?? "pdf",
    course: doc.subjectCode,
    size,
    uploadedAt: doc.createdAt.slice(0, 10),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    status: apiStatusToDocStatus[doc.status] ?? "uploaded",
    chunks: doc.totalChunks,
    active: doc.active,
  };
}

export function isAllowedUploadFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return !!ext && ALLOWED_UPLOAD_EXTENSIONS.has(ext);
}

export type UploadDocumentItem = {
  file: File;
  title: string;
  description?: string;
};

async function uploadDocumentsBatch(items: UploadDocumentItem[], token: string) {
  const metadata = items.map(({ title, description }) => ({
    title,
    description: description?.trim() || "",
  }));

  const formData = new FormData();
  formData.append(
    "data",
    new File([JSON.stringify(metadata)], "data.json", { type: "application/json" }),
  );
  for (const { file } of items) {
    formData.append("files", file, file.name);
  }

  return apiUpload<DocumentResponse | DocumentResponse[]>("/documents/upload", formData, { token });
}

export async function uploadDocuments(items: UploadDocumentItem[], token: string) {
  if (items.length === 0) {
    throw new Error("No files to upload");
  }
  if (items.length === 1) {
    return uploadDocumentsBatch(items, token);
  }

  // Backend validates metadata.length === files.length per request; upload one file at a time.
  const results: DocumentResponse[] = [];
  for (const item of items) {
    const res = await uploadDocumentsBatch([item], token);
    results.push(Array.isArray(res) ? res[0] : res);
  }
  return results;
}

export async function uploadDocument(
  file: File,
  token: string,
  meta: { title: string; description?: string },
) {
  return uploadDocuments([{ file, ...meta }], token);
}

export type DocumentSortField = "title" | "status" | "documentType" | "createdAt" | "updatedAt";
export type SortDirection = "asc" | "desc";

export const DEFAULT_DOCUMENT_PAGE_SIZE = 10;

export type FetchDocumentsParams = {
  keyword?: string;
  status?: ApiDocumentStatus;
  documentType?: ApiDocumentType;
  active?: boolean;
  sortBy?: DocumentSortField;
  sortDir?: SortDirection;
  page?: number;
  size?: number;
};

export async function fetchDocuments(token: string, params?: FetchDocumentsParams) {
  const search = new URLSearchParams({
    page: String(params?.page ?? 0),
    size: String(params?.size ?? DEFAULT_DOCUMENT_PAGE_SIZE),
  });
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.sortDir) search.set("sortDir", params.sortDir);
  if (params?.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params?.status) search.set("status", params.status);
  if (params?.documentType) search.set("documentType", params.documentType);
  if (params?.active != null) search.set("active", String(params.active));
  return apiFetch<PageResponse<DocumentResponse>>(`/documents?${search}`, { token });
}

export async function deleteDocument(id: string, token: string) {
  return apiFetch<void>(`/documents/${id}`, { method: "DELETE", token });
}

export type UpdateDocumentPayload = {
  title: string;
  description?: string;
  active: boolean;
};

export async function updateDocumentApi(
  id: string,
  token: string,
  payload: UpdateDocumentPayload,
) {
  return apiFetch<DocumentResponse>(`/documents/${id}`, {
    method: "PUT",
    token,
    body: JSON.stringify({
      title: payload.title,
      description: payload.description?.trim() ?? "",
      active: payload.active,
    }),
  });
}

export async function toggleDocumentActive(id: string, token: string) {
  return apiFetch<DocumentResponse>(`/documents/${id}/toggle-active`, { method: "PATCH", token });
}

export type DocumentChunkResponse = {
  id: string;
  documentId: string;
  chunkIndex: number;
  chunkType: "TEXT" | string;
  content: string;
  pageStart: number | null;
  pageEnd: number | null;
  tokenCount: number;
  startCharIndex: number;
  endCharIndex: number;
  metadataJson: string | null;
  createdAt: string;
};

export async function fetchDocumentChunks(documentId: string, token: string) {
  return apiFetch<DocumentChunkResponse[]>(`/documents/${documentId}/chunks`, { token });
}

export type DocumentViewerResponse = {
  id: string;
  title: string;
  description: string | null;
  documentType: ApiDocumentType;
  totalPages: number;
  fileId: string;
  fileName: string;
  mimeType: string;
};

export async function fetchDocumentViewer(documentId: string, token: string) {
  return apiFetch<DocumentViewerResponse>(`/documents/${documentId}/viewer`, { token });
}

export async function fetchDocumentFile(documentId: string, token: string) {
  return apiFetchBlob(`/documents/${documentId}/view`, { token });
}
