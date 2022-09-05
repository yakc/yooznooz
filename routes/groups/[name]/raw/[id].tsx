import { HandlerContext } from "$fresh/server.ts";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import { NewsOrigin } from "yooznooz/lib/model.ts";
import { default as newsBack } from "yooznooz/lib/proc_back.ts";

export async function handler(
  req: Request,
  ctx: HandlerContext,
): Promise<Response> {
  const my = new MyCookies(req);
  if (!my.origins.length) {
    const url = new URL("/servers", req.url);
    return Response.redirect(url);
  }
  const origin: NewsOrigin = { host: my.origins[0].host };
  const id = decodeURIComponent(ctx.params.id);
  try {
    const { headers, body } = await newsBack.raw(origin, id);
    const content = headers.concat([""], body).join("\r\n");
    return new Response(content, {
      headers: { "Content-Disposition": `attachment; filename=${id};` },
    });
  } catch (x) {
    return new Response(x.toString(), { status: 400 });
  }
}
