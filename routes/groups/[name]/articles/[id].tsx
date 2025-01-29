import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import { nonbreak } from "yooznooz/lib/format.ts";
import {
  collateAttachments,
  NewsArticleID,
  NewsAttachment,
  unRe,
  whoFrom,
} from "yooznooz/lib/model.ts";
import { default as wrappedBack } from "yooznooz/lib/proc_wrap.ts";
import { ArticleExt, ExtArticle } from "yooznooz/lib/ware.ts";
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

function extDescription(ext: ArticleExt) {
  const images = ext.img || [];
  const attachments = ext.attach || [];
  if (images.length) {
    if (images.length > 1) {
      return `${images.length} images`;
    }
    return "1 image";
  } else if (attachments.length) {
    if (attachments.length > 1) {
      return `${attachments.length} attachments`;
    }
    return "1 attachment";
  } else if (ext.multipart) {
    return "multi-part";
  }
  return "";
}

export interface ArticleProps {
  my: MyCookies;
  article: ExtArticle;
}

export default function Article(props: PageProps<ArticleProps>) {
  const { my, article } = props.data;
  const signature = article.ext.sig || "";
  const images = article.ext.img || [];
  const attachments = article.ext.attach || [];
  const lbl = `col-span-1 text-right`;
  const val = `col-start-2 col-span-5`;
  const formatter = MyCookies.formatter(my.lang);
  return (
    <>
      <Head>
        <title>
          {unRe(article.subject)} | {whoFrom(article.from)} | YoozNooz
        </title>
      </Head>
      <form class="container grid gap-4 px-2 mt-1">
        <label class={lbl}>Date</label>
        <span class="col-start-2 col-span-4">
          {formatter.date(article.date)}
        </span>
        <span class="col-start-6">
          {nonbreak(extDescription(article.ext))}
        </span>
        <label class={lbl}>From</label>
        <span class={val}>
          {whoFrom(article.from)} &lt;{article.from.email}&gt;
        </span>
        <label class={lbl}>Subject</label>
        <span class={val}>{article.subject}</span>
        <pre class="col-span-6 whitespace-pre-wrap mt-3 max-w-4xl">
          <p>{article.body.trim()}</p>
          <p style="font-size: x-small">{signature.trim()}</p>
        </pre>
      </form>
      {(images.length > 0 || attachments.length > 0) &&
        <hr class="my-2" />}
      {images.map((m) => (
        <div class="py-2 px-2">
          <p>{m.name}</p>
          <img src={`data:${m.contentType};${m.contentEncoding},${m.data}`} />
        </div>
      ))}
      {attachments.length > 0 && (
        <AttachmentTable id={article.id} attachments={attachments} />
      )}
    </>
  );
}

interface AttachmentTableProps {
  id: NewsArticleID;
  attachments: NewsAttachment[];
}

function AttachmentTable(props: AttachmentTableProps) {
  const thd = `border(dotted b-2)`;
  return (
    <table class="mx-2 my-2">
      <thead class={thd}>
        <tr>
          <th>Attachment</th>
          <th class="pl-2 text-right whitespace-nowrap">approx size K</th>
          <th></th>
        </tr>
      </thead>
      {collateAttachments(props.attachments).map((a, _i) => (
        <tr>
          <td>
            {a.reason ? a.name : (
              <a
                href={[
                  encodeURIComponent(props.id),
                  "attachments",
                  encodeURIComponent(a.name),
                ].join("/")}
              >
                {a.name}
              </a>
            )}
          </td>
          <td class="pl-2 text-right">
            {(a.length / 1024).toFixed(1)}
          </td>
          <td class="pl-2">
            {a.reason}
          </td>
        </tr>
      ))}
    </table>
  );
}
