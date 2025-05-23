import { FreshContext } from "$fresh/server.ts";
import { default as codec } from "yooznooz/lib/codec.ts";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import { collateAttachmentNames } from "yooznooz/lib/model.ts";
import { default as wrappedBack } from "yooznooz/lib/proc_wrap.ts";
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
  const [origin, group] = name2Group(my, ctx);
  const id = decodeURIComponent(ctx.params.id);
  const article = (await wrappedBack.article(origin, group, id)).value;
  if (!article) {
    return new Response(null, { status: 429 });
  }
  const attachments = article.ext.attach || [];
  const names = collateAttachmentNames(attachments);
  const index = names.indexOf(decodeURIComponent(ctx.params.file));
  if (index < 0) {
    return new Response(null, { status: 404 });
  }
  const attach = attachments[index];
  const c = codec(attach.contentEncoding);
  if (typeof c === "string") {
    return new Response(c, { status: 400 });
  }
  const content = c.decode(attach.data);
  const filename = attach.name || ctx.params.file;
  return new Response(content, {
    headers: { "Content-Disposition": `attachment; filename=${filename};` },
  });
}
