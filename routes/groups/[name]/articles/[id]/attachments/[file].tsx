import { HandlerContext } from "$fresh/server.ts";
import { Buffer } from "$std/node/buffer.ts";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import {
  collateAttachmentNames,
  NewsGroup,
  NewsOrigin,
} from "yooznooz/lib/model.ts";
import { default as wrappedBack } from "yooznooz/lib/proc_wrap.ts";

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
  const group: NewsGroup = { origin, name: ctx.params.name };
  const id = decodeURIComponent(ctx.params.id);
  const article = (await wrappedBack.article(origin, group, id)).value;
  if (!article) {
    return new Response(null, { status: 429 });
  }
  const attachments = article.ext.attach || [];
  const names = collateAttachmentNames(attachments);
  const index = names.indexOf(ctx.params.file);
  if (index < 0) {
    return new Response(null, { status: 404 });
  }
  const attach = attachments[index];
  const filename = attach.name || ctx.params.file;
  if (attach.contentEncoding === "base64") {
    const content = Buffer.from(attach.data, "base64");
    return new Response(content, {
      headers: { "Content-Disposition": `attachment; filename=${filename};` },
    });
  }
  return new Response(
    `unsupported content encoding: ${attach.contentEncoding}`,
    { status: 400 },
  );
}
