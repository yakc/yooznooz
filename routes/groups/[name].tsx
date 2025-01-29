import { FreshContext, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import {
  groupAtOrigin,
  NewsGroup,
  NewsOrigin,
  NewsOverview,
  NewsRange,
  whoFrom,
} from "yooznooz/lib/model.ts";
import { default as wrappedBack } from "yooznooz/lib/proc_wrap.ts";

const pageSize = 100;

export function name2Group(
  my: MyCookies,
  ctx: FreshContext,
): [NewsOrigin, NewsGroup] {
  const [name, host] = (() => {
    const at = ctx.params.name.split("@", 2);
    if (at[1]) {
      return at;
    }
    return [ctx.params.name, my.origins[0].host];
  })();
  const origin: NewsOrigin = { host };
  const group: NewsGroup = { origin, name };
  return [origin, group];
}

function start2Range(start: number): NewsRange {
  const newest = !(start > 0); // NaN also sorts by most recent
  // fetch one more than needed; if you get it, that's the start
  // of the next page, in whatever direction you're headed
  const slice = newest ? -(pageSize + 1) : (pageSize + 1);
  if (start > 0) {
    return {
      low: start,
      slice,
    };
  } else if (start < 0) {
    return {
      high: -start,
      slice,
    };
  }
  return { slice };
}

export async function handler(
  req: Request,
  ctx: FreshContext,
): Promise<Response> {
  const my = new MyCookies(req);
  if (!my.origins.length) {
    const url = new URL("/servers", req.url);
    return Response.redirect(url);
  }
  const start = new URL(req.url).searchParams.get("start") || "";
  const range = start2Range(parseInt(start));
  const [_, group] = name2Group(my, ctx);
  const overview = (await wrappedBack.overview(group, range)).value;
  if (!overview.length) {
    const message = start
      ? `no Article #${Math.abs(+start)} in ${group.name}`
      : `no group ${group.name}`;
    return new Response(message, { status: 404 });
  }
  if (range.slice! < 0) {
    // can't just reverse since they might have been fetched in batches
    overview.sort((a, b) => b.number! - a.number!);
  }
  const next = overview.length > pageSize ? overview.slice(-1)[0].number! : 0;
  const rows = overview.length > pageSize ? overview.slice(0, -1) : overview;
  const data: MessagesProps = { my, group, overview: rows, next, range };
  const response = await ctx.render(data);
  return response;
}

export interface MessagesProps {
  my: MyCookies;
  group: NewsGroup;
  overview: NewsOverview[];
  next: number;
  range: NewsRange;
}

export default function GroupMessages(props: PageProps<MessagesProps>) {
  const { my, group, overview, next, range } = props.data;
  const formatter = MyCookies.formatter(my.lang);
  const top = overview[0];
  const inject = top.number && !range.low && !range.high && (
    <script>
      localStorage.setItem(`last:{groupAtOrigin(group)}`, `{top.number};{top
        .date.toISOString()}`);
    </script>
  );
  const bottom = overview.slice(-1)[0];
  const sparse = overview.length !== Math.abs(top.number! - bottom.number!) + 1;
  const topNumber = formatter.num(top.number!);
  const bottomNumber = formatter.num(bottom.number!);
  const direction = Math.sign(range.slice!);
  const nextLabel = direction < 0 ? "Older" : "Newer";
  const pageNav = (
    <div class="px-2">
      <p>
        {sparse && "sparse"} Articles {topNumber} to {bottomNumber}
      </p>
      <p>
        {next
          ? <a href={`?start=${direction * next}`}>{nextLabel}</a>
          : <span>None {nextLabel.toLowerCase()}</span>}
      </p>
    </div>
  );
  return (
    <>
      <Head>
        <title>{group.name} | {topNumber} to {bottomNumber} | YoozNooz</title>
      </Head>
      {inject}
      {pageNav}
      <hr class="my-2" />
      <table class="mx-2">
        <tbody>
          {overview.map((o) => (
            <tr>
              <td>
                <a
                  href={`${groupAtOrigin(group)}/articles/${
                    encodeURIComponent(o.id)
                  }`}
                >
                  {o.subject}
                </a>
              </td>
              <td class="pl-2">{whoFrom(o.from)}</td>
              <td class="pl-2">{formatter.date(o.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr class="my-2" />
      {pageNav}
    </>
  );
}
