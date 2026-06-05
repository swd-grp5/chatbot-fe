import { apiFetch, apiUpload } from "@/shared/lib/api-client";
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
  const name = file?.originalFileName ?? doc.title;

  return {
    id: doc.id,
    name,
    type: typeMap[doc.documentType] ?? "pdf",
    course: doc.subjectCode,
    size,
    uploadedAt: doc.createdAt.slice(0, 10),
    status: apiStatusToDocStatus[doc.status] ?? "uploaded",
    chunks: doc.totalChunks,
    active: doc.active,
  };
}

export function isAllowedUploadFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return !!ext && ALLOWED_UPLOAD_EXTENSIONS.has(ext);
}

export async function uploadDocument(file: File, token: string) {
  const formData = new FormData();
  formData.append("files", file);
  return apiUpload<DocumentResponse>("/documents/upload", formData, { token });
}

export type FetchDocumentsParams = {
  keyword?: string;
  status?: ApiDocumentStatus;
  active?: boolean;
};

export async function fetchDocuments(token: string, params?: FetchDocumentsParams) {
  const search = new URLSearchParams({ page: "0", size: "100", sortBy: "createdAt", sortDir: "desc" });
  if (params?.keyword?.trim()) search.set("keyword", params.keyword.trim());
  if (params?.status) search.set("status", params.status);
  if (params?.active != null) search.set("active", String(params.active));
  return apiFetch<PageResponse<DocumentResponse>>(`/documents?${search}`, { token });
}

export async function deleteDocument(id: string, token: string) {
  return apiFetch<void>(`/documents/${id}`, { method: "DELETE", token });
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
