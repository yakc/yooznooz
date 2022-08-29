/** @jsx h */
import { h } from "preact";
import { HandlerContext, PageProps } from "$fresh/server.ts";
import { tw } from "@twind";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import * as format from "yooznooz/lib/format.ts";
import {
  NewsGroup,
  NewsOrigin,
  NewsOverview,
  whoFrom,
} from "yooznooz/lib/model.ts";
import { default as wrappedBack } from "yooznooz/lib/proc_wrap.ts";

export interface MessagesProps {
  group: NewsGroup;
  overview: NewsOverview[];
  lang: string[];
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
  const data: MessagesProps = { group, overview, lang: my.lang };
  const response = await ctx.render(data);
  return response;
}

export default function GroupMessages(props: PageProps<MessagesProps>) {
  const { group, overview, lang } = props.data;
  return (
    <div>
      <table>
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
            <td class={tw`pl-2`}>{format.date(o.date, lang)}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
