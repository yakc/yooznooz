export interface PendingAttachment {
  id: string;
  file: File;
  filename: string;
  contentType: string;
  size: number;
  objectUrl?: string;
  textPreview?: string;
  textTruncated?: boolean;
}

const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/ld+json",
  "application/xml",
  "application/xhtml+xml",
  "application/javascript",
  "application/typescript",
  "application/x-javascript",
  "application/x-sh",
  "application/x-yaml",
  "application/yaml",
  "application/toml",
  "application/sql",
]);

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "tsv",
  "log",
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "rb",
  "rs",
  "go",
  "java",
  "c",
  "h",
  "cpp",
  "hpp",
  "html",
  "htm",
  "css",
  "scss",
  "xml",
  "svg",
  "yml",
  "yaml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "sh",
  "bash",
  "ps1",
  "sql",
  "diff",
  "patch",
]);

const TEXT_PREVIEW_BYTES = 4096;

export function isTextFile(file: File): boolean {
  if (file.type.startsWith("text/") || TEXT_MIME_TYPES.has(file.type)) {
    return true;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TEXT_EXTENSIONS.has(ext);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

export async function createPendingAttachment(
  file: File,
): Promise<PendingAttachment> {
  const contentType = file.type || "application/octet-stream";
  const base: PendingAttachment = {
    id: crypto.randomUUID(),
    file,
    filename: file.name || "attachment",
    contentType,
    size: file.size,
  };

  if (
    contentType.startsWith("image/") ||
    contentType.startsWith("audio/") ||
    contentType.startsWith("video/")
  ) {
    base.objectUrl = URL.createObjectURL(file);
  } else if (isTextFile(file)) {
    const slice = file.slice(0, TEXT_PREVIEW_BYTES);
    base.textPreview = await slice.text();
    base.textTruncated = file.size > TEXT_PREVIEW_BYTES;
  }

  return base;
}

export function revokeAttachmentUrl(att: PendingAttachment): void {
  if (att.objectUrl) {
    URL.revokeObjectURL(att.objectUrl);
  }
}

export function uniqueFilename(
  desired: string,
  existingNames: Set<string>,
): string {
  const base = desired.trim() || "attachment";
  if (!existingNames.has(base)) {
    return base;
  }
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  let n = 2;
  let candidate = `${stem}-${n}${ext}`;
  while (existingNames.has(candidate)) {
    n++;
    candidate = `${stem}-${n}${ext}`;
  }
  return candidate;
}
