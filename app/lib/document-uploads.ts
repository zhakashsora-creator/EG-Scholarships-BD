export const DOCUMENT_CHUNK_BYTES = 512 * 1024;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

const ACCEPTED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export function safeDocumentFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
}

export function normalizedDocumentMime(filename: string, suppliedMime: string) {
  if (ACCEPTED_DOCUMENT_TYPES.has(suppliedMime)) return suppliedMime;
  const extension = filename.toLowerCase().split(".").pop() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "";
}

export async function documentOwnerPrefix(email: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase()));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function documentChunkKey(uploadId: string, index: number) {
  return `pending-uploads/${uploadId}/${String(index).padStart(4, "0")}.part`;
}
