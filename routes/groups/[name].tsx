/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { HandlerContext, PageProps } from "$fresh/server.ts";
import { tw } from "@twind";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import {
  NewsGroup,
  NewsOrigin,
  NewsOverview,
  whoFrom,
} from "yooznooz/lib/model.ts";
import { default as wrappedBack } from "yooznooz/lib/proc_wrap.ts";

export interface MessagesProps {
  my: MyCookies;
  group: NewsGroup;
  overview: NewsOverview[];
}

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
  const overview = (await wrappedBack.overview(group, { slice: -100 })).value
    .sort((a, b) => b.date.getTime() - a.date.getTime()); // Latest first
  const data: MessagesProps = { my, group, overview };
  const response = await ctx.render(data);
  return response;
}

export default function GroupMessages(props: PageProps<MessagesProps>) {
  const { my, group, overview } = props.data;
  const formatter = MyCookies.formatter(my.lang);
  const last = overview[0]; // Sort by most recent: last is first
  const inject = last && !!last.number && (
    <script>
      localStorage.setItem(`last:{group.name}`, `{last.number};{last.date
        .toISOString()}`);
    </script>
  );
  return (
    <>
      {inject}
      <table class={tw`mx-2`}>
        {overview.map((o) => (
          <tr>
            <td>
              <a
                href={`${group.name}/articles/${encodeURIComponent(o.id)}`}
              >
                {o.subject}
              </a>
            </td>
            <td class={tw`pl-2`}>{whoFrom(o.from)}</td>
            <td class={tw`pl-2`}>{formatter.date(o.date)}</td>
          </tr>
        ))}
      </table>
    </>
  );
}
