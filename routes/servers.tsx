/** @jsx h */
/** @jsxFrag Fragment */
import { Fragment, h } from "preact";
import { HandlerContext, PageProps } from "$fresh/server.ts";
import { default as Groups, GroupsProps } from "yooznooz/islands/Groups.tsx";
import { default as newsBack } from "yooznooz/lib/proc_back.ts";
import { MyCookies } from "yooznooz/lib/cookies.ts";
import { NewsGroupInfo, NewsOrigin } from "yooznooz/lib/model.ts";

const noOrigin: NewsOrigin = { host: "fake.example.com" };
const noGroups: NewsGroupInfo[] = [
  { origin: noOrigin, name: "one", high: 100, low: 1 },
  { origin: noOrigin, name: "two", high: 20, low: 1 },
];

export async function handler(
  req: Request,
  ctx: HandlerContext,
): Promise<Response> {
  const my = new MyCookies(req);
  const groups = (await Promise.all(
    my.origins.map((origin) => {
      const start = Date.now();
      let timer = 0; //TODO do unfulfilled promises leak?
      return Promise.race([
        new Promise<NewsGroupInfo[]>((resolve) =>
          timer = setTimeout(() => {
            console.log(`waited too long for origin ${origin.host}`);
            resolve(noGroups);
          }, 7500)
        ),
        newsBack.groups(origin).then((g) => {
          console.log(
            `resolve (${
              Date.now() - start
            } ms) groups for origin ${origin.host}: ${g.length}`,
          );
          clearTimeout(timer);
          return g.filter((i) => !i.name.startsWith("control."));
        }).catch((x) => {
          console.log(
            `reject  (${
              Date.now() - start
            } ms) groups for origin ${origin.host}`,
            String(x),
          );
          clearTimeout(timer);
          return [];
        }),
      ]);
    }),
  )).flat();
  const data: GroupsProps = {
    origins: my.origins,
    groups,
    subs: [],
  };
  const response = await ctx.render(data);
  // responseCookies(response, {})
  return response;
}

export default function Servers(props: PageProps<GroupsProps>) {
  return (
    <>
      <p>Subscribed Groups and Servers {props.params.name}</p>
      <Groups
        origins={props.data.origins}
        groups={props.data.groups}
        subs={props.data.subs}
      />
    </>
  );
}
