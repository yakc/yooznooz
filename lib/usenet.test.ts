import { parseHeaders } from "./usenet.ts";
import NNTP from "nntp";
import { parse } from "https://deno.land/std@0.148.0/flags/mod.ts";
import {
  assert,
  assertExists,
} from "https://deno.land/std@0.148.0/testing/asserts.ts";

const args = parse(Deno.args);
assertExists(args.host);
assertExists(args.group);

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
