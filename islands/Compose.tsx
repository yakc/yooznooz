import { useEffect, useRef, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import AttachmentDropZone from "yooznooz/components/AttachmentDropZone.tsx";
import AttachmentList from "yooznooz/components/AttachmentList.tsx";
import {
  createPendingAttachment,
  PendingAttachment,
  revokeAttachmentUrl,
  uniqueFilename,
} from "yooznooz/lib/attachments.ts";
import type { PostResponse } from "yooznooz/routes/api/post/[host].ts";

export interface ComposeProps {
  host: string;
  group: string;
  subject?: string;
  body?: string;
  inReplyTo?: string;
  references: string[];
}

function formatPostError(resp: PostResponse, status: number): string {
  const parts: string[] = [];
  if (resp.message) parts.push(resp.message);
  if (resp.missing?.length) parts.push(`missing: ${resp.missing.join(", ")}`);
  if (resp.empty?.length) parts.push(`empty: ${resp.empty.join(", ")}`);
  if (resp.invalid?.length) parts.push(`invalid: ${resp.invalid.join(", ")}`);
  return parts.length ? parts.join("; ") : `Post failed (HTTP ${status})`;
}

export default function Compose(props: ComposeProps) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const attachmentsRef = useRef<PendingAttachment[]>([]);
  attachmentsRef.current = attachments;

  useEffect(() => {
    return () => {
      for (const att of attachmentsRef.current) {
        revokeAttachmentUrl(att);
      }
    };
  }, []);

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    const added = await Promise.all(files.map(createPendingAttachment));
    setAttachments((prev) => {
      const used = new Set(
        prev.map((a) => a.filename.trim() || a.file.name || "attachment"),
      );
      const deduped = added.map((att) => {
        const filename = uniqueFilename(att.filename, used);
        used.add(filename);
        return filename === att.filename ? att : { ...att, filename };
      });
      return [...prev, ...deduped];
    });
    setError(undefined);
  };

  const renameAttachment = (id: string, filename: string) => {
    setAttachments((prev) =>
      prev.map((att) => (att.id === id ? { ...att, filename } : att))
    );
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((att) => att.id === id);
      if (target) revokeAttachmentUrl(target);
      return prev.filter((att) => att.id !== id);
    });
  };

  const handlePaste = (e: JSX.TargetedClipboardEvent<HTMLDivElement>) => {
    const files = e.clipboardData?.files;
    if (files?.length) {
      addFiles(files);
      if (!e.clipboardData?.getData("text/plain")) {
        e.preventDefault();
      }
    }
  };

  const handleSubmit = async (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(undefined);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      formData.delete("attachments");
      for (const att of attachments) {
        const name = att.filename.trim() || att.file.name || "attachment";
        formData.append("attachments", att.file, name);
      }

      const res = await fetch(form.action, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        globalThis.location.href = res.redirected
          ? res.url
          : `/groups/${props.group}@${props.host}`;
        return;
      }

      let message = `Post failed (HTTP ${res.status})`;
      try {
        const json = (await res.json()) as PostResponse;
        message = formatPostError(json, res.status);
      } catch {
        // Response was not JSON; keep HTTP status message.
      }
      setError(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const ruler = "font-mono px-2 border border-transparent text-gray-500 text-opacity-25 select-none overflow-hidden whitespace-nowrap";
  const btn = "px-3 py-1 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50";
  const input = "px-2 py-1 border border-gray-300 rounded";

  return (
    <div
      class="w-full max-w-screen-2xl mx-auto px-3 mt-1 pt-2 flex flex-col lg:flex-row gap-4 items-start"
      onPaste={handlePaste}
    >
      <form
        class="flex-1 min-w-0 lg:min-w-[43rem] w-full max-w-4xl flex flex-col gap-3"
        method="POST"
        action={"/api/post/" + props.host}
        encType="multipart/form-data"
        onSubmit={handleSubmit}
      >
        <div class="grid grid-cols-6 gap-2 items-center">
          <label class="col-span-1 text-right text-sm">Subject</label>
          <input
            class={`col-span-5 ${input}`}
            name="subject"
            type="text"
            value={props.subject}
          />
          {props.inReplyTo && (
            <>
              <label class="col-span-1 text-right text-xs">In-Reply-To</label>
              <span class="col-span-5 font-mono text-xs truncate">
                {props.inReplyTo}
              </span>
            </>
          )}
        </div>

        <div>
          <p class={ruler}>
            123456789 123456789 123456789 123456789 123456789 123456789 123456789 12
          </p>
          <textarea
            name="body"
            class="font-mono w-full h-64 p-2 border border-gray-300 rounded"
          >
            {props.body}
          </textarea>
          <p class={ruler}>
            123456789 123456789 123456789 123456789 123456789 123456789 123456789 12
          </p>
        </div>

        <AttachmentDropZone onFiles={addFiles} disabled={submitting} />

        {error && (
          <div
            role="alert"
            class="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2"
          >
            {error}
          </div>
        )}

        <div class="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={submitting} class={btn}>
            {submitting ? "Posting…" : "Post"}
          </button>
          <input
            name="name"
            type="text"
            placeholder="name"
            class={`flex-1 min-w-[10rem] ${input}`}
          />
          <input
            name="email"
            type="email"
            placeholder="email"
            class={`flex-1 min-w-[10rem] ${input}`}
          />
        </div>

        <input
          name="references"
          type="hidden"
          value={props.references.join(" ")}
        />
        <input name="reply" type="hidden" value={props.inReplyTo} />
        <input name="group" type="hidden" value={props.group} />
      </form>

      <aside class="w-full lg:w-64 xl:w-72 shrink-0 min-w-0 overflow-hidden">
        <AttachmentList
          attachments={attachments}
          onRename={renameAttachment}
          onRemove={removeAttachment}
          disabled={submitting}
        />
      </aside>
    </div>
  );
}
