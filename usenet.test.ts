import { parseHeaders } from "./usenet.ts";
import NNTP from "https://raw.githubusercontent.com/yakc/deno-nntp/main/nntp.ts";
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
  const article = await nntp.article(String(numbers.high));
  console.log("article", article.headers);
  const headers = parseHeaders(article);
  console.log("headers", headers);
  assertExists(headers.from.email);
  assert(headers.date.getDate() > 0, `invalid date`);
  assertExists(headers.subject);
  return nntp.disconnect();
});
