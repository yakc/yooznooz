/** @jsx h */
import { h } from "preact";
import { HandlerContext, Handlers, PageProps } from "$fresh/server.ts";
import { tw } from "@twind";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import {
  NewsGroup,
  NewsGroupArticle,
  NewsOrigin,
  unquoteName,
} from "yooznooz/lib/model.ts";
import { default as newsBack } from "yooznooz/lib/proc_back.ts";

export interface ArticleProps {
  article: NewsGroupArticle;
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
    const generator = newsBack.articles(origin, [[group, id]]);
    const start = Date.now();
    let timer = 0;
    const article = await Promise.race([
      new Promise<NewsGroupArticle | null>((resolve) =>
        timer = setTimeout(() => {
          console.log(
            `waited too long for article in ${group.name} from ${origin.host}`,
          );
          resolve(null);
        }, 7500)
      ),
      generator.next().then((i) => i.value as NewsGroupArticle)
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

export default function Article(props: PageProps<NewsGroupArticle>) {
  const lbl = tw`col-span-1 text-right`;
  const val = tw`col-start-2 col-span-5`;
  return (
    <form class={tw`container grid gap-4 px-2`}>
      <label class={lbl}>Date</label>
      <span class={val}>{props.data.date.toLocaleString()}</span>
      <label class={lbl}>From</label>
      <span class={val}>
        {unquoteName(props.data.from)} &lt;{props.data.from.email}&gt;
      </span>
      <label class={lbl}>Subject</label>
      <span class={val}>{props.data.subject}</span>
      <pre class={tw`col-span-6 whitespace-pre-wrap`}>{props.data.body}</pre>
    </form>
  );
}
