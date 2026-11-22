import { formatBytes, PendingAttachment } from "yooznooz/lib/attachments.ts";

export interface AttachmentListProps {
  attachments: PendingAttachment[];
  onRename: (id: string, filename: string) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const LARGE_TOTAL_BYTES = 10 * 1024 * 1024;

function AttachmentPreview({ att }: { att: PendingAttachment }) {
  if (att.contentType.startsWith("image/") && att.objectUrl) {
    return (
      <div class="mt-2 flex justify-center bg-white border border-gray-200 rounded p-1">
        <img
          src={att.objectUrl}
          alt={att.filename}
          class="max-h-40 max-w-full object-contain rounded"
        />
      </div>
    );
  }
  if (att.contentType.startsWith("audio/") && att.objectUrl) {
    return (
      <div class="mt-2">
        <audio controls src={att.objectUrl} class="w-full" />
      </div>
    );
  }
  if (att.contentType.startsWith("video/") && att.objectUrl) {
    return (
      <div class="mt-2">
        <video controls src={att.objectUrl} class="max-h-40 w-full rounded bg-black" />
      </div>
    );
  }
  if (att.textPreview !== undefined) {
    return (
      <pre class="mt-2 text-xs font-mono bg-white border border-gray-200 rounded p-2 max-h-36 overflow-auto whitespace-pre-wrap break-all text-gray-700">
        {att.textPreview}
        {att.textTruncated ? "\n…" : ""}
      </pre>
    );
  }
  return (
    <div class="mt-2 text-xs text-gray-500 bg-white border border-gray-200 rounded px-2 py-1.5 font-mono truncate">
      {att.contentType} ({formatBytes(att.size)})
    </div>
  );
}

export default function AttachmentList(props: AttachmentListProps) {
  const { attachments, onRename, onRemove, disabled } = props;
  const totalBytes = attachments.reduce((sum, a) => sum + a.size, 0);
  const nameCounts = new Map<string, number>();
  for (const att of attachments) {
    const key = att.filename.trim() || att.file.name || "attachment";
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }
  const hasDuplicates = Array.from(nameCounts.values()).some((c) => c > 1);

  return (
    <section aria-label="Pending attachments" class="border border-gray-200 rounded bg-gray-50 p-3">
      <div class="flex items-baseline justify-between mb-2">
        <h2 class="text-sm font-semibold text-gray-800">
          Attachments ({attachments.length})
        </h2>
        {attachments.length > 0 && (
          <span class="text-xs text-gray-500">
            {formatBytes(totalBytes)}
          </span>
        )}
      </div>

      {totalBytes > LARGE_TOTAL_BYTES && (
        <p class="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          Total size exceeds 10 MB; some news servers may reject large posts.
        </p>
      )}

      {hasDuplicates && (
        <p class="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          Duplicate attachment filenames; consider renaming so recipients can distinguish them.
        </p>
      )}

      {attachments.length === 0
        ? (
          <p class="text-xs text-gray-500 py-4 text-center border border-dashed border-gray-300 rounded bg-white">
            No pending attachments.
          </p>
        )
        : (
          <ul class="space-y-3">
            {attachments.map((att) => (
              <li
                key={att.id}
                class="bg-white border border-gray-200 rounded p-2.5 shadow-sm min-w-0 overflow-hidden"
              >
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    value={att.filename}
                    disabled={disabled}
                    aria-label={`Filename for ${att.file.name}`}
                    placeholder={att.file.name}
                    onInput={(e) => onRename(att.id, e.currentTarget.value)}
                    class="flex-1 min-w-0 text-sm font-mono px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                  />
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemove(att.id)}
                    title="Remove attachment"
                    aria-label={`Remove ${att.filename}`}
                    class="px-2 py-1 text-xs text-red-700 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50 shrink-0"
                  >
                    Remove
                  </button>
                </div>
                <div class="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span class="truncate">{att.contentType}</span>
                  <span class="shrink-0 ml-2">{formatBytes(att.size)}</span>
                </div>
                <AttachmentPreview att={att} />
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
