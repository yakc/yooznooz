import { assert, assertEquals, assertExists } from "@std/assert";
import {
  createPendingAttachment,
  formatBytes,
  isTextFile,
  revokeAttachmentUrl,
  uniqueFilename,
} from "yooznooz/lib/attachments.ts";

Deno.test("formatBytes formats B, KB, and MB", () => {
  assertEquals(formatBytes(0), "0 B");
  assertEquals(formatBytes(512), "512 B");
  assertEquals(formatBytes(1536), "1.5 KB");
  assertEquals(formatBytes(150 * 1024), "150 KB");
  assertEquals(formatBytes(2.5 * 1024 * 1024), "2.5 MB");
});

Deno.test("isTextFile detects MIME types and extensions", () => {
  assert(isTextFile(new File(["hi"], "note.txt", { type: "text/plain" })));
  assert(isTextFile(new File(["{}"], "data.json", { type: "application/json" })));
  assert(isTextFile(new File(["const x = 1;"], "mod.ts", { type: "" })));
  assert(!isTextFile(new File([new Uint8Array([1, 2, 3])], "pic.png", { type: "image/png" })));
  assert(!isTextFile(new File([new Uint8Array([1, 2, 3])], "archive.bin")));
});

Deno.test("createPendingAttachment generates text preview and truncates large text", async () => {
  const small = new File(["hello\nworld"], "hello.txt", { type: "text/plain" });
  const attSmall = await createPendingAttachment(small);
  assertEquals(attSmall.filename, "hello.txt");
  assertEquals(attSmall.textPreview, "hello\nworld");
  assertEquals(attSmall.textTruncated, false);
  assertEquals(attSmall.objectUrl, undefined);

  const bigContent = "a".repeat(5000);
  const big = new File([bigContent], "big.log", { type: "text/plain" });
  const attBig = await createPendingAttachment(big);
  assertExists(attBig.textPreview);
  assertEquals(attBig.textPreview.length, 4096);
  assertEquals(attBig.textTruncated, true);
});

Deno.test("createPendingAttachment creates and revokes objectUrl for images", async () => {
  const img = new File([new Uint8Array([137, 80, 78, 71])], "cat.png", {
    type: "image/png",
  });
  const att = await createPendingAttachment(img);
  assertExists(att.objectUrl);
  assertEquals(att.textPreview, undefined);
  revokeAttachmentUrl(att);
});

Deno.test("uniqueFilename auto-suffixes duplicate names", () => {
  const used = new Set(["image.png", "README", ".gitignore"]);
  assertEquals(uniqueFilename("photo.jpg", used), "photo.jpg");
  assertEquals(uniqueFilename("image.png", used), "image-2.png");
  used.add("image-2.png");
  assertEquals(uniqueFilename("image.png", used), "image-3.png");
  assertEquals(uniqueFilename("README", used), "README-2");
  assertEquals(uniqueFilename(".gitignore", used), ".gitignore-2");
});
