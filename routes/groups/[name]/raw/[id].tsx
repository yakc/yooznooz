import { FreshContext } from "$fresh/server.ts";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import { default as newsBack } from "yooznooz/lib/proc_back.ts";
import { name2Group } from "yooznooz/routes/groups/[name].tsx";

export async function handler(
  req: Request,
  ctx: FreshContext,
): Promise<Response> {
  const my = new MyCookies(req);
  if (!my.origins.length) {
    const url = new URL("/servers", req.url);
    return Response.redirect(url);
  }
  const [origin, _] = name2Group(my, ctx);
  const id = decodeURIComponent(ctx.params.id);
  try {
    const { headers, body } = await newsBack.raw(origin, id);
    const content = headers.concat([""], body).join("\r\n");
    return new Response(content, {
      headers: { "Content-Disposition": `attachment; filename=${id};` },
    });
  } catch (x) {
    return new Response(String(x), { status: 400 });
  }
}
