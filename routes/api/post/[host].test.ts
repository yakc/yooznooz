import { assert, assertEquals, assertExists } from "@std/assert";
import { STATUS_CODE } from "@std/http/status";
import { buildPostMessage, parseRequest } from "yooznooz/routes/api/post/[host].ts";

Deno.test("parseRequest handles multipart/form-data with attachments and edited filenames", async () => {
  const form = new FormData();
  form.set("group", "alt.test");
  form.set("name", "Alice");
  form.set("email", "alice@example.com");
  form.set("subject", "Hello with attachment");
  form.set("body", "See attached.");
  form.append(
    "attachments",
    new File([new Uint8Array([1, 2, 3, 4])], "renamed.bin", {
      type: "application/octet-stream",
    }),
  );

  const req = new Request("http://localhost/api/post/news.example.com", {
    method: "POST",
    body: form,
  });

  const [status, composed, resp] = await parseRequest(req);
  assertEquals(status, STATUS_CODE.SeeOther);
  assertEquals(resp.ok, true);
  assertExists(composed);
  assertEquals(composed.attachments?.length, 1);
  assertEquals(composed.attachments?.[0].filename, "renamed.bin");
  assertEquals(composed.attachments?.[0].data, new Uint8Array([1, 2, 3, 4]));

  const msg = buildPostMessage(composed);
  assert(msg.headers[0].startsWith("Subject: Hello with attachment"));
  assert(msg.headers.some((h) => h === "MIME-Version: 1.0"));
  assert(msg.headers.some((h) => h.startsWith("Content-Type: multipart/mixed;")));
  assert(msg.body.some((l) => l.includes('filename="renamed.bin"')));
});

Deno.test("parseRequest allows empty body when attachment is present", async () => {
  const form = new FormData();
  form.set("group", "alt.test");
  form.set("name", "Alice");
  form.set("email", "alice@example.com");
  form.set("subject", "Attachment only");
  form.set("body", "");
  form.append(
    "attachments",
    new File(["hi"], "note.txt", { type: "text/plain" }),
  );

  const req = new Request("http://localhost/api/post/news.example.com", {
    method: "POST",
    body: form,
  });

  const [status, composed, resp] = await parseRequest(req);
  assertEquals(status, STATUS_CODE.SeeOther);
  assertEquals(resp.ok, true);
  assertExists(composed);
  assertEquals(composed.attachments?.length, 1);
});

Deno.test("parseRequest ignores empty file inputs", async () => {
  const form = new FormData();
  form.set("group", "alt.test");
  form.set("name", "Alice");
  form.set("email", "alice@example.com");
  form.set("subject", "No attachment");
  form.set("body", "Just text");
  form.append("attachments", new File([], ""));

  const req = new Request("http://localhost/api/post/news.example.com", {
    method: "POST",
    body: form,
  });

  const [status, composed, resp] = await parseRequest(req);
  assertEquals(status, STATUS_CODE.SeeOther);
  assertEquals(resp.ok, true);
  assertExists(composed);
  assertEquals(composed.attachments, undefined);

  const msg = buildPostMessage(composed);
  assertEquals(msg.body, ["Just text"]);
  assert(!msg.headers.some((h) => h.startsWith("Content-Type: multipart/mixed")));
});
