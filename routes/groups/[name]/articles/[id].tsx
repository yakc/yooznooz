/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { HandlerContext, Handlers, PageProps } from "$fresh/server.ts";
import { tw } from "@twind";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import {
  NewsGroup,
  NewsImage,
  NewsOrigin,
  unquoteString,
  whoFrom,
} from "yooznooz/lib/model.ts";
import { default as wrappedBack } from "yooznooz/lib/proc_wrap.ts";
import { NewsExt, WareExt, WrappedArticle } from "yooznooz/lib/ware.ts";

export interface ArticleProps {
  article: WrappedArticle;
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
    const generator = wrappedBack.articles(origin, [[group, id]]);
    const start = Date.now();
    let timer = 0;
    const article = await Promise.race([
      new Promise<WrappedArticle | null>((resolve) =>
        timer = setTimeout(() => {
          console.log(
            `waited too long for article in ${group.name} from ${origin.host}`,
          );
          resolve(null);
        }, 7500)
      ),
      generator.next().then((i) => i.value as WrappedArticle)
        .then((a) => {
          console.log(
            `resolve (${
              Date.now() - start
            } ms) article in ${group.name} from origin ${origin.host}: ${a?.body
              ?.length}`,
          );
          clearTimeout(timer);
          return a;
        }).catch((x) => {
          console.log(
            `reject  (${
              Date.now() - start
            } ms) article in ${group.name} from origin ${origin.host}`,
            String(x),
          );
          clearTimeout(timer);
          return null;
        }).finally(() => generator.return(undefined)),
    ]);
    if (!article) {
      return new Response(null, { status: 429 });
    }
    const response = await ctx.render(article);
    return response;
  },
};

function extDescription(ext: NewsExt) {
  const images = (ext.img || []) as NewsImage[];
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

export default function Article(props: PageProps<WrappedArticle>) {
  const images = (props.data.ext.img || []) as NewsImage[];
  const lbl = tw`col-span-1 text-right`;
  const val = tw`col-start-2 col-span-5`;
  return (
    <>
      <form class={tw`container grid gap-4 px-2`}>
        <label class={lbl}>Date</label>
        <span class={tw`col-start-2 col-span-3`}>
          {props.data.date.toLocaleString()}
        </span>
        <span class={tw`col-start-6`}>{extDescription(props.data.ext)}</span>
        <label class={lbl}>From</label>
        <span class={val}>
          {whoFrom(props.data.from)} &lt;{props.data.from.email}&gt;
        </span>
        <label class={lbl}>Subject</label>
        <span class={val}>{props.data.subject}</span>
        <pre class={tw`col-span-6 whitespace-pre-wrap mt-3`}>
          {props.data.body.trim()}
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
