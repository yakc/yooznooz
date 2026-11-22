import { parseHeaders } from "./usenet.ts";
import NNTP from "nntp";
import { parseArgs } from "@std/cli/parse-args";
import {
  assert,
  assertExists,
} from "@std/assert";

const args = parseArgs(Deno.args);
assertExists(args.host, "requires --host");
assertExists(args.group, "requires --group");

Deno.test("parses headers", async () => {
  const nntp = new NNTP({
    host: args.host,
  });

  await nntp.connectAndAuthenticate();
  const numbers = await nntp.group(args.group);
  const id = args.article || String(numbers.high);
  const article = await nntp.article(id);
  console.log("article", article.headers);
  const headers = parseHeaders(article);
  console.log("headers", headers);
  assertExists(headers.from.email);
  assert(headers.date.getDate() > 0, `invalid date`);
  assertExists(headers.subject);
  return nntp.disconnect();
});
