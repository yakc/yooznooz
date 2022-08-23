import back from "./proc_back.ts";
import { parse } from "https://deno.land/std@0.148.0/flags/mod.ts";
import { assertExists } from "https://deno.land/std@0.148.0/testing/asserts.ts";

const args = parse(Deno.args);
assertExists(args.host);
assertExists(args.group);

Deno.test("proc_back", async () => {
  const origin = { host: args.host };
  const groups = await back.groups(origin);
  console.log("groups", groups);
  const group = groups.find((g) => g.name === args.group);
  assertExists(group);
  const overview = await back.overview(group, { slice: -5 });
  console.log("overview", overview);
  for await (
    const article of back.articles(origin, overview.map((o) => [group, o.id]))
  ) {
    console.log(article);
  }
  return back.stop();
});
