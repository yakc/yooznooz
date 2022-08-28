import { HandlerContext } from "$fresh/server.ts";
import { default as wrappedBack } from "yooznooz/lib/proc_wrap.ts";

export const handler = async (
  _req: Request,
  ctx: HandlerContext,
): Promise<Response> => {
  const host = ctx.params.host;
  const groups = await wrappedBack.groups({ host });
  if (groups.err) {
    return new Response(JSON.stringify({ error: groups.err }), { status: 400 });
  }
  const body = {
    kind: "Collection#Group",
    items: groups.value.map(({ name, high, low, count }) => ({
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
