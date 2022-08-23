/** @jsx h */
import { h } from "preact";
import { HandlerContext, PageProps } from "$fresh/server.ts";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import {
  NewsGroup,
  NewsOrigin,
  NewsOverview,
  unquoteName,
} from "yooznooz/lib/model.ts";
import { default as newsBack } from "yooznooz/lib/proc_back.ts";

export interface MessagesProps {
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
  const start = Date.now();
  let timer = 0;
  const overview = await Promise.race([
    new Promise<NewsOverview[]>((resolve) =>
      timer = setTimeout(() => {
        console.log(
          `waited too long for messages in ${group.name} from ${origin.host}`,
        );
        resolve([]);
      }, 7500)
    ),
    newsBack.overview(group, { slice: -100 }).then((o) => {
      console.log(
        `resolve (${
          Date.now() - start
        } ms) overview for ${group.name} from origin ${origin.host}: ${o.length}`,
      );
      clearTimeout(timer);
      return o;
    }).catch((x) => {
      console.log(
        `reject  (${
          Date.now() - start
        } ms) overview for ${group.name} from origin ${origin.host}`,
        String(x),
      );
      clearTimeout(timer);
      return [];
    }),
  ]);
  const data: MessagesProps = {
    group,
    overview,
  };
  const response = await ctx.render(data);
  return response;
}

export default function GroupMessages(props: PageProps<MessagesProps>) {
  return (
    <div>
      <table>
        {props.data.overview.map((o) => (
          <tr>
            <td>
              <a
                href={`${props.data.group.name}/articles/${
                  encodeURIComponent(o.id)
                }`}
              >
                {o.subject}
              </a>
            </td>
            <td>{unquoteName(o.from)}</td>
            <td>{o.date.toLocaleString()}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
