/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { HandlerContext, Handlers, PageProps } from "$fresh/server.ts";
import { tw } from "@twind";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import {
  NewsGroup,
  NewsOrigin,
  unquoteString,
  whoFrom,
} from "yooznooz/lib/model.ts";
import { default as wrappedBack } from "yooznooz/lib/proc_wrap.ts";
import { ArticleExt, ExtArticle } from "yooznooz/lib/ware.ts";

export interface ArticleProps {
  my: MyCookies;
  article: ExtArticle;
}

export const handler: Handlers = {
  async GET(req: Request, ctx: HandlerContext) {
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
    const response = await ctx.render({ my, article });
    return response;
  },
};

function extDescription(ext: ArticleExt) {
  const images = ext.img || [];
  if (images.length) {
    if (images.length > 1) {
      return `${images.length} images`;
    }
    return "1 image";
  } else if (ext.multipart) {
    return "multi-part";
  }
  return "";
}

export default function Article(props: PageProps<ArticleProps>) {
  const { my, article } = props.data;
  const signature = article.ext.sig || "";
  const images = article.ext.img || [];
  const lbl = tw`col-span-1 text-right`;
  const val = tw`col-start-2 col-span-5`;
  return (
    <>
      <form class={tw`container grid gap-4 px-2`}>
        <label class={lbl}>Date</label>
        <span class={tw`col-start-2 col-span-3`}>
          {MyCookies.formatter(my.lang).date(article.date)}
        </span>
        <span class={tw`col-start-6`}>{extDescription(article.ext)}</span>
        <label class={lbl}>From</label>
        <span class={val}>
          {whoFrom(article.from)} &lt;{article.from.email}&gt;
        </span>
        <label class={lbl}>Subject</label>
        <span class={val}>{article.subject}</span>
        <pre class={tw`col-span-6 whitespace-pre-wrap mt-3`}>
          <p>{article.body.trim()}</p>
          <p style="font-size: x-small">{signature.trim()}</p>
        </pre>
      </form>
      {images.length > 0 &&
        <hr class={tw`my-2`} />}
      {images.map((m) => (
        <div class={tw`py-2 px-2`}>
          <p>{unquoteString(m.name)}</p>
          <img src={`data:${m.contentType};${m.contentEncoding},${m.data}`} />
        </div>
      ))}
    </>
  );
}
