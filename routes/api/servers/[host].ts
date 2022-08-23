import { HandlerContext } from "$fresh/server.ts";
import { default as newsBack } from "yooznooz/lib/proc_back.ts";

export const handler = async (
  _req: Request,
  ctx: HandlerContext,
): Promise<Response> => {
  const host = ctx.params.host;
  console.log("host", host);
  const groups = await newsBack.groups({ host });
  const body = {
    kind: "Collection#Group",
    items: groups.map(({ name, high, low, count }) => ({
      name,
      high,
      low,
      count,
    })),
  };
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
};
