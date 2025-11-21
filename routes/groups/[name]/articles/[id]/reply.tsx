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
  const ruler = `font-mono col-span-6 text-gray-500 text-opacity-25`;
  const btn = `px-1 py-1 border(gray-100 1) hover:bg-gray-200 max-w-sm`;
  const lbl = `col-span-1 text-right`;
  const val = `col-start-2 col-span-2`;
  const formatter = MyCookies.formatter(my.lang);
  const ago = formatter.agoLongTerm(article.date);
  return (
    <>
      <Head>
        <title>
          Re: {unRe(article.subject)} | {whoFrom(article.from)} | YoozNooz
        </title>
      </Head>
      <form class="container grid gap-4 px-2 mt-1" method="POST" action={"/api/post/" + host} >
        <label class={lbl}>Subject</label>
        <input class={val} name="subject" type="text" value={"Re: " + unRe(article.subject)}/>
        <span class="col-span-3"></span>
        <label class={lbl + " text-xs"}>In-Reply-To</label>
        <span class={val + " font-mono text-xs"}>{article.id}</span>
        <span class="col-span-3"></span>
        <p class={ruler}>123456789 123456789 123456789 123456789 123456789 123456789 123456789 12</p>
        <textarea name="body" class="font-mono col-span-4 max-w-4xl h-64">{quote(article, ago)}</textarea>
        <p class={ruler}>123456789 123456789 123456789 123456789 123456789 123456789 123456789 12</p>
        <button type="submit" class={btn}>Post</button>
        <input name="name" type="text" placeholder="name" class="colspan-2"/>
        <input name="email" type="email" placeholder="email" class="colspan-2"/>
        <input name="references" type="hidden" value={article.references.join(" ")}/>
        <input name="reply" type="hidden" value={article.id}/>
        <input name="group" type="hidden" value={article.group.name}/>
      </form>
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
