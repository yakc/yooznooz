import { useRef, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";

export interface AttachmentDropZoneProps {
  onFiles: (files: FileList | File[]) => void;
  disabled?: boolean;
}

export default function AttachmentDropZone(props: AttachmentDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const handleDragEnter = (e: JSX.TargetedDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (props.disabled) return;
    dragDepth.current++;
    setDragging(true);
  };

  const handleDragOver = (e: JSX.TargetedDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = props.disabled ? "none" : "copy";
    }
  };

  const handleDragLeave = (e: JSX.TargetedDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setDragging(false);
    }
  };

  const handleDrop = (e: JSX.TargetedDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    if (props.disabled) return;
    const files = e.dataTransfer?.files;
    if (files?.length) {
      props.onFiles(files);
    }
  };

  const handleFileChange = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (input.files?.length) {
      props.onFiles(input.files);
      input.value = "";
    }
  };

  const zoneClass = dragging
    ? "border-2 border-dashed border-blue-500 bg-blue-50"
    : "border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-400";

  return (
    <div
      class={`${zoneClass} rounded p-3 flex flex-wrap items-center justify-between gap-3 transition-colors`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div class="text-sm text-gray-600">
        {dragging
          ? "Drop files to attach"
          : "Drag and drop files here, paste an image, or choose files"}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        class="hidden"
        disabled={props.disabled}
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => inputRef.current?.click()}
        class="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
      >
        Choose file…
      </button>
    </div>
  );
}
