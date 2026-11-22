import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import {
  unRe,
  whoFrom,
} from "yooznooz/lib/model.ts";
import { default as wrappedBack } from "yooznooz/lib/proc_wrap.ts";
import { ExtArticle } from "yooznooz/lib/ware.ts";
import { name2Group } from "yooznooz/routes/groups/[name].tsx";
import Compose from "yooznooz/islands/Compose.tsx";

export const handler: Handlers = {
  async GET(req: Request, ctx: FreshContext) {
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
    const response = await ctx.render({ my, article });
    return response;
  },
};

export interface ReplyProps {
  my: MyCookies;
  article: ExtArticle;
}

export default function Reply(props: PageProps<ReplyProps>) {
  const { my, article } = props.data;
  const host = article.group.origin.host;
  const formatter = MyCookies.formatter(my.lang);
  const ago = formatter.agoLongTerm(article.date);
  return (
    <>
      <Head>
        <title>
          Re: {unRe(article.subject)} | {whoFrom(article.from)} | YoozNooz
        </title>
      </Head>
      <Compose
        host={host!}
        group={article.group.name}
        subject={"Re: " + unRe(article.subject)}
        body={quote(article, ago)}
        inReplyTo={article.id}
        references={article.references}
      />
    </>
  );
}

function quote(article: ExtArticle, ago: string) {
  const slug = article.from.name + " wrote:\n";
  const quoted = article.body.trim().split("\n").map(line => "> " + line).join("\n");
  if (ago) {
    return `${ago} ${slug}${quoted}`;
  }
  return slug + quoted;
}
